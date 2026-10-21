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
  "sport": "Sport",
};

// Onboarding answers that shape Frank's cards. Keep the keys in sync with
// the app's lib/onboarding.ts and firestore.rules. Every line that reaches
// the prompt comes from these server-side tables, never from the user's
// document directly, so a stored answer can't inject instructions.
const AGE_CONTEXT: Record<string, string> = {
  "18-24": "The user is 18–24 — pitch references and examples to match.",
  "25-34": "The user is 25–34 — pitch references and examples to match.",
  "35-44": "The user is 35–44 — pitch references and examples to match.",
  "45+": "The user is 45 or older — pitch references and examples to match.",
};

const WHY_CONTEXT: Record<string, string> = {
  "sharpen": "The user wants to sharpen their thinking — favour " +
    "perspective cards that demand a clear stance, with genuinely strong " +
    "counterpoints.",
  "learn": "The user is here to learn — favour recall cards that build " +
    "real, memorable knowledge.",
  "sides": "The user wants to hear other perspectives — emphasise " +
    "less-heard views and surprising counterpoints.",
  "switch-off": "The user is replacing mindless scrolling — keep the tone " +
    "approachable and difficulty moderate; nothing that feels like homework.",
};

// 1 = back me up, 5 = push back hard.
const STYLE_CONTEXT: Record<number, string> = {
  1: "The user wants support — lead with affirming ideas and keep " +
    "counterpoints gentle.",
  2: "The user leans towards agreement — present ideas warmly with only " +
    "light challenge.",
  3: "The user wants balance — give both sides equal weight.",
  4: "The user wants to be pushed — include sharp counterpoints.",
  5: "The user wants maximum pushback — be genuinely challenging and " +
    "question assumptions directly.",
};

const STYLE_DIFFICULTY: Record<number, string> = {
  1: "Lean towards difficulty 1–3.",
  2: "Lean towards difficulty 1–3.",
  4: "Lean towards difficulty 3–5.",
  5: "Lean towards difficulty 4–5.",
};

// The user's onboarding answers, each one known to the tables above.
export interface UserProfile {
  ageBand?: string;
  whyHere?: string;
  frankStyle?: number;
}

/**
 * Picks the known onboarding answers out of a user document. Unknown or
 * missing answers are left out, so Frank falls back to his defaults.
 * @param {Record<string, unknown>} data The users/{uid} document data.
 * @return {UserProfile} The answers Frank can use.
 */
export function toUserProfile(data: Record<string, unknown>): UserProfile {
  const profile: UserProfile = {};
  if (typeof data.ageBand === "string" && data.ageBand in AGE_CONTEXT) {
    profile.ageBand = data.ageBand;
  }
  if (typeof data.whyHere === "string" && data.whyHere in WHY_CONTEXT) {
    profile.whyHere = data.whyHere;
  }
  if (
    typeof data.frankStyle === "number" &&
    data.frankStyle in STYLE_CONTEXT
  ) {
    profile.frankStyle = data.frankStyle;
  }
  return profile;
}

// Structured outputs constrain Claude's reply to this schema, so the
// response is always parseable JSON in this exact shape.
const CardSchema = z.object({
  type: z.enum(["perspective", "recall"]),
  body: z.string(),
  prompt: z.string(),
  counterpoint: z.string().nullable(),
  difficulty: z.number().int(),
  imageQuery: z.string(),
});

type ParsedCard = z.infer<typeof CardSchema>;

const CardBatchSchema = z.object({
  cards: z.array(CardSchema),
});

/**
 * Builds the system prompt for Frank, Pique's AI persona.
 * @param {UserProfile} profile The user's onboarding answers.
 * @return {string} The system prompt.
 */
