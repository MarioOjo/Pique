import Anthropic from "@anthropic-ai/sdk";
import {anthropicApiKey} from "./config";

let client: Anthropic | null = null;

/**
 * Lazily creates the shared Anthropic client. The API key secret is only
 * available while a function that declares it is running, not at import.
 * @return {Anthropic} The shared client.
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({apiKey: anthropicApiKey.value()});
  }
  return client;
}
