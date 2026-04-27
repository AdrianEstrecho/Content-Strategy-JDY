"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { stringifyList } from "@/lib/json";
import { isAIEnabled } from "@/lib/ai/client";
import {
  generateCarousel,
  generateReel,
  type CarouselInput,
  type ReelInput,
} from "@/lib/ai/scripter";
import type { Carousel, ReelScript } from "@/lib/ai/schemas";

export type ScripterStatus = {
  aiEnabled: boolean;
};

export async function getScripterStatus(): Promise<ScripterStatus> {
  return { aiEnabled: isAIEnabled() };
}

export async function runReelGenerator(input: ReelInput): Promise<ReelScript> {
  return generateReel(input);
}

export async function runCarouselGenerator(
  input: CarouselInput
): Promise<Carousel> {
  return generateCarousel(input);
}

export async function saveReelToLibrary(
  reel: ReelScript,
  pillarId?: string | null
): Promise<string> {
  const beatText = reel.beats
    .map(
      (b, i) =>
        `[${i + 1}] ${b.timestamp}\nVO: ${b.voiceover}\nOST: ${b.onScreenText}\nB-roll: ${b.bRoll}`
    )
    .join("\n\n");
  const fullScript = [
    `HOOK (${reel.hookStyle}): ${reel.hook}`,
    ``,
    `LENGTH: ${reel.lengthSeconds}s`,
    `AUDIO: ${reel.suggestedAudio}`,
    ``,
    beatText,
  ].join("\n");

  const item = await prisma.contentItem.create({
    data: {
      type: "reel",
      status: "scripted",
      title: reel.title,
      hook: reel.hook,
      script: fullScript,
      caption: reel.caption,
      hashtags: stringifyList(reel.hashtags),
      cta: reel.cta,
      createdByAgent: "scripter",
      pillarId: pillarId || null,
    },
  });

  revalidatePath("/library");
  revalidatePath("/");
  return item.id;
}

export async function saveCarouselToLibrary(
  carousel: Carousel,
  pillarId?: string | null
): Promise<string> {
  const slideText = carousel.slides
    .map((s) => `Slide ${s.slideNumber}: ${s.headline}\n${s.body}`)
    .join("\n\n");
  const fullScript = [`COVER HOOK: ${carousel.coverHook}`, ``, slideText].join("\n");

  const item = await prisma.contentItem.create({
    data: {
      type: "carousel",
      status: "scripted",
      title: carousel.title,
      hook: carousel.coverHook,
      script: fullScript,
      caption: carousel.caption,
      hashtags: stringifyList(carousel.hashtags),
      cta: carousel.cta,
      createdByAgent: "scripter",
      pillarId: pillarId || null,
    },
  });

  revalidatePath("/library");
  revalidatePath("/");
  return item.id;
}
