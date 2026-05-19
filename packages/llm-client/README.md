# llm-client

Module #1 trong chuỗi học kiến trúc LLM/agent hiện đại.

Cung cấp một interface thống nhất để gọi các LLM provider (OpenAI, Anthropic) mà không cần biết đến SDK cụ thể bên dưới.

---

## Tại sao cần module này?

Mỗi LLM provider có SDK riêng, format response riêng, cách xử lý lỗi riêng. Nếu code trực tiếp vào SDK, khi đổi provider phải sửa code ở nhiều nơi, và các module phía trên phải hiểu từng SDK cụ thể.

Module này áp dụng **Adapter Pattern**: tạo một interface chung (`LLMClient`), mỗi provider là một adapter. Toàn bộ 8 module còn lại chỉ cần biết đến `LLMClient` — đổi provider là đổi một dòng `createClient()`, không đụng vào logic phía trên.

---

## Kiến trúc

### Luồng dữ liệu

```
createClient("openai", config)
        │
        ▼
  OpenAIClient (implements LLMClient)
        │
        ├── complete(options) ──► Promise<CompletionResult>
        │
        └── stream(options) ───► AsyncGenerator<string, CompletionResult>
```

Caller chỉ tương tác qua `LLMClient` interface, không bao giờ import `OpenAIClient` hay `AnthropicClient` trực tiếp.

---

### Tách biệt thành 4 lớp

**Lớp 1 — Types (`types.ts`)**

Định nghĩa toàn bộ interface contract: `Message`, `CompletionOptions`, `CompletionResult`, `LLMClient`. Đây là "hợp đồng" mà mọi module trong chuỗi đều import từ đây. Không có logic, chỉ có types.

**Lớp 2 — Errors (`errors.ts`)**

Phân loại lỗi từ provider thành 4 loại có kiểu rõ ràng. Tách biệt hoàn toàn khỏi SDK — module phía trên `catch` được `LLMAuthError` mà không cần biết OpenAI hay Anthropic throw gì.

**Lớp 3 — Adapters (`providers/`)**

Mỗi file là một adapter: dịch từ `CompletionOptions` sang format của SDK, dịch response ngược lại thành `CompletionResult`, map lỗi sang error hierarchy. Tất cả sự khác biệt giữa providers được cô lập tại đây.

**Lớp 4 — Public API (`client.ts`, `index.ts`)**

`createClient()` là điểm vào duy nhất để tạo client. `collectStream()` là helper để tiêu thụ stream mà không cần hiểu generator protocol. `index.ts` kiểm soát chính xác cái gì được expose ra ngoài.

---

### Hai chế độ gọi: `complete()` vs `stream()`

**`complete()`** — gửi request, chờ model generate xong, trả về toàn bộ response một lần. Phù hợp khi cần full output trước khi xử lý tiếp (ví dụ: structured output parsing).

**`stream()`** — nhận từng chunk text ngay khi model generate ra. Phù hợp cho UI hiển thị realtime hoặc khi muốn xử lý từng token sớm.

`stream()` trả về `AsyncGenerator<string, CompletionResult, unknown>`. Kiểu `TReturn = CompletionResult` nghĩa là sau khi stream kết thúc, generator *trả về* (không phải *yield*) một `CompletionResult` chứa usage stats. `collectStream()` bọc logic này lại, trả về `{ text, result }` cho caller không cần biết generator protocol.

---

### Chiến lược xử lý lỗi

Thay vì để lỗi từ SDK bubble up, mỗi adapter bắt lỗi và map sang 4 loại cụ thể:

- **`LLMAuthError`** — API key không hợp lệ. Fail fast, không bao giờ retry.
- **`LLMRateLimitError`** — Quá nhiều request. Có `retryAfter` (giây) để caller biết chờ bao lâu trước khi thử lại.
- **`LLMContextLengthError`** — Prompt quá dài. Caller cần rút ngắn input, không phải retry.
- **`LLMProviderError`** — Lỗi server 5xx. Có `statusCode`, thường có thể retry.

Phân loại này cho phép `simple-react-agent` (module #5) implement đúng chiến lược: rate limit thì retry với exponential backoff, auth error thì dừng ngay.

---

### Tại sao `maxRetries: 0` trong SDK?

Cả OpenAI và Anthropic SDK đều có retry tự động. Module này tắt đi (`maxRetries: 0`) vì retry logic thuộc về tầng agent, không phải tầng client. Nếu SDK tự retry, agent mất khả năng kiểm soát timing, không thể implement chiến lược riêng, và không biết thực sự đã có bao nhiêu attempt.

---

### Tại sao `baseURL` override?

Cho phép trỏ đến bất kỳ OpenAI-compatible server nào (Ollama, LM Studio, Groq, Azure...) mà không cần thay đổi code. Khi phát triển `simple-react-agent` trên máy local, có thể dùng Ollama với zero config thay đổi.

---

### `raw: unknown` trong `CompletionResult`

Escape hatch giữ nguyên raw response từ provider. Khi module phía trên cần feature provider-specific (logprobs, tool call objects, citation data...) mà `CompletionResult` không normalize, họ cast `result.raw` sang type cụ thể thay vì `llm-client` phải biết trước mọi use case.

---

## Vị trí trong chuỗi module

```
llm-client (#1)          ← module này — giao tiếp với OpenAI/Anthropic
     ↓
prompt-template (#2)     ← tạo Message[] đúng format
     ↓
structured-output (#3)   ← parse output thành object có cấu trúc
     ↓
tool-registry (#4)       ← đăng ký tools cho agent
     ↓
simple-react-agent (#5)  ← agent hoàn chỉnh đầu tiên
     ...
```

---

## API nhanh

| | Mô tả |
|---|---|
| `createClient("openai", config)` | Tạo OpenAI adapter, trả về `LLMClient` |
| `createClient("anthropic", config)` | Tạo Anthropic adapter, trả về `LLMClient` |
| `client.complete(options)` | Gọi LLM, chờ xong, trả về `CompletionResult` |
| `client.stream(options)` | Gọi LLM, trả về generator yield từng chunk |
| `collectStream(gen)` | Helper: tiêu thụ stream → `{ text, result }` |
| `client.provider` | `"openai"` hoặc `"anthropic"` |

**Config chung cho cả hai provider:**

| | Mô tả |
|---|---|
| `apiKey` | API key (bắt buộc) |
| `baseURL` | Override endpoint (Ollama, Azure...) |
| `defaultModel` | Model fallback khi không chỉ định trong options |
| `fetch` | Custom fetch implementation (dùng để mock trong tests) |

---

## Commands

```bash
pnpm test       # chạy test (27 cases, không cần API key thật)
pnpm typecheck  # type-check không emit
pnpm build      # compile sang dist/
```
