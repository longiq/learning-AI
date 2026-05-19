# structured-output

Module #3 trong chuỗi học kiến trúc LLM/agent hiện đại.

Parse và validate JSON từ text thô của LLM — xử lý markdown fence, prose wrapper, và kiểm tra kiểu dữ liệu qua Zod schema.

---

## Tại sao cần module này?

LLM không trả về JSON thuần túy. Kết quả thực tế thường trông như thế này:

```
Đây là thông tin người dùng:

```json
{"name": "Alice", "age": 30}
```

Hy vọng điều này giúp ích!
```

Nếu chỉ dùng `JSON.parse()` sẽ thất bại vì có markdown fence và prose xung quanh. Và dù parse thành công, bạn vẫn không biết object đó có đúng shape không — `name` có phải string không, `age` có phải number không.

Module này giải quyết cả hai vấn đề: trích xuất JSON từ noise, rồi validate và trả về typed result.

---

## Kiến trúc

### Luồng dữ liệu

```
CompletionResult.content        ZodSchema<T>
  (text thô từ LLM)       +    (định nghĩa shape)
          │                           │
          └──── parseStructured() ────┘
                        │
                     T (typed)
```

### Tách biệt thành 3 lớp

**Lớp 1 — Extraction (`extract.ts`)**

Hàm thuần túy, chỉ quan tâm đến việc tìm JSON string trong text. Ưu tiên theo thứ tự: markdown fence → inline object → inline array. Không biết gì về schema hay validation.

**Lớp 2 — Parse + Validate (`parseStructured.ts`)**

Kết hợp extraction, `JSON.parse()`, và Zod `safeParse()` thành một pipeline. Mỗi bước thất bại ném một loại error khác nhau với metadata cụ thể.

**Lớp 3 — Public API (`index.ts`)**

Chỉ re-export, không có logic. Kiểm soát cái gì được expose ra ngoài.

---

### Chiến lược trích xuất JSON

`extractJSON()` xử lý các format phổ biến nhất theo thứ tự ưu tiên:

1. **Markdown code block** — ` ```json\n...\n``` ` hoặc ` ```\n...\n``` `
2. **Inline JSON object** — `{...}` với ngoặc nhọn cân bằng
3. **Inline JSON array** — `[...]` với ngoặc vuông cân bằng

Option `preferLast: true` để lấy match cuối cùng thay vì đầu tiên — hữu ích khi LLM "suy nghĩ to" trước rồi mới đưa ra kết quả cuối.

---

### Error hierarchy

Mỗi bước trong pipeline có error riêng, tất cả extend `StructuredOutputError`:

```
StructuredOutputError (base, có .text: string)
├── JSONExtractionError  — không tìm thấy JSON nào trong text
├── JSONParseError       — JSON tìm thấy nhưng syntax lỗi; có .raw: string
└── SchemaValidationError — parse OK nhưng không khớp schema; có .zodError: ZodError
```

Thiết kế này cho phép caller xử lý từng tình huống khác nhau: `JSONExtractionError` thường có nghĩa là LLM không follow instruction, `SchemaValidationError` có nghĩa là cần điều chỉnh prompt để đúng format.

---

## Vị trí trong chuỗi module

```
llm-client (#1)          ← giao tiếp với OpenAI/Anthropic
     ↑
prompt-template (#2)     ← tạo Message[] đúng format
     ↑
structured-output (#3)   ← module này — parse output thành typed object
     ↑
tool-registry (#4)       ← đăng ký tools cho agent
     ↑
simple-react-agent (#5)  ← agent hoàn chỉnh đầu tiên
     ...
```

---

## API nhanh

| | Mô tả |
|---|---|
| `parseStructured(text, schema)` | Extract + parse + validate, trả về `T` |
| `parseStructured(text, schema, { preferLast: true })` | Lấy JSON cuối cùng trong text |
| `extractJSON(text)` | Chỉ extract, không validate |
| `JSONExtractionError` | Không tìm thấy JSON; `.text` chứa input gốc |
| `JSONParseError` | Syntax lỗi; `.raw` chứa string đã extract |
| `SchemaValidationError` | Shape sai; `.zodError` chứa chi tiết lỗi Zod |
| `StructuredOutputError` | Base class — dùng cho `instanceof` check chung |

---

## Ví dụ

```typescript
import { parseStructured, SchemaValidationError } from "@llm-series/structured-output";
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// Text từ LLM có thể chứa bất kỳ format nào
const llmOutput = `
Dưới đây là thông tin người dùng:
\`\`\`json
{"name": "Alice", "age": 30}
\`\`\`
`;

const person = parseStructured(llmOutput, PersonSchema);
// person: { name: "Alice", age: 30 }  ← fully typed

// Xử lý lỗi
try {
  parseStructured(llmOutput, PersonSchema);
} catch (e) {
  if (e instanceof SchemaValidationError) {
    console.log(e.zodError.issues); // chi tiết field nào sai
  }
}
```

---

## Commands

```bash
pnpm test       # chạy test (31 cases)
pnpm typecheck  # type-check không emit
pnpm build      # compile sang dist/
```
