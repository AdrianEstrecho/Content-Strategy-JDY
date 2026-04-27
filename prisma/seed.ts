import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper: N days ago
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};
const daysFromNow = (n: number, hour = 18, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, min, 0, 0);
  return d;
};

async function main() {
  console.log("Seeding JustDoYou…");

  // Clean slate
  await prisma.performance.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.pillar.deleteMany();
  await prisma.brandProfile.deleteMany();
  await prisma.agentTask.deleteMany();
  await prisma.followerSnapshot.deleteMany();
  await prisma.researchFinding.deleteMany();
  await prisma.weeklyReport.deleteMany();

  // Brand
  const brand = await prisma.brandProfile.create({
    data: {
      name: "JustDoYou",
      niche: "Real estate — home buyers",
      audience:
        "First-time and repeat home buyers aged 28–45. Actively researching neighborhoods, financing, and the buying process. Consume short-form video and save posts they want to revisit.",
      voice:
        "Direct, warm, and practical. No jargon. Short sentences. Lead with the benefit. Speak like the smartest friend who happens to be a real estate expert.",
      goals: JSON.stringify([
        { label: "Reach 10k followers", target: "10,000", horizon: "Q4 2026" },
        {
          label: "Book buyer consultations from IG DMs",
          target: "3 / week",
          horizon: "ongoing",
        },
        { label: "Average engagement rate", target: "5%+", horizon: "quarterly" },
      ]),
    },
  });

  // Pillars — the user's three
  const pillars = await Promise.all([
    prisma.pillar.create({
      data: {
        brandId: brand.id,
        label: "Founder mindset",
        description:
          "How to think like an operator in real estate: discipline, long-term thinking, habits, and the mental game of buying and selling.",
        color: "#833ab4",
        order: 0,
      },
    }),
    prisma.pillar.create({
      data: {
        brandId: brand.id,
        label: "Tips & tricks",
        description:
          "Tactical, saveable posts: negotiation, financing, inspections, timing the market, common mistakes.",
        color: "#fd1d1d",
        order: 1,
      },
    }),
    prisma.pillar.create({
      data: {
        brandId: brand.id,
        label: "Stories & growth",
        description:
          "Real buyer stories and before/after transformations. How I got better at real estate — week by week.",
        color: "#fcb045",
        order: 2,
      },
    }),
  ]);

  // Sample content — mix of past (published) + scheduled (this week / next week)
  const content = [
    // Published last week
    {
      type: "reel",
      status: "published",
      title: "3 things I wish I knew before buying my first house",
      hook: "If I could redo my first home purchase, I'd undo this one mistake before anything else.",
      caption:
        "Your offer isn't rejected because of the price — 90% of the time it's because of the terms. Here's the tiny contract tweak that made my buyers win in a bidding war without overpaying. Save this for when you're ready to offer.",
      cta: "Save this post for offer day.",
      pillarId: pillars[1].id,
      publishedAt: daysAgo(6),
      perf: { views: 14820, likes: 612, saves: 1103, shares: 284, comments: 71, reach: 12450 },
    },
    {
      type: "carousel",
      status: "published",
      title: "The 5-minute mortgage pre-approval checklist",
      hook: "Don't walk into a listing without these 5 things ready.",
      caption:
        "The difference between getting your offer taken seriously and being ignored is 5 documents. Here's everything a lender will ask for — and how to have it in one folder before you even see the house.",
      cta: "Comment 'CHECKLIST' for the PDF version.",
      pillarId: pillars[1].id,
      publishedAt: daysAgo(12),
      perf: { views: 8930, likes: 401, saves: 722, shares: 156, comments: 43, reach: 7820 },
    },
    {
      type: "reel",
      status: "published",
      title: "Client story — how Maria bought in Austin for $18k under ask",
      hook: "Everyone told Maria to offer over asking. We did the opposite — and it worked.",
      caption:
        "Real story from a buyer I worked with last month. She wanted a home in a hot Austin neighborhood, 9 offers on the table. Here's the counterintuitive strategy we used to win — and save $18,000.",
      cta: "DM me 'STORY' for the full breakdown.",
      pillarId: pillars[2].id,
      publishedAt: daysAgo(3),
      perf: { views: 22140, likes: 982, saves: 1456, shares: 521, comments: 119, reach: 18750 },
    },
    {
      type: "post",
      status: "published",
      title: "Founder mindset: the 100 NO rule",
      hook: "Every time I got rejected, I got closer.",
      caption:
        "When I started, I set a goal: get 100 NOs this year. Not 100 yeses. 100 NOs. Because every rejection was proof I was in the arena. Here's what happened at NO #47.",
      cta: "What's your 100 NO number?",
      pillarId: pillars[0].id,
      publishedAt: daysAgo(9),
      perf: { views: 5410, likes: 289, saves: 178, shares: 64, comments: 37, reach: 4820 },
    },
    // Scheduled this week
    {
      type: "reel",
      status: "scheduled",
      title: "Why your dream home is still on the market",
      hook: "If a house is still listed after 21 days in this market… here's the real reason.",
      caption:
        "Sellers think it's their price. It's almost never their price. Here are the 3 things buyers notice in the first 8 seconds of a listing — and how to tell if it's a real problem or an opportunity.",
      cta: "Save this before your next showing.",
      pillarId: pillars[1].id,
      scheduledAt: daysFromNow(0, 18, 0),
    },
    {
      type: "carousel",
      status: "scheduled",
      title: "Neighborhood scouting: the 10-question framework",
      hook: "Before you fall in love with the house, fall in love with the block.",
      caption:
        "I walked through 37 neighborhoods last quarter with buyers. These 10 questions predict satisfaction 1 year later. Bookmark for your next Saturday open house.",
      cta: "Save + share with your partner.",
      pillarId: pillars[1].id,
      scheduledAt: daysFromNow(2, 19, 30),
    },
    {
      type: "reel",
      status: "scheduled",
      title: "Story: the $12k roof I almost missed",
      hook: "The inspection said 'good condition'. I knew something was off.",
      caption:
        "How a 4-minute walk on the roof saved my buyer $12,000. The one thing inspectors miss — and how to spot it yourself in 60 seconds.",
      cta: "DM 'ROOF' for the 60-second checklist.",
      pillarId: pillars[2].id,
      scheduledAt: daysFromNow(4, 18, 0),
    },
    // Upcoming later next week
    {
      type: "post",
      status: "scheduled",
      title: "Mindset: you don't need to time the market",
      hook: "Stop waiting for the 'right' time. There isn't one.",
      caption:
        "Interest rates move 1% either way. Home prices drift 3–5% per year. Your life changes 100%. Here's how to make the decision without a crystal ball.",
      cta: "Which are you waiting on — rates, prices, or certainty?",
      pillarId: pillars[0].id,
      scheduledAt: daysFromNow(7, 17, 0),
    },
    // In pipeline (not scheduled yet)
    {
      type: "reel",
      status: "scripted",
      title: "The 3 paperwork traps that kill deals",
      hook: "This one clause costs buyers thousands — and nobody talks about it.",
      caption: "",
      cta: "",
      pillarId: pillars[1].id,
    },
    {
      type: "carousel",
      status: "idea",
      title: "Before / after: my year of improving as an agent",
      hook: "Year 1 me vs. year 3 me — the habits that changed everything.",
      caption: "",
      cta: "",
      pillarId: pillars[2].id,
    },
    {
      type: "story",
      status: "idea",
      title: "Poll: what's stopping you from buying?",
      hook: "",
      caption: "",
      cta: "",
      pillarId: pillars[0].id,
    },
  ];

  for (const c of content) {
    const item = await prisma.contentItem.create({
      data: {
        type: c.type,
        status: c.status,
        title: c.title,
        hook: c.hook,
        caption: c.caption,
        cta: c.cta ?? "",
        pillarId: c.pillarId,
        scheduledAt: c.scheduledAt ?? null,
        publishedAt: c.publishedAt ?? null,
        createdByAgent: "user",
        hashtags: JSON.stringify(
          c.type === "reel"
            ? ["#realestate", "#homebuyer", "#firsttimehomebuyer", "#mortgage", "#realestatetips"]
            : c.type === "carousel"
            ? ["#realestate", "#homebuyingtips", "#mortgagetips", "#househunting"]
            : ["#realestate", "#realestatelife"]
        ),
      },
    });
    if ((c as any).perf) {
      await prisma.performance.create({
        data: {
          contentItemId: item.id,
          ...(c as any).perf,
        },
      });
    }
  }

  // Follower snapshots — 90 days of growth
  const base = 4200;
  for (let i = 90; i >= 0; i--) {
    const day = daysAgo(i);
    // steady growth with a small bump 2 weeks ago (viral reel)
    const growth = (90 - i) * 22;
    const viralBump = i < 18 && i > 12 ? 180 : 0;
    const noise = Math.floor(Math.random() * 30) - 15;
    await prisma.followerSnapshot.create({
      data: {
        capturedAt: day,
        followers: base + growth + viralBump + noise,
        following: 420,
        posts: 48 + Math.floor((90 - i) / 3),
        engagement: 3.8 + Math.random() * 1.6,
      },
    });
  }

  // A couple of example agent tasks (historical, done)
  await prisma.agentTask.createMany({
    data: [
      {
        agent: "researcher",
        input: "Find 5 trending audios for real estate Reels this week",
        output:
          "Surfaced 5 trending audios — top pick: lo-fi piano clip trending on buyer-focused content (+22% usage WoW).",
        status: "done",
        startedAt: daysAgo(2),
        completedAt: daysAgo(2),
      },
      {
        agent: "scripter",
        input: "Draft 3 Reel scripts from this week's research findings",
        output:
          "Drafted 3 Reel scripts for the pillar 'Tips & tricks' — all under 60s, with question hooks tested against the current top-performing format.",
        status: "done",
        startedAt: daysAgo(1),
        completedAt: daysAgo(1),
      },
      {
        agent: "analysis",
        input: "Weekly report for " + new Date().toLocaleDateString(),
        output:
          "Your Reels with a story hook in the first 3 seconds get 2.4x more saves than tip-based hooks. Recommend leaning into pillar 'Stories & growth' next week.",
        status: "done",
        startedAt: daysAgo(0),
        completedAt: daysAgo(0),
      },
    ],
  });

  console.log("Seed complete. 🌱");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
