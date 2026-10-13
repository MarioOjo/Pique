import {zodOutputFormat} from "@anthropic-ai/sdk/helpers/zod";
import {z} from "zod";
import {getAnthropicClient} from "../anthropicClient";
import {config} from "../config";
import {GeneratedCard} from "../types";

// Interest display names for prompts. Keep in sync with INTERESTS in the
// app's lib/seedInterests.ts.
export const INTEREST_NAMES: Record<string, string> = {
  "philosophy": "Philosophy",
  "science": "Science",
  "technology": "Technology",
  "culture": "Culture",
  "psychology": "Psychology",
  "economics": "Economics",
  "art": "Art",
  "politics": "Politics",
  "pop-culture": "Pop Culture",
  "gaming": "Gaming",
  "food": "Food",
  "history": "History",
};

// Structured outputs constrain Claude's reply to this schema, so the
// response is always parseable JSON in this exact shape.
const CardSchema = z.object({
  type: z.enum(["perspective", "recall"]),
  body: z.string(),
  prompt: z.string(),
  counterpoint: z.string().nullable(),
  difficulty: z.number().int(),
});

type ParsedCard = z.infer<typeof CardSchema>;

const CardBatchSchema = z.object({
  cards: z.array(CardSchema),
});

/**
 * Builds the system prompt for Frank, Pique's AI persona.
 * @return {string} The system prompt.
 */
function buildSystemPrompt(): string {
  return `You are Frank, the AI behind Pique — an app that replaces
passive social media scrolling with content that requires genuine
thought. Your job is to generate content cards that make people stop
and actually think.

Rules for every card you generate:
- Be genuinely thought-provoking, not generic or safe
- Use clear, accessible language — no jargon
- For perspective cards: present a clear position worth debating
- For recall cards: explain an idea simply, then ask for reflection
- Difficulty 1 = anyone can engage, 5 = requires real thought
- The body (the statement) must be 180 characters or fewer
- The prompt (the sub-prompt) must be 80 characters or fewer
- Never generate harmful, biased or inappropriate content`;
}

/**
 * Builds the user prompt for a specific interest and card count.
 * @param {string} interestName Display name of the interest.
 * @param {number} count Number of cards to generate.
 * @return {string} The user prompt.
 */
function buildUserPrompt(interestName: string, count: number): string {
  return `Generate exactly ${count} content cards about ${interestName}.

For each card:
- type: "perspective" or "recall"
- body: the main content — a statement or concept (max 2 sentences)
- prompt: what the user is asked to respond to (max 1 sentence)
- counterpoint: the other side of the argument for perspective cards;
  null for recall cards
- difficulty: an integer from 1 to 5

Mix card types — aim for roughly half perspective, half recall.
Vary difficulty across the batch.
Make each card genuinely different in topic and angle.`;
}

/**
 * Normalises one schema-valid card into the stored shape.
 * @param {ParsedCard} card Card as returned by Claude.
 * @return {GeneratedCard} The normalised card.
 */
function toGeneratedCard(card: ParsedCard): GeneratedCard {
  const generated: GeneratedCard = {
    type: card.type,
    body: card.body.trim(),
    prompt: card.prompt.trim(),
    difficulty: Math.min(5, Math.max(1, Math.round(card.difficulty))),
  };
  // Only perspective cards carry a counterpoint. Leaving the key off
  // entirely matters: Firestore rejects undefined field values.
  const counterpoint = card.counterpoint?.trim();
  if (card.type === "perspective" && counterpoint) {
    generated.counterpoint = counterpoint;
  }
  return generated;
}

/**
 * Generates cards for one interest using Claude.
 * @param {string} interestId One of the keys of INTEREST_NAMES.
 * @param {number} count Number of cards to generate.
 * @return {Promise<GeneratedCard[]>} The generated cards.
 */
export async function generateCardsForInterest(
  interestId: string,
  count: number,
): Promise<GeneratedCard[]> {
  const interestName = INTEREST_NAMES[interestId];
  if (!interestName) throw new Error(`Unknown interest: ${interestId}`);

  const response = await getAnthropicClient().messages.parse({
    model: config.anthropic.model,
    max_tokens: config.anthropic.maxTokens,
    system: buildSystemPrompt(),
    messages: [
      {role: "user", content: buildUserPrompt(interestName, count)},
    ],
    output_config: {format: zodOutputFormat(CardBatchSchema)},
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude declined to generate cards for ${interestId}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Card generation was cut off by max_tokens");
  }
  if (!response.parsed_output) {
    throw new Error("Claude response did not match the card schema");
  }

  return response.parsed_output.cards.slice(0, count).map(toGeneratedCard);
}
