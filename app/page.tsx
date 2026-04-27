import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  Sparkles,
  CalendarDays,
  BarChart3,
  Search,
  Bot,
  ExternalLink,
  Film,
  LayoutGrid,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TYPE_COLORS, PIPELINE_STAGES, STATUS_LABELS, type ContentType, type ContentStatus } from "@/lib/content";
import { parseList } from "@/lib/json";
import { isAIEnabled } from "@/lib/ai/client";
import {
  fetchRecentPostsWithInsights,
  computeBaseline,
  isIGEnabled,
  type PostWithInsights,
} from "@/lib/instagram";
import { analyzePost } from "@/lib/ai/post-analysis";
import { getCached, setCached } from "@/lib/ai/post-analysis-cache";
import type { PostAnalysis } from "@/lib/ai/schemas";

function startOfWeek(d = new Date()) {
  const out = new Date(d);
  const dow = out.getDay(); // Sun=0
  const diff = (dow + 6) % 7; // make Monday=0
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}
function endOfWeek(d = new Date()) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 7);
  return e;
}
function startOfDay(d = new Date()) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function endOfDay(d = new Date()) {
  const out = startOfDay(d);
  out.setDate(out.getDate() + 1);
  return out;
}

export default async function DashboardPage() {
  const aiEnabled = isAIEnabled();
  const [
    todayItems,
    weekItems,
    pipelineCounts,
    latestSnapshot,
    prevSnapshot,
    topPost,
    agentTasks,
    latestReport,
  ] = await Promise.all([
    prisma.contentItem.findMany({
      where: {
        scheduledAt: { gte: startOfDay(), lt: endOfDay() },
        status: { in: ["scheduled", "filmed", "edited"] },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { scheduledAt: { gte: startOfWeek(), lt: endOfWeek() } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.contentItem.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.followerSnapshot.findFirst({ orderBy: { capturedAt: "desc" } }),
    prisma.followerSnapshot.findFirst({
      orderBy: { capturedAt: "desc" },
      skip: 7,
    }),
    prisma.contentItem.findFirst({
      where: { status: "published" },
      include: { performance: true },
      orderBy: [{ performance: { reach: "desc" } }],
    }),
    prisma.agentTask.findMany({
      where: { parentTaskId: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.weeklyReport.findFirst({ orderBy: { weekOf: "desc" } }),
  ]);

  const coachInsights = parseList<string>(latestReport?.insights);
  const coachRecs = parseList<string>(latestReport?.recommendations);

  const childCounts = await prisma.agentTask.groupBy({
    by: ["parentTaskId"],
    where: { parentTaskId: { in: agentTasks.map((t) => t.id) } },
    _count: { parentTaskId: true },
  });
  const childCountMap = new Map(
    childCounts.map((c) => [c.parentTaskId!, c._count.parentTaskId])
  );

  const pipelineMap = new Map(pipelineCounts.map((p) => [p.status, p._count.status]));

  const followers = latestSnapshot?.followers ?? 0;
  const followersDelta = prevSnapshot
    ? followers - prevSnapshot.followers
    : 0;
  const engagement = latestSnapshot?.engagement ?? 0;

  // Best-effort: live IG top performer with cached AI analysis. Falls back
  // silently to the DB-driven topPost card if anything fails.
  let igTop: PostWithInsights | null = null;
  let igTopAnalysis: PostAnalysis | null = null;
  if (isIGEnabled()) {
    try {
      const recent = await fetchRecentPostsWithInsights(12);
      igTop = recent.length > 0
        ? [...recent].sort((a, b) => b.reach - a.reach)[0]
        : null;
      if (igTop && aiEnabled) {
        const baseline = computeBaseline(recent, igTop.id);
        const cached = getCached(igTop.id, igTop.reach);
        if (cached) {
          igTopAnalysis = cached.analysis;
        } else {
          try {
            const analysis = await analyzePost(igTop, baseline);
            setCached(igTop.id, analysis, baseline, igTop.reach);
            igTopAnalysis = analysis;
          } catch {
            // AI failed — show metrics card without diagnosis
          }
        }
      }
    } catch {
      // IG fetch failed — fall back to DB topPost
    }
  }

  const VERDICT_TONE = {
    overperformed: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
    average: "text-ink-200 border-white/[0.08] bg-white/[0.04]",
    underperformed: "text-rose-300 border-rose-400/30 bg-rose-500/10",
  } as const;
  const VERDICT_LABEL = {
    overperformed: "Overperformed",
    average: "On par",
    underperformed: "Underperformed",
  } as const;

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Today at a glance"
        description="Your content pipeline, agent outputs, and what needs your attention right now."
      >
        <Link href="/generate" className="btn-primary">
          <Sparkles className="w-4 h-4" /> Generate
        </Link>
        <Link href="/calendar" className="btn-secondary">
          <CalendarDays className="w-4 h-4" /> Calendar
        </Link>
      </PageHeader>

      {/* Stat row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Followers"
          value={followers.toLocaleString()}
          delta={followersDelta >= 0 ? `+${followersDelta}` : `${followersDelta}`}
          deltaTone={followersDelta >= 0 ? "pos" : "neg"}
          sub="vs. 7 days ago"
        />
        <StatCard
          label="Engagement"
          value={`${engagement.toFixed(1)}%`}
          sub="7-day avg"
        />
        <StatCard
          label="Scheduled"
          value={pipelineMap.get("scheduled") ?? 0}
          sub="on the calendar"
        />
        <StatCard
          label="In Pipeline"
          value={
            (pipelineMap.get("idea") ?? 0) +
            (pipelineMap.get("scripted") ?? 0) +
            (pipelineMap.get("filmed") ?? 0) +
            (pipelineMap.get("edited") ?? 0)
          }
          sub="ideas → edited"
        />
      </section>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Today's action items */}
        <section className="surface md:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="editorial-heading text-xl">Today's action items</h2>
            <span className="chip">{todayItems.length} due</span>
          </div>
          {todayItems.length === 0 ? (
            <div className="text-sm text-ink-400 py-6 text-center">
              Nothing scheduled for today. Enjoy the breathing room — or{" "}
              <Link href="/generate" className="underline hover:text-ink-100">
                draft something
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {todayItems.map((item) => {
                const color = TYPE_COLORS[item.type as ContentType];
                return (
                  <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Circle className="w-4 h-4 text-ink-400 shrink-0" />
                    <span
                      className={`text-[10px] uppercase tracking-[0.14em] border rounded px-1.5 py-0.5 ${color.bg} ${color.text}`}
                    >
                      {color.label}
                    </span>
                    <span className="text-sm text-ink-100 flex-1 truncate">{item.title}</span>
                    <span className="text-xs text-ink-400 tabular-nums">
                      {item.scheduledAt
                        ? new Date(item.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Agent feed */}
        <section className="surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="editorial-heading text-xl">Agent activity</h2>
            <Bot className="w-4 h-4 text-ink-400" />
          </div>
          {agentTasks.length === 0 ? (
            <div className="text-sm text-ink-400 py-4">
              No agent activity yet. Delegate from the{" "}
              <Link href="/agents/admin" className="underline hover:text-ink-100">
                Admin chat
              </Link>
              .
            </div>
          ) : (
            <ul className="space-y-3">
              {agentTasks.map((t) => {
                const childCount = childCountMap.get(t.id) ?? 0;
                return (
                  <li key={t.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="eyebrow">{t.agent}</span>
                      {childCount > 0 ? (
                        <span className="chip text-[10px] text-ink-400 border-white/[0.08]">
                          +{childCount} child {childCount === 1 ? "task" : "tasks"}
                        </span>
                      ) : null}
                      <span className="text-[10px] text-ink-500 ml-auto">
                        {new Date(t.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-ink-200 mt-0.5 line-clamp-2">
                      {t.output || t.input}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Pipeline */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="editorial-heading text-xl">This week's pipeline</h2>
          <Link href="/library" className="btn-ghost text-sm">
            View library →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const count = pipelineMap.get(stage) ?? 0;
            return (
              <div key={stage} className="surface-2 px-4 py-3">
                <div className="eyebrow">{STATUS_LABELS[stage]}</div>
                <div className="text-2xl font-semibold tabular-nums mt-1.5">{count}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top post & quick actions */}
      <section className="grid md:grid-cols-2 gap-6">
        {igTop ? (
          <div className="surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="eyebrow">Top post (last 12)</div>
              <span className="chip text-emerald-300 border-emerald-400/30 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live IG
              </span>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-md bg-white/[0.04] border border-white/[0.06]">
                {igTop.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={igTop.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-500">
                    {igTop.mediaType === "CAROUSEL_ALBUM" ? (
                      <LayoutGrid className="w-6 h-6" />
                    ) : (
                      <Film className="w-6 h-6" />
                    )}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="eyebrow">
                    {igTop.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : "Reel"}
                  </span>
                  <span className="text-[10px] text-ink-500">
                    {new Date(igTop.timestamp).toLocaleDateString()}
                  </span>
                  <a
                    href={igTop.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-ink-400 hover:text-ink-100"
                    title="Open on Instagram"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-sm text-ink-100 mt-1 line-clamp-2 leading-snug">
                  {igTop.caption.split("\n")[0] || (
                    <span className="text-ink-500 italic">No caption</span>
                  )}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <div className="eyebrow">Reach</div>
                <div className="text-lg tabular-nums mt-1">
                  {igTop.reach.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="eyebrow">Saves</div>
                <div className="text-lg tabular-nums mt-1">
                  {igTop.saved.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="eyebrow">Shares</div>
                <div className="text-lg tabular-nums mt-1">
                  {igTop.shares.toLocaleString()}
                </div>
              </div>
            </div>
            {igTopAnalysis ? (
              <div className="border-t border-white/[0.05] pt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`chip text-[10px] uppercase tracking-[0.14em] ${
                      VERDICT_TONE[igTopAnalysis.verdict]
                    }`}
                  >
                    {VERDICT_LABEL[igTopAnalysis.verdict]}
                  </span>
                  <span className="text-xs text-ink-400">
                    {igTopAnalysis.reachVsBaseline.toFixed(2)}× baseline reach
                  </span>
                </div>
                <p className="text-sm text-ink-100 leading-snug">
                  {igTopAnalysis.headline}
                </p>
                <div>
                  <div className="eyebrow mb-1.5">Why it worked</div>
                  <ul className="space-y-1.5">
                    {igTopAnalysis.drivers.slice(0, 3).map((d, i) => (
                      <li key={i} className="text-xs text-ink-300 leading-snug">
                        <span className="text-ink-100 font-medium capitalize">
                          {d.factor}:
                        </span>{" "}
                        {d.observation}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/analytics"
                  className="text-[10px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-100"
                >
                  See all posts →
                </Link>
              </div>
            ) : (
              <div className="border-t border-white/[0.05] pt-3 text-xs text-ink-400 italic">
                {aiEnabled
                  ? "Diagnosis loading on next refresh…"
                  : "Add an Anthropic API key in Settings to see why this post performed."}
              </div>
            )}
          </div>
        ) : (
          <div className="surface p-5">
            <div className="eyebrow mb-2">Top post of the week</div>
            {topPost ? (
              <>
                <div className="editorial-heading text-xl mb-1">{topPost.title}</div>
                <div className="text-sm text-ink-400 mb-4">
                  {STATUS_LABELS[topPost.status as ContentStatus]} • {TYPE_COLORS[topPost.type as ContentType].label}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="eyebrow">Reach</div>
                    <div className="text-lg tabular-nums mt-1">
                      {(topPost.performance?.reach ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Saves</div>
                    <div className="text-lg tabular-nums mt-1">
                      {(topPost.performance?.saves ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Shares</div>
                    <div className="text-lg tabular-nums mt-1">
                      {(topPost.performance?.shares ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-ink-400 py-4">
                Publish your first post to see performance here.
              </div>
            )}
          </div>
        )}

        <div className="surface p-5">
          <div className="eyebrow mb-3">Quick actions</div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/generate?mode=reel" className="btn-secondary justify-center py-3">
              <Sparkles className="w-4 h-4" /> Reel Script
            </Link>
            <Link href="/generate?mode=carousel" className="btn-secondary justify-center py-3">
              <Sparkles className="w-4 h-4" /> Carousel
            </Link>
            <Link href="/agents/researcher" className="btn-secondary justify-center py-3">
              <Search className="w-4 h-4" /> Run Research
            </Link>
            <Link href="/analytics" className="btn-secondary justify-center py-3">
              <TrendingUp className="w-4 h-4" /> Analytics
            </Link>
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 mb-2">
              <div className="eyebrow">Coach notes</div>
              <Link href="/agents/analysis" className="ml-auto text-[10px] uppercase tracking-[0.14em] text-ink-400 hover:text-ink-100">
                Open Analysis →
              </Link>
            </div>
            {latestReport && coachInsights[0] ? (
              <>
                <p className="text-sm text-ink-100 font-medium mb-2 leading-snug">
                  {coachInsights[0]}
                </p>
                {coachRecs.slice(0, 3).length > 0 ? (
                  <ul className="text-xs text-ink-300 space-y-1 list-disc list-inside">
                    {coachRecs.slice(0, 3).map((rec) => (
                      <li key={rec} className="line-clamp-1">{rec}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500 mt-3">
                  Week of {latestReport.weekOf.toLocaleDateString()}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-300 italic">
                {aiEnabled
                  ? "No report yet — run Analysis to generate this week's coach notes."
                  : "Add an Anthropic API key in Settings to unlock personalized coach notes."}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
