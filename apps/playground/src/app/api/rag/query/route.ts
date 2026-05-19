import { NextRequest, NextResponse } from "next/server";
import { getRetriever } from "@/lib/rag-store";
import { getClient } from "@/lib/client-factory";
import { env } from "@/lib/env";
import type { RagQueryRequest, RagQueryResponse } from "@/types/api";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RagQueryRequest;
  const { provider, model, query, topK = 3, minScore } = body;

  const retriever = getRetriever();
  const retrievedChunks = await retriever.retrieve(query, topK, minScore);

  if (retrievedChunks.length === 0) {
    const response: RagQueryResponse = {
      retrievedChunks: [],
      answer: "No relevant documents found. Please ingest some documents first.",
      contextUsed: "",
    };
    return NextResponse.json(response);
  }

  const contextUsed = retrievedChunks
    .map((c, i) => `[${i + 1}] ${c.text}`)
    .join("\n\n");

  const client = getClient(provider);
  const resolvedModel = model ?? env.DEFAULT_MODEL;

  const result = await client.complete({
    model: resolvedModel,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant. Answer the user's question using ONLY the provided context. " +
          "If the context doesn't contain the answer, say so clearly. Cite which context chunks you used.",
      },
      {
        role: "user",
        content: `Context:\n${contextUsed}\n\nQuestion: ${query}`,
      },
    ],
  });

  const response: RagQueryResponse = {
    retrievedChunks: retrievedChunks.map((c) => ({
      text: c.text,
      score: c.score,
      chunkIndex: c.chunkIndex,
      docTitle: typeof c.metadata?.["title"] === "string" ? c.metadata["title"] : undefined,
    })),
    answer: result.content,
    contextUsed,
  };

  return NextResponse.json(response);
}
