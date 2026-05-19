import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: [
    "@llm-series/llm-client",
    "@llm-series/prompt-template",
    "@llm-series/structured-output",
    "@llm-series/tool-registry",
    "@llm-series/simple-react-agent",
    "@llm-series/memory-store",
    "@llm-series/chunker",
    "@llm-series/embedder",
    "@llm-series/vector-store-lite",
    "@llm-series/retriever",
    "@llm-series/agent-router",
  ],
  serverExternalPackages: ["openai", "@anthropic-ai/sdk"],
  output: "standalone",
};

export default config;
