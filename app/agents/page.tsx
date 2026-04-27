import Link from "next/link";
import { Bot, Compass, PenLine, Activity } from "lucide-react";
import { prisma } from "@/lib/db";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";

const AGENTS = [
  {
    slug: "admin",
    name: "Admin",
    role: "Chief of Staff",
    icon: Bot,
    blurb:
      "Orchestrates the other three. Manages the calendar, delegates tasks, and tells you what to do next.",
    href: "/agents/admin",
    phase: 2,
    ctaLabel: "Open chat",
  },
  {
    slug: "scripter",
    name: "Scripter",
    role: "Creative",
    icon: PenLine,
    blurb:
      "Writes Reel scripts, carousel copy, captions, and hooks based on ideas from Research or topics you provide.",
    href: "/generate",
    phase: 2,
    ctaLabel: "Open studio",
  },
  {
    slug: "researcher",
    name: "Researcher",
    role: "Trend Scout",
    icon: Compass,
    blurb:
      "Finds trends, competitor insights, trending audios, and hashtags relevant to your niche. Web-search enabled.",
    href: "/agents/researcher",
    phase: 3,
    ctaLabel: "Run research",
  },
  {
    slug: "analysis",
    name: "Analysis",
    role: "Data Coach",
    icon: Activity,
    blurb:
      "Analyzes performance data and tells you what's working, what isn't, and what to do about it next week.",
    href: "/agents/analysis",
    phase: 3,
    ctaLabel: "Open report",
  },
] as const;

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

export default async function AgentsPage() {
  const aiEnabled = isAIEnabled();
  const taskCounts = await prisma.agentTask.groupBy({
    by: ["agent"],
    where: { createdAt: { gte: weekStart() } },
    _count: { agent: true },
  });
  const counts = new Map(taskCounts.map((t) => [t.agent, t._count.agent]));

  return (
    <>
      <PageHeader
        eyebrow="Agents"
        title="Your four-person marketing team"
        description="Each agent has its own system prompt, memory, and UI. They collaborate via the orchestration queue."
      >
        <span
          className={`chip ${
            aiEnabled
              ? "text-emerald-300 border-emerald-400/30"
              : "text-amber-300 border-amber-400/30"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              aiEnabled ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          {aiEnabled ? "API key active" : "No API key"}
        </span>
      </PageHeader>

      <div className="grid md:grid-cols-2 gap-4">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          const isLive = aiEnabled;
          const isLockedByPhase = false;
          const isLockedByKey = !aiEnabled;
          const count = counts.get(a.slug) ?? 0;
          return (
            <div key={a.slug} className="surface p-6 flex flex-col">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-ig-gradient flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="eyebrow">{a.role}</div>
                    {isLive ? (
                      <span className="chip text-emerald-300 border-emerald-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Online
                      </span>
                    ) : isLockedByKey ? (
                      <span className="chip text-amber-300 border-amber-400/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Needs API key
                      </span>
                    ) : (
                      <span className="chip text-ink-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-ink-500" />
                        Phase {a.phase}
                      </span>
                    )}
                  </div>
                  <h2 className="editorial-heading text-2xl mt-0.5">{a.name}</h2>
                  <p className="text-sm text-ink-300 mt-2">{a.blurb}</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center gap-2">
                <Link
                  href={a.href}
                  className={isLockedByPhase ? "btn-secondary" : "btn-primary"}
                >
                  {a.ctaLabel}
                </Link>
                <span className="chip text-ink-400 ml-auto">
                  {count} {count === 1 ? "task" : "tasks"} this week
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
