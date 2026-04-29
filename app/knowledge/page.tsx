import { Brain } from "lucide-react";
import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import type { ContentAngle } from "@/lib/ai/schemas";
import { KnowledgeWorkspace } from "./knowledge-workspace";

export default async function KnowledgePage() {
  const aiEnabled = isAIEnabled();
  const rows = await prisma.knowledgeEntry.findMany({
    orderBy: { createdAt: "desc" },
  });

  const entries = rows.map((r) => ({
    id: r.id,
    title: r.title,
    source: r.source,
    sourceUrl: r.sourceUrl,
    rawContent: r.rawContent,
    summary: r.summary,
    keyIdeas: parseList<string>(r.keyIdeas),
    contentAngles: parseList<ContentAngle>(r.contentAngles),
    tags: parseList<string>(r.tags),
    status: r.status,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Learning Library"
        title="Feed the AI what you know"
        description="Paste transcripts, notes, articles, or ideas. The AI extracts key takeaways and turns them into Instagram angles your Scripter can reuse."
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
          {aiEnabled ? "Extractor online" : "Needs API key"}
        </span>
      </PageHeader>

      {entries.length === 0 ? (
        <div className="surface p-6 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-ig-gradient flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="editorial-heading text-lg">How this works</div>
            <p className="text-sm text-ink-300 mt-1 max-w-2xl">
              Drop in a podcast transcript, a market report, a voice-memo dump,
              or a competitor's caption. The AI summarizes it, pulls the key
              ideas, and proposes IG content angles in your voice. Everything
              you save here becomes context the Scripter sees on every
              generation.
            </p>
          </div>
        </div>
      ) : null}

      <KnowledgeWorkspace entries={entries} aiEnabled={aiEnabled} />
    </>
  );
}
