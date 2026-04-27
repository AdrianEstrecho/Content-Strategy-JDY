import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  icon?: React.ReactNode;
  className?: string;
};

export function Empty({ title, description, cta, icon, className }: Props) {
  return (
    <div
      className={cn(
        "surface flex flex-col items-center justify-center text-center px-8 py-14",
        className
      )}
    >
      {icon ? <div className="mb-3 text-ink-400">{icon}</div> : null}
      <div className="editorial-heading text-xl mb-1">{title}</div>
      {description ? (
        <p className="text-sm text-ink-400 max-w-sm mb-4">{description}</p>
      ) : null}
      {cta ? (
        <Link href={cta.href} className="btn-secondary">
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
