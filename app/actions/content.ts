"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { stringifyList } from "@/lib/json";
import type { ContentStatus, ContentType } from "@/lib/content";

export type ContentFormInput = {
  id?: string;
  type: ContentType;
  status: ContentStatus;
  title: string;
  hook?: string;
  script?: string;
  caption?: string;
  hashtags?: string[];
  cta?: string;
  pillarId?: string | null;
  scheduledAt?: string | null; // ISO string
};

export async function upsertContent(input: ContentFormInput) {
  const data = {
    type: input.type,
    status: input.status,
    title: input.title,
    hook: input.hook ?? "",
    script: input.script ?? "",
    caption: input.caption ?? "",
    hashtags: stringifyList(input.hashtags ?? []),
    cta: input.cta ?? "",
    pillarId: input.pillarId || null,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
  };

  if (input.id) {
    await prisma.contentItem.update({ where: { id: input.id }, data });
  } else {
    await prisma.contentItem.create({ data: { ...data, createdByAgent: "user" } });
  }
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
}

export async function rescheduleContent(id: string, scheduledAt: string | null) {
  await prisma.contentItem.update({
    where: { id },
    data: {
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "scheduled" : "idea",
    },
  });
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateStatus(id: string, status: ContentStatus) {
  await prisma.contentItem.update({ where: { id }, data: { status } });
  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/calendar");
}

export async function deleteContent(id: string) {
  await prisma.contentItem.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
}
