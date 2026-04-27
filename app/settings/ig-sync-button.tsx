"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type SyncResponse =
  | {
      ok: true;
      snapshot: {
        username: string;
        followers: number;
        following: number;
        posts: number;
        engagement: number;
        capturedAt: string;
      };
    }
  | { ok: false; error: string };

export function IGSyncButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSync() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" });
      const data = (await res.json()) as SyncResponse;
      setResult(data);
      if (data.ok) startTransition(() => router.refresh());
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-ink-400">
          Pull live followers + engagement and write a new snapshot to the database.
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={disabled || busy || isPending}
          className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${busy || isPending ? "animate-spin" : ""}`} />
          {busy ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {result?.ok ? (
        <div className="mt-3 text-xs text-emerald-300">
          Pulled @{result.snapshot.username} — {result.snapshot.followers.toLocaleString()} followers,{" "}
          {result.snapshot.engagement}% engagement.
        </div>
      ) : null}
      {result && !result.ok ? (
        <div className="mt-3 text-xs text-rose-300 break-words">
          {result.error}
        </div>
      ) : null}
    </div>
  );
}
