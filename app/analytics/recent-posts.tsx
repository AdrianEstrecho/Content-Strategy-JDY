"use client";

import { useState } from "react";
import { Sparkles, ExternalLink, Film, LayoutGrid, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { PostWithInsights } from "@/lib/instagram";

type PostAnalysisResponse =
  | {
      ok: true;
      analysis: {
        verdict: "overperformed" | "average" | "underperformed";
        reachVsBaseline: number;
        headline: string;
        drivers: { factor: string; observation: string }[];
        recommendations: string[];
      };
      baseline: { avgReach: number; postsCounted: number };
    }
  | { ok: false; error: string };

const VERDICT_TONE: Record<
  "overperformed" | "average" | "underperformed",
  { label: string; chip: string }
> = {
  overperformed: {
    label: "Overperformed",
    chip: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
  },
  average: {
    label: "On par",
    chip: "text-ink-200 border-white/[0.08] bg-white/[0.04]",
  },
  underperformed: {
    label: "Underperformed",
    chip: "text-rose-300 border-rose-400/30 bg-rose-500/10",
  },
};

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function captionPreview(caption: string): string {
  const firstLine = caption.split("\n")[0]?.trim() ?? "";
  return firstLine.length > 90 ? firstLine.slice(0, 87) + "…" : firstLine;
}

function PostCard({ post }: { post: PostWithInsights }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PostAnalysisResponse | null>(null);
  const [open, setOpen] = useState(false);

  const isReel = post.mediaType === "REELS" || post.mediaType === "VIDEO";
  const TypeIcon = isReel ? Film : LayoutGrid;
  const typeLabel = isReel ? "Reel" : "Carousel";

  async function onAnalyze() {
    if (result?.ok) {
      setOpen((v) => !v);
      return;
    }
    setBusy(true);
    setResult(null);
    setOpen(true);
    try {
      const res = await fetch(`/api/instagram/analyze/${post.id}`, { method: "POST" });
      const data = (await res.json()) as PostAnalysisResponse;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function onReanalyze() {
    setBusy(true);
    setResult(null);
    setOpen(true);
    try {
      const res = await fetch(`/api/instagram/analyze/${post.id}`, { method: "POST" });
      const data = (await res.json()) as PostAnalysisResponse;
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface p-4 flex flex-col gap-3">
      <div className="flex gap-3">
        <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-md bg-white/[0.04] border border-white/[0.06]">
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-500">
              <TypeIcon className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow flex items-center gap-1">
              <TypeIcon className="w-3 h-3" /> {typeLabel}
            </span>
            <span className="text-[10px] text-ink-500">
              {new Date(post.timestamp).toLocaleDateString()}
            </span>
            <a
              href={post.permalink}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-ink-400 hover:text-ink-100"
              title="Open on Instagram"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-sm text-ink-100 mt-1 line-clamp-2 leading-snug">
            {captionPreview(post.caption) || <span className="text-ink-500 italic">No caption</span>}
          </p>
          <div className="flex gap-3 text-xs text-ink-400 tabular-nums mt-2">
            {isReel ? <span>{formatNumber(post.views)} views</span> : null}
            <span>{formatNumber(post.reach)} reach</span>
            <span>{formatNumber(post.likes)} likes</span>
            <span>{formatNumber(post.saved)} saves</span>
            <span>{formatNumber(post.shares)} shares</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] text-ink-500">
          {result?.ok ? `${result.analysis.reachVsBaseline.toFixed(2)}× baseline reach` : ""}
        </div>
        <div className="flex items-center gap-2">
          {result?.ok ? (
            <button
              type="button"
              onClick={onReanalyze}
              disabled={busy}
              className="btn-ghost text-xs disabled:opacity-40"
              title="Re-run analysis"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Re-analyze
            </button>
          ) : null}
          <button
            type="button"
            onClick={onAnalyze}
            disabled={busy}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : result?.ok ? (
              open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {busy ? "Analyzing…" : result?.ok ? (open ? "Hide" : "Show analysis") : "Analyze"}
          </button>
        </div>
      </div>

      {open && result?.ok ? (
        <div className="border-t border-white/[0.05] pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`chip text-[10px] uppercase tracking-[0.14em] ${
                VERDICT_TONE[result.analysis.verdict].chip
              }`}
            >
              {VERDICT_TONE[result.analysis.verdict].label}
            </span>
            <span className="text-xs text-ink-400">
              vs avg reach of {formatNumber(result.baseline.avgReach)} across {result.baseline.postsCounted} posts
            </span>
          </div>
          <p className="text-sm text-ink-100 leading-snug">{result.analysis.headline}</p>
          <div>
            <div className="eyebrow mb-1.5">Why</div>
            <ul className="space-y-1.5">
              {result.analysis.drivers.map((d, i) => (
                <li key={i} className="text-xs text-ink-300 leading-snug">
                  <span className="text-ink-100 font-medium capitalize">{d.factor}:</span>{" "}
                  {d.observation}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="eyebrow mb-1.5">Do next</div>
            <ul className="text-xs text-ink-300 space-y-1 list-disc list-inside marker:text-ink-500">
              {result.analysis.recommendations.map((r, i) => (
                <li key={i} className="leading-snug">{r}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      {open && result && !result.ok ? (
        <div className="border-t border-white/[0.05] pt-3 text-xs text-rose-300 break-words">
          {result.error}
        </div>
      ) : null}
    </div>
  );
}

export function RecentPosts({ posts }: { posts: PostWithInsights[] }) {
  if (posts.length === 0) {
    return (
      <div className="surface p-6 text-sm text-ink-400">
        No reels or carousels found in the last 12 posts. Publish one and sync from Settings.
      </div>
    );
  }
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
