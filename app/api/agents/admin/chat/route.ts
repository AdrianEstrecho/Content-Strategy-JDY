import { NextRequest, NextResponse } from "next/server";
import { isAIEnabled } from "@/lib/ai/client";
import { streamAdminChat, type ChatMessage } from "@/lib/ai/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isAIEnabled()) {
    return NextResponse.json(
      { error: "AI disabled — add ANTHROPIC_API_KEY in Settings." },
      { status: 503 }
    );
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "Conversation must end with a user message" },
      { status: 400 }
    );
  }

  try {
    const stream = await streamAdminChat(messages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
