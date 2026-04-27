"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Save } from "lucide-react";
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  STATUS_LABELS,
  TYPE_COLORS,
  type ContentStatus,
  type ContentType,
} from "@/lib/content";
import { upsertContent } from "@/app/actions/content";
import type { LibItem, PillarOption } from "@/app/library/library-grid";

type Props = {
  item: LibItem | null;
  pillars: PillarOption[];
  defaultDate?: Date | null;
  onClose: () => void;
};

export function ContentDrawer({ item, pillars, defaultDate, onClose }: Props) {
  const [type, setType] = useState<ContentType>((item?.type as ContentType) ?? "reel");
  const [status, setStatus] = useState<ContentStatus>(
    (item?.status as ContentStatus) ?? (defaultDate ? "scheduled" : "idea")
  );
  const [title, setTitle] = useState(item?.title ?? "");
  const [hook, setHook] = useState(item?.hook ?? "");
  const [caption, setCaption] = useState(item?.caption ?? "");
  const [pillarId, setPillarId] = useState<string>(item?.pillarId ?? "");
  const [scheduledAt, setScheduledAt] = useState<string>(() => {
    const d = item?.scheduledAt ? new Date(item.scheduledAt) : defaultDate;
    if (!d) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  function save() {
    startTransition(async () => {
      await upsertContent({
        id: item?.id,
        type,
        status,
        title,
        hook,
        caption,
        pillarId: pillarId || null,
        scheduledAt: scheduledAt || null,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-lg bg-ink-900 border-l border-white/[0.08] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-ink-900/95 backdrop-blur">
          <div>
            <div className="eyebrow">{item ? "Edit content" : "New content"}</div>
            <div className="editorial-heading text-xl mt-0.5">
              {title || "Untitled piece"}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              placeholder="Working title — you'll refine later"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={type}
                onChange={(e) => setType(e.target.value as ContentType)}
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_COLORS[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
              >
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Pillar</label>
              <select
                className="input"
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
              >
                <option value="">— None —</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Scheduled for</label>
              <input
                type="datetime-local"
                className="input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Hook (first 3 seconds)</label>
            <textarea
              className="input min-h-[60px]"
              placeholder="Stop scrolling — here's why your offer is rejected even when you offer more money…"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Caption</label>
            <textarea
              className="input min-h-[120px]"
              placeholder="Caption draft. You can generate this from the Script Generator later."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] sticky bottom-0 bg-ink-900/95 backdrop-blur flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={save} disabled={pending || !title.trim()} className="btn-primary">
            <Save className="w-4 h-4" /> {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </aside>
    </div>
  );
}
