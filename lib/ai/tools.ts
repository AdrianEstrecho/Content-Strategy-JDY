import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { stringifyList } from "@/lib/json";
import { runResearch } from "./researcher";
import { generateCarousel, generateReel } from "./scripter";
import { runAnalysis } from "./analysis";

export const ADMIN_TOOLS: Anthropic.Tool[] = [
  {
    name: "request_research",
    description:
      "Run the Researcher agent to find trends, competitor moves, audio cues, hashtag clusters, and content ideas for a specific topic. Returns a structured report with scored findings and a summary. Takes 15-45 seconds (web search). Use when the user asks about trends, ideas you don't already have, or wants fresh angles.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "A specific, focused research topic. Examples: 'bidding war tactics spring 2026', 'first-time buyer objections this quarter', 'competitor analysis of @some_agent'.",
        },
        watchlist: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of competitor IG handles to scan.",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "request_script",
    description:
      "Run the Scripter agent to draft a complete Reel or Carousel script. The result auto-saves to the user's Library as a draft they can review. Use this when the user wants concrete content to post, not just ideas.",
    input_schema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["reel", "carousel"],
          description: "Type of content to draft.",
        },
        topic: {
          type: "string",
          description: "The post topic — specific and concrete.",
        },
        lengthSeconds: {
          type: "number",
          enum: [15, 30, 60, 90],
          description: "Reel only. Default 30 if omitted.",
        },
        numSlides: {
          type: "number",
          description: "Carousel only. 3-10. Default 5 if omitted.",
        },
        goal: {
          type: "string",
          enum: ["educate", "sell", "story", "list"],
          description: "Carousel only. Default 'educate' if omitted.",
        },
        hookStyle: {
          type: "string",
          enum: ["question", "bold_claim", "story", "stat"],
          description: "Reel only. Optional. If omitted, the Scripter picks.",
        },
        pillarHint: {
          type: "string",
          description:
            "Optional — the pillar name this fits. Used to assign the content to the right pillar in the Library.",
        },
      },
      required: ["format", "topic"],
    },
  },
  {
    name: "request_analysis",
    description:
      "Run the Analysis agent to read the user's published posts and return a structured performance report: headline, patterns, wins, misses, recommendations, and per-pillar guidance. Call this before planning a week if you want to ground recommendations in real data.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

export type ToolResult = {
  summary: string;
  detail: string;
};

export async function runTool(
  name: string,
  input: Record<string, unknown>,
  parentTaskId: string
): Promise<ToolResult> {
  if (name === "request_analysis") {
    const report = await runAnalysis(parentTaskId);
    const detail = [
      `HEADLINE: ${report.headline}`,
      ``,
      `PATTERNS:`,
      ...report.patterns.map((p, i) => `${i + 1}. ${p.title} — ${p.detail}`),
      ``,
      `WINS: ${report.wins.join(" | ") || "(none)"}`,
      `MISSES: ${report.misses.join(" | ") || "(none)"}`,
      ``,
      `RECOMMENDATIONS:`,
      ...report.recommendations.map((r, i) => `${i + 1}. ${r.action} — ${r.why}`),
      ``,
      `PILLAR GUIDANCE:`,
      ...report.pillarGuidance.map((g) => `- ${g.pillar}: ${g.verdict} (${g.note})`),
    ].join("\n");
    return {
      summary: report.headline,
      detail,
    };
  }

  if (name === "request_research") {
    const topic = String(input.topic ?? "");
    const watchlist = Array.isArray(input.watchlist)
      ? (input.watchlist as string[]).filter((x) => typeof x === "string")
      : [];
    const report = await runResearch({ topic, watchlist, parentTaskId });
    const detail = [
      `SUMMARY: ${report.summary}`,
      ``,
      `FINDINGS (${report.findings.length}):`,
      ...report.findings.map(
        (f, i) =>
          `${i + 1}. [${f.type}, score ${(f.relevanceScore * 100).toFixed(0)}] ${f.title}\n   ${f.detail}${f.sourceUrl ? `\n   src: ${f.sourceUrl}` : ""}`
      ),
    ].join("\n");
    return {
      summary: `${report.findings.length} findings — ${report.summary}`,
      detail,
    };
  }

  if (name === "request_script") {
    const format = input.format === "carousel" ? "carousel" : "reel";
    const topic = String(input.topic ?? "");
    const pillarHint =
      typeof input.pillarHint === "string" && input.pillarHint.trim()
        ? input.pillarHint.trim().toLowerCase()
        : null;

    // Resolve pillar by label match if provided
    let pillarId: string | null = null;
    if (pillarHint) {
      const p = await prisma.pillar.findFirst({
        where: { label: { contains: pillarHint } },
      });
      pillarId = p?.id ?? null;
    }

    if (format === "reel") {
      const lengthSeconds = [15, 30, 60, 90].includes(Number(input.lengthSeconds))
        ? (Number(input.lengthSeconds) as 15 | 30 | 60 | 90)
        : 30;
      const hookStyle = (
        ["question", "bold_claim", "story", "stat"] as const
      ).includes(input.hookStyle as never)
        ? (input.hookStyle as "question" | "bold_claim" | "story" | "stat")
        : undefined;

      const reel = await generateReel({ topic, lengthSeconds, hookStyle });
      const beatText = reel.beats
        .map(
          (b, i) =>
            `[${i + 1}] ${b.timestamp}\nVO: ${b.voiceover}\nOST: ${b.onScreenText}\nB-roll: ${b.bRoll}`
        )
        .join("\n\n");
      const fullScript = [
        `HOOK A (${reel.hookStyle}): ${reel.hooks[0]}`,
        `HOOK B (${reel.hookStyle}): ${reel.hooks[1]}`,
        ``,
        `LENGTH: ${reel.lengthSeconds}s`,
        `AUDIO: ${reel.suggestedAudio}`,
        ``,
        beatText,
      ].join("\n");

      const item = await prisma.contentItem.create({
        data: {
          type: "reel",
          status: "scripted",
          title: reel.title,
          hook: reel.hooks[0],
          script: fullScript,
          caption: reel.caption,
          hashtags: stringifyList(reel.hashtags),
          cta: reel.cta,
          createdByAgent: "admin",
          pillarId,
        },
      });

      return {
        summary: `Reel drafted: "${reel.title}" → saved to Library (id: ${item.id})`,
        detail: [
          `Saved to Library as a draft (status: scripted).`,
          `Title: ${reel.title}`,
          `Hook A: ${reel.hooks[0]}`,
          `Hook B: ${reel.hooks[1]}`,
          `Length: ${reel.lengthSeconds}s`,
          `CTA: ${reel.cta}`,
          `Beats: ${reel.beats.length}`,
        ].join("\n"),
      };
    }

    // Carousel
    const numSlides = Math.max(3, Math.min(10, Number(input.numSlides) || 5));
    const goal = (["educate", "sell", "story", "list"] as const).includes(
      input.goal as never
    )
      ? (input.goal as "educate" | "sell" | "story" | "list")
      : "educate";

    const carousel = await generateCarousel({ topic, numSlides, goal });
    const slideText = carousel.slides
      .map((s) => `Slide ${s.slideNumber}: ${s.headline}\n${s.body}`)
      .join("\n\n");
    const fullScript = [`COVER HOOK: ${carousel.coverHook}`, ``, slideText].join("\n");

    const item = await prisma.contentItem.create({
      data: {
        type: "carousel",
        status: "scripted",
        title: carousel.title,
        hook: carousel.coverHook,
        script: fullScript,
        caption: carousel.caption,
        hashtags: stringifyList(carousel.hashtags),
        cta: carousel.cta,
        createdByAgent: "admin",
        pillarId,
      },
    });

    return {
      summary: `Carousel drafted: "${carousel.title}" → saved to Library (id: ${item.id})`,
      detail: [
        `Saved to Library as a draft.`,
        `Title: ${carousel.title}`,
        `Cover hook: ${carousel.coverHook}`,
        `Slides: ${carousel.slides.length}`,
        `CTA: ${carousel.cta}`,
      ].join("\n"),
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}
