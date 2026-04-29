import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publishContentItem } from "@/lib/publish";

export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Allow ?secret= override for manual triggers.
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.contentItem.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now, not: null },
      publishedAt: null,
    },
    orderBy: { scheduledAt: "asc" },
    take: 5, // safety cap per tick
  });

  const results: Array<{ id: string; ok: boolean; error?: string; igMediaId?: string }> = [];

  for (const item of due) {
    try {
      const r = await publishContentItem(item.id);
      results.push({ id: item.id, ok: true, igMediaId: r.igMediaId });
    } catch (err) {
      results.push({
        id: item.id,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  return NextResponse.json({
    checkedAt: now.toISOString(),
    processed: results.length,
    results,
  });
}
