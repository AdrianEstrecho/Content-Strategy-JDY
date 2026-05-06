"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { stringifyList } from "@/lib/json";
import { isAIEnabled } from "@/lib/ai/client";
import { extractFromRaw } from "@/lib/ai/knowledge";
import { generateCarousel, generateReel } from "@/lib/ai/scripter";
import {
  saveCarouselToLibrary,
  saveReelToLibrary,
} from "@/app/actions/scripter";
import type { ContentAngle } from "@/lib/ai/schemas";

export type KnowledgeInput = {
  title?: string;
  source?: "transcript" | "note" | "article" | "idea" | "other";
  sourceUrl?: string;
  rawContent: string;
};

export type KnowledgeStatus = { aiEnabled: boolean };

export async function getKnowledgeStatus(): Promise<KnowledgeStatus> {
  return { aiEnabled: isAIEnabled() };
}

export async function createKnowledgeEntry(input: KnowledgeInput): Promise<string> {
  const raw = input.rawContent?.trim();
  if (!raw) throw new Error("Paste some content first.");

  const entry = await prisma.knowledgeEntry.create({
    data: {
      title: input.title?.trim() || "(processing…)",
      source: input.source ?? "note",
      sourceUrl: input.sourceUrl?.trim() || null,
      rawContent: raw,
      status: isAIEnabled() ? "pending" : "processed",
      summary: "",
      keyIdeas: "[]",
      contentAngles: "[]",
      tags: "[]",
    },
  });

  if (isAIEnabled()) {
    try {
      const extracted = await extractFromRaw(raw, {
        title: input.title,
        source: input.source,
        sourceUrl: input.sourceUrl,
      });
      await prisma.knowledgeEntry.update({
        where: { id: entry.id },
        data: {
          title: input.title?.trim() || extracted.title,
          summary: extracted.summary,
          keyIdeas: stringifyList(extracted.keyIdeas),
          contentAngles: stringifyList(extracted.contentAngles),
          tags: stringifyList(extracted.tags),
          status: "processed",
          errorMessage: null,
        },
      });
    } catch (err) {
      await prisma.knowledgeEntry.update({
        where: { id: entry.id },
        data: {
          status: "failed",
          errorMessage:
            err instanceof Error ? err.message : "Unknown extraction error",
        },
      });
    }
  }

  revalidatePath("/knowledge");
  return entry.id;
}

export async function reprocessKnowledgeEntry(id: string): Promise<void> {
  if (!isAIEnabled()) {
    throw new Error("Add ANTHROPIC_API_KEY to .env first.");
  }
  const entry = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Entry not found.");

  try {
    const extracted = await extractFromRaw(entry.rawContent, {
      title: entry.title,
      source: entry.source,
      sourceUrl: entry.sourceUrl ?? undefined,
    });
    await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        summary: extracted.summary,
        keyIdeas: stringifyList(extracted.keyIdeas),
        contentAngles: stringifyList(extracted.contentAngles),
        tags: stringifyList(extracted.tags),
        status: "processed",
        errorMessage: null,
      },
    });
  } catch (err) {
    await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage:
          err instanceof Error ? err.message : "Unknown extraction error",
      },
    });
    throw err;
  }

  revalidatePath("/knowledge");
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await prisma.knowledgeEntry.delete({ where: { id } });
  revalidatePath("/knowledge");
}

export type ScriptedAngleResult = {
  id: string;
  title: string;
  format: "reel" | "carousel";
};

export async function scriptFromAngle(
  angle: ContentAngle
): Promise<ScriptedAngleResult> {
  if (!isAIEnabled()) {
    throw new Error("Add ANTHROPIC_API_KEY to .env first.");
  }
  if (angle.format !== "reel" && angle.format !== "carousel") {
    throw new Error("Auto-script only works for Reels and carousels.");
  }

  const topic = [angle.hook, angle.angle].filter(Boolean).join(" — ");

  let pillarId: string | null = null;
  const hint = angle.pillarHint?.trim();
  if (hint) {
    const p = await prisma.pillar.findFirst({
      where: { label: { contains: hint } },
    });
    pillarId = p?.id ?? null;
  }

  if (angle.format === "reel") {
    const reel = await generateReel({ topic, lengthSeconds: 30 });
    const id = await saveReelToLibrary(reel, pillarId);
    return { id, title: reel.title, format: "reel" };
  }

  const carousel = await generateCarousel({
    topic,
    numSlides: 6,
    goal: "educate",
  });
  const id = await saveCarouselToLibrary(carousel, pillarId);
  return { id, title: carousel.title, format: "carousel" };
}
