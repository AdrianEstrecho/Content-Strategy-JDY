import { prisma } from "@/lib/db";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import { GenerateStudio } from "./generate-studio";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const pillars = await prisma.pillar.findMany({ orderBy: { order: "asc" } });
  const aiEnabled = isAIEnabled();

  return (
    <>
      <PageHeader
        eyebrow="Script Generator"
        title="Reel & Carousel studio"
        description="The Scripter agent writes hooks, beat-by-beat scripts, captions, and hashtags from a topic. Everything saves straight to your Library."
      >
        <span
          className={`chip ${
            aiEnabled
              ? "text-emerald-300 border-emerald-400/30"
              : "text-amber-300 border-amber-400/30"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              aiEnabled ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          {aiEnabled ? "Scripter online" : "No API key — add in Settings"}
        </span>
      </PageHeader>
      <GenerateStudio
        aiEnabled={aiEnabled}
        initialMode={searchParams.mode === "carousel" ? "carousel" : "reel"}
        pillars={pillars.map((p) => ({ id: p.id, label: p.label, color: p.color }))}
      />
    </>
  );
}
