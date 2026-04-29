import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList, stringifyList } from "@/lib/json";
import { deleteAsset, isCloudinaryEnabled } from "@/lib/cloudinary";
import type { StoredMedia } from "@/lib/media";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { contentItemId?: string; publicId?: string }
    | null;

  const contentItemId = body?.contentItemId?.trim();
  const publicId = body?.publicId?.trim();
  if (!contentItemId || !publicId) {
    return NextResponse.json(
      { error: "Missing contentItemId or publicId" },
      { status: 400 }
    );
  }

  const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  const existing = parseList<StoredMedia>(item.mediaUrls);
  const target = existing.find((m) => m.publicId === publicId);
  const remaining = existing.filter((m) => m.publicId !== publicId);

  if (target && isCloudinaryEnabled()) {
    try {
      await deleteAsset(target.publicId, target.resourceType);
    } catch {
      // Don't block local removal on a remote-delete failure.
    }
  }

  await prisma.contentItem.update({
    where: { id: contentItemId },
    data: {
      mediaUrls: stringifyList(remaining),
      thumbnailUrl: remaining[0]?.thumbnailUrl ?? remaining[0]?.url ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
