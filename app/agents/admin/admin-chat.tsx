"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Check,
  Compass,
  PenLine,
  Plus,
  Target,
  Trash2,
  User,
  X,
  Loader2,
  MessagesSquare,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { setAppStreaming } from "@/lib/nav-guard";
import type { ChatMessage } from "@/lib/ai/admin";

const STARTERS = [
  "Plan my content for next week — use Analysis, then Research, then draft 3 Reels.",
  "What should I post tomorrow?",
  "Find 3 trending angles for the 'Tips & tricks' pillar and draft the strongest one as a 30s Reel.",
  "Run analysis and tell me what pillar I'm underusing.",
];

type ToolBlock = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: "running" | "done" | "error";
  summary?: string;
};

type Block = { kind: "text"; text: string } | { kind: "tool"; tool: ToolBlock };

type AssistantTurn = { role: "assistant"; blocks: Block[] };
type UserTurn = { role: "user"; content: string };
type Turn = UserTurn | AssistantTurn;

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: Turn[];
};

const STORAGE_KEY = "admin_chats_v1";

const TOOL_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  request_research: { label: "Researcher", icon: Compass },
  request_script: { label: "Scripter", icon: PenLine },
  request_analysis: { label: "Analysis", icon: Target },
};

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function titleFromMessage(msg: string): string {
  const trimmed = msg.trim().split(/\r?\n/)[0] ?? "";
  if (trimmed.length <= 48) return trimmed || "New chat";
  return trimmed.slice(0, 45).trimEnd() + "…";
}

function loadStore(): { conversations: Conversation[]; activeId: string | null } {
  if (typeof window === "undefined") return { conversations: [], activeId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversations: [], activeId: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.conversations)) {
      return {
        conversations: parsed.conversations,
        activeId: parsed.activeId ?? null,
      };
    }
  } catch {
    // fall through
  }
  return { conversations: [], activeId: null };
}

function saveStore(conversations: Conversation[], activeId: string | null) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversations, activeId })
    );
  } catch {
    // storage may be full / disabled — ignore
  }
}

