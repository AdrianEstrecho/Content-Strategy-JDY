import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseList, stringifyList } from "@/lib/json";
import { isCloudinaryEnabled, uploadImage, uploadVideo } from "@/lib/cloudinary";
import { fromUpload, type StoredMedia } from "@/lib/media";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 100 * 1024 * 1024; // IG cap for Reels

export async function POST(req: NextRequest) {
  if (!isCloudinaryEnabled()) {
    return NextResponse.json(
      { error: "Cloudinary not configured. Set credentials in .env." },
      { status: 400 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const contentItemId = (form.get("contentItemId") as string | null)?.trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Cap is 100MB.` },
      { status: 400 }
    );
  }
  if (!contentItemId) {
    return NextResponse.json({ error: "Missing contentItemId" }, { status: 400 });
  }

  const item = await prisma.contentItem.findUnique({ where: { id: contentItemId } });
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const isVideo = file.type.startsWith("video/");

  let asset;
  try {
    asset = isVideo
      ? await uploadVideo(buffer)
      : await uploadImage(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }

  const stored = fromUpload(asset);
  const existing = parseList<StoredMedia>(item.mediaUrls);
  const updated = [...existing, stored];

  await prisma.contentItem.update({
    where: { id: contentItemId },
    data: {
      mediaUrls: stringifyList(updated),
      thumbnailUrl: item.thumbnailUrl ?? stored.thumbnailUrl ?? (stored.resourceType === "image" ? stored.url : null),
    },
  });

  return NextResponse.json({ ok: true, media: stored });
}
