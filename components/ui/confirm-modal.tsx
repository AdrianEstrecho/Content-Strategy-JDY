"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus cancel by default — destructive actions shouldn't be one Enter away.
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div
        className="surface relative p-6 w-full max-w-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="flex items-start gap-3">
          {destructive ? (
            <span className="shrink-0 w-9 h-9 rounded-full bg-rose-500/10 border border-rose-400/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-300" />
            </span>
          ) : null}
          <div className="flex-1 min-w-0">
            <h2
              id="confirm-modal-title"
              className="editorial-heading text-lg leading-tight"
            >
              {title}
            </h2>
            {description ? (
              <p className="text-sm text-ink-400 mt-1.5 leading-snug">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end mt-6">
          <button
            ref={cancelRef}
            type="button"
            className="btn-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              destructive
                ? "px-3 py-1.5 rounded-md bg-rose-500/15 border border-rose-400/40 text-rose-200 hover:bg-rose-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                : "btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            }
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
