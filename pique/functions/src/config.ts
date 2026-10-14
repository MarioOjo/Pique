// Central config — all environment variables and tunables live here.
import {defineSecret} from "firebase-functions/params";

// Stored with `firebase functions:secrets:set ANTHROPIC_API_KEY`, never
// hardcoded. Read it with anthropicApiKey.value() inside a function that
// lists it in its `secrets` option.
export const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

export const config = {
  anthropic: {
    model: "claude-sonnet-4-5",
    // A ceiling, not a target: you're billed for tokens actually generated.
    // Leaves headroom so a full batch is never cut off mid-JSON.
    maxTokens: 4096,
    // Scoring returns a single {"score": n}.
    scoringMaxTokens: 256,
  },
  cards: {
    batchSize: 5, // max cards generated per request
    // Max cards per user per day (3 sessions of 10). Higher on the local
    // emulator so testing doesn't run out; real API calls still cost.
    dailyLimit: process.env.FUNCTIONS_EMULATOR === "true" ? 300 : 30,
    expiryDays: 7, // days before a card can be re-served
  },
} as const;
