"use client";

import { useState, useTransition } from "react";
import { Sparkles, Save, RefreshCw, Copy, Check } from "lucide-react";
import {
  runReelGenerator,
  runCarouselGenerator,
  saveReelToLibrary,
  saveCarouselToLibrary,
} from "@/app/actions/scripter";
import type { Carousel, ReelScript } from "@/lib/ai/schemas";

type PillarOpt = { id: string; label: string; color: string };

export function GenerateStudio({
  aiEnabled,
  initialMode,
  pillars,
}: {
  aiEnabled: boolean;
  initialMode: "reel" | "carousel";
  pillars: PillarOpt[];
}) {
  const [mode, setMode] = useState<"reel" | "carousel">(initialMode);

  return (
    <div>
      <div className="flex items-center gap-1 mb-6 p-1 surface-2 w-fit">
        {(["reel", "carousel"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              mode === m
                ? "bg-white/[0.07] text-white"
                : "text-ink-300 hover:text-white"
            }`}
          >
            {m === "reel" ? "Reel" : "Carousel"}
          </button>
        ))}
      </div>

      {mode === "reel" ? (
        <ReelPanel aiEnabled={aiEnabled} pillars={pillars} />
      ) : (
        <CarouselPanel aiEnabled={aiEnabled} pillars={pillars} />
      )}
    </div>
  );
}

function ReelPanel({ aiEnabled, pillars }: { aiEnabled: boolean; pillars: PillarOpt[] }) {
  const [topic, setTopic] = useState("");
  const [length, setLength] = useState<15 | 30 | 60 | 90>(30);
  const [hookStyle, setHookStyle] = useState<"" | "question" | "bold_claim" | "story" | "stat">("");
  const [tone, setTone] = useState("");
  const [pillarId, setPillarId] = useState<string>("");
  const [result, setResult] = useState<ReelScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);

  function generate() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const r = await runReelGenerator({
          topic,
          lengthSeconds: length,
          hookStyle: hookStyle || undefined,
          tone: tone || undefined,
        });
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate");
      }
    });
  }

  function save() {
    if (!result) return;
    startSaving(async () => {
      await saveReelToLibrary(result, pillarId || null);
      setSaved(true);
    });
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <section className="surface p-6 lg:col-span-2">
        <h2 className="editorial-heading text-xl mb-5">Reel brief</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Topic</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="e.g. How to win a bidding war without overpaying"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Length</label>
              <select
                className="input"
                value={length}
                onChange={(e) => setLength(Number(e.target.value) as 15 | 30 | 60 | 90)}
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
              </select>
            </div>
            <div>
              <label className="label">Hook style</label>
              <select
                className="input"
                value={hookStyle}
                onChange={(e) => setHookStyle(e.target.value as typeof hookStyle)}
              >
                <option value="">Auto (let Scripter pick)</option>
                <option value="question">Question</option>
                <option value="bold_claim">Bold claim</option>
                <option value="story">Story</option>
                <option value="stat">Stat</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Tone override (optional)</label>
            <input
              className="input"
              placeholder="e.g. punchier, more story-driven"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Pillar</label>
            <select
              className="input"
              value={pillarId}
              onChange={(e) => setPillarId(e.target.value)}
            >
              <option value="">— Assign later —</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={!aiEnabled || !topic.trim() || pending}
            className="btn-primary w-full justify-center"
          >
            <Sparkles className="w-4 h-4" />
            {pending ? "Writing…" : result ? "Regenerate" : "Generate Reel"}
          </button>
          {!aiEnabled ? (
            <p className="text-xs text-amber-300">
              Add an Anthropic API key in Settings to activate the Scripter.
            </p>
          ) : null}
          {error ? (
            <p className="text-xs text-rose-300">{error}</p>
          ) : null}
        </div>
      </section>

      <section className="lg:col-span-3">
        {!result ? (
          <div className="surface flex flex-col items-center justify-center text-center px-8 py-16 h-full">
            <Sparkles className="w-8 h-8 text-ink-400 mb-3" />
            <div className="editorial-heading text-xl mb-1">Ready when you are</div>
            <p className="text-sm text-ink-400 max-w-sm">
              Write a topic, hit Generate. You'll get a full script: hook, beats, on-screen text,
              B-roll ideas, caption, and hashtags.
            </p>
          </div>
        ) : (
          <ReelResult
            reel={result}
            pillarLabel={pillars.find((p) => p.id === pillarId)?.label}
            saving={saving}
            saved={saved}
            onSave={save}
            onRegen={generate}
          />
        )}
      </section>
    </div>
  );
}

function ReelResult({
  reel,
  pillarLabel,
  saving,
  saved,
  onSave,
  onRegen,
}: {
  reel: ReelScript;
  pillarLabel?: string;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onRegen: () => void;
}) {
  return (
    <div className="surface p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">
            Reel • {reel.lengthSeconds}s • hook style: {reel.hookStyle}
            {pillarLabel ? ` • ${pillarLabel}` : ""}
          </div>
          <h3 className="editorial-heading text-2xl">{reel.title}</h3>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onRegen} className="btn-ghost" title="Regenerate">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onSave} disabled={saving || saved} className="btn-primary">
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save to Library"}
              </>
            )}
          </button>
        </div>
      </div>

      <Section title="Hooks (first 3 seconds — pick one)">
        <div className="space-y-2">
          {reel.hooks.map((h, i) => (
            <div key={i} className="surface-2 p-3">
              <div className="eyebrow mb-1">Option {String.fromCharCode(65 + i)}</div>
              <p className="text-ink-100 italic">"{h}"</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Beats">
        <div className="space-y-3">
          {reel.beats.map((b, i) => (
            <div key={i} className="surface-2 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="eyebrow">Beat {i + 1}</span>
                <span className="text-xs text-ink-400 tabular-nums">{b.timestamp}</span>
              </div>
              <div className="grid gap-2 text-sm">
                <Kvp label="VO" value={b.voiceover} />
                <Kvp label="OST" value={b.onScreenText} />
                <Kvp label="B-roll" value={b.bRoll} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Caption">
        <p className="text-ink-100 whitespace-pre-wrap">{reel.caption}</p>
      </Section>

      <Section title="CTA">
        <p className="text-ink-100">{reel.cta}</p>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Hashtags">
          <div className="flex flex-wrap gap-1.5">
            {reel.hashtags.map((h) => (
              <span key={h} className="chip text-ink-200">
                {h}
              </span>
            ))}
          </div>
        </Section>
        <Section title="Suggested audio">
          <p className="text-ink-100 text-sm">{reel.suggestedAudio}</p>
        </Section>
      </div>
    </div>
  );
}

function CarouselPanel({
  aiEnabled,
  pillars,
}: {
  aiEnabled: boolean;
  pillars: PillarOpt[];
}) {
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState(5);
  const [goal, setGoal] = useState<"educate" | "sell" | "story" | "list">("educate");
  const [tone, setTone] = useState("");
  const [pillarId, setPillarId] = useState<string>("");
  const [result, setResult] = useState<Carousel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);

  function generate() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const r = await runCarouselGenerator({
          topic,
          numSlides: slides,
          goal,
          tone: tone || undefined,
        });
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate");
      }
    });
  }

  function save() {
    if (!result) return;
    startSaving(async () => {
      await saveCarouselToLibrary(result, pillarId || null);
      setSaved(true);
    });
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <section className="surface p-6 lg:col-span-2">
        <h2 className="editorial-heading text-xl mb-5">Carousel brief</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Topic</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="e.g. The 5-minute mortgage pre-approval checklist"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Slides</label>
              <input
                type="number"
                min={3}
                max={10}
                className="input"
                value={slides}
                onChange={(e) => setSlides(Math.max(3, Math.min(10, Number(e.target.value))))}
              />
            </div>
            <div>
              <label className="label">Goal</label>
              <select
                className="input"
                value={goal}
                onChange={(e) => setGoal(e.target.value as typeof goal)}
              >
                <option value="educate">Educate</option>
                <option value="sell">Sell</option>
                <option value="story">Story</option>
                <option value="list">List</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Tone override (optional)</label>
            <input
              className="input"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. warmer, more direct"
            />
          </div>
          <div>
            <label className="label">Pillar</label>
            <select
              className="input"
              value={pillarId}
              onChange={(e) => setPillarId(e.target.value)}
            >
              <option value="">— Assign later —</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={!aiEnabled || !topic.trim() || pending}
            className="btn-primary w-full justify-center"
          >
            <Sparkles className="w-4 h-4" />
            {pending ? "Writing…" : result ? "Regenerate" : "Generate Carousel"}
          </button>
          {!aiEnabled ? (
            <p className="text-xs text-amber-300">
              Add an Anthropic API key in Settings to activate the Scripter.
            </p>
          ) : null}
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        </div>
      </section>

      <section className="lg:col-span-3">
        {!result ? (
          <div className="surface flex flex-col items-center justify-center text-center px-8 py-16 h-full">
            <Sparkles className="w-8 h-8 text-ink-400 mb-3" />
            <div className="editorial-heading text-xl mb-1">Ready when you are</div>
            <p className="text-sm text-ink-400 max-w-sm">
              Write a topic, pick a goal, hit Generate. You'll get slide-by-slide copy with a cover
              hook and a closing CTA.
            </p>
          </div>
        ) : (
          <CarouselResult
            carousel={result}
            pillarLabel={pillars.find((p) => p.id === pillarId)?.label}
            saving={saving}
            saved={saved}
            onSave={save}
            onRegen={generate}
          />
        )}
      </section>
    </div>
  );
}

function CarouselResult({
  carousel,
  pillarLabel,
  saving,
  saved,
  onSave,
  onRegen,
}: {
  carousel: Carousel;
  pillarLabel?: string;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onRegen: () => void;
}) {
  return (
    <div className="surface p-6 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">
            Carousel • {carousel.slides.length} slides{pillarLabel ? ` • ${pillarLabel}` : ""}
          </div>
          <h3 className="editorial-heading text-2xl">{carousel.title}</h3>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onRegen} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={onSave} disabled={saving || saved} className="btn-primary">
            {saved ? (
              <>
                <Check className="w-4 h-4" /> Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save to Library"}
              </>
            )}
          </button>
        </div>
      </div>

      <Section title="Cover hook (slide 1)">
        <p className="text-ink-100 italic text-lg">"{carousel.coverHook}"</p>
      </Section>

      <Section title="Slides">
        <div className="grid gap-3 md:grid-cols-2">
          {carousel.slides.map((s) => (
            <div key={s.slideNumber} className="surface-2 p-4 aspect-[4/5] flex flex-col">
              <div className="eyebrow mb-2">Slide {s.slideNumber}</div>
              <div className="editorial-heading text-xl mb-2">{s.headline}</div>
              <div className="text-sm text-ink-300 whitespace-pre-wrap">{s.body}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Caption">
        <p className="text-ink-100 whitespace-pre-wrap">{carousel.caption}</p>
      </Section>

      <Section title="CTA">
        <p className="text-ink-100">{carousel.cta}</p>
      </Section>

      <Section title="Hashtags">
        <div className="flex flex-wrap gap-1.5">
          {carousel.hashtags.map((h) => (
            <span key={h} className="chip text-ink-200">
              {h}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </div>
  );
}

function Kvp({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[60px_1fr] gap-3">
      <span className="text-xs text-ink-400 uppercase tracking-[0.12em]">{label}</span>
      <span className="text-ink-100">{value}</span>
    </div>
  );
}
