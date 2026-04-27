import { prisma } from "@/lib/db";
import { parseList } from "@/lib/json";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { m?: string };
}) {
  const now = new Date();
  const [ystr, mstr] = (searchParams.m ?? "").split("-");
  const year = Number(ystr) || now.getFullYear();
  const month = Number(mstr) ? Number(mstr) - 1 : now.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  // Grab items for this month plus a 7-day pad on either side so edge weeks
  // show partial neighbors.
  const windowStart = new Date(monthStart);
  windowStart.setDate(windowStart.getDate() - 7);
  const windowEnd = new Date(monthEnd);
  windowEnd.setDate(windowEnd.getDate() + 7);

  const [items, pillars] = await Promise.all([
    prisma.contentItem.findMany({
      where: { scheduledAt: { gte: windowStart, lt: windowEnd } },
      include: { pillar: true },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.pillar.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title={monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        description="Click a day to plan. Click a block to edit. Drag a block to a new day to reschedule."
      />
      <CalendarView
        year={year}
        month={month}
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
          createdByAgent: i.createdByAgent,
          performance: null,
        }))}
        pillars={pillars.map((p) => ({ id: p.id, label: p.label, color: p.color }))}
      />
    </>
  );
}
