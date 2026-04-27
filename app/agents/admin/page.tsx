import Link from "next/link";
import { isAIEnabled } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui/page-header";
import { AdminChat } from "./admin-chat";

export default function AdminAgentPage() {
  const aiEnabled = isAIEnabled();
  return (
    <>
      <PageHeader eyebrow="Chief of Staff" title="Admin">
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
          {aiEnabled ? "Online" : "No API key"}
        </span>
      </PageHeader>
      <AdminChat aiEnabled={aiEnabled} />
    </>
  );
}
