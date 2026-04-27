"use server";

import { revalidatePath } from "next/cache";
import { runAnalysis } from "@/lib/ai/analysis";

export async function runAnalyst() {
  const report = await runAnalysis();
  revalidatePath("/agents/analysis");
  revalidatePath("/");
  return report;
}
