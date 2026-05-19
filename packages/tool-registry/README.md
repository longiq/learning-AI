# tool-registry

Module #4 trong chuỗi học kiến trúc LLM/agent hiện đại.

Định nghĩa, đăng ký, và thực thi typed LLM tools — cầu nối giữa LLM output và code thực tế.

---

## Tại sao cần module này?

Khi LLM quyết định gọi một tool, nó trả về tên tool và JSON arguments. Bạn cần:

1. **Tìm** đúng tool theo tên
2. **Validate** arguments khớp với schema mong đợi
3. **Thực thi** và trả kết quả về LLM

Nếu làm thủ công, mỗi agent phải tự viết dispatch logic, schema validation, và error handling. `tool-registry` đóng gói tất cả thành một interface nhất quán, với type safety và error hierarchy rõ ràng.

---

## Kiến trúc

### Luồng dữ liệu

```
ToolDefinition[]     ToolCall (name + argsJson)
(đăng ký trước)  →   ToolRegistry.execute()
                           │
                    validate với Zod schema
                           │
                    call tool.execute()
                           │
                       ToolResult
```

### Tách biệt thành 3 lớp

**Lớp 1 — Types (`types.ts`)**

Interfaces thuần túy: `ToolDefinition`, `ToolCall`, `ToolResult`, `OpenAIToolDefinition`, `AnthropicToolDefinition`. Không có logic, chỉ là hợp đồng.

**Lớp 2 — Errors (`errors.ts`)**

Hierarchy rõ ràng cho từng failure mode: not found, invalid input, execution failure.

**Lớp 3 — Registry (`ToolRegistry.ts`)**

State là `Map<string, ToolDefinition>`. `execute()` là pipeline: JSON.parse → Zod validate → call execute(). `toOpenAITools()` và `toAnthropicTools()` convert schema sang format mỗi provider.

---

### Error hierarchy

```
ToolRegistryError (base)
├── ToolNotFoundError   — tool không tồn tại; có .toolName
├── ToolInputError      — JSON invalid hoặc schema fail; có .toolName, .argsJson
└── ToolExecutionError  — execute() ném lỗi; có .toolName, .cause
```

---

## Vị trí trong chuỗi module

```
llm-client (#1)          ← giao tiếp với OpenAI/Anthropic
     ↑
prompt-template (#2)     ← tạo Message[] đúng format
     ↑
structured-output (#3)   ← parse output thành typed object
     ↑
tool-registry (#4)       ← module này — đăng ký và dispatch tools
     ↑
simple-react-agent (#5)  ← agent hoàn chỉnh sử dụng tool-registry
     ...
```

---

## API nhanh

| | Mô tả |
|---|---|
| `new ToolRegistry()` | Tạo registry mới |
| `registry.register(tool)` | Đăng ký tool, trả `this` cho chaining |
| `registry.get(name)` | Lấy tool hoặc `undefined` |
| `registry.has(name)` | Kiểm tra tool tồn tại |
| `registry.execute(name, argsJson)` | Validate + thực thi, trả `Promise<ToolResult>` |
| `registry.toOpenAITools()` | Convert sang OpenAI function calling format |
| `registry.toAnthropicTools()` | Convert sang Anthropic tool use format |
| `ToolNotFoundError` | Tool không tìm thấy; `.toolName` |
| `ToolInputError` | Input không hợp lệ; `.toolName`, `.argsJson` |
| `ToolExecutionError` | Execute ném lỗi; `.toolName`, `.cause` |
| `ToolRegistryError` | Base class — dùng cho `instanceof` check chung |

---

## Ví dụ

```typescript
import { ToolRegistry } from "@llm-series/tool-registry";
import { z } from "zod";

const registry = new ToolRegistry();

registry
  .register({
    name: "get_weather",
    description: "Get current weather for a city",
    schema: z.object({ city: z.string() }),
    execute: async ({ city }) => {
      // gọi weather API...
      return { city, temperature: 22, condition: "sunny" };
    },
  })
  .register({
    name: "calculate",
    description: "Evaluate a math expression",
    schema: z.object({ expression: z.string() }),
    execute: ({ expression }) => eval(expression) as number,
  });

// Dùng với OpenAI
const openaiTools = registry.toOpenAITools();
// → [{ type: "function", function: { name, description, parameters } }]

// Dùng với Anthropic
const anthropicTools = registry.toAnthropicTools();
// → [{ name, description, input_schema: { type: "object", properties, required } }]

// Dispatch từ LLM tool call
const result = await registry.execute("get_weather", '{"city": "Hanoi"}');
// → { id: "", name: "get_weather", output: { city: "Hanoi", temperature: 22, condition: "sunny" } }
```

---

## Commands

```bash
pnpm test       # chạy tests
pnpm typecheck  # type-check không emit
pnpm build      # compile sang dist/
```
