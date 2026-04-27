import Link from "next/link";
import { prisma } from "@/lib/db";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import { parseList } from "@/lib/json";
import { AnalysisStudio } from "./analysis-studio";

export default async function AnalysisAgentPage() {
  const aiEnabled = isAIEnabled();
  const [publishedCount, reports] = await Promise.all([
    prisma.contentItem.count({ where: { status: "published" } }),
    prisma.weeklyReport.findMany({
      orderBy: { weekOf: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Data Coach" title="Analysis">
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

      <AnalysisStudio
        aiEnabled={aiEnabled}
        publishedCount={publishedCount}
        pastReports={reports.map((r) => ({
          id: r.id,
          weekOf: r.weekOf.toISOString(),
          insights: parseList<string>(r.insights),
          recommendations: parseList<string>(r.recommendations),
        }))}
      />
    </>
  );
}
