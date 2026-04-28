"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const params = useSearchParams();
  const from = params?.get("from") ?? "/";
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase: pass, from }),
      });
      const data = (await res.json()) as { ok: boolean; redirect?: string; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Login failed");
        setBusy(false);
        return;
      }
      window.location.href = data.redirect ?? "/";
    } catch {
      setErr("Network error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="passphrase" className="eyebrow block mb-1.5">
          Passphrase
        </label>
        <input
          id="passphrase"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-white/[0.08] focus:border-white/[0.2] focus:bg-white/[0.05] outline-none text-sm text-ink-100"
        />
      </div>
      {err ? (
        <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded px-3 py-2">
          {err}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={busy || pass.length === 0}
        className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}
