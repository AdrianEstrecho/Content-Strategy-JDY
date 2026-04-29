import { z } from "zod";

export const ReelBeatSchema = z.object({
  timestamp: z.string().describe("approx timestamp e.g. 0:00-0:03"),
  voiceover: z.string().describe("what the creator says on camera / voiceover"),
  onScreenText: z.string().describe("shorter anchor text for sound-off viewers"),
  bRoll: z.string().describe("visual idea — what the camera shows"),
});

export const ReelScriptSchema = z.object({
  title: z.string().describe("working title for the Reel"),
  hook: z.string().describe("first-3-second hook — the opening voiceover line"),
  hookStyle: z.enum(["question", "bold_claim", "story", "stat"]),
  lengthSeconds: z.number().int(),
  beats: z.array(ReelBeatSchema).min(2),
  caption: z.string().describe("full caption for the post"),
  hashtags: z.array(z.string()).min(10).max(30),
  cta: z.string().describe("specific call-to-action at end of the Reel"),
  suggestedAudio: z.string().describe("audio/music vibe suggestion — genre or energy, not a specific track"),
});

export const CarouselSlideSchema = z.object({
  slideNumber: z.number().int(),
  headline: z.string(),
  body: z.string().describe("1-2 short lines of supporting copy"),
});

export const CarouselSchema = z.object({
  title: z.string(),
  coverHook: z.string().describe("slide 1 hook, max 10 words"),
  slides: z.array(CarouselSlideSchema).min(3).max(10),
  caption: z.string(),
  hashtags: z.array(z.string()).min(10).max(30),
  cta: z.string(),
});

export type ReelScript = z.infer<typeof ReelScriptSchema>;
export type Carousel = z.infer<typeof CarouselSchema>;

export const FindingTypeSchema = z.enum([
  "trend",
  "competitor",
  "audio",
  "hashtag",
  "idea",
]);

export const ResearchFindingSchema = z.object({
  type: FindingTypeSchema,
  title: z.string().describe("short punchy title — what the user should take away in one line"),
  detail: z.string().describe("2-3 sentence body. What it is, why it matters, how to use it."),
  sourceUrl: z.string().optional().describe("empty string if no confident source"),
  relevanceScore: z.number().min(0).max(1),
  tags: z.array(z.string()).max(5).describe("pillar names or themes this fits"),
});

export const ResearchReportSchema = z.object({
  summary: z.string().describe("2-3 sentence headline summary of what you found"),
  findings: z.array(ResearchFindingSchema).min(1).max(10),
});

export type ResearchReport = z.infer<typeof ResearchReportSchema>;
export type ResearchFinding = z.infer<typeof ResearchFindingSchema>;

export const AnalysisReportSchema = z.object({
  headline: z.string().describe("one sentence — the single most important takeaway this week"),
  patterns: z
    .array(
      z.object({
        title: z.string().describe("short label for the pattern"),
        detail: z.string().describe("what you observed, grounded in specific post titles"),
      })
    )
    .min(1)
    .max(5),
  wins: z.array(z.string()).describe("specific post titles that overperformed — empty array if none"),
  misses: z
    .array(z.string())
    .describe("specific post titles that underperformed — empty array if none"),
  recommendations: z
    .array(
      z.object({
        action: z.string().describe("concrete thing to do next week"),
        why: z.string().describe("one sentence linking this to an observed pattern"),
      })
    )
    .min(2)
    .max(5),
  pillarGuidance: z
    .array(
      z.object({
        pillar: z.string(),
        verdict: z.enum(["double_down", "steady", "reduce"]),
        note: z.string(),
      })
    )
    .describe("one row per pillar you have data on"),
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;

export const PostAnalysisSchema = z.object({
  verdict: z
    .enum(["overperformed", "average", "underperformed"])
    .describe("how this post performed against the user's own recent baseline"),
  reachVsBaseline: z
    .number()
    .describe("multiplier: 1.0 = matches baseline, 2.0 = double, 0.5 = half"),
  headline: z
    .string()
    .describe("one sentence diagnosis the user can read at a glance"),
  drivers: z
    .array(
      z.object({
        factor: z
          .enum(["hook", "caption", "format", "topic", "cta", "timing", "hashtags", "thumbnail", "audio", "length"])
          .describe("which lever moved the result"),
        observation: z.string().describe("what specifically about this factor helped or hurt"),
      })
    )
    .min(2)
    .max(5),
  recommendations: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe("concrete things to change or repeat next time"),
});

export type PostAnalysis = z.infer<typeof PostAnalysisSchema>;

export const KnowledgeSourceSchema = z.enum([
  "transcript",
  "note",
  "article",
  "idea",
  "other",
]);

export const ContentAngleSchema = z.object({
  format: z
    .enum(["reel", "carousel", "story", "post"])
    .describe("which IG format best fits this angle"),
  hook: z.string().describe("first-line hook the user could open the post with — under 15 words"),
  angle: z.string().describe("one sentence describing the take or framing"),
  pillarHint: z
    .string()
    .describe("which existing pillar this likely fits (or empty if unclear)"),
});

export const KnowledgeExtractionSchema = z.object({
  title: z
    .string()
    .describe("a 4-8 word title that captures the source — used if the user did not provide one"),
  summary: z
    .string()
    .describe("2-4 sentence plain-language summary of the source"),
  keyIdeas: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe("the most important takeaways, each one short and concrete"),
  contentAngles: z
    .array(ContentAngleSchema)
    .min(2)
    .max(6)
    .describe("specific IG content the user could create from this material"),
  tags: z
    .array(z.string())
    .min(1)
    .max(8)
    .describe("topic tags — kebab-case or single words"),
});

export type KnowledgeExtraction = z.infer<typeof KnowledgeExtractionSchema>;
export type ContentAngle = z.infer<typeof ContentAngleSchema>;
