import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchAccountSnapshot, isIGEnabled, IGError } from "@/lib/instagram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!isIGEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Instagram is not connected. Set IG_ACCESS_TOKEN and IG_BUSINESS_ACCOUNT_ID in .env." },
      { status: 400 }
    );
  }

  try {
    const snap = await fetchAccountSnapshot();
    const row = await prisma.followerSnapshot.create({
      data: {
        followers: snap.account.followers_count,
        following: snap.account.follows_count,
        posts: snap.account.media_count,
        engagement: Number(snap.engagementRate.toFixed(2)),
        capturedAt: snap.fetchedAt,
      },
    });

    return NextResponse.json({
      ok: true,
      snapshot: {
        id: row.id,
        username: snap.account.username,
        followers: row.followers,
        following: row.following,
        posts: row.posts,
        engagement: row.engagement,
        capturedAt: row.capturedAt,
      },
    });
  } catch (err) {
    const message =
      err instanceof IGError
        ? err.message
        : err instanceof Error
        ? err.message
        : "Unknown error";
    const status = err instanceof IGError && err.status ? err.status : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
