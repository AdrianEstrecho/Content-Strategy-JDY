import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/db";
import { AI_MODEL, getAnthropic } from "./client";
import { SCRIPTER_SYSTEM } from "./prompts";
import { loadStrategyContext, renderStrategyContext } from "./context";
import { loadKnowledgeContext, renderKnowledgeContext } from "./knowledge";
import {
  CarouselSchema,
  ReelScriptSchema,
  type Carousel,
  type ReelScript,
} from "./schemas";

export type ReelInput = {
  topic: string;
  targetAudience?: string;
  lengthSeconds: 15 | 30 | 60 | 90;
  tone?: string;
  hookStyle?: "question" | "bold_claim" | "story" | "stat";
};

export type CarouselInput = {
  topic: string;
  numSlides: number; // 3-10
  goal: "educate" | "sell" | "story" | "list";
  tone?: string;
};

async function logTask(
  agent: "scripter",
  input: string,
  output: string,
  ok: boolean
) {
  await prisma.agentTask.create({
    data: {
      agent,
      input,
      output,
      status: ok ? "done" : "rejected",
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
}

export async function generateReel(input: ReelInput): Promise<ReelScript> {
  const client = getAnthropic();
  const [strategy, knowledge] = await Promise.all([
    loadStrategyContext(),
    loadKnowledgeContext(),
  ]);
  const ctx = renderStrategyContext(strategy);
  const knowledgeCtx = renderKnowledgeContext(knowledge);

  const userPrompt = [
    `Topic: ${input.topic}`,
    `Target length: ${input.lengthSeconds}s`,
    input.targetAudience ? `Audience override: ${input.targetAudience}` : null,
    input.tone ? `Tone override: ${input.tone}` : null,
    input.hookStyle ? `Preferred hook style: ${input.hookStyle}` : null,
    ``,
    `Write a complete Reel script that fits within the length, uses the voice and pillars from the brand context above, and ends with a specific CTA. Follow the JSON schema exactly.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SCRIPTER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: ctx },
      { type: "text", text: knowledgeCtx },
    ],
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(ReelScriptSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    await logTask(
      "scripter",
      `Reel: ${input.topic}`,
      "Parse failed — model returned malformed JSON.",
      false
    );
    throw new Error("Scripter returned malformed output. Try regenerating.");
  }

  await logTask(
    "scripter",
    `Reel: ${input.topic} (${input.lengthSeconds}s)`,
    `Drafted Reel "${parsed.title}" with ${parsed.beats.length} beats.`,
    true
  );

  return parsed;
}

export async function generateCarousel(input: CarouselInput): Promise<Carousel> {
  const client = getAnthropic();
  const [strategy, knowledge] = await Promise.all([
    loadStrategyContext(),
    loadKnowledgeContext(),
  ]);
  const ctx = renderStrategyContext(strategy);
  const knowledgeCtx = renderKnowledgeContext(knowledge);

  const userPrompt = [
    `Topic: ${input.topic}`,
    `Number of slides: ${input.numSlides} (including cover + final CTA)`,
    `Goal: ${input.goal}`,
    input.tone ? `Tone override: ${input.tone}` : null,
    ``,
    `Write a complete carousel following the JSON schema exactly. Cover slide must hook; final slide must CTA.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: SCRIPTER_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: ctx },
      { type: "text", text: knowledgeCtx },
    ],
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(CarouselSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    await logTask(
      "scripter",
      `Carousel: ${input.topic}`,
      "Parse failed — model returned malformed JSON.",
      false
    );
    throw new Error("Scripter returned malformed output. Try regenerating.");
  }

  await logTask(
    "scripter",
    `Carousel: ${input.topic} (${input.numSlides} slides)`,
    `Drafted carousel "${parsed.title}" with ${parsed.slides.length} slides.`,
    true
  );

  return parsed;
}