function buildSystemPrompt(profile: UserProfile): string {
  const context: string[] = [];
  if (profile.ageBand) context.push(AGE_CONTEXT[profile.ageBand]);
  if (profile.whyHere) context.push(WHY_CONTEXT[profile.whyHere]);
  if (profile.frankStyle !== undefined) {
    context.push(STYLE_CONTEXT[profile.frankStyle]);
  }
  const contextBlock = context.length > 0 ?
    `\nAbout this user:\n${context.map((line) => `- ${line}`).join("\n")}\n` :
    "";

  return `You are Frank, the AI behind Pique — an app that replaces
passive social media scrolling with content that requires genuine
thought. Your job is to generate content cards that make people stop
and actually think. Pique's users are adults (18+) with every level of
schooling, from those who left school early to graduates.
${contextBlock}
Rules for every card you generate:
- Be genuinely thought-provoking, not generic or safe
- Write so anyone can follow it: short sentences and everyday words, at
  about the reading level of a 14-year-old. The ideas can be deep; the
  words should be simple
- No jargon. If a term is needed, explain it in a few plain words
- For perspective cards: the body states one clear position worth
  debating, and the reader can only answer Agree or Disagree. So the
  prompt must be a yes/no question asking whether they agree with that
  one position, such as "Do you agree that chess should count as a
  sport?" Never an either/or question ("Is it X, or Y?"), and never an
  open question ("Why...?", "What...?") on a perspective card
- For recall cards: explain an idea simply, then ask for reflection
- Difficulty 1 = anyone can engage, 5 = requires real thought
- Keep the body short so the reader reaches the question fresh: 140
  characters or fewer, at most two short sentences
- The prompt is a direct question to the reader, in plain words. On a
  recall card it is open, asking them to explain or reflect in writing
- The prompt (the sub-prompt) must be 80 characters or fewer
- The counterpoint is one or two short sentences, just as plain
- Never generate harmful, biased or inappropriate content`;
}

/**
 * Builds the user prompt for a specific interest and card count.
 * @param {string} interestName Display name of the interest.
 * @param {number} count Number of cards to generate.
 * @param {UserProfile} profile The user's onboarding answers.
 * @return {string} The user prompt.
 */
function buildUserPrompt(
  interestName: string,
  count: number,
  profile: UserProfile,
): string {
  const difficulty =
    (profile.frankStyle !== undefined &&
      STYLE_DIFFICULTY[profile.frankStyle]) ||
    "Vary difficulty across the batch.";

  return `Generate exactly ${count} content cards about ${interestName}.

For each card:
- type: "perspective" or "recall"
- body: the main content — a statement or concept (max 2 sentences)
- prompt: what the user is asked to respond to (max 1 sentence)
- counterpoint: the other side of the argument for perspective cards;
  null for recall cards
- difficulty: an integer from 1 to 5
- imageQuery: 2 to 4 plain English words to search a stock photo library
  for a picture that fits the card, something concrete you can see (for
  example "rugby crowd stadium" or "brain scan"). No names of real people.

Mix card types — aim for roughly half perspective, half recall.
${difficulty}
Make each card genuinely different in topic and angle.`;
}

// A generated card with Frank's photo search phrase, which is used once to
// find the card's picture and not stored.
export interface DraftCard extends GeneratedCard {
  imageQuery: string;
}

/**
 * Normalises one schema-valid card into the stored shape.
 * @param {ParsedCard} card Card as returned by Claude.
 * @return {DraftCard} The normalised card.
 */
function toGeneratedCard(card: ParsedCard): DraftCard {
  const generated: DraftCard = {
    imageQuery: card.imageQuery.trim(),
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
 * @param {UserProfile} profile The user's onboarding answers, if any.
 * @return {Promise<DraftCard[]>} The generated cards.
 */
export async function generateCardsForInterest(
  interestId: string,
  count: number,
  profile: UserProfile = {},
): Promise<DraftCard[]> {
  const interestName = INTEREST_NAMES[interestId];
  if (!interestName) throw new Error(`Unknown interest: ${interestId}`);

  const response = await getAnthropicClient().beta.messages.parse({
    model: config.anthropic.model,
    max_tokens: config.anthropic.maxTokens,
    betas: [config.anthropic.fallbackBeta],
    fallbacks: "default",
    system: buildSystemPrompt(profile),
    messages: [
      {role: "user", content: buildUserPrompt(interestName, count, profile)},
    ],
    output_config: {
      effort: config.anthropic.effort,
      format: zodOutputFormat(CardBatchSchema),
    },
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
