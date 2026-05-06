"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Sparkles,
  Trash2,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Link as LinkIcon,
  Wand2,
  Check,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  reprocessKnowledgeEntry,
  scriptFromAngle,
  type KnowledgeInput,
} from "@/app/actions/knowledge";
import type { ContentAngle } from "@/lib/ai/schemas";

type Entry = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string | null;
  rawContent: string;
  summary: string;
  keyIdeas: string[];
  contentAngles: ContentAngle[];
  tags: string[];
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

const SOURCE_OPTIONS: { value: KnowledgeInput["source"]; label: string }[] = [
  { value: "transcript", label: "Transcript" },
  { value: "note", label: "Note" },
  { value: "article", label: "Article" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

export function KnowledgeWorkspace({
  entries,
  aiEnabled,
}: {
  entries: Entry[];
  aiEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(entries[0]?.id ?? null);
  const [confirmDelete, setConfirmDelete] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<KnowledgeInput>({
    title: "",
    source: "transcript",
    sourceUrl: "",
    rawContent: "",
  });

  function submit() {
    setError(null);
    if (!draft.rawContent.trim()) {
      setError("Paste something first.");
      return;
    }
    startTransition(async () => {
      try {
        await createKnowledgeEntry(draft);
        setDraft({ title: "", source: draft.source, sourceUrl: "", rawContent: "" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function reprocess(id: string) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      try {
        await reprocessKnowledgeEntry(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reprocess failed.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      try {
        await deleteKnowledgeEntry(id);
        setConfirmDelete(null);
        if (openId === id) setOpenId(null);
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
      {/* Composer */}
      <section className="surface p-6 lg:sticky lg:top-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-ink-300" />
          <h2 className="editorial-heading text-xl">New entry</h2>
        </div>
        <p className="text-sm text-ink-400 mb-4">
          Paste the raw material. The AI handles the rest.
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Source type</label>
              <select
                className="input"
                value={draft.source}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    source: e.target.value as KnowledgeInput["source"],
                  })
                }
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Title (optional)</label>
              <input
                className="input"
                placeholder="Auto-generated if blank"
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Source URL (optional)</label>
            <input
              className="input"
              placeholder="https://…"
              value={draft.sourceUrl ?? ""}
              onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Raw content</label>
            <textarea
              className="input min-h-[260px] font-mono text-[13px] leading-relaxed"
              placeholder={
                "Paste a transcript, your notes, an article, or a stream-of-consciousness dump…"
              }
              value={draft.rawContent}
              onChange={(e) =>
                setDraft({ ...draft, rawContent: e.target.value })
              }
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-ink-500">
                {draft.rawContent.length.toLocaleString()} chars
              </span>
              {!aiEnabled ? (
                <span className="text-xs text-amber-300">
                  Will save raw — extractor needs API key
                </span>
              ) : null}
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2 text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <button
            onClick={submit}
            disabled={pending}
            className="btn-primary w-full justify-center"
          >
            <Sparkles className="w-4 h-4" />
            {pending
              ? aiEnabled
                ? "Extracting…"
                : "Saving…"
              : aiEnabled
              ? "Extract & save"
              : "Save"}
          </button>
        </div>
      </section>

      {/* Library */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="editorial-heading text-xl">Library</h2>
          <span className="chip text-ink-400">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="surface px-8 py-10 text-center">
            <div className="editorial-heading text-lg mb-1">
              Nothing fed in yet
            </div>
            <p className="text-sm text-ink-400">
              Paste your first transcript or note on the left to seed the AI.
            </p>
          </div>
        ) : (
          entries.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              open={openId === e.id}
              busy={busyId === e.id}
              onToggle={() => setOpenId(openId === e.id ? null : e.id)}
              onReprocess={() => reprocess(e.id)}
              onDelete={() => setConfirmDelete(e)}
            />
          ))
        )}
      </section>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete this entry?"
        description={
          confirmDelete
            ? `"${confirmDelete.title}" will be removed from the AI's context permanently.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        busy={pending}
        onConfirm={() => confirmDelete && remove(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function EntryCard({
  entry,
  open,
  busy,
  onToggle,
  onReprocess,
  onDelete,
}: {
  entry: Entry;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onReprocess: () => void;
  onDelete: () => void;
}) {
  const Chevron = open ? ChevronDown : ChevronRight;
  const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="surface overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Chevron className="w-4 h-4 mt-1 text-ink-400 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="eyebrow">{entry.source}</span>
            <span className="chip text-ink-400">{date}</span>
            <StatusChip status={entry.status} />
          </div>
          <h3 className="editorial-heading text-lg mt-1 truncate">
            {entry.title}
          </h3>
          {entry.summary ? (
            <p className="text-sm text-ink-300 mt-1 line-clamp-2">
              {entry.summary}
            </p>
          ) : entry.status === "failed" ? (
            <p className="text-sm text-rose-300/80 mt-1 line-clamp-2">
              {entry.errorMessage ?? "Extraction failed."}
            </p>
          ) : (
            <p className="text-sm text-ink-500 mt-1 italic">
              Saved without extraction.
            </p>
          )}
        </div>
      </button>

      {open ? (
        <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-5">
          {entry.sourceUrl ? (
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-ink-100"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {entry.sourceUrl}
            </a>
          ) : null}

          {entry.keyIdeas.length > 0 ? (
            <Section label="Key ideas">
              <ul className="space-y-1.5 text-sm text-ink-200">
                {entry.keyIdeas.map((k, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-ink-500 shrink-0">•</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {entry.contentAngles.length > 0 ? (
            <Section label="Content angles">
              <div className="space-y-2.5">
                {entry.contentAngles.map((a, i) => (
                  <AngleCard key={i} angle={a} />
                ))}
              </div>
            </Section>
          ) : null}

          {entry.tags.length > 0 ? (
            <Section label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((t) => (
                  <span key={t} className="chip text-ink-300">
                    {t}
                  </span>
                ))}
              </div>
            </Section>
          ) : null}

          <Section label="Original">
            <pre className="text-xs text-ink-400 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto p-3 surface-2">
              {entry.rawContent.length > 4000
                ? entry.rawContent.slice(0, 4000) + "\n\n[…truncated]"
                : entry.rawContent}
            </pre>
          </Section>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onReprocess}
              disabled={busy}
              className="btn-secondary"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              {busy ? "Working…" : "Re-extract"}
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="btn-ghost text-rose-300 hover:text-rose-200 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      {children}
    </div>
  );
}

function AngleCard({ angle }: { angle: ContentAngle }) {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scriptable = angle.format === "reel" || angle.format === "carousel";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await scriptFromAngle(angle);
      setSaved({ id: res.id, title: res.title });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Script failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="surface-2 p-3">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="chip text-ink-200 border-white/10 uppercase text-[10px] tracking-wider">
          {angle.format}
        </span>
        {angle.pillarHint ? (
          <span className="chip text-ink-400">{angle.pillarHint}</span>
        ) : null}
        <div className="ml-auto">
          {scriptable ? (
            saved ? (
              <Link
                href="/library"
                className="btn-secondary text-xs"
                title={`Saved: ${saved.title}`}
              >
                <Check className="w-3.5 h-3.5" />
                Saved — view in Library
              </Link>
            ) : (
              <button
                onClick={run}
                disabled={busy}
                className="btn-secondary text-xs"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {busy ? "Scripting…" : "Auto-script"}
              </button>
            )
          ) : null}
        </div>
      </div>
      <div className="text-sm font-medium text-ink-50">{angle.hook}</div>
      <div className="text-sm text-ink-300 mt-1">{angle.angle}</div>
      {error ? (
        <div className="flex items-start gap-1.5 text-xs text-rose-300 mt-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  if (status === "processed") {
    return (
      <span className="chip text-emerald-300 border-emerald-400/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Processed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="chip text-rose-300 border-rose-400/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        Failed
      </span>
    );
  }
  return (
    <span className="chip text-amber-300 border-amber-400/30">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Pending
    </span>
  );
}
