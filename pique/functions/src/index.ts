import Anthropic from "@anthropic-ai/sdk";
import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {
  DocumentReference,
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {anthropicApiKey, config} from "./config";
import {
  INTEREST_NAMES,
  UserProfile,
  generateCardsForInterest,
  toUserProfile,
} from "./generators/cardGenerator";
import {
  ScoreResult,
  adjustWeight,
  preScore,
  scoreWithClaude,
} from "./scoring/responseScorer";
import {computeStreaks, localDayNumber} from "./stats/streaks";
import {
  CardGenerationRequest,
  DeleteAccountResult,
  GenerateCardsResult,
  ScoreResponseRequest,
  StoredCard,
  ScoreResponseResult,
  UpdateStatsRequest,
  UpdateStatsResult,
} from "./types";

// Caps concurrent containers per function to limit cost from traffic spikes.
setGlobalOptions({maxInstances: 10});

initializeApp();
const db = getFirestore();

/**
 * Whether a Claude API error is worth retrying later (rate limits,
 * server errors, network failures) rather than a bug in the request.
 * @param {unknown} error The caught error.
 * @return {boolean} True for transient errors.
 */
function isTransientAnthropicError(error: unknown): boolean {
  return (
    error instanceof Anthropic.RateLimitError ||
    error instanceof Anthropic.InternalServerError ||
    error instanceof Anthropic.APIConnectionError
  );
}

/**
 * Extracts a loggable message; SDK errors carry bulky header objects.
 * @param {unknown} error The caught error.
 * @return {string} The error message.
 */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Today's date in UTC as YYYY-MM-DD; the daily card limit resets on it.
 * @return {string} The date key.
 */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Atomically reserves up to `requested` cards from the user's daily
 * allowance, so concurrent calls can't both slip under the limit.
 * @param {DocumentReference} userRef The user's profile document.
 * @param {number} requested Number of cards the caller asked for.
 * @return {Promise<{reserved: number, remaining: number,
 *   profile: UserProfile}>} How many cards were reserved, how many are left
 *   today after this reservation, and the user's onboarding answers (read
 *   in the same transaction, to save a second read).
 */
async function reserveDailyQuota(
  userRef: DocumentReference,
  requested: number,
): Promise<{reserved: number; remaining: number; profile: UserProfile}> {
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(userRef);
    const data = snapshot.data();
    if (!data) {
      throw new HttpsError("not-found", "User not found");
    }

    const today = todayKey();
    const used = data.dailyCardCountDate === today ?
      Number(data.dailyCardCount ?? 0) :
      0;
    const reserved = Math.min(requested, config.cards.dailyLimit - used);
    if (reserved <= 0) {
      throw new HttpsError("resource-exhausted", "Daily card limit reached");
    }

    tx.update(userRef, {
      dailyCardCount: used + reserved,
      dailyCardCountDate: today,
    });
    return {
      reserved,
      remaining: config.cards.dailyLimit - used - reserved,
      profile: toUserProfile(data),
    };
  });
}

/**
 * Returns unused quota, e.g. after a failed or short generation. Skipped
 * if the day has rolled over, since the counter has already reset.
 * @param {DocumentReference} userRef The user's profile document.
 * @param {number} amount Number of cards to give back.
 * @param {string} day The date key the quota was reserved under.
 */
async function releaseDailyQuota(
  userRef: DocumentReference,
  amount: number,
  day: string,
): Promise<void> {
  if (amount <= 0) return;
  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(userRef);
    if (snapshot.get("dailyCardCountDate") !== day) return;
    tx.update(userRef, {dailyCardCount: FieldValue.increment(-amount)});
  });
}

