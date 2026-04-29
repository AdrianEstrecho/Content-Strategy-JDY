"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { publishContentItem } from "@/lib/publish";
import { isIGEnabled } from "@/lib/instagram";
import { isCloudinaryEnabled } from "@/lib/cloudinary";

export type PublishStatus = {
  igEnabled: boolean;
  cloudinaryEnabled: boolean;
};

export async function getPublishStatus(): Promise<PublishStatus> {
  return {
    igEnabled: isIGEnabled(),
    cloudinaryEnabled: isCloudinaryEnabled(),
  };
}

export async function publishNow(itemId: string): Promise<{
  ok: boolean;
  igMediaId?: string;
  permalink?: string;
  error?: string;
}> {
  try {
    const result = await publishContentItem(itemId);
    revalidatePath("/library");
    revalidatePath("/calendar");
    revalidatePath("/");
    return { ok: true, igMediaId: result.igMediaId, permalink: result.permalink };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Publish failed",
    };
  }
}

export async function schedulePost(
  itemId: string,
  scheduledAt: string | null
): Promise<void> {
  await prisma.contentItem.update({
    where: { id: itemId },
    data: {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "scheduled" : "idea",
    },
  });
  revalidatePath("/library");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function clearPublishError(itemId: string): Promise<void> {
  await prisma.contentItem.update({
    where: { id: itemId },
    data: { publishError: null, status: "scheduled" },
  });
  revalidatePath("/library");
}
