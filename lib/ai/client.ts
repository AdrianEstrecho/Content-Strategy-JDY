import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function isAIEnabled(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return !!key && key.startsWith("sk-");
}

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!isAIEnabled()) {
    throw new Error(
      "Anthropic API key is not configured. Add ANTHROPIC_API_KEY to .env and restart the dev server."
    );
  }
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!.trim(),
    });
  }
  return _client;
}
