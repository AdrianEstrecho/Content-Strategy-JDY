"use client";

import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const urlQ = params?.get("q") ?? "";
  const [q, setQ] = useState(urlQ);

  // Keep the input in sync when navigation changes ?q (e.g. clearing it elsewhere)
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  // ⌘K / Ctrl+K focuses the search; Esc clears + blurs while focused.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submit() {
    const trimmed = q.trim();
    const target = "/library";
    if (trimmed) {
      router.push(`${target}?q=${encodeURIComponent(trimmed)}`);
    } else if (pathname === target) {
      router.push(target);
    }
  }

  function clear() {
    setQ("");
    if (pathname === "/library") {
      router.push("/library");
    }
    inputRef.current?.focus();
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-4 px-4 md:px-8 py-3 max-w-[1400px] mx-auto">
        <Link
          href="/"
          aria-label="Go to Dashboard"
          className="md:hidden flex items-center gap-2 shrink-0"
        >
          <span className="inline-block w-7 h-7 rounded-md bg-ig-gradient" />
          <span className="editorial-heading text-base">JustDoYou</span>
        </Link>
        <div className="hidden md:block flex-1 min-w-0">
          <div className="eyebrow">{today}</div>
          <Link
            href="/"
            className="text-sm text-ink-200 mt-0.5 truncate hover:text-ink-50 transition-colors block"
          >
            Plan, create, and analyze — all in one place.
          </Link>
        </div>
        <div className="flex-1 md:hidden" />
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] focus-within:border-white/[0.18] focus-within:bg-white/[0.05] transition-colors w-72"
        >
          <Search className="w-3.5 h-3.5 text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.blur();
              }
            }}
            placeholder="Search content, ideas, hashtags…"
            aria-label="Search content library"
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-ink-100 placeholder:text-ink-400"
          />
          {q ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="text-ink-400 hover:text-ink-100 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-ink-300 shrink-0">
              ⌘K
            </kbd>
          )}
        </form>
        <Link href="/generate" className="btn-primary">
          <Plus className="w-4 h-4" /> New Content
        </Link>
      </div>
    </header>
  );
}
