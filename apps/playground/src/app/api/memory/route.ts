import { NextRequest, NextResponse } from "next/server";
import { MemoryStore } from "@llm-series/memory-store";
import type { MemoryEntry } from "@llm-series/memory-store";
import type { MessageRole } from "@llm-series/llm-client";
import { getClient } from "@/lib/client-factory";
import { env } from "@/lib/env";
import type { MemoryRequest, MemoryResponse, MemoryHistoryEntry } from "@/types/api";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as MemoryRequest;
  const {
    provider,
    model,
    message,
    history,
    systemPrompt,
    maxEntries = 20,
  } = body;

  const client = getClient(provider);
  const resolvedModel = model ?? env.DEFAULT_MODEL;

  const VALID_ROLES = new Set<string>(["user", "assistant", "system"]);
  const entries: MemoryEntry[] = history
    .filter((e) => VALID_ROLES.has(e.role))
    .map((e) => ({
      role: e.role as MessageRole,
      content: e.content,
      timestamp: e.timestamp,
      ...(e.metadata !== undefined ? { metadata: e.metadata } : {}),
    }));

  // Stateless: client sends full history, server reconstructs MemoryStore
  const store = MemoryStore.fromJSON(
    entries,
    {
      maxEntries,
      ...(systemPrompt ? { systemPrompt } : {}),
    }
  );

  const beforeCount = store.size;
  store.add("user", message);

  const messages = store.getMessages();
  const result = await client.complete({ model: resolvedModel, messages });
  store.add("assistant", result.content);

  const afterCount = store.size;
  const droppedCount = Math.max(0, beforeCount + 2 - afterCount);

  const updatedHistory: MemoryHistoryEntry[] = [...store.getEntries()].map((e) => ({
    role: e.role,
    content: e.content,
    timestamp: e.timestamp,
    ...(e.metadata !== undefined ? { metadata: e.metadata } : {}),
  }));

  const response: MemoryResponse = {
    reply: result.content,
    updatedHistory,
    windowSize: afterCount,
    droppedCount,
  };

  return NextResponse.json(response);
}
