export const CONTENT_TYPES = ["reel", "carousel", "story", "post"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = [
  "idea",
  "scripted",
  "filmed",
  "edited",
  "scheduled",
  "published",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const TYPE_COLORS: Record<ContentType, { bg: string; text: string; label: string }> = {
  reel:     { bg: "bg-purple-500/15 border-purple-400/30", text: "text-purple-200", label: "Reel" },
  carousel: { bg: "bg-sky-500/15 border-sky-400/30",       text: "text-sky-200",    label: "Carousel" },
  story:    { bg: "bg-amber-500/15 border-amber-400/30",   text: "text-amber-200",  label: "Story" },
  post:     { bg: "bg-emerald-500/15 border-emerald-400/30", text: "text-emerald-200", label: "Post" },
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  filmed: "Filmed",
  edited: "Edited",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export const PIPELINE_STAGES: ContentStatus[] = [
  "idea",
  "scripted",
  "filmed",
  "edited",
  "scheduled",
  "published",
];