export function AdminChat({ aiEnabled }: { aiEnabled: boolean }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history on mount.
  useEffect(() => {
    const store = loadStore();
    setConversations(store.conversations);
    setActiveId(store.activeId);
    setHydrated(true);
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (!hydrated) return;
    saveStore(conversations, activeId);
  }, [conversations, activeId, hydrated]);

  // Streaming flag → nav guard + beforeunload.
  useEffect(() => {
    setAppStreaming(streaming);
    if (!streaming) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [streaming]);

  // Abort any in-flight fetch on unmount.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      setAppStreaming(false);
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId]
  );
  const turns: Turn[] = activeConversation?.turns ?? [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, streaming, activeId]);

  function startNewChat() {
    if (streaming) return;
    setActiveId(null);
    setError(null);
    setInput("");
  }

  function selectChat(id: string) {
    if (streaming) return;
    setActiveId(id);
    setError(null);
  }

  function deleteChat(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
    setConfirmDelete(null);
  }

  function updateTurns(convId: string, updater: (t: Turn[]) => Turn[]) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, turns: updater(c.turns), updatedAt: Date.now() }
          : c
      )
    );
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || streaming) return;
    setError(null);

    // Resolve target conversation — create one if we're on a fresh chat.
    let convId = activeId;
    let baseTurns: Turn[];
    if (!convId) {
      convId = newId();
      const conv: Conversation = {
        id: convId,
        title: titleFromMessage(clean),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        turns: [
          { role: "user", content: clean },
          { role: "assistant", blocks: [] },
        ],
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveId(convId);
      baseTurns = conv.turns;
    } else {
      const existing = conversations.find((c) => c.id === convId);
      const priorTurns = existing?.turns ?? [];
      baseTurns = [
        ...priorTurns,
        { role: "user", content: clean },
        { role: "assistant", blocks: [] },
      ];
      updateTurns(convId, () => baseTurns);
    }

    setInput("");
    setStreaming(true);

    // Build API payload from prior text turns only.
    const apiMessages: ChatMessage[] = baseTurns
      .slice(0, -1) // drop the empty assistant placeholder
      .map((t) =>
        t.role === "user"
          ? { role: "user", content: t.content }
          : {
              role: "assistant",
              content: t.blocks
                .filter((b): b is { kind: "text"; text: string } => b.kind === "text")
                .map((b) => b.text)
                .join(""),
            }
      );

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agents/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentBlocks: Block[] = [];

      const flush = () => {
        const snapshot: Block[] = currentBlocks.map((b) =>
          b.kind === "text" ? { ...b } : { kind: "tool", tool: { ...b.tool } }
        );
        updateTurns(convId!, (existingTurns) => {
          const next = [...existingTurns];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = { role: "assistant", blocks: snapshot };
          }
          return next;
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.type === "text" && typeof evt.delta === "string") {
            const last = currentBlocks[currentBlocks.length - 1];
            if (last && last.kind === "text") {
              last.text += evt.delta;
            } else {
              currentBlocks.push({ kind: "text", text: evt.delta });
            }
            flush();
          } else if (evt.type === "tool_start") {
            currentBlocks.push({
              kind: "tool",
              tool: {
                id: String(evt.id),
                name: String(evt.name),
                input: (evt.input as Record<string, unknown>) ?? {},
                status: "running",
              },
            });
            flush();
          } else if (evt.type === "tool_end") {
            const idx = currentBlocks.findIndex(
              (b) => b.kind === "tool" && b.tool.id === String(evt.id)
            );
            if (idx >= 0) {
              const b = currentBlocks[idx] as Extract<Block, { kind: "tool" }>;
              b.tool.status = evt.ok ? "done" : "error";
              b.tool.summary = String(evt.summary ?? "");
              flush();
            }
          } else if (evt.type === "error") {
            setError(String(evt.message ?? "stream error"));
          }
        }
      }
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (!aborted) {
        setError(e instanceof Error ? e.message : "Stream failed");
        // Trim trailing empty assistant bubble if nothing streamed.
        updateTurns(convId, (existingTurns) => {
          const last = existingTurns[existingTurns.length - 1];
          if (last?.role === "assistant" && last.blocks.length === 0) {
            return existingTurns.slice(0, -1);
          }
          return existingTurns;
        });
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] h-[calc(100vh-240px)] min-h-[500px] surface overflow-hidden">
      <ChatHistorySidebar
        conversations={conversations}
        activeId={activeId}
        streaming={streaming}
        onNew={startNewChat}
        onSelect={selectChat}
        onDelete={(c) => setConfirmDelete(c)}
      />

      <div className="grid grid-rows-[1fr_auto] overflow-hidden">
        <div ref={scrollRef} className="overflow-y-auto px-6 py-6">
          {turns.length === 0 ? (
            <div className="max-w-xl mx-auto mt-6">
              <div className="editorial-heading text-2xl mb-1">What's on your mind?</div>
              <p className="text-sm text-ink-400 mb-5">
                Admin can now delegate to the other agents live. Ask it to plan your week and watch
                it pull analysis, research trends, and draft scripts — each saved straight to your
                Library.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={!aiEnabled}
                    className="surface-2 text-left px-4 py-3 text-sm text-ink-200 hover:bg-white/[0.04]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {turns.map((t, i) => {
                const isLast = i === turns.length - 1;
                if (t.role === "user") return <UserBubble key={i} content={t.content} />;
                return (
                  <AssistantBubble
                    key={i}
                    blocks={t.blocks}
                    streaming={streaming && isLast}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] bg-ink-900/60 px-6 py-4">
          {error ? <div className="text-xs text-rose-300 mb-2">{error}</div> : null}
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <textarea
              className="input min-h-[44px] max-h-[160px] resize-none"
              placeholder={aiEnabled ? "Message Admin…" : "Add ANTHROPIC_API_KEY in Settings to chat."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              disabled={!aiEnabled || streaming}
            />
            <button
              onClick={() => send(input)}
              disabled={!aiEnabled || !input.trim() || streaming}
              className="btn-primary shrink-0 h-11"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete this chat?"
        description={
          confirmDelete
            ? `"${confirmDelete.title}" will be removed permanently.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => confirmDelete && deleteChat(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function ChatHistorySidebar({
  conversations,
  activeId,
  streaming,
  onNew,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  streaming: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (c: Conversation) => void;
}) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="hidden md:flex flex-col border-r border-white/[0.06] bg-ink-900/30">
      <div className="p-3 border-b border-white/[0.06]">
        <button
          onClick={onNew}
          disabled={streaming}
          className="btn-secondary w-full justify-center text-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {sorted.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <MessagesSquare className="w-5 h-5 text-ink-500 mx-auto mb-2" />
            <p className="text-xs text-ink-500 leading-relaxed">
              Your chats will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => onSelect(c.id)}
                    disabled={streaming && !isActive}
                    className={
                      "w-full text-left px-3 py-2 rounded-md text-sm leading-snug transition-colors " +
                      (isActive
                        ? "bg-white/[0.06] text-ink-50"
                        : "text-ink-300 hover:bg-white/[0.03] hover:text-ink-100") +
                      " disabled:opacity-50 disabled:cursor-not-allowed"
                    }
                  >
                    <div className="truncate pr-6">{c.title}</div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c);
                    }}
                    disabled={streaming}
                    className="absolute right-1.5 top-1.5 p-1 rounded text-ink-500 opacity-0 group-hover:opacity-100 hover:text-rose-300 hover:bg-white/[0.04] disabled:cursor-not-allowed"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-white/[0.08]">
        <User className="w-3.5 h-3.5 text-ink-200" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="eyebrow mb-1">You</div>
        <div className="text-sm text-ink-100 whitespace-pre-wrap leading-relaxed">{content}</div>
      </div>
    </div>
  );
}

function AssistantBubble({ blocks, streaming }: { blocks: Block[]; streaming: boolean }) {
  const hasAny = blocks.length > 0;
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center bg-ig-gradient">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-3">
        <div className="eyebrow">Admin</div>
        {!hasAny && streaming ? (
          <div className="text-sm text-ink-400 italic">thinking…</div>
        ) : null}
        {blocks.map((b, i) => {
          if (b.kind === "text") {
            const isLast = i === blocks.length - 1;
            return (
              <div
                key={i}
                className="text-sm text-ink-100 whitespace-pre-wrap leading-relaxed"
              >
                {b.text}
                {streaming && isLast ? (
                  <span className="inline-block w-1.5 h-4 bg-ink-300 align-middle ml-0.5 animate-pulse" />
                ) : null}
              </div>
            );
          }
          return <ToolEvent key={i} tool={b.tool} />;
        })}
      </div>
    </div>
  );
}

function ToolEvent({ tool }: { tool: ToolBlock }) {
  const meta = TOOL_META[tool.name] ?? { label: tool.name, icon: Bot };
  const Icon = meta.icon;
  const statusLabel =
    tool.status === "running" ? "running…" : tool.status === "done" ? "done" : "failed";
  const StatusIcon =
    tool.status === "running" ? Loader2 : tool.status === "done" ? Check : X;
  return (
    <div
      className={`surface-2 px-4 py-3 text-sm border-l-2 ${
        tool.status === "error"
          ? "border-rose-400/50"
          : tool.status === "done"
          ? "border-emerald-400/40"
          : "border-ink-400/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-ink-300" />
        <span className="text-ink-100 font-medium">{meta.label}</span>
        <span
          className={`chip ${
            tool.status === "error"
              ? "text-rose-300 border-rose-400/30"
              : tool.status === "done"
              ? "text-emerald-300 border-emerald-400/30"
              : "text-ink-300"
          }`}
        >
          <StatusIcon
            className={`w-3 h-3 ${tool.status === "running" ? "animate-spin" : ""}`}
          />
          {statusLabel}
        </span>
      </div>
      {Object.keys(tool.input).length > 0 ? (
        <div className="text-xs text-ink-400 font-mono mb-1 truncate">
          {Object.entries(tool.input)
            .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
            .join(" · ")}
        </div>
      ) : null}
      {tool.summary ? (
        <div className="text-xs text-ink-300 mt-1 leading-relaxed">{tool.summary}</div>
      ) : null}
    </div>
  );
}
