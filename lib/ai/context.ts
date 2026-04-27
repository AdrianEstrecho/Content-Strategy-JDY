import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";

export type StrategyContext = {
  brand: {
    name: string;
    niche: string;
    audience: string;
    voice: string;
    goals: { label: string; target?: string; horizon?: string }[];
  };
  pillars: { label: string; description: string }[];
};

export async function loadStrategyContext(): Promise<StrategyContext> {
  const brand = await prisma.brandProfile.findFirst({
    include: { pillars: { orderBy: { order: "asc" } } },
  });
  return {
    brand: {
      name: brand?.name ?? "JustDoYou",
      niche: brand?.niche ?? "Real estate — home buyers",
      audience: brand?.audience ?? "",
      voice: brand?.voice ?? "",
      goals: parseList(brand?.goals),
    },
    pillars: (brand?.pillars ?? []).map((p) => ({
      label: p.label,
      description: p.description,
    })),
  };
}

export function renderStrategyContext(ctx: StrategyContext): string {
  const goals =
    ctx.brand.goals.length > 0
      ? ctx.brand.goals
          .map((g) => `  - ${g.label}${g.target ? ` (target: ${g.target})` : ""}${g.horizon ? ` [${g.horizon}]` : ""}`)
          .join("\n")
      : "  (none set yet)";

  const pillars =
    ctx.pillars.length > 0
      ? ctx.pillars
          .map((p) => `  - ${p.label}${p.description ? ` — ${p.description}` : ""}`)
          .join("\n")
      : "  (none defined)";

  return [
    `# ${ctx.brand.name} — Brand Context`,
    ``,
    `Niche: ${ctx.brand.niche || "(not set)"}`,
    ``,
    `Target audience:`,
    ctx.brand.audience || "  (not set)",
    ``,
    `Voice & tone:`,
    ctx.brand.voice || "  (not set)",
    ``,
    `Content pillars:`,
    pillars,
    ``,
    `Goals:`,
    goals,
  ].join("\n");
}