export const generateCards = onCall(
  {secrets: [anthropicApiKey], timeoutSeconds: 120},
  async (request): Promise<GenerateCardsResult> => {
    // Auth check — must be signed in
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const {userId, interestId, count} =
      (request.data ?? {}) as Partial<CardGenerationRequest>;

    // Validate request
    if (!userId || !interestId || count === undefined) {
      throw new HttpsError("invalid-argument", "Missing required fields");
    }
    if (!(interestId in INTEREST_NAMES)) {
      throw new HttpsError("invalid-argument", "Unknown interest");
    }
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > config.cards.batchSize
    ) {
      throw new HttpsError(
        "invalid-argument",
        `count must be an integer from 1 to ${config.cards.batchSize}`,
      );
    }

    // Only generate for the requesting user
    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "Cannot generate for another user",
      );
    }

    const userRef = db.collection("users").doc(userId);
    const day = todayKey();
    const {reserved, remaining, profile} =
      await reserveDailyQuota(userRef, count);

    let generatedCards;
    try {
      generatedCards =
        await generateCardsForInterest(interestId, reserved, profile);
    } catch (error) {
      await releaseDailyQuota(userRef, reserved, day);
      logger.error("Card generation failed", {
        userId,
        interestId,
        error: describeError(error),
      });
      if (isTransientAnthropicError(error)) {
        throw new HttpsError(
          "unavailable",
          "Frank is busy right now. Please try again shortly.",
        );
      }
      throw new HttpsError("internal", "Card generation failed");
    }

    // Save cards to Firestore
    const batch = db.batch();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + config.cards.expiryDays);

    const cards: StoredCard[] = generatedCards.map((card) => {
      const ref = db.collection("cards").doc();
      batch.set(ref, {
        ...card,
        interestId,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });
      return {
        ...card,
        id: ref.id,
        interestId,
        status: "active",
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
    });
    try {
      await batch.commit();
    } catch (error) {
      await releaseDailyQuota(userRef, reserved, day);
      logger.error("Saving cards failed", {
        userId,
        interestId,
        error: describeError(error),
      });
      throw new HttpsError("internal", "Could not save generated cards");
    }

    // Claude may return fewer cards than asked; don't charge for those.
    const unused = reserved - generatedCards.length;
    await releaseDailyQuota(userRef, unused, day);

    return {
      success: true,
      cardsGenerated: cards.length,
      message: `Generated ${cards.length} cards for ${interestId}`,
      cards,
      remainingToday: remaining + unused,
    };
  },
);

/**
 * Scores an interaction the app has already written, stores the score on
 * it, and nudges the user's weight for the card's interest.
 *
 * Takes the interaction's ID rather than the response itself, so it scores
 * what was actually recorded and each interaction is scored (and moves
 * weights) at most once, however often it's called.
 */
export const scoreResponse = onCall(
  {secrets: [anthropicApiKey], timeoutSeconds: 60},
  async (request): Promise<ScoreResponseResult> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const {interactionId} =
      (request.data ?? {}) as Partial<ScoreResponseRequest>;
    if (!interactionId || typeof interactionId !== "string") {
      throw new HttpsError("invalid-argument", "interactionId is required");
    }

    const interactionRef = db.collection("interactions").doc(interactionId);
    const interactionSnap = await interactionRef.get();
    const interaction = interactionSnap.data();
    if (!interaction) {
      throw new HttpsError("not-found", "Interaction not found");
    }
    // Same response whether it's missing or someone else's, so IDs can't
    // be probed.
    if (interaction.userId !== request.auth.uid) {
      throw new HttpsError("not-found", "Interaction not found");
    }
    if (interaction.scoredAt) {
      return {
        score: Number(interaction.engagementScore),
        message: "Already scored",
      };
    }

    const cardSnap = await db.collection("cards")
      .doc(String(interaction.cardId))
      .get();
    const card = cardSnap.data();
    const input = {
      responseText: String(interaction.responseText ?? ""),
      timeOnCard: Number(interaction.timeOnCard ?? 0),
      skipped: interaction.skipped === true,
      cardText: card ?
        `${String(card.body ?? "")} ${String(card.prompt ?? "")}` :
        undefined,
    };

    // Pre-checks first: they save a Claude call when the score is obvious.
    let result: ScoreResult | null = preScore(input);
    if (!result) {
      if (!card) {
        // e.g. a fallback mock card that was never stored in Firestore.
        result = {
          score: 0,
          message: "Card not found; response not scored",
          usedClaude: false,
        };
      } else {
        try {
          result = await scoreWithClaude(
            String(card.body),
            input.responseText,
          );
        } catch (error) {
          logger.error("Scoring failed", {
            interactionId,
            error: describeError(error),
          });
          if (isTransientAnthropicError(error)) {
            throw new HttpsError("unavailable", "Scoring unavailable");
          }
          throw new HttpsError("internal", "Scoring failed");
        }
      }
    }
    const {score, message, usedClaude} = result;
    const interestId = card ? String(card.interestId) : null;
    const userId = request.auth.uid;

    // Store the score and adjust the weight together. Re-checking scoredAt
    // inside the transaction stops two concurrent calls both applying it.
    const outcome = await db.runTransaction(async (tx) => {
      const current = await tx.get(interactionRef);
      if (current.get("scoredAt")) {
        return {
          score: Number(current.get("engagementScore")),
          message: "Already scored",
        };
      }

      const interestRef = interestId ?
        db.collection("users").doc(userId)
          .collection("interests").doc(interestId) :
        null;
      const interestSnap = interestRef ? await tx.get(interestRef) : null;

      tx.update(interactionRef, {
        engagementScore: score,
        scoredAt: FieldValue.serverTimestamp(),
        // Kept with the score as a record of why it was given.
        scoreReason: message,
        scoredBy: usedClaude ? "claude" : "precheck",
      });
      // Only interests the user chose have a weight to adjust.
      if (interestRef && interestSnap?.exists) {
        const weight = Number(interestSnap.get("weight") ?? 1);
        const next = adjustWeight(weight, score);
        if (next !== weight) tx.update(interestRef, {weight: next});
      }
      return {score, message};
    });

    logger.info("Scored interaction", {
      interactionId,
      score: outcome.score,
      usedClaude: result.usedClaude,
    });

    // Answers earn their score as points. Recounted from every answer
    // rather than incremented, so it's always right and covers answers
    // scored before points existed. A failure here doesn't undo the score.
    if (!input.skipped) {
      try {
        await recountScores(userId);
      } catch (error) {
        logger.error("Score recount failed", {
          userId,
          error: describeError(error),
        });
      }
    }
    return outcome;
  },
);

