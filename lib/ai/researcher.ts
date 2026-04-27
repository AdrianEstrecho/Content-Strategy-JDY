import { prisma } from "@/lib/db";
import { AI_MODEL, getAnthropic } from "./client";
import { RESEARCHER_SYSTEM } from "./prompts";
import { loadStrategyContext, renderStrategyContext } from "./context";
import { ResearchReportSchema, type ResearchReport } from "./schemas";

export type ResearchInput = {
  topic?: string;
  watchlist?: string[];
  parentTaskId?: string;
};

function extractJson(text: string): string | null {
  // Claude sometimes wraps JSON in ```json ... ``` even when told not to.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  // Otherwise, find the first { ... last } block.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return null;
}

export async function runResearch(
  input: ResearchInput = {}
): Promise<ResearchReport> {
  const client = getAnthropic();
  const ctx = await loadStrategyContext();
  const ctxText = renderStrategyContext(ctx);

  const task = await prisma.agentTask.create({
    data: {
      agent: "researcher",
      input: JSON.stringify({
        topic: input.topic ?? "weekly scan",
        watchlist: input.watchlist ?? [],
      }),
      status: "running",
      startedAt: new Date(),
      parentTaskId: input.parentTaskId ?? null,
    },
  });

  try {
    const pillars = ctx.pillars.map((p) => p.label).join(", ") || ctx.brand.niche;
    const topic = input.topic?.trim() || `${ctx.brand.niche} — trends, audios, hashtags, and content ideas this week`;
    const watchlist = input.watchlist?.filter(Boolean) ?? [];

    const instruction = [
      `Run 2–4 web searches to find high-signal insights for this brief, then output a ResearchReport as JSON.`,
      ``,
      `Brief:`,
      `- Topic: ${topic}`,
      `- Pillars to bias toward: ${pillars}`,
      watchlist.length > 0
        ? `- Competitor watchlist (scan what they're doing recently): ${watchlist.join(", ")}`
        : `- No competitor watchlist for this run.`,
      ``,
      `Required output shape (fields, no other keys):`,
      `{`,
      `  "summary": "2-3 sentence headline summary",`,
      `  "findings": [`,
      `    {`,
      `      "type": "trend" | "competitor" | "audio" | "hashtag" | "idea",`,
      `      "title": "short punchy title",`,
      `      "detail": "2-3 sentence body",`,
      `      "sourceUrl": "url or empty string",`,
      `      "relevanceScore": 0.0 to 1.0,`,
      `      "tags": ["pillar or theme"]`,
      `    }`,
      `  ]`,
      `}`,
      ``,
      `Return JSON only — no prose, no markdown, no code fences.`,
    ].join("\n");

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: RESEARCHER_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: ctxText },
      ],
      tools: [
        {
          type: "web_search_20260209",
          name: "web_search",
          max_uses: 4,
        },
      ],
      messages: [{ role: "user", content: instruction }],
    });

    const finalText = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const jsonStr = extractJson(finalText);
    if (!jsonStr) {
      throw new Error("Researcher returned no JSON payload in final message.");
    }

    const parsed = ResearchReportSchema.safeParse(JSON.parse(jsonStr));
    if (!parsed.success) {
      throw new Error(
        `Researcher output failed schema validation: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`
      );
    }

    // Persist findings
    await prisma.researchFinding.createMany({
      data: parsed.data.findings.map((f) => ({
        type: f.type,
        content: `${f.title}\n\n${f.detail}`,
        sourceUrl: f.sourceUrl?.trim() || null,
        relevanceScore: f.relevanceScore,
        tags: JSON.stringify(f.tags),
      })),
    });

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "done",
        output: `${parsed.data.findings.length} findings — ${parsed.data.summary}`.slice(0, 500),
        completedAt: new Date(),
      },
    });

    return parsed.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "rejected",
        output: `ERROR: ${msg}`.slice(0, 500),
        completedAt: new Date(),
      },
    });
    throw err;
  }
}
