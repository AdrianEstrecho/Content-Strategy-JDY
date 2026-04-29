import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refreshLongLivedToken } from "@/lib/instagram";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  if (req.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { accessToken, expiresInSeconds } = await refreshLongLivedToken();
    const expiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : null;

    await prisma.integrationToken.upsert({
      where: { provider: "instagram" },
      update: { accessToken, expiresAt, refreshedAt: new Date() },
      create: {
        provider: "instagram",
        accessToken,
        expiresAt,
        refreshedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
