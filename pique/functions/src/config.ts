// Central config — all environment variables and tunables live here.
import {defineSecret} from "firebase-functions/params";

// Stored with `firebase functions:secrets:set ANTHROPIC_API_KEY`, never
// hardcoded. Read it with anthropicApiKey.value() inside a function that
// lists it in its `secrets` option.
export const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");
// For each card's photo search. Set the same way as PIXABAY_API_KEY.
export const pixabayApiKey = defineSecret("PIXABAY_API_KEY");

export const config = {
  anthropic: {
    model: "claude-opus-5-5",
    // Thinking is always on with this model; effort sets how much it
    // thinks, and so how long the user waits. Low keeps the first card and
    // Frank's replies quick; raise it if quality drops.
    effort: "low",
    // Ceilings, not targets: you're billed for tokens actually generated.
    // Thinking counts towards them, so both leave room for it on top of the
    // reply, and a full batch is never cut off mid-JSON.
    maxTokens: 16000,
    // Scoring returns a score, a reason and a short reply.
    scoringMaxTokens: 4000,
    // If a safety check declines a request, the API re-runs it on the
    // fallback model it recommends for that kind of refusal.
    fallbackBeta: "server-side-fallback-2026-07-01",
  },
  cards: {
    batchSize: 5, // max cards generated per request
    // Max cards per user per day (3 sessions of 10). Higher on the local
    // emulator so testing doesn't run out; real API calls still cost.
    dailyLimit: process.env.FUNCTIONS_EMULATOR === "true" ? 300 : 30,
    expiryDays: 7, // days before a card can be re-served
  },
} as const;
