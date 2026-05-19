import { VectorStoreLite } from "@llm-series/vector-store-lite";
import { Retriever } from "@llm-series/retriever";
import { getEmbedder } from "./client-factory";

// Server-side singleton — resets on server restart
// Upgrade path: replace with Redis/pgvector by swapping this file
let store = new VectorStoreLite();
let retriever: Retriever | null = null;

export function getRetriever(): Retriever {
  if (!retriever) {
    retriever = new Retriever(getEmbedder(), { store });
  }
  return retriever;
}

export function resetRagStore() {
  store = new VectorStoreLite();
  retriever = null;
}
