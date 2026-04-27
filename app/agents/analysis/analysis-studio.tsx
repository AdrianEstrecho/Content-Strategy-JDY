"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  Play,
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { runAnalyst } from "@/app/actions/analysis";
import type { AnalysisReport } from "@/lib/ai/schemas";

type PastReport = {
  id: string;
  weekOf: string;
  insights: string[];
  recommendations: string[];
};

export function AnalysisStudio({
  aiEnabled,
  publishedCount,
  pastReports,
}: {
  aiEnabled: boolean;
  publishedCount: number;
  pastReports: PastReport[];
}) {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await runAnalyst();
        setReport(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run analysis");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Run panel */}
      <section className="surface p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-ig-gradient flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="editorial-heading text-2xl">This week's coach notes</div>
            <p className="text-sm text-ink-300 mt-1">
              {publishedCount > 0
                ? `Reading ${publishedCount} published posts and benchmarking you against your own history.`
                : `No published posts yet. Publish or seed data so Analysis has something to read.`}
            </p>
          </div>
          <button
            onClick={run}
            disabled={!aiEnabled || pending || publishedCount === 0}
            className="btn-primary shrink-0"
          >
            {pending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Reading…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run Analysis
              </>
            )}
          </button>
        </div>
        {!aiEnabled ? (
          <p className="text-xs text-amber-300 mt-3">
            Add an Anthropic API key in Settings to activate Analysis.
          </p>
        ) : null}
        {error ? <p className="text-xs text-rose-300 mt-3">{error}</p> : null}
      </section>

      {/* Latest report */}
      {report ? <ReportView report={report} /> : null}

      {/* Past reports */}
      <section>
        <div className="eyebrow mb-3">Past weekly reports</div>
        {pastReports.length === 0 ? (
          <div className="surface p-6 text-sm text-ink-400 italic">
            No past reports yet. Run your first analysis above.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {pastReports.map((r) => (
              <div key={r.id} className="surface-2 p-4">
                <div className="eyebrow mb-1">
                  Week of{" "}
                  {new Date(r.weekOf).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                {r.insights[0] ? (
                  <div className="text-sm text-ink-100 font-medium line-clamp-2 mb-2">
                    {r.insights[0]}
                  </div>
                ) : null}
                <ul className="text-xs text-ink-400 space-y-1 list-disc list-inside">
                  {r.recommendations.slice(0, 2).map((rec) => (
                    <li key={rec} className="line-clamp-1">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReportView({ report }: { report: AnalysisReport }) {
  return (
    <section className="space-y-6">
      <div className="surface p-6">
        <div className="eyebrow mb-2">Headline</div>
        <p className="editorial-heading text-2xl leading-snug">{report.headline}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-300" />
            <h3 className="editorial-heading text-xl">Wins</h3>
          </div>
          {report.wins.length === 0 ? (
            <p className="text-sm text-ink-400 italic">No standout wins this week.</p>
          ) : (
            <ul className="space-y-2 text-sm text-ink-100">
              {report.wins.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-emerald-300">•</span>
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-rose-300" />
            <h3 className="editorial-heading text-xl">Misses</h3>
          </div>
          {report.misses.length === 0 ? (
            <p className="text-sm text-ink-400 italic">Nothing flagged as underperforming.</p>
          ) : (
            <ul className="space-y-2 text-sm text-ink-100">
              {report.misses.map((m) => (
                <li key={m} className="flex gap-2">
                  <span className="text-rose-300">•</span>
                  {m}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="surface p-6">
        <h3 className="editorial-heading text-xl mb-4">Patterns</h3>
        <div className="space-y-4">
          {report.patterns.map((p, i) => (
            <div key={i} className="surface-2 p-4">
              <div className="text-ink-50 font-medium mb-1">{p.title}</div>
              <p className="text-sm text-ink-300">{p.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface p-6">
        <h3 className="editorial-heading text-xl mb-4">Do next week</h3>
        <div className="space-y-3">
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex gap-3">
              <span className="eyebrow shrink-0 mt-0.5 w-6 tabular-nums">#{i + 1}</span>
              <div>
                <div className="text-ink-100 font-medium">{r.action}</div>
                <div className="text-xs text-ink-400 mt-0.5 italic">{r.why}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {report.pillarGuidance.length > 0 ? (
        <div className="surface p-6">
          <h3 className="editorial-heading text-xl mb-4">Per-pillar guidance</h3>
          <div className="divide-y divide-white/[0.05]">
            {report.pillarGuidance.map((g, i) => {
              const Icon =
                g.verdict === "double_down"
                  ? ArrowUpCircle
                  : g.verdict === "reduce"
                  ? ArrowDownCircle
                  : MinusCircle;
              const color =
                g.verdict === "double_down"
                  ? "text-emerald-300"
                  : g.verdict === "reduce"
                  ? "text-rose-300"
                  : "text-ink-300";
              const label =
                g.verdict === "double_down"
                  ? "Double down"
                  : g.verdict === "reduce"
                  ? "Reduce"
                  : "Steady";
              return (
                <div key={i} className="py-3 flex items-start gap-3">
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-ink-50 font-medium">{g.pillar}</span>
                      <span className={`chip ${color} border-current/30`}>{label}</span>
                    </div>
                    <p className="text-sm text-ink-300 mt-1">{g.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
