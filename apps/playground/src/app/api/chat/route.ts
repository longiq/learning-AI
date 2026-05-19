import { NextRequest, NextResponse } from "next/server";
import { PromptTemplate } from "@llm-series/prompt-template";
import { getClient } from "@/lib/client-factory";
import { env } from "@/lib/env";
import type { ChatRequest, ChatResponse } from "@/types/api";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatRequest;
  const { provider, model, templateSystem, templateUser, variables = {}, stream = false } = body;

  const client = getClient(provider);
  const resolvedModel = model ?? env.DEFAULT_MODEL;

  const template = new PromptTemplate({
    ...(templateSystem ? { system: templateSystem } : {}),
    user: templateUser,
  });
  const messages = template.render(variables);

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const gen = client.stream({ model: resolvedModel, messages });
          for await (const chunk of gen) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        // Pass rendered messages in header for trace panel (JSON encoded)
        "X-Rendered-Messages": JSON.stringify(messages),
      },
    });
  }

  const result = await client.complete({ model: resolvedModel, messages });

  const response: ChatResponse = {
    content: result.content,
    renderedMessages: messages.map((m) => ({ role: m.role, content: m.content })),
    ...(result.usage
      ? {
          usage: {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          },
        }
      : {}),
  };

  return NextResponse.json(response);
}
