import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { FollowerChart } from "./follower-chart";
import { isIGEnabled, fetchRecentPostsWithInsights, type PostWithInsights } from "@/lib/instagram";
import { isAIEnabled } from "@/lib/ai/client";
import { RecentPosts } from "./recent-posts";

export default async function AnalyticsPage() {
  const igConnected = isIGEnabled();
  const aiEnabled = isAIEnabled();

  let recentPosts: PostWithInsights[] = [];
  let recentPostsError: string | null = null;
  if (igConnected) {
    try {
      recentPosts = await fetchRecentPostsWithInsights(12);
    } catch (err) {
      recentPostsError = err instanceof Error ? err.message : "Could not load recent posts.";
    }
  }
  const [snapshots, topPosts, allPosts] = await Promise.all([
    prisma.followerSnapshot.findMany({
      orderBy: { capturedAt: "asc" },
      take: 90,
    }),
    prisma.contentItem.findMany({
      where: { status: "published" },
      include: { performance: true, pillar: true },
      orderBy: [{ performance: { reach: "desc" } }],
      take: 10,
    }),
    prisma.contentItem.findMany({
      where: { status: "published" },
      include: { performance: true, pillar: true },
    }),
  ]);

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 8]; // 7 days back
  const followers = latest?.followers ?? 0;
  const delta = prev ? followers - prev.followers : 0;

  const avgEng =
    snapshots.length > 0
      ? snapshots.reduce((s, x) => s + x.engagement, 0) / snapshots.length
      : 0;

  const pillarBreakdown = new Map<string, number>();
  for (const p of allPosts) {
    const key = p.pillar?.label ?? "Unassigned";
    pillarBreakdown.set(key, (pillarBreakdown.get(key) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="What's working, what isn't"
        description={
          igConnected
            ? "Live Instagram Graph API. Hit Sync in Settings to pull a fresh snapshot."
            : "Driven by Instagram Graph API once wired. Currently using seeded mock data."
        }
      >
        <span
          className={`chip ${
            igConnected ? "text-emerald-300 border-emerald-400/30" : ""
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              igConnected ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          {igConnected ? "Live IG data" : "Mock data"}
        </span>
      </PageHeader>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Followers"
          value={followers.toLocaleString()}
          delta={delta >= 0 ? `+${delta}` : `${delta}`}
          deltaTone={delta >= 0 ? "pos" : "neg"}
          sub="vs. 7d ago"
        />
        <StatCard
          label="Avg engagement"
          value={`${avgEng.toFixed(1)}%`}
          sub="90-day rolling"
        />
        <StatCard
          label="Published"
          value={allPosts.length}
          sub="lifetime"
        />
        <StatCard
          label="Pillars active"
          value={pillarBreakdown.size}
          sub={Array.from(pillarBreakdown.keys()).slice(0, 2).join(", ")}
        />
      </section>

      <section className="surface p-6 mb-8">
        <div className="eyebrow mb-2">Follower growth</div>
        <FollowerChart
          data={snapshots.map((s) => ({
            date: s.capturedAt.toISOString(),
            followers: s.followers,
          }))}
        />
      </section>

      {igConnected ? (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="editorial-heading text-2xl">Latest reels & carousels</h2>
              <p className="text-sm text-ink-400 mt-0.5">
                {aiEnabled
                  ? "Click Analyze on any post — Claude diagnoses why it over- or underperformed against your own baseline."
                  : "Add an Anthropic API key in Settings to unlock per-post analysis."}
              </p>
            </div>
            <span className="chip text-emerald-300 border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live from IG
            </span>
          </div>
          {recentPostsError ? (
            <div className="surface p-4 text-sm text-rose-300 break-words">
              {recentPostsError}
            </div>
          ) : (
            <RecentPosts posts={recentPosts} />
          )}
        </section>
      ) : null}

      <section className="surface p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="editorial-heading text-2xl">Top posts by reach</h2>
          <BarChart3 className="w-4 h-4 text-ink-400" />
        </div>
        {topPosts.length === 0 ? (
          <div className="text-sm text-ink-400 py-4">
            Nothing published yet. Seed data or connect Instagram Graph API.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {topPosts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 py-3 first:pt-0">
                <span className="eyebrow tabular-nums w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-ink-100 truncate">{p.title}</div>
                  <div className="text-xs text-ink-400">
                    {p.pillar?.label ?? "Unassigned"} • {p.type}
                  </div>
                </div>
                <div className="flex gap-6 text-sm tabular-nums">
                  <div>
                    <div className="eyebrow">Reach</div>
                    <div>{(p.performance?.reach ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="eyebrow">Saves</div>
                    <div>{(p.performance?.saves ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="eyebrow">Shares</div>
                    <div>{(p.performance?.shares ?? 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
