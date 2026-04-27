import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { AI_MODEL, getAnthropic } from "./client";
import { ADMIN_SYSTEM } from "./prompts";
import { loadStrategyContext, renderStrategyContext } from "./context";
import { ADMIN_TOOLS, runTool } from "./tools";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type EventLine =
  | { type: "text"; delta: string }
  | { type: "tool_start"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_end"; id: string; name: string; ok: boolean; summary: string }
  | { type: "done" }
  | { type: "error"; message: string };

const MAX_ITERATIONS = 8;

export async function streamAdminChat(
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const client = getAnthropic();
  const ctx = renderStrategyContext(await loadStrategyContext());
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  const adminTask = await prisma.agentTask.create({
    data: {
      agent: "admin",
      input: lastUser?.content.slice(0, 500) ?? "",
      status: "running",
      startedAt: new Date(),
    },
  });

  const encoder = new TextEncoder();
  const emit = (controller: ReadableStreamDefaultController<Uint8Array>, e: EventLine) => {
    controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
  };

  // Conversation state — grows as we loop through tool calls
  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullAssistantText = "";

      try {
        for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
          const stream = client.messages.stream({
            model: AI_MODEL,
            max_tokens: 4096,
            system: [
              {
                type: "text",
                text: ADMIN_SYSTEM,
                cache_control: { type: "ephemeral" },
              },
              { type: "text", text: ctx },
            ],
            tools: ADMIN_TOOLS,
            messages: conversation,
          });

          stream.on("text", (delta) => {
            fullAssistantText += delta;
            emit(controller, { type: "text", delta });
          });

          const finalMessage = await stream.finalMessage();

          // Append the full assistant turn (text + any tool_use blocks) to history
          conversation.push({ role: "assistant", content: finalMessage.content });

          if (finalMessage.stop_reason === "end_turn" || finalMessage.stop_reason === "max_tokens") {
            break;
          }

          if (finalMessage.stop_reason === "tool_use") {
            const toolUses = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const tu of toolUses) {
              emit(controller, {
                type: "tool_start",
                id: tu.id,
                name: tu.name,
                input: (tu.input ?? {}) as Record<string, unknown>,
              });

              try {
                const result = await runTool(
                  tu.name,
                  (tu.input ?? {}) as Record<string, unknown>,
                  adminTask.id
                );
                emit(controller, {
                  type: "tool_end",
                  id: tu.id,
                  name: tu.name,
                  ok: true,
                  summary: result.summary,
                });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tu.id,
                  content: result.detail,
                });
              } catch (err) {
                const msg = err instanceof Error ? err.message : "tool failed";
                emit(controller, {
                  type: "tool_end",
                  id: tu.id,
                  name: tu.name,
                  ok: false,
                  summary: msg,
                });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tu.id,
                  content: `ERROR: ${msg}`,
                  is_error: true,
                });
              }
            }

            conversation.push({ role: "user", content: toolResults });
            // loop continues — Claude gets the tool results next iteration
            continue;
          }

          // Unknown stop reason — bail
          break;
        }

        await prisma.agentTask.update({
          where: { id: adminTask.id },
          data: {
            status: "done",
            output: fullAssistantText.slice(0, 500),
            completedAt: new Date(),
          },
        });

        emit(controller, { type: "done" });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream error";
        emit(controller, { type: "error", message: msg });
        await prisma.agentTask.update({
          where: { id: adminTask.id },
          data: {
            status: "rejected",
            output: `ERROR: ${msg}`.slice(0, 500),
            completedAt: new Date(),
          },
        });
        controller.close();
      }
    },
  });
}
