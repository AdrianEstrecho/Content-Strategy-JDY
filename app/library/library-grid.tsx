"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, Filter, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  STATUS_LABELS,
  TYPE_COLORS,
  type ContentStatus,
  type ContentType,
} from "@/lib/content";
import { ContentDrawer } from "@/components/content/content-drawer";
import { ContentDetail } from "@/components/content/content-detail";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { deleteContent, updateStatus } from "@/app/actions/content";

export type LibItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  hook: string;
  script: string;
  caption: string;
  cta: string;
  hashtags: string[];
  thumbnailUrl: string | null;
  pillarId: string | null;
  pillarLabel?: string;
  pillarColor?: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdByAgent: string | null;
  performance: { views: number; likes: number; saves: number; reach: number } | null;
};

export type PillarOption = { id: string; label: string; color: string };

export function LibraryGrid({
  items,
  pillars,
  suggestedDate,
  suggestedReason,
  initialQ = "",
}: {
  items: LibItem[];
  pillars: PillarOption[];
  suggestedDate: string;
  suggestedReason: string;
  initialQ?: string;
}) {
  const [q, setQ] = useState(initialQ);
  const [typeFilter, setTypeFilter] = useState<ContentType | "">("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "">("");
  const [viewing, setViewing] = useState<LibItem | null>(null);
  const [editing, setEditing] = useState<LibItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LibItem | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [, startTransition] = useTransition();

  // Sync the local input when the URL ?q= changes (topbar drives this)
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (typeFilter && i.type !== typeFilter) return false;
      if (statusFilter && i.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        i.title.toLowerCase().includes(needle) ||
        i.hook.toLowerCase().includes(needle) ||
        i.caption.toLowerCase().includes(needle) ||
        i.script.toLowerCase().includes(needle) ||
        i.cta.toLowerCase().includes(needle) ||
        i.hashtags.some((h) => h.toLowerCase().includes(needle))
      );
    });
  }, [items, q, typeFilter, statusFilter]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search title, hook, caption…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ink-400" />
          <select
            className="input w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ContentType | "")}
          >
            <option value="">All types</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_COLORS[t].label}
              </option>
            ))}
          </select>
          <select
            className="input w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContentStatus | "")}
          >
            <option value="">All statuses</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="surface flex flex-col items-center justify-center text-center px-8 py-14">
          <div className="editorial-heading text-xl mb-1">No matches</div>
          <p className="text-sm text-ink-400 max-w-sm mb-4">
            {items.length === 0
              ? "Your library is empty. Draft something to get started."
              : "Try clearing the filters or adjusting your search."}
          </p>
          <button onClick={() => setCreating(true)} className="btn-secondary">
            <Plus className="w-4 h-4" /> New content
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => {
            const tc = TYPE_COLORS[i.type as ContentType];
            const isPublished = i.status === "published";
            return (
              <article
                key={i.id}
                onClick={() => setViewing(i)}
                className="surface overflow-hidden group cursor-pointer hover:border-white/[0.12] transition-colors"
              >
                <div className="relative aspect-[4/3] bg-gradient-to-br from-ink-800 to-ink-900 flex items-center justify-center">
                  {i.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-6xl opacity-20">
                      {i.type === "reel" ? "▶" : i.type === "carousel" ? "▧" : i.type === "story" ? "◉" : "◼"}
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 text-[10px] uppercase tracking-[0.14em] border rounded px-1.5 py-0.5 ${tc.bg} ${tc.text}`}
                  >
                    {tc.label}
                  </span>
                  <span className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.14em] border rounded px-1.5 py-0.5 bg-black/40 border-white/10 text-ink-200">
                    {STATUS_LABELS[i.status as ContentStatus]}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {i.pillarLabel ? (
                      <span
                        className="chip"
                        style={{ borderColor: `${i.pillarColor}60`, color: "#e8e8e6" }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: i.pillarColor ?? "#fff" }}
                        />
                        {i.pillarLabel}
                      </span>
                    ) : null}
                    {i.createdByAgent && i.createdByAgent !== "user" ? (
                      <span className="chip text-ink-400">{i.createdByAgent}</span>
                    ) : null}
                  </div>
                  <h3 className="text-ink-50 font-medium line-clamp-2 mb-1">{i.title}</h3>
                  {i.hook ? (
                    <p className="text-xs text-ink-400 line-clamp-2 mb-3 italic">"{i.hook}"</p>
                  ) : null}
                  {isPublished && i.performance ? (
                    <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-white/[0.05]">
                      <div>
                        <div className="eyebrow">Reach</div>
                        <div className="text-sm tabular-nums">
                          {i.performance.reach.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="eyebrow">Likes</div>
                        <div className="text-sm tabular-nums">
                          {i.performance.likes.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="eyebrow">Saves</div>
                        <div className="text-sm tabular-nums">
                          {i.performance.saves.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div
                    className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.05]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="btn-ghost" onClick={() => setEditing(i)}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        startTransition(() => updateStatus(i.id, "archived"))
                      }
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                    <button
                      className="btn-ghost text-rose-300 hover:text-rose-200 ml-auto"
                      onClick={() => setDeleting(i)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewing && !editing ? (
        <ContentDetail
          item={viewing}
          suggestedDate={suggestedDate}
          suggestedReason={suggestedReason}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {(editing || creating) && (
        <ContentDrawer
          item={editing}
          pillars={pillars}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        destructive
        title="Delete this content?"
        description={
          deleting
            ? `"${deleting.title}" will be permanently removed. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        busy={isDeletePending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const target = deleting;
          if (!target) return;
          startDeleteTransition(async () => {
            await deleteContent(target.id);
            setDeleting(null);
          });
        }}
      />
    </>
  );
}
