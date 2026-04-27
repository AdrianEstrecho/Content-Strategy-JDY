# JustDoYou

Personal Instagram marketing command center for real estate — home buyers.

Single-user (you) platform with four AI agents that plan, create, and analyze your content end-to-end.

## Status

**Phase 1 shipped.** Auth stub, Strategy Hub, Dashboard, Content Calendar, Content Library, DB schema, demo seed. Agents & Script Generator come online in Phase 2 once the Anthropic API key is added.

## Quick start

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See [.env.example](./.env.example). Everything is optional — the app runs with zero keys using stubbed agents and seeded mock analytics.

| Var | What it does |
| --- | --- |
| `DATABASE_URL` | SQLite path. Default `file:./dev.db`. |
| `ANTHROPIC_API_KEY` | Unlocks all four agents. Get one at [console.anthropic.com](https://console.anthropic.com/). |
| `ANTHROPIC_MODEL` | Defaults to `claude-sonnet-4-5`. Update as newer Claude models ship. |
| `IG_ACCESS_TOKEN` | Instagram Graph API token for real analytics. |
| `IG_BUSINESS_ACCOUNT_ID` | Your IG Business account ID. |

### Wiring the Instagram Graph API

Meta Graph API replaces the seeded mock follower/engagement data with real numbers. You need:

1. A Meta Business Manager account.
2. An Instagram Business account linked to a Facebook Page.
3. An app at [developers.facebook.com](https://developers.facebook.com/).
4. A long-lived access token with scopes: `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`.

Paste the token and business account ID into `.env` and restart `npm run dev`.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (custom editorial dark theme)
- Prisma + SQLite
- Recharts
- Zustand (state, Phase 2)
- Anthropic SDK (agents, Phase 2)
- Lucide icons

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run db:push      # sync Prisma schema to SQLite
npm run db:seed      # load real-estate demo content
npm run db:studio    # browse the database
```

## Folder structure

```
app/
  actions/           # server actions (content CRUD, strategy CRUD)
  calendar/          # month-view calendar
  library/           # content grid + filters + drawer
  strategy/          # brand / pillars / goals editor
  analytics/         # charts + top posts
  agents/            # agent hub + detail stubs
  generate/          # script generator (Phase 2)
  settings/          # API keys / integration status
  page.tsx           # dashboard
components/
  shell/             # sidebar + topbar
  content/           # shared content drawer
  ui/                # primitives (PageHeader, StatCard, Empty)
lib/
  db.ts              # Prisma singleton
  json.ts            # SQLite JSON helpers
  content.ts         # content type/status enums + color tokens
  cn.ts              # className util
prisma/
  schema.prisma      # full schema
  seed.ts            # real-estate demo data
```

## Phase roadmap

- **Phase 1 (done):** Foundation — auth stub, Strategy Hub, Dashboard, Calendar, Library, schema, seed.
- **Phase 2 (next):** Scripter agent (Reel + Carousel generator), Admin agent chat, wiring Scripter outputs into the Library/Calendar.
- **Phase 3:** Researcher agent with web search, Analysis agent with real data, agent orchestration queue.
- **Phase 4:** Instagram Graph API connection, real analytics, email + in-app notifications, mobile polish.
