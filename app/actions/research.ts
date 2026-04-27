"use server";

import { revalidatePath } from "next/cache";
import { runResearch, type ResearchInput } from "@/lib/ai/researcher";

export async function runResearcher(input: ResearchInput) {
  const report = await runResearch(input);
  revalidatePath("/agents/researcher");
  revalidatePath("/");
  return report;
}
