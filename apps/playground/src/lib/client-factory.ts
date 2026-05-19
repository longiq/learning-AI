import { createClient } from "@llm-series/llm-client";
import { Embedder } from "@llm-series/embedder";
import { env } from "./env";

export function getClient(provider?: "openai" | "anthropic") {
  const p = provider ?? env.DEFAULT_PROVIDER;
  if (p === "anthropic") {
    if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
    return createClient("anthropic", {
      apiKey: env.ANTHROPIC_API_KEY,
      ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}),
    });
  }
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  return createClient("openai", {
    apiKey: env.OPENAI_API_KEY,
    ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  });
}

export function getEmbedder() {
  const key = env.EMBEDDER_API_KEY ?? env.OPENAI_API_KEY;
  if (!key) throw new Error("No embedder API key — set EMBEDDER_API_KEY or OPENAI_API_KEY");
  return new Embedder({
    apiKey: key,
    model: env.EMBEDDER_MODEL,
    ...(env.OPENAI_BASE_URL ? { baseURL: env.OPENAI_BASE_URL } : {}),
  });
}
