import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";
import { PageHeader } from "@/components/ui/page-header";
import { StrategyEditor } from "./strategy-editor";

export default async function StrategyPage() {
  const brand = await prisma.brandProfile.findFirst({
    include: { pillars: { orderBy: { order: "asc" } } },
  });

  const goals = parseList<{ label: string; target?: string; horizon?: string }>(brand?.goals);

  return (
    <>
      <PageHeader
        eyebrow="Strategy Hub"
        title="Your North Star"
        description="Brand pillars, voice, audience, and goals. All four agents read from here as shared context."
      />
      <StrategyEditor
        initial={{
          brand: {
            name: brand?.name ?? "JustDoYou",
            niche: brand?.niche ?? "",
            audience: brand?.audience ?? "",
            voice: brand?.voice ?? "",
            goals,
          },
          pillars: (brand?.pillars ?? []).map((p) => ({
            id: p.id,
            label: p.label,
            description: p.description,
            color: p.color,
            order: p.order,
          })),
        }}
      />
    </>
  );
}
