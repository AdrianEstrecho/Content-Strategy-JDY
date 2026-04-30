import { prisma } from "@/lib/db";

const GRAPH_BASE = "https://graph.instagram.com/v23.0";

export function isIGEnabled(): boolean {
  return !!process.env.IG_ACCESS_TOKEN?.trim() && !!process.env.IG_BUSINESS_ACCOUNT_ID?.trim();
}

// Token resolution: prefer the rotating token in DB if present.
// Fall back to the .env value for first-run / local dev.
async function getIGToken(): Promise<string> {
  try {
    const row = await prisma.integrationToken.findUnique({ where: { provider: "instagram" } });
    if (row?.accessToken) return row.accessToken;
  } catch {
    // DB may be unreachable in some contexts — fall through to env.
  }
  const env = process.env.IG_ACCESS_TOKEN?.trim();
  if (!env) throw new IGError("IG_ACCESS_TOKEN is not set");
  return env;
}

export function getIGAccountId(): string {
  const id = process.env.IG_BUSINESS_ACCOUNT_ID?.trim();
  if (!id) throw new IGError("IG_BUSINESS_ACCOUNT_ID is not set");
  return id;
}

export class IGError extends Error {
  status?: number;
  code?: number;
  type?: string;
  raw?: unknown;
  constructor(message: string, opts: { status?: number; code?: number; type?: string; raw?: unknown } = {}) {
    super(message);
    this.name = "IGError";
    this.status = opts.status;
    this.code = opts.code;
    this.type = opts.type;
    this.raw = opts.raw;
  }
}

type AccountFields = {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
  followers_count: number;
  follows_count: number;
};

type MediaItem = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

type InsightValue = { name: string; values: { value: number }[] };

async function igFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getIGToken();
  const qs = new URLSearchParams({ ...params, access_token: token });
  const url = `${GRAPH_BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as { error?: { message: string; code: number; type: string }; data?: unknown };
  if (!res.ok || json.error) {
    throw new IGError(json.error?.message ?? `IG request failed (${res.status})`, {
      status: res.status,
      code: json.error?.code,
      type: json.error?.type,
      raw: json,
    });
  }
  return json as T;
}

async function igPost<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getIGToken();
  const body = new URLSearchParams({ ...params, access_token: token });
  const url = `${GRAPH_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    cache: "no-store",
  });
  const json = (await res.json()) as { error?: { message: string; code: number; type: string } } & Record<string, unknown>;
  if (!res.ok || json.error) {
    throw new IGError(json.error?.message ?? `IG request failed (${res.status})`, {
      status: res.status,
      code: json.error?.code,
      type: json.error?.type,
      raw: json,
    });
  }
  return json as T;
}

export async function fetchAccount(): Promise<AccountFields> {
  return igFetch<AccountFields>("/me", {
    fields: "id,username,account_type,media_count,followers_count,follows_count",
  });
}

export async function fetchAccountReach(days = 7): Promise<number> {
  const since = Math.floor((Date.now() - days * 86400_000) / 1000);
  const until = Math.floor(Date.now() / 1000);
  try {
    const json = await igFetch<{ data: InsightValue[] }>("/me/insights", {
      metric: "reach",
      period: "day",
      since: String(since),
      until: String(until),
    });
    const values = json.data?.[0]?.values ?? [];
    return values.reduce((s, v) => s + (v.value || 0), 0);
  } catch {
    return 0;
  }
}

export async function fetchRecentMedia(limit = 12): Promise<MediaItem[]> {
  const json = await igFetch<{ data: MediaItem[] }>("/me/media", {
    fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count",
    limit: String(limit),
  });
  return json.data ?? [];
}

