import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { IGSyncButton } from "./ig-sync-button";

export default async function SettingsPage() {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasIG = !!process.env.IG_ACCESS_TOKEN && !!process.env.IG_BUSINESS_ACCOUNT_ID;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const igAccountId = process.env.IG_BUSINESS_ACCOUNT_ID ?? "";
  const lastSnapshot = hasIG
    ? await prisma.followerSnapshot.findFirst({ orderBy: { capturedAt: "desc" } })
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Wiring"
        description="API keys and integration status. Values are read from .env — restart the dev server after editing."
      />

      <div className="space-y-4">
        <section className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">Anthropic (Claude)</div>
              <div className="editorial-heading text-xl mt-0.5">AI Agents</div>
              <p className="text-sm text-ink-400 mt-1">
                Powers all four agents. Stub responses are returned when no key is set.
              </p>
            </div>
            <span
              className={`chip ${
                hasAnthropic ? "text-emerald-300 border-emerald-400/30" : "text-amber-300 border-amber-400/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasAnthropic ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {hasAnthropic ? "Connected" : "Not set"}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="eyebrow">Model</div>
              <div className="text-ink-100 mt-0.5 font-mono text-xs">{model}</div>
            </div>
            <div>
              <div className="eyebrow">Env variable</div>
              <div className="text-ink-100 mt-0.5 font-mono text-xs">ANTHROPIC_API_KEY</div>
            </div>
          </div>
          <p className="text-xs text-ink-400 mt-4">
            Get a key at{" "}
            <a
              className="underline hover:text-ink-100"
              href="https://console.anthropic.com/"
              target="_blank"
              rel="noreferrer"
            >
              console.anthropic.com
            </a>
            , then paste into <code>.env</code>.
          </p>
        </section>

        <section className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow">Instagram Graph API</div>
              <div className="editorial-heading text-xl mt-0.5">Real analytics</div>
              <p className="text-sm text-ink-400 mt-1">
                Fetch follower counts, post insights, and media to replace the seeded mock data.
              </p>
            </div>
            <span
              className={`chip ${
                hasIG ? "text-emerald-300 border-emerald-400/30" : "text-amber-300 border-amber-400/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hasIG ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {hasIG ? "Connected" : "Not set"}
            </span>
          </div>
          {hasIG ? (
            <>
              <div className="mt-4 pt-4 border-t border-white/[0.05] grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="eyebrow">Business account ID</div>
                  <div className="text-ink-100 mt-0.5 font-mono text-xs">{igAccountId}</div>
                </div>
                <div>
                  <div className="eyebrow">Last sync</div>
                  <div className="text-ink-100 mt-0.5 text-xs">
                    {lastSnapshot
                      ? new Date(lastSnapshot.capturedAt).toLocaleString()
                      : "Never — click Sync now"}
                  </div>
                </div>
              </div>
              <IGSyncButton disabled={false} />
            </>
          ) : (
            <ol className="mt-4 pt-4 border-t border-white/[0.05] text-sm text-ink-300 space-y-2 list-decimal list-inside">
              <li>Create a Meta Business Manager account.</li>
              <li>Link your Instagram Business account to a Facebook Page.</li>
              <li>
                Create an app at{" "}
                <a
                  className="underline hover:text-ink-100"
                  href="https://developers.facebook.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  developers.facebook.com
                </a>
                .
              </li>
              <li>
                Generate a long-lived access token with scopes{" "}
                <code className="text-xs">instagram_basic</code>,{" "}
                <code className="text-xs">instagram_manage_insights</code>,{" "}
                <code className="text-xs">pages_read_engagement</code>.
              </li>
              <li>
                Paste into <code>IG_ACCESS_TOKEN</code> and <code>IG_BUSINESS_ACCOUNT_ID</code> in{" "}
                <code>.env</code>.
              </li>
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
