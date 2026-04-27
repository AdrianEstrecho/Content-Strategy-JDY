"use client";

import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveBrand, savePillar, deletePillar, type PillarInput } from "@/app/actions/strategy";

type BrandState = {
  name: string;
  niche: string;
  audience: string;
  voice: string;
  goals: { label: string; target?: string; horizon?: string }[];
};

export function StrategyEditor({
  initial,
}: {
  initial: { brand: BrandState; pillars: PillarInput[] };
}) {
  const [brand, setBrand] = useState<BrandState>(initial.brand);
  const [pillars, setPillars] = useState<PillarInput[]>(initial.pillars);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function updateGoal(i: number, patch: Partial<BrandState["goals"][number]>) {
    setBrand((b) => ({
      ...b,
      goals: b.goals.map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    }));
  }

  function addGoal() {
    setBrand((b) => ({ ...b, goals: [...b.goals, { label: "", target: "", horizon: "" }] }));
  }

  function removeGoal(i: number) {
    setBrand((b) => ({ ...b, goals: b.goals.filter((_, idx) => idx !== i) }));
  }

  function save() {
    startTransition(async () => {
      await saveBrand(brand);
      for (const p of pillars) {
        await savePillar(p);
      }
      setSavedAt(new Date().toLocaleTimeString());
    });
  }

  function addPillar() {
    setPillars((ps) => [
      ...ps,
      {
        label: "",
        description: "",
        color: ["#833ab4", "#fd1d1d", "#fcb045", "#4f46e5", "#059669"][ps.length % 5],
        order: ps.length,
      },
    ]);
  }

  async function removePillar(i: number) {
    const p = pillars[i];
    setPillars((ps) => ps.filter((_, idx) => idx !== i));
    if (p.id) await deletePillar(p.id);
  }

  return (
    <div className="space-y-8">
      {/* Brand basics */}
      <section className="surface p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="editorial-heading text-2xl">Brand basics</h2>
          <button onClick={save} disabled={pending} className="btn-primary">
            <Save className="w-4 h-4" />
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Brand name</label>
            <input
              className="input"
              value={brand.name}
              onChange={(e) => setBrand({ ...brand, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Niche</label>
            <input
              className="input"
              placeholder="Real estate — home buyers"
              value={brand.niche}
              onChange={(e) => setBrand({ ...brand, niche: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Target audience</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="First-time home buyers aged 28–42, researching neighborhoods and financing…"
              value={brand.audience}
              onChange={(e) => setBrand({ ...brand, audience: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Voice & tone</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Direct, warm, and practical. No jargon. Short sentences. Lead with the benefit."
              value={brand.voice}
              onChange={(e) => setBrand({ ...brand, voice: e.target.value })}
            />
          </div>
        </div>
        {savedAt ? <div className="text-xs text-emerald-400 mt-3">Saved at {savedAt}</div> : null}
      </section>

      {/* Pillars */}
      <section className="surface p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="editorial-heading text-2xl">Content pillars</h2>
            <p className="text-sm text-ink-400 mt-1">
              The 3–5 themes you own. Everything the agents propose should fit one.
            </p>
          </div>
          <button onClick={addPillar} className="btn-secondary">
            <Plus className="w-4 h-4" /> Pillar
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {pillars.length === 0 ? (
            <div className="md:col-span-2 text-sm text-ink-400 py-4">
              Add your first pillar to get started.
            </div>
          ) : null}
          {pillars.map((p, i) => (
            <div key={p.id ?? `new-${i}`} className="surface-2 p-4">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="color"
                  value={p.color}
                  onChange={(e) => {
                    const color = e.target.value;
                    setPillars((ps) =>
                      ps.map((x, idx) => (idx === i ? { ...x, color } : x))
                    );
                  }}
                  className="w-8 h-8 rounded-md border-0 bg-transparent cursor-pointer"
                  aria-label="Pillar color"
                />
                <input
                  className="input flex-1"
                  placeholder="Pillar name (e.g. Founder mindset)"
                  value={p.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setPillars((ps) =>
                      ps.map((x, idx) => (idx === i ? { ...x, label } : x))
                    );
                  }}
                />
                <button
                  onClick={() => removePillar(i)}
                  className="btn-ghost text-rose-300 hover:text-rose-200"
                  aria-label="Remove pillar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea
                className="input min-h-[70px]"
                placeholder="What belongs in this pillar? What's the angle?"
                value={p.description}
                onChange={(e) => {
                  const description = e.target.value;
                  setPillars((ps) =>
                    ps.map((x, idx) => (idx === i ? { ...x, description } : x))
                  );
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Goals */}
      <section className="surface p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="editorial-heading text-2xl">Goals</h2>
            <p className="text-sm text-ink-400 mt-1">
              Concrete targets the Analysis agent measures against.
            </p>
          </div>
          <button onClick={addGoal} className="btn-secondary">
            <Plus className="w-4 h-4" /> Goal
          </button>
        </div>
        <div className="space-y-3">
          {brand.goals.length === 0 ? (
            <div className="text-sm text-ink-400 py-2">
              e.g. "Reach 10k followers by Q4", "Book 3 buyer consultations per week from IG DMs".
            </div>
          ) : null}
          {brand.goals.map((g, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-start">
              <input
                className="input col-span-6"
                placeholder="Goal"
                value={g.label}
                onChange={(e) => updateGoal(i, { label: e.target.value })}
              />
              <input
                className="input col-span-3"
                placeholder="Target (e.g. 10,000)"
                value={g.target ?? ""}
                onChange={(e) => updateGoal(i, { target: e.target.value })}
              />
              <input
                className="input col-span-2"
                placeholder="Horizon"
                value={g.horizon ?? ""}
                onChange={(e) => updateGoal(i, { horizon: e.target.value })}
              />
              <button
                onClick={() => removeGoal(i)}
                className="btn-ghost col-span-1 justify-center text-rose-300 hover:text-rose-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
