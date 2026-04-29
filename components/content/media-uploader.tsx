"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Image as ImageIcon, Film, Loader2 } from "lucide-react";
import type { LibMedia } from "@/app/library/library-grid";

type Props = {
  itemId: string;
  itemType: string; // reel | carousel | story | post
  media: LibMedia[];
  cloudinaryEnabled: boolean;
};

export function MediaUploader({ itemId, itemType, media, cloudinaryEnabled }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const acceptsVideo = itemType === "reel" || itemType === "carousel";
  const acceptsImage = itemType !== "reel";
  const accept = [
    acceptsImage ? "image/*" : null,
    acceptsVideo ? "video/*" : null,
  ]
    .filter(Boolean)
    .join(",");

  const allowMultiple = itemType === "carousel";
  const slotsLeft =
    itemType === "carousel" ? Math.max(0, 10 - media.length) :
    itemType === "post" ? Math.max(0, 1 - media.length) :
    itemType === "reel" ? Math.max(0, 1 - media.filter((m) => m.resourceType === "video").length) :
    0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const list = Array.from(files).slice(0, slotsLeft || files.length);
      for (const file of list) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("contentItemId", itemId);
        const res = await fetch("/api/media/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? "Upload failed");
        }
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeAsset(publicId: string) {
    setError(null);
    try {
      const res = await fetch("/api/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId: itemId, publicId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Delete failed");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (itemType === "story") {
    return (
      <div className="surface-2 p-4 text-sm text-ink-400">
        Stories aren't auto-postable yet — use the IG app.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!cloudinaryEnabled ? (
        <div className="surface-2 px-3 py-2.5 text-xs text-amber-300 border border-amber-400/20">
          Cloudinary keys aren't set. Add CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET to .env.
        </div>
      ) : null}

      {media.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div
              key={m.publicId}
              className="relative group surface-2 overflow-hidden aspect-square"
            >
              {m.resourceType === "video" ? (
                <>
                  {m.thumbnailUrl ? (
                    <img
                      src={m.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-6 h-6 text-ink-400" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 chip text-[10px] bg-black/60 border-white/10">
                    Video {m.duration ? `${Math.round(m.duration)}s` : ""}
                  </span>
                </>
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeAsset(m.publicId)}
                className="absolute top-1 right-1 p-1 rounded bg-black/70 text-rose-300 hover:text-rose-200 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove asset"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {slotsLeft > 0 ? (
        <button
          type="button"
          disabled={uploading || !cloudinaryEnabled}
          onClick={() => inputRef.current?.click()}
          className="btn-secondary w-full justify-center"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {media.length === 0
                ? itemType === "reel"
                  ? "Upload Reel video"
                  : itemType === "carousel"
                  ? "Upload slides (2–10 images)"
                  : "Upload image"
                : `Add ${itemType === "carousel" ? "another slide" : "more"}`}
            </>
          )}
        </button>
      ) : (
        <div className="text-xs text-ink-400 italic">
          {itemType === "carousel" ? "10 slide max." : "All slots filled."}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={allowMultiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error ? (
        <div className="text-xs text-rose-300 flex items-start gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
