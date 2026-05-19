# @llm-series/agent-router

Module #9 — capstone của `@llm-series` learning chain. Dispatches user queries đến sub-agent phù hợp nhất bằng cách dùng LLM làm classifier.

## Why this module?

Khi hệ thống có nhiều chuyên gia (math agent, code agent, search agent…), cần một layer quyết định agent nào xử lý query nào. Thay vì hard-code routing rules, module này dùng chính LLM để phân loại — mỗi agent khai báo mô tả khả năng của mình, LLM chọn agent phù hợp nhất:

```
User query
    ↓
AgentRouter — LLM classifier call → picks best agent
    ↓
Chosen agent.run(messages)
    ↓
RouterResult { answer, agentName }
```

## Where it fits

```
llm-client  +  structured-output
         \       /
       agent-router   ← you are here (capstone)
```

Sub-agents có thể dùng bất kỳ module nào trong chuỗi: `simple-react-agent`, `retriever`, `memory-store`… — đó là trách nhiệm của caller.

## Quick API

```typescript
import { AgentRouter } from "@llm-series/agent-router";
import type { RouterAgent, RouterResult } from "@llm-series/agent-router";

const router = new AgentRouter({ client, model: "gpt-4o" });

router
  .register({
    name: "math",
    description: "Handles arithmetic, algebra, and mathematical proofs",
    run: async (messages) => runMathAgent(messages),
  })
  .register({
    name: "code",
    description: "Writes, debugs, and explains code in any language",
    run: async (messages) => runCodeAgent(messages),
  });

const result: RouterResult = await router.route([
  { role: "user", content: "What is the derivative of x²?" },
]);

console.log(result.agentName); // "math"
console.log(result.answer);    // agent's response
```

### Constructor options

```typescript
interface RouterOptions {
  client: LLMClient;    // from @llm-series/llm-client
  model: string;
  agents?: RouterAgent[];   // optional — can also use register()
  maxTokens?: number;
}
```

### Errors

```typescript
import { RouterError, NoAgentsError, UnknownAgentError, AgentRunError }
  from "@llm-series/agent-router";

// NoAgentsError     — route() called before any register()
// UnknownAgentError — LLM returned a name not in registry; .agentName field
// AgentRunError     — agent.run() threw; .agentName and .cause fields
// RouterError       — base class; duplicate register() throws this
```

## Commands

```bash
pnpm build      # compile to dist/
pnpm test       # run vitest
pnpm typecheck  # tsc --noEmit
```
