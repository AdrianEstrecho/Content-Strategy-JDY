// Suggest the next good post slot based on what's already scheduled.
// Heuristic: next weekday at 6:00 PM local time where no other content is booked.
// Skips Sundays (low engagement), prefers Tue–Fri.

const GOOD_DAYS = new Set([2, 3, 4, 5]); // Tue, Wed, Thu, Fri
const EVENING_HOUR = 18;

export function suggestPostDate(
  taken: Date[],
  from: Date = new Date()
): { date: Date; reason: string } {
  const takenKeys = new Set(
    taken.map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    })
  );

  const cursor = new Date(from);
  cursor.setHours(EVENING_HOUR, 0, 0, 0);
  // Start at tomorrow if we're past today's evening window
  if (cursor.getTime() <= from.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
  }

  for (let i = 0; i < 21; i++) {
    const dayKey = new Date(cursor);
    dayKey.setHours(0, 0, 0, 0);
    const dow = cursor.getDay();
    if (GOOD_DAYS.has(dow) && !takenKeys.has(dayKey.getTime())) {
      return {
        date: new Date(cursor),
        reason: "Next open Tue–Fri evening — peak window for home-buyer audiences.",
      };
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Fallback: just return tomorrow 6 PM
  const fallback = new Date(from);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(EVENING_HOUR, 0, 0, 0);
  return {
    date: fallback,
    reason: "No obvious slot found — defaulting to tomorrow evening.",
  };
}

export function formatWhen(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
