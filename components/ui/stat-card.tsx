import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "pos" | "neg" | "neutral";
  sub?: string;
  className?: string;
};

export function StatCard({ label, value, delta, deltaTone = "neutral", sub, className }: Props) {
  return (
    <div className={cn("surface px-5 py-4", className)}>
      <div className="eyebrow">{label}</div>
      <div className="flex items-baseline gap-2 mt-2">
        <div className="text-2xl font-semibold text-ink-50 tabular-nums">{value}</div>
        {delta ? (
          <span
            className={cn(
              "text-xs font-medium",
              deltaTone === "pos" && "text-emerald-400",
              deltaTone === "neg" && "text-rose-400",
              deltaTone === "neutral" && "text-ink-300"
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
      {sub ? <div className="text-xs text-ink-400 mt-1">{sub}</div> : null}
    </div>
  );
}
