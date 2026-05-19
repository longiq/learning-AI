# prompt-template

Module #2 trong chuỗi học kiến trúc LLM/agent hiện đại.

Chuyển đổi template có `{{variable}}` thành `Message[]` tương thích trực tiếp với [llm-client](https://github.com/longiq/llm-client).

---

## Tại sao cần module này?

Khi gọi LLM, bạn luôn phải tạo một mảng messages theo đúng format — system prompt, các ví dụ, rồi câu hỏi thực tế. Nếu viết thẳng vào code, prompt bị rải rác khắp nơi, khó tái sử dụng, và dễ mắc lỗi khi điền dữ liệu động.

Module này tách biệt **cấu trúc prompt** (định nghĩa một lần) khỏi **dữ liệu động** (điền vào lúc chạy), giống như SQL prepared statement tách query khỏi parameters.

---

## Kiến trúc

### Luồng dữ liệu

```
PromptTemplateConfig          TemplateVariables
(định nghĩa một lần)    +    (điền lúc chạy)
        │                           │
        └──────── render() ─────────┘
                      │
                  Message[]
                      │
              llm-client.complete()
```

Mỗi bước có trách nhiệm rõ ràng và không bị trộn lẫn.

---

### Tách biệt thành 3 lớp

**Lớp 1 — Interpolation (`interpolate.ts`)**

Hàm thuần túy, không có trạng thái, không phụ thuộc vào bất kỳ class nào. Nhận một chuỗi và một object biến, trả về chuỗi đã điền giá trị. Có thể test hoàn toàn độc lập. Đây là "engine" nhỏ nhất của module.

**Lớp 2 — Template (`PromptTemplate.ts`)**

Class bất biến (immutable). Một khi tạo xong, không thể thay đổi nội dung template. Mỗi lần gọi `render()` trả về một mảng `Message[]` mới, không dùng lại object cũ. Điều này tránh được các lỗi chia sẻ trạng thái khi dùng cùng template ở nhiều nơi.

**Lớp 3 — Public API (`index.ts`)**

Chỉ re-export, không có logic. Vai trò là cổng vào duy nhất của module — kiểm soát cái gì được expose ra ngoài.

---

### Thứ tự message đầu ra

Khi gọi `render()`, messages được sắp xếp theo đúng convention mà các LLM provider mong đợi:

1. **system** — hướng dẫn hành vi tổng thể cho model (tùy chọn)
2. **user / assistant** — các cặp ví dụ few-shot (tĩnh, không điền biến)
3. **user** — câu hỏi thực tế của người dùng (có điền biến)

Few-shot examples **không** bị interpolate vì chúng là dữ liệu tham chiếu cố định, không phải nội dung động.

---

### Chiến lược xử lý lỗi

Khi `render()` được gọi mà thiếu biến, thay vì dừng ở biến đầu tiên thiếu, module **thu thập tất cả biến thiếu** rồi mới throw một lỗi duy nhất. Lý do: trong thực tế, người dùng muốn biết tất cả vấn đề cùng lúc, không phải sửa từng cái một rồi chạy lại.

Biến thừa (có trong `vars` nhưng không có trong template) bị bỏ qua, cho phép truyền một object context lớn vào nhiều template khác nhau mà không cần lọc trước.

---

### Tại sao không có runtime dependency?

Template interpolation chỉ là regex + string replace — không cần thư viện ngoài. Giữ module nhỏ gọn để có thể copy vào bất kỳ dự án nào mà không kéo theo dependency chain.

---

## Vị trí trong chuỗi module

```
llm-client (#1)          ← giao tiếp với OpenAI/Anthropic
     ↑
prompt-template (#2)     ← module này — tạo Message[] đúng format
     ↑
structured-output (#3)   ← parse output thành object có cấu trúc
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
| `new PromptTemplate(config)` | Định nghĩa template — `user` bắt buộc, `system` và `examples` tùy chọn |
| `template.render(vars)` | Trả về `Message[]`, throw `TemplateRenderError` nếu thiếu biến |
| `template.withExamples(list)` | Trả về template mới với examples bổ sung, không thay đổi bản gốc |
| `template.variables` | Danh sách biến cần thiết, tính sẵn tại constructor |
| `TemplateRenderError` | Có `.missingVariables: string[]` để xử lý lỗi có kiểu |

---

## Commands

```bash
npm test           # chạy test (40 cases)
npm run typecheck  # type-check không emit
npm run build      # compile sang dist/
```
