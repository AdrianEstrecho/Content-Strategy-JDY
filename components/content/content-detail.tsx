"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Pencil, CalendarCheck2, Archive, Trash2, Copy } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatWhen } from "@/lib/schedule";
import {
  STATUS_LABELS,
  TYPE_COLORS,
  type ContentStatus,
  type ContentType,
} from "@/lib/content";
import { deleteContent, rescheduleContent, updateStatus } from "@/app/actions/content";
import type { LibItem } from "@/app/library/library-grid";

type Props = {
  item: LibItem;
  suggestedDate: string;
  suggestedReason: string;
  onClose: () => void;
  onEdit: () => void;
};

export function ContentDetail({
  item,
  suggestedDate,
  suggestedReason,
  onClose,
  onEdit,
}: Props) {
  const [, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      // Don't double-close: if the delete confirm is open, let it own Escape.
      if (e.key === "Escape" && !confirmingDelete) onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose, confirmingDelete]);

  const tc = TYPE_COLORS[item.type as ContentType];
  const statusLabel = STATUS_LABELS[item.status as ContentStatus] ?? item.status;

  const scheduled = item.scheduledAt ? new Date(item.scheduledAt) : null;
  const published = item.publishedAt ? new Date(item.publishedAt) : null;
  const recommended = new Date(suggestedDate);

  async function copyAll() {
    const txt = [
      `TITLE: ${item.title}`,
      `HOOK: ${item.hook}`,
      ``,
      `SCRIPT:`,
      item.script || "(no script yet)",
      ``,
      `CAPTION:`,
      item.caption || "(no caption yet)",
      ``,
      `CTA: ${item.cta || "(none)"}`,
      ``,
      `HASHTAGS:`,
      item.hashtags.join(" "),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      /* ignore */
    }
  }

  function acceptRecommended() {
    startTransition(async () => {
      await rescheduleContent(item.id, recommended.toISOString());
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-2xl bg-ink-900 border-l border-white/[0.08] overflow-y-auto">
        <header className="sticky top-0 z-10 bg-ink-900/95 backdrop-blur border-b border-white/[0.06] px-8 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[10px] uppercase tracking-[0.14em] border rounded px-1.5 py-0.5 ${tc.bg} ${tc.text}`}
                >
                  {tc.label}
                </span>
                <span className="chip">{statusLabel}</span>
                {item.pillarLabel ? (
                  <span
                    className="chip"
                    style={{ borderColor: `${item.pillarColor}60` }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: item.pillarColor ?? "#fff" }}
                    />
                    {item.pillarLabel}
                  </span>
                ) : null}
                {item.createdByAgent && item.createdByAgent !== "user" ? (
                  <span className="chip text-ink-400">by {item.createdByAgent}</span>
                ) : null}
              </div>
              <h2 className="editorial-heading text-3xl leading-tight">{item.title}</h2>
            </div>
            <button onClick={onClose} className="btn-ghost shrink-0" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={onEdit} className="btn-secondary">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={copyAll} className="btn-secondary">
              <Copy className="w-3.5 h-3.5" /> Copy all
            </button>
            <button
              onClick={() => {
                if (confirm("Archive this content item?")) {
                  startTransition(() => updateStatus(item.id, "archived"));
                  onClose();
                }
              }}
              className="btn-ghost"
            >
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="btn-ghost text-rose-300 hover:text-rose-200 ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <div className="px-8 py-6 space-y-6">
          {/* When — published / scheduled / recommended */}
          <section className="surface-2 p-5">
            <div className="eyebrow mb-3">Timing</div>
            {published ? (
              <div>
                <div className="text-sm text-ink-400 mb-0.5">Published</div>
                <div className="text-ink-100 text-lg">{formatWhen(published)}</div>
              </div>
            ) : scheduled ? (
              <div>
                <div className="text-sm text-ink-400 mb-0.5">Scheduled for</div>
                <div className="text-ink-100 text-lg">{formatWhen(scheduled)}</div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CalendarCheck2 className="w-4 h-4 text-emerald-300" />
                  <div className="text-sm text-ink-400">Recommended post time</div>
                </div>
                <div className="text-ink-100 text-lg">{formatWhen(recommended)}</div>
                <p className="text-xs text-ink-400 mt-2 italic">{suggestedReason}</p>
                <button onClick={acceptRecommended} className="btn-primary mt-4">
                  <CalendarCheck2 className="w-4 h-4" /> Schedule for this time
                </button>
              </div>
            )}
          </section>

          {/* Hook */}
          {item.hook ? (
            <Field label="Hook (first 3 seconds)">
              <p className="text-ink-100 italic leading-relaxed">"{item.hook}"</p>
            </Field>
          ) : null}

          {/* Script */}
          <Field label="Script">
            {item.script ? (
              <pre className="text-sm text-ink-100 whitespace-pre-wrap font-sans leading-relaxed">
                {item.script}
              </pre>
            ) : (
              <p className="text-sm text-ink-400 italic">
                No script yet. Click Edit to add one, or generate from the Script Generator.
              </p>
            )}
          </Field>

          {/* Caption */}
          <Field label="Caption">
            {item.caption ? (
              <p className="text-ink-100 whitespace-pre-wrap leading-relaxed">
                {item.caption}
              </p>
            ) : (
              <p className="text-sm text-ink-400 italic">No caption yet.</p>
            )}
          </Field>

          {/* CTA */}
          {item.cta ? (
            <Field label="CTA">
              <p className="text-ink-100">{item.cta}</p>
            </Field>
          ) : null}

          {/* Hashtags */}
          <Field label={`Hashtags (${item.hashtags.length})`}>
            {item.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.hashtags.map((h) => (
                  <span key={h} className="chip text-ink-200">
                    {h}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400 italic">No hashtags yet.</p>
            )}
          </Field>

          {/* Performance (if published) */}
          {item.performance ? (
            <Field label="Performance">
              <div className="grid grid-cols-4 gap-4">
                <Metric label="Reach" value={item.performance.reach} />
                <Metric label="Views" value={item.performance.views} />
                <Metric label="Likes" value={item.performance.likes} />
                <Metric label="Saves" value={item.performance.saves} />
              </div>
            </Field>
          ) : null}
        </div>
      </aside>

      <ConfirmModal
        open={confirmingDelete}
        destructive
        title="Delete this content?"
        description={`"${item.title}" will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        busy={isDeletePending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          startDeleteTransition(async () => {
            await deleteContent(item.id);
            setConfirmingDelete(false);
            onClose();
          });
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-2 px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="text-lg tabular-nums mt-1">{value.toLocaleString()}</div>
    </div>
  );
}
