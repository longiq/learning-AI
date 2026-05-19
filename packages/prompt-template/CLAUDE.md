# prompt-template

Module #2 trong chuỗi 9 module học kiến trúc LLM/agent hiện đại.
Chuyển đổi template có `{{variable}}` thành `Message[]` tương thích với llm-client.

## Lộ trình 9 module

| # | Module | Repo | Trạng thái |
|---|---|---|---|
| 1 | llm-client | longiq/llm-client | ✓ Hoàn thành |
| 2 | prompt-template | longiq/prompt-template | ✓ Hoàn thành |
| 3 | structured-output | — | Chưa bắt đầu |
| 4 | tool-registry | — | Chưa bắt đầu |
| 5 | simple-react-agent | — | Chưa bắt đầu |
| 6 | memory-store | — | Chưa bắt đầu |
| 7 | chunker + embedder | — | Chưa bắt đầu |
| 8 | vector-store-lite + retriever | — | Chưa bắt đầu |
| 9 | agent-router | — | Chưa bắt đầu |

## Kế hoạch Monorepo

Sau khi đủ module, tất cả sẽ được gộp vào monorepo `llm-clients`:

```
llm-clients/
├── packages/
│   ├── llm-client/
│   ├── prompt-template/
│   └── ...
└── package.json   ← pnpm/npm workspaces
```

Khi migrate: đổi `"name": "prompt-template"` → `"name": "@llm-clients/prompt-template"`.

## Nguyên tắc kiến trúc chung

- Mỗi module: nhỏ gọn, zero runtime dependencies, TypeScript strict mode
- Output của mỗi module tương thích với input của module tiếp theo
- Không dùng path alias phức tạp — import bằng tên package
- Cấu trúc thư mục `src/` và `tests/` nhất quán giữa các module

## Interface với llm-client (#1)

```typescript
// llm-client exports (tương thích structural typing)
type MessageRole = "system" | "user" | "assistant";
interface Message { role: MessageRole; content: string; }
interface CompletionOptions { model: string; messages: Message[]; ... }
```

`render()` của module này trả về `Message[]` trực tiếp dùng được trong `CompletionOptions.messages`.

## Kiến trúc module này

```
src/types.ts          — interface + class TemplateRenderError
src/interpolate.ts    — hàm thuần túy xử lý {{variable}}
src/PromptTemplate.ts — class chính
src/index.ts          — re-export, không có logic
```

## Cú pháp variable

`{{variableName}}` — tên phải khớp `[a-zA-Z_][a-zA-Z0-9_-]*`

- Cho phép hyphen: `{{user-name}}`
- Cho phép underscore đầu: `{{_internal}}`
- KHÔNG khớp khi có khoảng trắng: `{{ name }}`
- KHÔNG khớp single brace: `{x}`

## Thứ tự message trong render()

1. `system` (nếu có `config.system`)
2. Các cặp `user` / `assistant` cho mỗi few-shot example (không interpolate)
3. `user` lượt cuối (có interpolation)

## Error handling

`TemplateRenderError` thrown khi thiếu variable trong `render()`.
Tất cả biến thiếu được báo cùng lúc qua `error.missingVariables: string[]`.
Biến thừa trong `vars` bị bỏ qua silently.

## Commands

```bash
npm test              # chạy test một lần
npm run test:watch    # watch mode
npm run typecheck     # type-check không emit
npm run build         # compile sang dist/
```
