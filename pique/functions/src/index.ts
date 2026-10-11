import Anthropic from "@anthropic-ai/sdk";
import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {
  DocumentReference,
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import {anthropicApiKey, config} from "./config";
import {
  INTEREST_NAMES,
  generateCardsForInterest,
} from "./generators/cardGenerator";
import {CardGenerationRequest} from "./types";

// Caps concurrent containers per function to limit cost from traffic spikes.
setGlobalOptions({maxInstances: 10});

initializeApp();
const db = getFirestore();

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
 * @return {Promise<number>} How many cards were reserved.
 */
async function reserveDailyQuota(
  userRef: DocumentReference,
  requested: number,
): Promise<number> {
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
    return reserved;
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
  async (request) => {
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
    const reserved = await reserveDailyQuota(userRef, count);

    let generatedCards;
    try {
      generatedCards = await generateCardsForInterest(interestId, reserved);
    } catch (error) {
      await releaseDailyQuota(userRef, reserved, day);
      logger.error("Card generation failed", {
        userId,
        interestId,
        error: describeError(error),
      });
      if (
        error instanceof Anthropic.RateLimitError ||
        error instanceof Anthropic.InternalServerError ||
        error instanceof Anthropic.APIConnectionError
      ) {
        throw new HttpsError(
          "unavailable",
          "Frank is busy right now. Please try again shortly.",
        );
      }
      throw new HttpsError("internal", "Card generation failed");
    }

    // Save cards to Firestore
    const batch = db.batch();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.cards.expiryDays);

    generatedCards.forEach((card) => {
      batch.set(db.collection("cards").doc(), {
        ...card,
        interestId,
        status: "active",
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
      });
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
    await releaseDailyQuota(userRef, reserved - generatedCards.length, day);

    return {
      success: true,
      cardsGenerated: generatedCards.length,
      message: `Generated ${generatedCards.length} cards for ${interestId}`,
    };
  },
);
