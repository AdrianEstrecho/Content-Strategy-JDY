"use client";

import { useState, useTransition } from "react";
import {
  Compass,
  ExternalLink,
  Filter,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { runResearcher } from "@/app/actions/research";

const TYPE_META: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  trend: { label: "Trend", bg: "bg-purple-500/10 border-purple-400/30", text: "text-purple-200" },
  competitor: { label: "Competitor", bg: "bg-sky-500/10 border-sky-400/30", text: "text-sky-200" },
  audio: { label: "Audio", bg: "bg-amber-500/10 border-amber-400/30", text: "text-amber-200" },
  hashtag: { label: "Hashtag", bg: "bg-emerald-500/10 border-emerald-400/30", text: "text-emerald-200" },
  idea: { label: "Idea", bg: "bg-rose-500/10 border-rose-400/30", text: "text-rose-200" },
};

type Finding = {
  id: string;
  type: string;
  content: string;
  sourceUrl: string | null;
  relevanceScore: number;
  tags: string[];
  createdAt: string;
};

export function ResearcherStudio({
  aiEnabled,
  findings: initial,
}: {
  aiEnabled: boolean;
  findings: Finding[];
}) {
  const [topic, setTopic] = useState("");
  const [watchlist, setWatchlist] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [findings, setFindings] = useState<Finding[]>(initial);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const report = await runResearcher({
          topic: topic.trim() || undefined,
          watchlist: watchlist
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
        });
        setSummary(report.summary);
        // Map report findings onto the same shape as DB rows for instant render
        const fresh: Finding[] = report.findings.map((f, i) => ({
          id: `new-${Date.now()}-${i}`,
          type: f.type,
          content: `${f.title}\n\n${f.detail}`,
          sourceUrl: f.sourceUrl?.trim() || null,
          relevanceScore: f.relevanceScore,
          tags: f.tags,
          createdAt: new Date().toISOString(),
        }));
        setFindings([...fresh, ...findings]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to run research");
      }
    });
  }

  const filtered = typeFilter
    ? findings.filter((f) => f.type === typeFilter)
    : findings;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <section className="surface p-6 lg:col-span-2 h-fit lg:sticky lg:top-24">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-5 h-5 text-ink-300" />
          <h2 className="editorial-heading text-xl">Run a scan</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Topic (optional)</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="e.g. first-time buyer objections this spring, or leave blank for a broad weekly scan"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Competitor watchlist (comma or newline separated)</label>
            <textarea
              className="input min-h-[60px]"
              placeholder="e.g. @some_agent, @realestate_guru"
              value={watchlist}
              onChange={(e) => setWatchlist(e.target.value)}
            />
          </div>
          <button
            onClick={run}
            disabled={!aiEnabled || pending}
            className="btn-primary w-full justify-center"
          >
            {pending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Searching…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Run Research
              </>
            )}
          </button>
          {!aiEnabled ? (
            <p className="text-xs text-amber-300">
              Add an Anthropic API key in Settings to activate web search.
            </p>
          ) : null}
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          {summary ? (
            <div className="surface-2 p-3 text-sm text-ink-200">
              <div className="eyebrow mb-1">Latest run</div>
              {summary}
            </div>
          ) : null}
        </div>

        <div className="mt-6 pt-5 border-t border-white/[0.05]">
          <div className="eyebrow mb-2">How this works</div>
          <p className="text-xs text-ink-400 leading-relaxed">
            The Researcher runs 2–4 focused web searches on your niche, scores each finding for
            relevance to your pillars, and saves them here. Drop high-scoring ideas straight into
            the Script Generator.
          </p>
        </div>
      </section>

      <section className="lg:col-span-3 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="editorial-heading text-xl">Findings feed</h2>
          <div className="ml-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-400" />
            <select
              className="input w-auto"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="surface flex flex-col items-center justify-center text-center px-8 py-14">
            <Sparkles className="w-8 h-8 text-ink-400 mb-3" />
            <div className="editorial-heading text-xl mb-1">Nothing here yet</div>
            <p className="text-sm text-ink-400 max-w-sm">
              Hit "Run Research" — the agent will run 2–4 web searches on your niche and drop
              ranked findings here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((f) => {
              const meta = TYPE_META[f.type] ?? { label: f.type, bg: "", text: "" };
              const [title, ...rest] = f.content.split("\n\n");
              const detail = rest.join("\n\n");
              return (
                <article key={f.id} className="surface p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <span
                      className={`text-[10px] uppercase tracking-[0.14em] border rounded px-1.5 py-0.5 ${meta.bg} ${meta.text}`}
                    >
                      {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-ink-50 font-medium">{title || f.content}</h3>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-xs text-ink-400">
                      <span className="tabular-nums">
                        {(f.relevanceScore * 100).toFixed(0)}
                      </span>
                      <span className="text-ink-500">/100</span>
                    </div>
                  </div>
                  {detail ? (
                    <p className="text-sm text-ink-300 leading-relaxed mb-3">{detail}</p>
                  ) : null}
                  <div className="flex items-center gap-2 flex-wrap">
                    {f.tags.map((t) => (
                      <span key={t} className="chip text-ink-300">
                        {t}
                      </span>
                    ))}
                    {f.sourceUrl ? (
                      <a
                        href={f.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="chip text-ink-300 hover:text-ink-100 ml-auto"
                      >
                        <ExternalLink className="w-3 h-3" /> Source
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
