import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_MODEL, getAnthropic } from "./client";
import { POST_ANALYSIS_SYSTEM } from "./prompts";
import { loadStrategyContext, renderStrategyContext } from "./context";
import { PostAnalysisSchema, type PostAnalysis } from "./schemas";
import type { PostWithInsights, PostBaseline } from "@/lib/instagram";

export async function analyzePost(
  post: PostWithInsights,
  baseline: PostBaseline
): Promise<PostAnalysis> {
  const client = getAnthropic();
  const ctx = renderStrategyContext(await loadStrategyContext());

  const payload = {
    post: {
      mediaType: post.mediaType,
      caption: post.caption,
      permalink: post.permalink,
      publishedAt: post.timestamp,
      metrics: {
        reach: post.reach,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        saved: post.saved,
        shares: post.shares,
        totalInteractions: post.totalInteractions,
      },
    },
    baseline,
  };

  const instruction = [
    `Diagnose why this single Instagram post performed the way it did, benchmarked against the user's own recent ${baseline.postsCounted} posts.`,
    ``,
    `\`\`\`json`,
    JSON.stringify(payload, null, 2),
    `\`\`\``,
    ``,
    `Calculate reachVsBaseline as post.reach / baseline.avgReach (use 1.0 if baseline is 0). Pick a verdict: "overperformed" if multiplier ≥ 1.2, "underperformed" if ≤ 0.8, otherwise "average". Drivers should reference what the user actually wrote in the caption hook when relevant.`,
  ].join("\n");

  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 1500,
    system: [
      { type: "text", text: POST_ANALYSIS_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: ctx },
    ],
    messages: [{ role: "user", content: instruction }],
    output_config: { format: zodOutputFormat(PostAnalysisSchema) },
  });

  const out = response.parsed_output;
  if (!out) throw new Error("Post analysis returned malformed output.");
  return out;
}