/**
 * Sets stats/{uid}.points to the sum of the user's answer scores, and
 * bestScore to the highest (for the Sharp take badge).
 * @param {string} userId The user whose scores to recount.
 * @return {Promise<void>} Resolves once stats are written.
 */
async function recountScores(userId: string): Promise<void> {
  const snapshot = await db.collection("interactions")
    .where("userId", "==", userId)
    .where("skipped", "==", false)
    .select("engagementScore")
    .get();
  const scores = snapshot.docs.map(
    (doc) => Number(doc.get("engagementScore") ?? 0),
  );
  const points = scores.reduce((sum, score) => sum + score, 0);
  const bestScore = Math.max(0, ...scores);
  await db.collection("stats").doc(userId)
    .set({points, bestScore}, {merge: true});
}

/**
 * Recomputes the user's stats/{uid} doc (streaks and total responses)
 * from their interactions. Safe to call repeatedly: it recalculates from
 * scratch rather than incrementing.
 */
export const updateStats = onCall(
  async (request): Promise<UpdateStatsResult> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const {userId, tzOffsetMinutes = 0} =
      (request.data ?? {}) as Partial<UpdateStatsRequest>;
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId is required");
    }
    if (request.auth.uid !== userId) {
      throw new HttpsError(
        "permission-denied",
        "Cannot update another user's stats",
      );
    }
    // Real offsets range from UTC-12 to UTC+14.
    if (
      !Number.isInteger(tzOffsetMinutes) ||
      Math.abs(tzOffsetMinutes) > 14 * 60
    ) {
      throw new HttpsError("invalid-argument", "Invalid tzOffsetMinutes");
    }

    const snapshot = await db.collection("interactions")
      .where("userId", "==", userId)
      .where("skipped", "==", false)
      .select("createdAt")
      .get();

    const days = snapshot.docs
      .map((doc) => doc.get("createdAt"))
      .filter((value): value is Timestamp => value instanceof Timestamp)
      .map((value) => localDayNumber(value.toDate(), tzOffsetMinutes));
    const today = localDayNumber(new Date(), tzOffsetMinutes);
    const {currentStreak, longestStreak} = computeStreaks(days, today);
    const totalResponses = snapshot.size;

    // Merged, so the points scoreResponse keeps are left alone.
    await db.collection("stats").doc(userId).set({
      userId,
      currentStreak,
      longestStreak,
      totalResponses,
      lastActive: FieldValue.serverTimestamp(),
    }, {merge: true});

    return {currentStreak, totalResponses};
  },
);

/**
 * Permanently deletes the caller's account and everything stored about
 * them: their interactions, stats, profile and interests, then their
 * sign-in. Generated cards aren't tied to a user and hold no personal
 * data, so they stay.
 */
export const deleteAccount = onCall(
  async (request): Promise<DeleteAccountResult> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }
    const uid = request.auth.uid;

    try {
      // Interactions are top-level documents keyed by userId.
      const interactions = await db
        .collection("interactions")
        .where("userId", "==", uid)
        .get();
      const writer = db.bulkWriter();
      interactions.docs.forEach((doc) => writer.delete(doc.ref));
      writer.delete(db.collection("stats").doc(uid));
      await writer.close();

      // The profile together with its interests subcollection.
      await db.recursiveDelete(db.collection("users").doc(uid));

      await getAuth().deleteUser(uid);
    } catch (error) {
      // A retry after a partial failure finds the sign-in already gone.
      const code = (error as {code?: string}).code;
      if (code !== "auth/user-not-found") {
        logger.error("Account deletion failed", {
          uid,
          error: describeError(error),
        });
        throw new HttpsError("internal", "Could not delete account");
      }
    }

    logger.info("Account deleted", {uid});
    return {deleted: true};
  },
);
