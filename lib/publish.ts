import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";
import {
  isIGEnabled,
  publishToInstagram,
  type PublishMediaInput,
} from "@/lib/instagram";
import type { StoredMedia } from "@/lib/media";

export class PublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishError";
  }
}

function buildCaption(item: {
  caption: string;
  cta: string;
  hashtags: string;
}): string {
  const tags = parseList<string>(item.hashtags);
  const tagLine = tags
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  return [item.caption, item.cta, tagLine].filter(Boolean).join("\n\n").trim();
}

function buildMediaInput(
  type: string,
  media: StoredMedia[],
  caption: string
): PublishMediaInput {
  if (media.length === 0) {
    throw new PublishError("No media uploaded. Add at least one image or video.");
  }

  if (type === "reel") {
    const video = media.find((m) => m.resourceType === "video");
    if (!video) throw new PublishError("Reels need a video file. Upload one first.");
    return { kind: "reel", videoUrl: video.url, caption };
  }

  if (type === "carousel") {
    if (media.length < 2) {
      throw new PublishError("Carousels need at least 2 slides.");
    }
    if (media.length > 10) {
      throw new PublishError("Carousels are capped at 10 slides.");
    }
    return {
      kind: "carousel",
      caption,
      slides: media.map((m) =>
        m.resourceType === "video"
          ? { videoUrl: m.url }
          : { imageUrl: m.url }
      ),
    };
  }

  if (type === "post") {
    const image = media.find((m) => m.resourceType === "image");
    if (!image) throw new PublishError("Image posts need an image file.");
    return { kind: "image", imageUrl: image.url, caption };
  }

  if (type === "story") {
    throw new PublishError(
      "Stories aren't supported yet — IG Graph requires a different endpoint and they expire in 24h."
    );
  }

  throw new PublishError(`Unsupported content type: ${type}`);
}

export async function publishContentItem(itemId: string): Promise<{
  igMediaId: string;
  permalink?: string;
}> {
  if (!isIGEnabled()) {
    throw new PublishError("Instagram credentials missing. Set IG_ACCESS_TOKEN + IG_BUSINESS_ACCOUNT_ID.");
  }

  const item = await prisma.contentItem.findUnique({ where: { id: itemId } });
  if (!item) throw new PublishError("Content item not found");
  if (item.publishedAt) throw new PublishError("Already published.");

  const media = parseList<StoredMedia>(item.mediaUrls);
  const caption = buildCaption({
    caption: item.caption,
    cta: item.cta,
    hashtags: item.hashtags,
  });

  await prisma.contentItem.update({
    where: { id: itemId },
    data: { status: "publishing", publishError: null },
  });

  try {
    const input = buildMediaInput(item.type, media, caption);
    const result = await publishToInstagram(input);

    await prisma.contentItem.update({
      where: { id: itemId },
      data: {
        status: "published",
        publishedAt: new Date(),
        igMediaId: result.igMediaId,
        igPermalink: result.permalink ?? null,
        publishError: null,
      },
    });

    await prisma.publishLog.create({
      data: {
        contentItemId: itemId,
        status: "success",
        message: `Published "${item.title}"`,
        igMediaId: result.igMediaId,
      },
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown publish error";
    await prisma.contentItem.update({
      where: { id: itemId },
      data: { status: "publish_failed", publishError: message },
    });
    await prisma.publishLog.create({
      data: {
        contentItemId: itemId,
        status: "failed",
        message,
      },
    });
    throw err;
  }
}
