import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/db";
import { parseList, stringifyList } from "@/lib/json";
import { AI_MODEL, getAnthropic } from "./client";
import { KNOWLEDGE_SYSTEM } from "./prompts";
import { loadStrategyContext, renderStrategyContext } from "./context";
import {
  KnowledgeExtractionSchema,
  type ContentAngle,
  type KnowledgeExtraction,
} from "./schemas";

const MAX_RAW_CHARS = 60_000;

export async function extractFromRaw(
  rawContent: string,
  hint: { title?: string; source?: string; sourceUrl?: string } = {}
): Promise<KnowledgeExtraction> {
  const client = getAnthropic();
  const ctx = renderStrategyContext(await loadStrategyContext());

  const trimmed = rawContent.length > MAX_RAW_CHARS
    ? rawContent.slice(0, MAX_RAW_CHARS) + "\n\n[…truncated]"
    : rawContent;

  const userPrompt = [
    hint.title ? `User-provided title: ${hint.title}` : null,
    hint.source ? `Source type: ${hint.source}` : null,
    hint.sourceUrl ? `Source URL: ${hint.sourceUrl}` : null,
    ``,
    `Raw material:`,
    `"""`,
    trimmed,
    `"""`,
    ``,
    `Extract the structured learning per the schema. Anchor "contentAngles" to the brand's pillars and audience above.`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: KNOWLEDGE_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
      { type: "text", text: ctx },
    ],
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: zodOutputFormat(KnowledgeExtractionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Knowledge extractor returned malformed output. Try again.");
  }
  return parsed;
}

export type KnowledgeContext = {
  entries: {
    title: string;
    summary: string;
    keyIdeas: string[];
    contentAngles: ContentAngle[];
  }[];
};

export async function loadKnowledgeContext(limit = 6): Promise<KnowledgeContext> {
  const rows = await prisma.knowledgeEntry.findMany({
    where: { status: "processed" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    entries: rows.map((r) => ({
      title: r.title,
      summary: r.summary,
      keyIdeas: parseList<string>(r.keyIdeas),
      contentAngles: parseList<ContentAngle>(r.contentAngles),
    })),
  };
}

export function renderKnowledgeContext(ctx: KnowledgeContext): string {
  if (ctx.entries.length === 0) {
    return "# Learning Library\n(no processed entries yet — user hasn't fed any source material)";
  }

  const blocks = ctx.entries.map((e, i) => {
    const ideas = e.keyIdeas.length
      ? e.keyIdeas.map((k) => `  - ${k}`).join("\n")
      : "  (none)";
    const angles = e.contentAngles.length
      ? e.contentAngles
          .map(
            (a) =>
              `  - [${a.format}] ${a.hook} — ${a.angle}${a.pillarHint ? ` (pillar: ${a.pillarHint})` : ""}`
          )
          .join("\n")
      : "  (none)";
    return [
      `## ${i + 1}. ${e.title}`,
      e.summary,
      ``,
      `Key ideas:`,
      ideas,
      ``,
      `Content angles:`,
      angles,
    ].join("\n");
  });

  return [
    `# Learning Library`,
    `The user has fed the following source material into their library. Treat these as their voice, knowledge, and current obsessions — when generating content, prefer hooks and angles drawn from here over generic advice.`,
    ``,
    blocks.join("\n\n"),
  ].join("\n");
}

export function serializeAngles(angles: ContentAngle[]): string {
  return stringifyList(angles);
}
