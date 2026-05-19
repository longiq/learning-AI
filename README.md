# Learning AI — Monorepo

9 module nhỏ để học modern LLM/agent architecture, từ LLM client cơ bản đến multi-agent routing.

## Packages

| # | Package | Mô tả | Status |
|---|---|---|---|
| 1 | [`llm-client`](./packages/llm-client) | Unified interface cho OpenAI, Anthropic | ✅ |
| 2 | [`prompt-template`](./packages/prompt-template) | Template `{{variable}}` → `Message[]` | ✅ |
| 3 | `structured-output` | Schema validation cho LLM output | ⏳ |
| 4 | `tool-registry` | Tool definitions + dispatch | ⏳ |
| 5 | `simple-react-agent` | ReAct agent loop | ⏳ |
| 6 | `memory-store` | Stateful conversation memory | ⏳ |
| 7 | `chunker` + `embedder` | Text chunking và embedding | ⏳ |
| 8 | `vector-store-lite` + `retriever` | Vector search cho RAG | ⏳ |
| 9 | `agent-router` | Multi-agent routing | ⏳ |

## Dependency tree

```
llm-client
└── prompt-template
    └── structured-output
        └── tool-registry
            └── simple-react-agent
                └── memory-store
                    └── chunker + embedder
                        └── vector-store-lite + retriever
                            └── agent-router
```

## Stack

- **Language:** TypeScript 5.x, ESM only
- **Package manager:** pnpm workspaces
- **Build:** tsup (mỗi package build độc lập)
- **Test:** vitest
- **tsconfig:** strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`

## Commands

```bash
# Từ root — chạy cho tất cả packages
pnpm build      # build tất cả
pnpm test       # test tất cả
pnpm typecheck  # type-check tất cả

# Cho một package cụ thể
pnpm --filter @llm-series/llm-client build
pnpm --filter @llm-series/prompt-template test
```
