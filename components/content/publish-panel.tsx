"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, ExternalLink, AlertCircle, RefreshCcw } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { publishNow, clearPublishError } from "@/app/actions/publish";
import type { LibItem } from "@/app/library/library-grid";

type Props = {
  item: LibItem;
  igEnabled: boolean;
  cloudinaryEnabled: boolean;
};

export function PublishPanel({ item, igEnabled, cloudinaryEnabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isPublished = !!item.publishedAt;
  const isPublishing = item.status === "publishing";
  const failed = item.status === "publish_failed" || !!item.publishError;

  const hasMedia = item.media.length > 0;
  const reelHasVideo = item.type !== "reel" || item.media.some((m) => m.resourceType === "video");
  const carouselSlideCount = item.type === "carousel" ? item.media.length : 0;
  const ready =
    igEnabled &&
    cloudinaryEnabled &&
    hasMedia &&
    reelHasVideo &&
    (item.type !== "carousel" || (carouselSlideCount >= 2 && carouselSlideCount <= 10));

  const blockingReason = !igEnabled
    ? "Instagram credentials not set."
    : !cloudinaryEnabled
    ? "Cloudinary credentials not set."
    : !hasMedia
    ? "Upload media first."
    : !reelHasVideo
    ? "Reels need a video file."
    : item.type === "carousel" && carouselSlideCount < 2
    ? "Carousels need 2–10 slides."
    : item.type === "carousel" && carouselSlideCount > 10
    ? "Too many slides (max 10)."
    : null;

  function doPublish() {
    setConfirming(false);
    setFeedback(null);
    startTransition(async () => {
      const res = await publishNow(item.id);
      if (res.ok) {
        setFeedback("Published. Refreshing…");
        router.refresh();
      } else {
        setFeedback(res.error ?? "Publish failed.");
      }
    });
  }

  function retryAfterFail() {
    startTransition(async () => {
      await clearPublishError(item.id);
      router.refresh();
    });
  }

  if (isPublished) {
    return (
      <div className="surface-2 p-4 space-y-2">
        <div className="text-sm text-emerald-300 font-medium">
          Published to Instagram
        </div>
        {item.igPermalink ? (
          <a
            href={item.igPermalink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-ink-200 hover:text-ink-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on Instagram
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="surface-2 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-ink-300" />
        <div className="text-sm font-medium text-ink-100">Publish to Instagram</div>
      </div>

      {failed ? (
        <div className="text-xs text-rose-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium mb-0.5">Last attempt failed</div>
            <div className="text-rose-300/80">{item.publishError ?? "Unknown error."}</div>
            <button
              onClick={retryAfterFail}
              className="btn-ghost text-xs mt-1 px-2 py-1"
            >
              <RefreshCcw className="w-3 h-3" /> Reset to scheduled
            </button>
          </div>
        </div>
      ) : null}

      {blockingReason ? (
        <div className="text-xs text-amber-300">{blockingReason}</div>
      ) : null}

      <button
        type="button"
        disabled={!ready || pending || isPublishing}
        onClick={() => setConfirming(true)}
        className="btn-primary w-full justify-center"
      >
        <Send className="w-4 h-4" />
        {isPublishing
          ? "Publishing…"
          : pending
          ? "Publishing…"
          : item.scheduledAt
          ? "Publish now (skip schedule)"
          : "Publish now"}
      </button>

      {feedback ? (
        <div className="text-xs text-ink-300">{feedback}</div>
      ) : null}

      <ConfirmModal
        open={confirming}
        title="Publish to Instagram now?"
        description={`This will post "${item.title}" to your IG account immediately. You can't unpost from here — only delete via the app.`}
        confirmLabel="Publish"
        busy={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={doPublish}
      />
    </div>
  );
}
