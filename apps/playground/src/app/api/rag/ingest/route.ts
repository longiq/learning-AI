import { NextRequest, NextResponse } from "next/server";
import { chunk } from "@llm-series/chunker";
import { getRetriever, resetRagStore } from "@/lib/rag-store";
import type { RagIngestRequest, RagIngestResponse, RagChunkPreview } from "@/types/api";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RagIngestRequest & { reset?: boolean };
  const {
    documents,
    chunkSize = 512,
    chunkOverlap = 64,
    strategy = "character",
    reset = false,
  } = body;

  if (reset) resetRagStore();

  const retriever = getRetriever();
  const chunkPreview: RagChunkPreview[] = [];
  let totalChunks = 0;

  for (const doc of documents) {
    const chunks = chunk(doc.text, { size: chunkSize, overlap: chunkOverlap, strategy });
    totalChunks += chunks.length;

    for (const c of chunks) {
      chunkPreview.push({
        docTitle: doc.title,
        chunkIndex: c.index,
        text: c.text,
        start: c.start,
        end: c.end,
      });
    }

    await retriever.addDocument(doc.text, {
      title: doc.title,
      chunkSize,
      overlap: chunkOverlap,
      strategy,
    });
  }

  const response: RagIngestResponse = {
    totalChunks,
    chunkPreview,
    docsAdded: documents.length,
  };

  return NextResponse.json(response);
}