export async function fetchMediaInsights(mediaId: string): Promise<Record<string, number>> {
  // Reels metrics: reach, saved, shares, total_interactions, views, likes, comments
  // Static IMAGE/CAROUSEL: reach, saved, shares, total_interactions, likes, comments
  const metrics = "reach,saved,shares,total_interactions,likes,comments,views";
  try {
    const json = await igFetch<{ data: InsightValue[] }>(`/${mediaId}/insights`, {
      metric: metrics,
      metric_type: "total_value",
    });
    const out: Record<string, number> = {};
    for (const m of json.data ?? []) {
      out[m.name] = m.values?.[0]?.value ?? 0;
    }
    return out;
  } catch {
    return {};
  }
}

export type AccountSnapshot = {
  account: AccountFields;
  engagementRate: number;
  fetchedAt: Date;
};

export type PostWithInsights = {
  id: string;
  caption: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS";
  permalink: string;
  thumbnailUrl: string;
  timestamp: string;
  likes: number;
  comments: number;
  reach: number;
  saved: number;
  shares: number;
  views: number;
  totalInteractions: number;
};

const POST_KINDS = new Set(["VIDEO", "REELS", "CAROUSEL_ALBUM"]);

export async function fetchRecentPostsWithInsights(limit = 12): Promise<PostWithInsights[]> {
  const media = await fetchRecentMedia(limit * 2); // overfetch since we filter
  const eligible = media.filter((m) => POST_KINDS.has(m.media_type)).slice(0, limit);

  const enriched = await Promise.all(
    eligible.map(async (m) => {
      const insights = await fetchMediaInsights(m.id);
      const post: PostWithInsights = {
        id: m.id,
        caption: m.caption ?? "",
        mediaType: m.media_type,
        permalink: m.permalink,
        thumbnailUrl: m.thumbnail_url || m.media_url || "",
        timestamp: m.timestamp,
        likes: insights.likes ?? m.like_count ?? 0,
        comments: insights.comments ?? m.comments_count ?? 0,
        reach: insights.reach ?? 0,
        saved: insights.saved ?? 0,
        shares: insights.shares ?? 0,
        views: insights.views ?? 0,
        totalInteractions: insights.total_interactions ?? 0,
      };
      return post;
    })
  );
  return enriched;
}

export type PostBaseline = {
  postsCounted: number;
  avgReach: number;
  avgLikes: number;
  avgComments: number;
  avgSaved: number;
  avgShares: number;
  avgInteractions: number;
};

export function computeBaseline(posts: PostWithInsights[], excludeId?: string): PostBaseline {
  const others = excludeId ? posts.filter((p) => p.id !== excludeId) : posts;
  const n = Math.max(others.length, 1);
  const sum = (key: keyof PostWithInsights) =>
    others.reduce((s, p) => s + (Number(p[key]) || 0), 0);
  return {
    postsCounted: others.length,
    avgReach: sum("reach") / n,
    avgLikes: sum("likes") / n,
    avgComments: sum("comments") / n,
    avgSaved: sum("saved") / n,
    avgShares: sum("shares") / n,
    avgInteractions: sum("totalInteractions") / n,
  };
}

// ──────────────────────────────────────────────────────────────
// Publishing
// ──────────────────────────────────────────────────────────────

type IGContainerStatus = {
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
};

