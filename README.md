# llm-client

Module #1 trong chuỗi 9 module học modern LLM/agent architecture. Đây là nền tảng cho tất cả module sau.

---

## Tại sao module này tồn tại?

Mỗi LLM provider (OpenAI, Anthropic, Groq...) có SDK riêng, API format riêng. Nếu code trực tiếp vào SDK, khi đổi provider phải sửa code ở nhiều nơi.

`llm-client` áp dụng **Adapter Pattern**: tạo một interface chung (`LLMClient`), mỗi provider là một adapter. Code của các module phía trên chỉ biết đến `LLMClient` — không biết đến OpenAI hay Anthropic.

---

## Kiến trúc

### Cấu trúc file

```
src/
├── types.ts          ← Interface contract — định nghĩa mọi type dùng chung
├── errors.ts         ← Error hierarchy phân loại lỗi từ providers
├── client.ts         ← createClient() factory và collectStream() helper
├── providers/
│   ├── openai.ts     ← Adapter giữa LLMClient ↔ OpenAI SDK
│   └── anthropic.ts  ← Adapter giữa LLMClient ↔ Anthropic SDK
└── index.ts          ← Public API
```

### Luồng dữ liệu

Caller gọi `createClient()` với provider và config → factory trả về một instance implement `LLMClient` interface → caller chỉ tương tác qua interface, không biết đến SDK cụ thể bên dưới.

### Hai chế độ gọi

**`complete()`** — gửi request, chờ response hoàn chỉnh rồi trả về một lần. Phù hợp khi cần toàn bộ output trước khi xử lý tiếp.

**`stream()`** — trả về từng chunk text ngay khi provider generate ra. Phù hợp cho UI hiển thị realtime. Trả về `AsyncGenerator` với kiểu `<string, CompletionResult>` — `yield` từng chunk text, `return` usage stats khi stream kết thúc. Helper `collectStream()` bọc logic này lại cho caller không cần hiểu generator protocol.

### Model selection

Model được resolve theo thứ tự ưu tiên: model trong từng lần gọi → `defaultModel` trong config → fallback mặc định. Một client có thể dùng nhiều model khác nhau trong từng lần gọi.

### Error hierarchy

Thay vì để lỗi từ SDK bubble up ra ngoài, mỗi adapter normalize lỗi về một trong bốn loại:

- **`LLMAuthError`** — API key không hợp lệ, fail ngay, không retry
- **`LLMRateLimitError`** — Quá nhiều request, kèm `retryAfter` (giây) để caller biết chờ bao lâu
- **`LLMContextLengthError`** — Prompt quá dài, caller cần rút ngắn
- **`LLMProviderError`** — Lỗi server 5xx, kèm `statusCode`

Phân loại này quan trọng cho `simple-react-agent` (module #5): rate limit thì retry với backoff, auth error thì fail fast.

### Các quyết định thiết kế đáng chú ý

**`maxRetries: 0` trong SDK constructors** — Tắt retry tự động của SDK. Retry logic thuộc về agent layer (module #5), không phải client layer. Nếu để SDK tự retry, agent không kiểm soát được timing và không thể implement chiến lược retry riêng.

**`baseURL` override trên cả hai config** — Cho phép trỏ đến Ollama, LM Studio, hay bất kỳ OpenAI-compatible server nào mà không cần thay đổi code.

**`raw: unknown` trong `CompletionResult`** — Escape hatch giữ nguyên raw response từ provider. Các module phía trên có thể cast để truy cập fields provider-specific (logprobs, tool calls...) mà không cần `llm-client` phải biết trước.

**Direct deps thay vì peer deps cho SDKs** — Vì tất cả 9 module nằm trong cùng một hệ sinh thái và được link local, `openai` và `@anthropic-ai/sdk` chỉ cần install một lần tại đây, pnpm hoist và share cho các module khác.

---

## Cách downstream modules sử dụng

Mỗi module tiếp theo link về `llm-client` qua `file:../llm-client` trong `package.json`, import `LLMClient` interface và các types cần thiết. Module phía trên nhận `LLMClient` làm dependency injection — không quan tâm provider là gì, chỉ cần gọi `.complete()` hoặc `.stream()`.

---

## Vị trí trong chuỗi module

```
llm-client          ← module này
└── prompt-template
    └── structured-output
        └── tool-registry
            └── simple-react-agent
                └── memory-store
                    └── chunker + embedder
                        └── vector-store-lite + retriever
                            └── agent-router
```
