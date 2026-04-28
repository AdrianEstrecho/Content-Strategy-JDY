"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export function HowToUse() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost text-sm"
        aria-expanded={open}
      >
        <HelpCircle className="w-4 h-4" />
        How to use this page
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="surface p-5 mt-3">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs flex items-center justify-center tabular-nums text-ink-200">
                1
              </span>
              <p className="text-sm text-ink-200 leading-relaxed">
                <span className="text-ink-100 font-medium">Fill in Brand basics.</span>{" "}
                Name, niche, who you&apos;re talking to, and how you sound. Be specific —
                &quot;first-time buyers, 28–42&quot; beats &quot;people who want houses.&quot;
              </p>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs flex items-center justify-center tabular-nums text-ink-200">
                2
              </span>
              <p className="text-sm text-ink-200 leading-relaxed">
                <span className="text-ink-100 font-medium">Add 3–5 content pillars.</span>{" "}
                The recurring themes you own. Every idea the agents propose should fit one
                of them, so keep them distinct and tight.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs flex items-center justify-center tabular-nums text-ink-200">
                3
              </span>
              <p className="text-sm text-ink-200 leading-relaxed">
                <span className="text-ink-100 font-medium">Set concrete goals.</span>{" "}
                Numbers and horizons (e.g. &quot;10k followers by Q4&quot;). Analysis
                measures performance against these every week.
              </p>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs flex items-center justify-center tabular-nums text-ink-200">
                4
              </span>
              <p className="text-sm text-ink-200 leading-relaxed">
                <span className="text-ink-100 font-medium">Save.</span> Scripter,
                Researcher, Admin, and Analysis all pull from here on every run — update
                this page whenever your strategy shifts.
              </p>
            </li>
          </ol>
        </div>
      ) : null}
    </section>
  );
}
