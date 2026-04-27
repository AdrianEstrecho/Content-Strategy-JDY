import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { prisma } from "@/lib/db";
import { AI_MODEL, getAnthropic } from "./client";
import { ANALYSIS_SYSTEM } from "./prompts";
import { loadStrategyContext, renderStrategyContext } from "./context";
import { AnalysisReportSchema, type AnalysisReport } from "./schemas";

function weekStart(d = new Date()) {
  const out = new Date(d);
  const dow = out.getDay();
  const diff = (dow + 6) % 7; // Monday
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

type PostStat = {
  id: string;
  title: string;
  type: string;
  hook: string;
  pillar: string;
  reach: number;
  saves: number;
  shares: number;
  likes: number;
  comments: number;
  engagement: number; // (likes+saves+shares+comments) / reach
  publishedAt: string;
};

export async function computeStats() {
  const posts = await prisma.contentItem.findMany({
    where: { status: "published" },
    include: { performance: true, pillar: true },
    orderBy: { publishedAt: "desc" },
  });

  const stats: PostStat[] = posts.map((p) => {
    const perf = p.performance;
    const reach = perf?.reach ?? 0;
    const interactions =
      (perf?.likes ?? 0) +
      (perf?.saves ?? 0) +
      (perf?.shares ?? 0) +
      (perf?.comments ?? 0);
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      hook: p.hook,
      pillar: p.pillar?.label ?? "Unassigned",
      reach,
      saves: perf?.saves ?? 0,
      shares: perf?.shares ?? 0,
      likes: perf?.likes ?? 0,
      comments: perf?.comments ?? 0,
      engagement: reach > 0 ? interactions / reach : 0,
      publishedAt: p.publishedAt?.toISOString() ?? "",
    };
  });

  // Averages to benchmark against self
  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;

  const benchmarks = {
    avgReach: avg(stats.map((s) => s.reach)),
    avgSaves: avg(stats.map((s) => s.saves)),
    avgShares: avg(stats.map((s) => s.shares)),
    avgEngagement: avg(stats.map((s) => s.engagement)),
  };

  // Top + bottom posts by engagement
  const byEng = [...stats].sort((a, b) => b.engagement - a.engagement);
  const top = byEng.slice(0, 5);
  const bottom = byEng.slice(-3).reverse();

  // Pillar rollup
  const pillarMap = new Map<string, { count: number; totalReach: number; totalSaves: number; totalEngagement: number }>();
  for (const s of stats) {
    const cur = pillarMap.get(s.pillar) ?? {
      count: 0,
      totalReach: 0,
      totalSaves: 0,
      totalEngagement: 0,
    };
    cur.count += 1;
    cur.totalReach += s.reach;
    cur.totalSaves += s.saves;
    cur.totalEngagement += s.engagement;
    pillarMap.set(s.pillar, cur);
  }
  const pillarRollup = Array.from(pillarMap.entries()).map(([pillar, v]) => ({
    pillar,
    posts: v.count,
    avgReach: v.totalReach / v.count,
    avgSaves: v.totalSaves / v.count,
    avgEngagement: v.totalEngagement / v.count,
  }));

  // Type rollup
  const typeMap = new Map<string, { count: number; totalEngagement: number }>();
  for (const s of stats) {
    const cur = typeMap.get(s.type) ?? { count: 0, totalEngagement: 0 };
    cur.count += 1;
    cur.totalEngagement += s.engagement;
    typeMap.set(s.type, cur);
  }
  const typeRollup = Array.from(typeMap.entries()).map(([type, v]) => ({
    type,
    posts: v.count,
    avgEngagement: v.totalEngagement / v.count,
  }));

  return {
    totalPosts: stats.length,
    benchmarks,
    top,
    bottom,
    pillarRollup,
    typeRollup,
  };
}

export async function runAnalysis(parentTaskId?: string): Promise<AnalysisReport> {
  const client = getAnthropic();
  const ctx = renderStrategyContext(await loadStrategyContext());
  const stats = await computeStats();

  const task = await prisma.agentTask.create({
    data: {
      agent: "analysis",
      input: "Weekly report",
      status: "running",
      startedAt: new Date(),
      parentTaskId: parentTaskId ?? null,
    },
  });

  if (stats.totalPosts === 0) {
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "rejected",
        output: "No published content yet — nothing to analyze.",
        completedAt: new Date(),
      },
    });
    throw new Error(
      "No published content yet. Publish a few pieces (or seed demo data) so Analysis has something to read."
    );
  }

  try {
    const instruction = [
      `Here are the user's actual performance stats for all published content. Benchmark them against themselves — these averages ARE the benchmark.`,
      ``,
      `\`\`\`json`,
      JSON.stringify(stats, null, 2),
      `\`\`\``,
      ``,
      `Write the weekly report as a JSON object matching the provided schema. Be specific — reference post titles in wins/misses. Recommendations must tie to observed patterns in this data, not generic advice.`,
    ].join("\n");

    const response = await client.messages.parse({
      model: AI_MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: ANALYSIS_SYSTEM,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: ctx },
      ],
      messages: [{ role: "user", content: instruction }],
      output_config: { format: zodOutputFormat(AnalysisReportSchema) },
    });

    const report = response.parsed_output;
    if (!report) {
      throw new Error("Analysis returned malformed output.");
    }

    // Persist the report
    await prisma.weeklyReport.create({
      data: {
        weekOf: weekStart(),
        insights: JSON.stringify([report.headline, ...report.patterns.map((p) => p.title)]),
        recommendations: JSON.stringify(report.recommendations.map((r) => r.action)),
        metricsSnapshot: JSON.stringify(stats.benchmarks),
      },
    });

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "done",
        output: report.headline.slice(0, 500),
        completedAt: new Date(),
      },
    });

    return report;
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
