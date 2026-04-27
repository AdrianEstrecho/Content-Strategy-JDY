"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { TYPE_COLORS, type ContentType } from "@/lib/content";
import { ContentDrawer } from "@/components/content/content-drawer";
import { rescheduleContent } from "@/app/actions/content";
import type { LibItem, PillarOption } from "@/app/library/library-grid";

function monthHref(year: number, month: number) {
  const y = month < 0 ? year - 1 : month > 11 ? year + 1 : year;
  const m = ((month % 12) + 12) % 12;
  return `/calendar?m=${y}-${String(m + 1).padStart(2, "0")}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function CalendarView({
  year,
  month,
  items,
  pillars,
}: {
  year: number;
  month: number;
  items: LibItem[];
  pillars: PillarOption[];
}) {
  const [editing, setEditing] = useState<LibItem | null>(null);
  const [composeDate, setComposeDate] = useState<Date | null>(null);

  // Local mirror of items for optimistic drag-and-drop updates.
  // Re-syncs whenever the server sends new props (after revalidatePath).
  const [localItems, setLocalItems] = useState(items);
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const { weeks, today } = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstDow = (first.getDay() + 6) % 7; // Mon=0
    const gridStart = new Date(year, month, 1 - firstDow);
    const weeks: Date[][] = [];
    const cursor = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        row.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(row);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { weeks, today };
  }, [year, month]);

  const byDay = useMemo(() => {
    const map = new Map<string, LibItem[]>();
    for (const item of localItems) {
      if (!item.scheduledAt) continue;
      const d = new Date(item.scheduledAt);
      const key = dayKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    // Sort each day's items by time ascending for predictable rendering
    for (const list of map.values()) {
      list.sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
    }
    return map;
  }, [localItems]);

  function handleDrop(target: Date, itemId: string) {
    const item = localItems.find((x) => x.id === itemId);
    if (!item) return;

    // Preserve time-of-day from original scheduledAt (default 6pm if missing)
    const original = item.scheduledAt ? new Date(item.scheduledAt) : null;
    const newDate = new Date(target);
    newDate.setHours(
      original?.getHours() ?? 18,
      original?.getMinutes() ?? 0,
      0,
      0
    );

    // No-op if same day + same time
    if (original && dayKey(original) === dayKey(newDate)) return;

    const iso = newDate.toISOString();

    // Optimistic update
    setLocalItems((prev) =>
      prev.map((x) =>
        x.id === itemId ? { ...x, scheduledAt: iso, status: "scheduled" } : x
      )
    );

    startTransition(async () => {
      await rescheduleContent(itemId, iso);
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Link className="btn-secondary" href={monthHref(year, month - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <Link className="btn-secondary" href={monthHref(year, month + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Link>
        <Link
          className="btn-ghost"
          href={monthHref(new Date().getFullYear(), new Date().getMonth())}
        >
          Today
        </Link>
        <div className="ml-auto flex items-center gap-2 text-xs text-ink-400">
          {(Object.keys(TYPE_COLORS) as ContentType[]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${TYPE_COLORS[t].bg}`} />
              {TYPE_COLORS[t].label}
            </span>
          ))}
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-ink-850">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-2 eyebrow border-r border-white/[0.04] last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((d, idx) => {
            const inMonth = d.getMonth() === month;
            const isToday = d.getTime() === today.getTime();
            const key = dayKey(d);
            const dayItems = byDay.get(key) ?? [];
            const isDropTarget = dropTargetKey === key && draggingId !== null;

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (draggingId) return;
                  const at = new Date(d);
                  at.setHours(18, 0, 0, 0);
                  setComposeDate(at);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    const at = new Date(d);
                    at.setHours(18, 0, 0, 0);
                    setComposeDate(at);
                  }
                }}
                onDragOver={(e) => {
                  if (draggingId) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }
                }}
                onDragEnter={(e) => {
                  if (draggingId) {
                    e.preventDefault();
                    setDropTargetKey(key);
                  }
                }}
                onDragLeave={(e) => {
                  // only clear if leaving to outside this cell (not entering child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropTargetKey((prev) => (prev === key ? null : prev));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setDropTargetKey(null);
                  if (id) handleDrop(d, id);
                }}
                className={cn(
                  "text-left min-h-[108px] border-r border-b border-white/[0.04] last:border-r-0 p-2 relative cursor-pointer",
                  "hover:bg-white/[0.02] focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20",
                  !inMonth && "bg-ink-900/60 text-ink-500",
                  isDropTarget &&
                    "bg-white/[0.06] ring-1 ring-inset ring-emerald-400/40"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      isToday
                        ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-ink-950 font-semibold"
                        : inMonth
                        ? "text-ink-200"
                        : "text-ink-500"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  {dayItems.length > 0 ? (
                    <span className="text-[10px] text-ink-400">{dayItems.length}</span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {dayItems.slice(0, 3).map((it) => {
                    const tc = TYPE_COLORS[it.type as ContentType];
                    const isDragging = draggingId === it.id;
                    return (
                      <div
                        key={it.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", it.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingId(it.id);
                        }}
                        onDragEnd={(e) => {
                          e.stopPropagation();
                          setDraggingId(null);
                          setDropTargetKey(null);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(it);
                        }}
                        className={cn(
                          "group flex items-center gap-1 truncate text-[11px] px-1.5 py-1 rounded border cursor-grab active:cursor-grabbing hover:brightness-125",
                          tc.bg,
                          tc.text,
                          isDragging && "opacity-40"
                        )}
                        title="Drag to reschedule · click to edit"
                      >
                        <GripVertical className="w-3 h-3 opacity-40 group-hover:opacity-80 shrink-0" />
                        <span className="truncate">
                          {it.scheduledAt
                            ? new Date(it.scheduledAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}{" "}
                          {it.title}
                        </span>
                      </div>
                    );
                  })}
                  {dayItems.length > 3 ? (
                    <div className="text-[10px] text-ink-400 px-1.5">
                      +{dayItems.length - 3} more
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-ink-500 mt-3 italic">
        Tip: drag any block to a new day to reschedule. Time-of-day is preserved.
      </div>

      {(editing || composeDate) && (
        <ContentDrawer
          item={editing}
          pillars={pillars}
          defaultDate={composeDate}
          onClose={() => {
            setEditing(null);
            setComposeDate(null);
          }}
        />
      )}
    </>
  );
}
