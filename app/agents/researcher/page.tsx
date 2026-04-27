import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import { parseList } from "@/lib/json";
import { ResearcherStudio } from "./researcher-studio";

export default async function ResearcherAgentPage() {
  const aiEnabled = isAIEnabled();
  const findings = await prisma.researchFinding.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <>
      <PageHeader eyebrow="Trend Scout" title="Researcher">
        <Link href="/agents" className="btn-secondary">
          ← All agents
        </Link>
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
          {aiEnabled ? "Online" : "Needs API key"}
        </span>
      </PageHeader>

      <ResearcherStudio
        aiEnabled={aiEnabled}
        findings={findings.map((f) => ({
          id: f.id,
          type: f.type,
          content: f.content,
          sourceUrl: f.sourceUrl,
          relevanceScore: f.relevanceScore,
          tags: parseList<string>(f.tags),
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
