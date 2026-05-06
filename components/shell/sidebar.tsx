"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Library,
  Sparkles,
  BarChart3,
  Bot,
  Compass,
  Brain,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { isAppStreaming } from "@/lib/nav-guard";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const nav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/library", label: "Library", icon: Library },
  { href: "/generate", label: "Script Generator", icon: Sparkles },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
  { href: "/strategy", label: "Strategy Hub", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function guardClick(e: React.MouseEvent, href: string) {
    if (!isAppStreaming()) return;
    const isCurrent =
      href === "/" ? pathname === "/" : pathname.startsWith(href);
    if (isCurrent) return;
    e.preventDefault();
    setPendingHref(href);
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-white/[0.06] bg-ink-950 flex-col">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <Link
          href="/"
          onClick={(e) => guardClick(e, "/")}
          className="flex items-center gap-2.5 group"
        >
          <span className="relative inline-block w-7 h-7 rounded-md bg-ig-gradient" />
          <span className="flex flex-col leading-none">
            <span className="editorial-heading text-lg">JustDoYou</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400 mt-1">
              Command Center
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => guardClick(e, item.href)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                active
                  ? "bg-white/[0.05] text-ink-50"
                  : "text-ink-300 hover:text-ink-50 hover:bg-white/[0.03]"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-white" : "text-ink-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="surface-2 px-3 py-3">
          <div className="eyebrow mb-1">Niche</div>
          <div className="text-sm text-ink-100">Real Estate</div>
          <div className="text-xs text-ink-400 mt-0.5">Home buyers</div>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingHref}
        title="Admin is still working"
        description="Leaving will cancel the response in progress. Continue anyway?"
        confirmLabel="Leave anyway"
        cancelLabel="Stay here"
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          if (href) router.push(href);
        }}
        onCancel={() => setPendingHref(null)}
      />
    </aside>
  );
}
