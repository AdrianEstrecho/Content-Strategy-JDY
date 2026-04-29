import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { parseList } from "@/lib/json";
import { suggestPostDate } from "@/lib/schedule";
import type { StoredMedia } from "@/lib/media";
import { isIGEnabled } from "@/lib/instagram";
import { isCloudinaryEnabled } from "@/lib/cloudinary";
import { LibraryGrid } from "./library-grid";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const initialQ = searchParams?.q?.trim() ?? "";
  const [items, pillars, allScheduled] = await Promise.all([
    prisma.contentItem.findMany({
      include: { performance: true, pillar: true },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.pillar.findMany({ orderBy: { order: "asc" } }),
    prisma.contentItem.findMany({
      where: { scheduledAt: { not: null } },
      select: { scheduledAt: true },
    }),
  ]);

  const takenDates = allScheduled
    .map((x) => x.scheduledAt)
    .filter((d): d is Date => d !== null);

  const suggestion = suggestPostDate(takenDates);

  return (
    <>
      <PageHeader
        eyebrow="Content Library"
        title="Everything you've made"
        description="Search, filter, edit, and archive. Click any card for the full script and recommended post time."
      />
      <LibraryGrid
        initialQ={initialQ}
        suggestedDate={suggestion.date.toISOString()}
        suggestedReason={suggestion.reason}
        igEnabled={isIGEnabled()}
        cloudinaryEnabled={isCloudinaryEnabled()}
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status,
          hook: i.hook,
          script: i.script,
          caption: i.caption,
          cta: i.cta,
          hashtags: parseList<string>(i.hashtags),
          thumbnailUrl: i.thumbnailUrl,
          pillarId: i.pillarId,
          pillarLabel: i.pillar?.label,
          pillarColor: i.pillar?.color,
          scheduledAt: i.scheduledAt?.toISOString() ?? null,
          publishedAt: i.publishedAt?.toISOString() ?? null,
          igPermalink: i.igPermalink,
          publishError: i.publishError,
          media: parseList<StoredMedia>(i.mediaUrls).map((m) => ({
            url: m.url,
            publicId: m.publicId,
            resourceType: m.resourceType,
            thumbnailUrl: m.thumbnailUrl,
            duration: m.duration,
          })),
          createdByAgent: i.createdByAgent,
          performance: i.performance
            ? {
                views: i.performance.views,
                likes: i.performance.likes,
                saves: i.performance.saves,
                reach: i.performance.reach,
              }
            : null,
        }))}
        pillars={pillars.map((p) => ({ id: p.id, label: p.label, color: p.color }))}
      />
    </>
  );
}
