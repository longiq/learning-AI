import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DEFAULT_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  DEFAULT_MODEL: z.string().default("gpt-4o-mini"),
  EMBEDDER_API_KEY: z.string().optional(),
  EMBEDDER_MODEL: z.string().default("text-embedding-3-small"),
  OPENAI_BASE_URL: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().optional(),
  PLAYGROUND_PASSWORD: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export const env = envSchema.parse(process.env);
