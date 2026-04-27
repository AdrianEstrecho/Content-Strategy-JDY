import { NextResponse } from "next/server";
import {
  fetchRecentPostsWithInsights,
  computeBaseline,
  isIGEnabled,
  IGError,
} from "@/lib/instagram";
import { isAIEnabled } from "@/lib/ai/client";
import { analyzePost } from "@/lib/ai/post-analysis";
import { getCached, setCached } from "@/lib/ai/post-analysis-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { mediaId: string } }
) {
  if (!isIGEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Instagram is not connected." },
      { status: 400 }
    );
  }
  if (!isAIEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Anthropic API key is not configured. Add ANTHROPIC_API_KEY in .env." },
      { status: 400 }
    );
  }

  try {
    const posts = await fetchRecentPostsWithInsights(12);
    const target = posts.find((p) => p.id === params.mediaId);
    if (!target) {
      return NextResponse.json(
        { ok: false, error: "Post not found in recent media. It may be older than the last 12 posts." },
        { status: 404 }
      );
    }
    const baseline = computeBaseline(posts, target.id);
    const cached = getCached(target.id, target.reach);
    if (cached) {
      return NextResponse.json({ ok: true, analysis: cached.analysis, baseline: cached.baseline, cached: true });
    }
    const analysis = await analyzePost(target, baseline);
    setCached(target.id, analysis, baseline, target.reach);
    return NextResponse.json({ ok: true, analysis, baseline });
  } catch (err) {
    const status = err instanceof IGError && err.status ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
