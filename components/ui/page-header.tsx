import { cn } from "@/lib/cn";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, children, className }: Props) {
  return (
    <div className={cn("flex items-end justify-between gap-6 mb-8", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="editorial-heading text-4xl md:text-5xl leading-[1.02]">{title}</h1>
        {description ? (
          <p className="text-ink-300 text-[15px] mt-3 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2 shrink-0">{children}</div> : null}
    </div>
  );
}
