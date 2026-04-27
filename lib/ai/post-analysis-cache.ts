import type { PostAnalysis } from "./schemas";
import type { PostBaseline } from "@/lib/instagram";

type Entry = {
  analysis: PostAnalysis;
  baseline: PostBaseline;
  reach: number;
  expiresAt: number;
};

const TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, Entry>();

export function getCached(mediaId: string, currentReach: number): Entry | null {
  const hit = cache.get(mediaId);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(mediaId);
    return null;
  }
  // Invalidate if metrics moved meaningfully (>10%) so the analysis stays accurate
  if (hit.reach > 0 && Math.abs(currentReach - hit.reach) / hit.reach > 0.1) {
    cache.delete(mediaId);
    return null;
  }
  return hit;
}

export function setCached(
  mediaId: string,
  analysis: PostAnalysis,
  baseline: PostBaseline,
  reach: number
): Entry {
  const entry: Entry = {
    analysis,
    baseline,
    reach,
    expiresAt: Date.now() + TTL_MS,
  };
  cache.set(mediaId, entry);
  return entry;
}
