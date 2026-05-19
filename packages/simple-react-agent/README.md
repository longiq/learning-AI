# @llm-series/simple-react-agent

Module #5 in the `@llm-series` learning chain. Implements a ReAct (Reason + Act) agent loop that drives an LLM through iterative tool use until a final answer is produced.

## Why this module?

An LLM on its own can only reason over its training data. Tools let it take actions (search, calculate, read files). The ReAct pattern structures this as a loop:

```
User query → LLM reasons → calls tool → receives result → LLM reasons again → … → final answer
```

This module wires together `@llm-series/llm-client` (LLM calls) and `@llm-series/tool-registry` (tool definitions + dispatch) into a clean, stateless `runAgent()` function.

## Where it fits

```
llm-client  +  tool-registry
         \       /
       simple-react-agent   ← you are here
              |
         memory-store
```

## Quick API

```typescript
import { runAgent } from "@llm-series/simple-react-agent";
import type { AgentOptions, AgentResult } from "@llm-series/simple-react-agent";

const result: AgentResult = await runAgent({
  client,        // LLMClient from @llm-series/llm-client
  registry,      // ToolRegistry from @llm-series/tool-registry
  messages,      // Message[] — initial conversation
  model,         // model string
  maxIterations, // default: 10
  temperature,   // optional
  maxTokens,     // optional
});

console.log(result.answer);     // final text answer
console.log(result.steps);      // AgentStep[] trace of tool calls and finish
console.log(result.iterations); // how many LLM calls were made
```

### Types

```typescript
type AgentStep =
  | { type: "tool_call"; calls: ToolCall[]; results: ToolResult[] }
  | { type: "finish"; text: string };

interface AgentResult {
  answer: string;
  steps: AgentStep[];
  iterations: number;
}
```

### Errors

```typescript
import { AgentError, MaxIterationsError } from "@llm-series/simple-react-agent";

// MaxIterationsError thrown when agent loops past maxIterations
// error.iterations holds the limit that was reached
```

## Commands

```bash
pnpm build      # compile to dist/
pnpm test       # run vitest
pnpm typecheck  # tsc --noEmit
```
