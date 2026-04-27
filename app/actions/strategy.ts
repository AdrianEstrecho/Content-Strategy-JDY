"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { stringifyList } from "@/lib/json";

export type BrandFormInput = {
  name: string;
  niche: string;
  audience: string;
  voice: string;
  goals: { label: string; target?: string; horizon?: string }[];
};

export async function saveBrand(input: BrandFormInput) {
  const existing = await prisma.brandProfile.findFirst();
  const data = {
    name: input.name,
    niche: input.niche,
    audience: input.audience,
    voice: input.voice,
    goals: stringifyList(input.goals ?? []),
  };
  if (existing) {
    await prisma.brandProfile.update({ where: { id: existing.id }, data });
  } else {
    await prisma.brandProfile.create({ data });
  }
  revalidatePath("/strategy");
  revalidatePath("/");
}

export type PillarInput = {
  id?: string;
  label: string;
  description: string;
  color: string;
  order: number;
};

export async function savePillar(input: PillarInput) {
  const brand = await prisma.brandProfile.findFirst();
  if (!brand) throw new Error("Create brand profile first");
  if (input.id) {
    await prisma.pillar.update({
      where: { id: input.id },
      data: {
        label: input.label,
        description: input.description,
        color: input.color,
        order: input.order,
      },
    });
  } else {
    await prisma.pillar.create({
      data: {
        label: input.label,
        description: input.description,
        color: input.color,
        order: input.order,
        brandId: brand.id,
      },
    });
  }
  revalidatePath("/strategy");
}

export async function deletePillar(id: string) {
  await prisma.pillar.delete({ where: { id } });
  revalidatePath("/strategy");
}