async function pollContainer(
  containerId: string,
  { timeoutMs = 5 * 60_000, intervalMs = 4_000 } = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const s = await igFetch<IGContainerStatus>(`/${containerId}`, {
      fields: "status_code,status",
    });
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") {
      throw new IGError(`Container ${containerId} failed: ${s.status_code} (${s.status ?? "no detail"})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new IGError(`Container ${containerId} did not finish within ${timeoutMs}ms`);
}

async function publishContainer(
  accountId: string,
  containerId: string
): Promise<{ id: string; permalink?: string }> {
  const published = await igPost<{ id: string }>(`/${accountId}/media_publish`, {
    creation_id: containerId,
  });
  // Best-effort permalink lookup.
  let permalink: string | undefined;
  try {
    const meta = await igFetch<{ permalink: string }>(`/${published.id}`, {
      fields: "permalink",
    });
    permalink = meta.permalink;
  } catch {
    // ignore
  }
  return { id: published.id, permalink };
}

export type PublishMediaInput =
  | {
      kind: "reel";
      videoUrl: string;
      caption?: string;
      shareToFeed?: boolean;
      thumbOffset?: number;
    }
  | {
      kind: "image";
      imageUrl: string;
      caption?: string;
    }
  | {
      kind: "carousel";
      slides: { imageUrl?: string; videoUrl?: string }[];
      caption?: string;
    };

export type PublishResult = {
  igMediaId: string;
  permalink?: string;
};

export async function publishToInstagram(input: PublishMediaInput): Promise<PublishResult> {
  const accountId = getIGAccountId();

  if (input.kind === "reel") {
    const params: Record<string, string> = {
      media_type: "REELS",
      video_url: input.videoUrl,
    };
    if (input.caption) params.caption = input.caption;
    if (input.shareToFeed !== false) params.share_to_feed = "true";
    if (input.thumbOffset != null) params.thumb_offset = String(input.thumbOffset);

    const container = await igPost<{ id: string }>(`/${accountId}/media`, params);
    await pollContainer(container.id);
    const res = await publishContainer(accountId, container.id);
    return { igMediaId: res.id, permalink: res.permalink };
  }

  if (input.kind === "image") {
    const params: Record<string, string> = { image_url: input.imageUrl };
    if (input.caption) params.caption = input.caption;
    const container = await igPost<{ id: string }>(`/${accountId}/media`, params);
    await pollContainer(container.id);
    const res = await publishContainer(accountId, container.id);
    return { igMediaId: res.id, permalink: res.permalink };
  }

  // carousel
  if (input.slides.length < 2 || input.slides.length > 10) {
    throw new IGError("Carousel requires 2–10 slides");
  }
  const childIds: string[] = [];
  for (const slide of input.slides) {
    const params: Record<string, string> = { is_carousel_item: "true" };
    if (slide.imageUrl) params.image_url = slide.imageUrl;
    else if (slide.videoUrl) {
      params.video_url = slide.videoUrl;
      params.media_type = "VIDEO";
    } else {
      throw new IGError("Carousel slide missing imageUrl or videoUrl");
    }
    const child = await igPost<{ id: string }>(`/${accountId}/media`, params);
    if (slide.videoUrl) await pollContainer(child.id);
    childIds.push(child.id);
  }
  const parentParams: Record<string, string> = {
    media_type: "CAROUSEL",
    children: childIds.join(","),
  };
  if (input.caption) parentParams.caption = input.caption;
  const parent = await igPost<{ id: string }>(`/${accountId}/media`, parentParams);
  await pollContainer(parent.id);
  const res = await publishContainer(accountId, parent.id);
  return { igMediaId: res.id, permalink: res.permalink };
}

export async function refreshLongLivedToken(): Promise<{
  accessToken: string;
  expiresInSeconds: number;
}> {
  const token = await getIGToken();
  const url = new URL(`${GRAPH_BASE}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string; code: number; type: string };
  };
  if (!res.ok || json.error || !json.access_token) {
    throw new IGError(json.error?.message ?? "refresh_access_token failed", {
      status: res.status,
      raw: json,
    });
  }
  return { accessToken: json.access_token, expiresInSeconds: json.expires_in ?? 0 };
}

export async function fetchAccountSnapshot(): Promise<AccountSnapshot> {
  const account = await fetchAccount();
  // Engagement rate = (recent likes + comments) / followers / posts averaged
  let engagementRate = 0;
  try {
    const recent = await fetchRecentMedia(12);
    if (recent.length > 0 && account.followers_count > 0) {
      const total = recent.reduce((s, m) => s + (m.like_count ?? 0) + (m.comments_count ?? 0), 0);
      engagementRate = (total / recent.length / account.followers_count) * 100;
    }
  } catch {
    // ignore — we still return follower data
  }
  return { account, engagementRate, fetchedAt: new Date() };
}
