=== Module tạo quiz

==== Kiến trúc tổng quan

Module tạo quiz tự động được triển khai như một microservice độc lập (`AI.Api`, cổng 5004),
tiếp nhận tài liệu PDF hoặc văn bản từ người dùng và trả về bộ câu hỏi trắc nghiệm JSON
đã được cấu trúc hóa. Module giao tiếp với mô hình ngôn ngữ lớn (LLM) thông qua nền tảng
OpenRouter — một API gateway tổng hợp nhiều nhà cung cấp LLM — với mô hình chính được
chọn là *Step-3.5-Flash* của StepFun dựa trên kết quả thực nghiệm đánh giá ở phần trước.

Kiến trúc module gồm ba thành phần chính:

- `QuizGenerationController` — nhận request multipart/form-data (file + metadata), trích
  xuất văn bản từ PDF, kiểm tra quota tổ chức, và điều phối luồng sinh câu hỏi.
- `OpenRouterService` — đóng gói toàn bộ logic giao tiếp với LLM: xây dựng prompt, gọi
  API, xử lý fallback, phân tích cú pháp JSON đầu ra.
- `AiQuotaService` — theo dõi và kiểm soát số lần gọi AI theo phạm vi tổ chức, tự động
  reset theo lịch bằng Hangfire.

==== Luồng xử lý end-to-end

Khi người dùng gửi yêu cầu tạo quiz, hệ thống thực hiện tuần tự các bước sau:

+ *Tiếp nhận và xác thực đầu vào*: Controller kiểm tra file không rỗng, không vượt quá
  10 MB, và trích xuất nội dung văn bản. Với file PDF, thư viện `PdfPig` đọc từng trang
  và nối toàn bộ text lại. Nội dung dưới 50 ký tự bị từ chối ngay.

+ *Kiểm tra quota*: Nếu người dùng thuộc một tổ chức (claim `org_id` có trong JWT),
  `AiQuotaService` kiểm tra xem tổ chức đó còn hạn mức không. Vượt quota trả về
  `HTTP 429`.

+ *Chuẩn bị nội dung tài liệu*: Nội dung được cắt xuống tối đa 96.000 ký tự để đảm bảo
  nằm trong cửa sổ ngữ cảnh của mô hình và kiểm soát chi phí token.

+ *Pass đầu tiên — sinh toàn bộ câu hỏi*: `OpenRouterService` xây dựng prompt với số
  lượng câu hỏi mục tiêu (`maxQ`) và gọi API Step-3.5-Flash. Nếu API trả lỗi hoặc
  timeout (lỗi tạm thời), hệ thống tự động chuyển sang mô hình dự phòng
  (`meta-llama/llama-3.1-8b-instruct`) với nội dung tài liệu được rút gọn xuống 48.000
  ký tự và ngân sách token giảm 30%.

+ *Pass bổ sung (Top-up)*: Nếu số câu hỏi thu được còn thấp hơn ngưỡng tối thiểu
  (`minQ`), hệ thống tạo thêm một lần gọi thứ hai với prompt chuyên biệt yêu cầu đúng
  số câu còn thiếu và bao phủ các phần tài liệu chưa được khai thác.

+ *Phân tích cú pháp và hậu xử lý*: Đầu ra thô của LLM được làm sạch và chuyển thành
  danh sách câu hỏi có cấu trúc. Mọi câu thiếu trường `explanation` đều được gán
  placeholder cảnh báo thay vì bị bỏ qua. Kết quả được cắt đúng `maxQ` rồi trả về.

+ *Trừ quota và phản hồi*: Chỉ sau khi sinh câu hỏi thành công, hệ thống mới trừ một
  đơn vị quota của tổ chức. Client nhận về JSON với danh sách câu hỏi ở trạng thái
  *draft* để xem xét trước khi lưu vào hệ thống.

==== Thiết kế Prompt

Prompt được thiết kế theo kiến trúc hai tầng: System Prompt thiết lập vai trò tổng quát
của mô hình, còn User Prompt cung cấp toàn bộ tài liệu, ràng buộc nghiệp vụ và schema
JSON mong muốn.

===== System Prompt

System Prompt được giữ ngắn gọn và tập trung vào hai nhiệm vụ: khai báo vai trò chuyên
gia sư phạm và thiết lập ràng buộc định dạng đầu ra tuyệt đối (chỉ JSON thuần, không
markdown, không văn bản thừa):

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  ```
  You are an expert educator creating multiple-choice quiz questions from a
  provided document. Output ONLY valid JSON matching the exact schema requested
  — no markdown, no code fences, no explanatory text before or after the JSON
  object.
  ```
)

Vai trò "giáo viên chuyên gia" (expert educator) được chọn thay cho "AI assistant" nhằm
kích hoạt hành vi sư phạm của mô hình: chú trọng độ chính xác thực tế, chất lượng
phương án nhiễu, và rõ ràng về ngữ pháp câu hỏi.

===== User Prompt chính (First-pass)

User Prompt chứa bốn khối nội dung được sắp xếp theo thứ tự ưu tiên từ cao đến thấp:
nhiệm vụ và số lượng, tiêu chí độ khó, quy tắc bắt buộc, schema đầu ra và tài liệu gốc.

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  ```
  TASK: Generate exactly {targetQ} multiple-choice questions from the document
  below.
  REQUIRED COUNT: {targetQ}. Output all {targetQ} questions without stopping
  early.

  DIFFICULTY CRITERIA ({DIFFICULTY}):
  {DifficultyLine}

  DOCUMENT TITLE: {documentTitle}

  STRICT RULES (violating any rule makes the output unusable):
  1. Base every question solely on the document — zero hallucination.
  2. Detect the document language. Output ALL text (questions, options,
     explanations) in THAT SAME language.
     Vietnamese doc → Vietnamese output. Japanese doc → Japanese output.
     English doc → English output.
  3. Each question has EXACTLY 4 options stored in the "options" array
     (index 0–3).
  4. Exactly ONE option is correct. Set "correct_index" to its 0-based index
     (0, 1, 2, or 3).
  5. The "explanation" field MUST be non-empty and must reference or quote
     the document.
  6. Generate all {targetQ} questions before outputting anything.

  OUTPUT FORMAT — return ONLY the JSON object below, starting with { and
  ending with }. No markdown fences. No code blocks. No preamble.
  No trailing commentary. Just the JSON:
  {
    "questions": [
      {
        "question": "...",
        "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
        "correct_index": 0,
        "explanation": "..."
      }
    ]
  }

  DOCUMENT:
  ---
  {documentContent}
  ---
  ```
)

Các điểm thiết kế đáng chú ý:

- *Quy tắc 1 (Zero Hallucination)*: Ràng buộc mô hình chỉ sử dụng thông tin có trong
  tài liệu, trực tiếp thực thi tiêu chí "Tính Trung thực" đã được đánh giá trong thực
  nghiệm.

- *Quy tắc 2 (Nhất quán ngôn ngữ)*: Yêu cầu mô hình tự phát hiện ngôn ngữ tài liệu
  và xuất câu hỏi bằng ngôn ngữ đó, thay vì mặc định tiếng Anh. Đây là điều kiện để
  hệ thống phục vụ tài liệu tiếng Việt và tiếng Nhật mà không cần cấu hình thêm.

- *Quy tắc 5 (Giải thích bắt buộc)*: Trường `explanation` là bắt buộc và phải tham
  chiếu đến tài liệu gốc, đảm bảo người học biết *tại sao* đáp án đúng là đúng —
  không chỉ biết đáp án nào đúng.

- *Quy tắc 6 (Sinh trước, xuất sau)*: Chỉ dẫn "Generate all questions before
  outputting anything" giảm hiện tượng mô hình sinh ra câu hỏi kém chất lượng ở cuối
  do gần hết ngân sách token.

===== Tiêu chí độ khó (DifficultyLine)

Mỗi mức độ được diễn đạt thành một đoạn mô tả hành vi cụ thể thay vì nhãn trừu tượng,
giúp mô hình căn chỉnh chính xác loại tư duy sư phạm cần thể hiện:

#table(
  columns: (auto, 1fr),
  align: (center, left),
  stroke: 0.5pt,
  table.header([*Mức độ*], [*Nội dung DifficultyLine*]),

  [*EASY*],
  [
    _Recognition and recall level:_ \
    • Câu hỏi phải trích xuất trực tiếp một sự kiện, thuật ngữ hoặc định nghĩa được
    nêu trong tài liệu. \
    • Mẫu câu hỏi: "According to the document, what is X?" \
    • Phương án nhiễu phải rõ ràng và khác biệt hoàn toàn — không dùng gần nghĩa. \
    • Giữ thân câu hỏi ngắn (một câu). Không hỏi suy luận hay tổng hợp.
  ],

  [*NORMAL*],
  [
    _Application and analysis level:_ \
    • Câu hỏi yêu cầu người học kết nối thông tin từ 2–3 câu hoặc đoạn khác nhau
    trong tài liệu. \
    • Mẫu câu hỏi: "Why does X lead to Y according to the document?" \
    • Phương án nhiễu phải hợp lý và tương tự đáp án đúng, nhưng sai khi đọc kỹ
    tài liệu. \
    • Tránh thuần nhớ thuộc lòng (quá dễ) và giả định giả thuyết (quá khó).
  ],

  [*HARD*],
  [
    _Synthesis and evaluation level:_ \
    • Câu hỏi yêu cầu tổng hợp nhiều phần của tài liệu hoặc suy luận về kịch bản
    giả định dựa trên kiến thức trong tài liệu. \
    • Mẫu câu hỏi: "Which conclusion is best supported by both concept A and B?" \
    • Phương án nhiễu cực kỳ hợp lý — chỉ sai ở một chi tiết tinh tế hoặc đúng trong
    ngữ cảnh khác. \
    • Tránh câu hỏi có thể trả lời bằng cách đọc một câu đơn lẻ.
  ],
)

===== User Prompt bổ sung (Top-up pass)

Khi pass đầu tiên trả về ít câu hỏi hơn ngưỡng tối thiểu, hệ thống gọi thêm một lần nữa
với prompt chuyên biệt. Prompt này thêm ràng buộc bổ sung để tránh trùng lặp với các câu
đã có:

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  ```
  TASK: Generate exactly {needed} MORE multiple-choice questions from the
  document below.
  CONTEXT: {alreadyHave} questions already exist. These {needed} must cover
  DIFFERENT aspects of the document.
  REQUIRED COUNT: {needed}. Output all {needed} without stopping early.

  DIFFICULTY CRITERIA ({DIFFICULTY}):
  {DifficultyLine}

  STRICT RULES:
  1. Base every question solely on the document — zero hallucination.
  2. Detect the document language. Output ALL text in THAT SAME language.
  3. Each question has EXACTLY 4 options in the "options" array (index 0–3).
  4. Exactly ONE option is correct; set "correct_index" to its 0-based index.
  5. The "explanation" field MUST be non-empty and reference the document.
  6. Cover DIFFERENT document sections from what was already generated.

  OUTPUT FORMAT — return ONLY the JSON object, starting with { and ending
  with }. No markdown fences. No preamble. No trailing text. Just JSON:
  { ... }

  DOCUMENT:
  ---
  {documentContent}
  ---
  ```
)

==== Cơ chế đảm bảo chất lượng đầu ra

Ngoài thiết kế prompt, module triển khai thêm một số cơ chế kỹ thuật để đảm bảo đầu ra
luôn sử dụng được trong mọi điều kiện:

===== Hiệu chỉnh tham số theo độ khó

Nhiệt độ (`temperature`) và `top_p` được điều chỉnh theo từng mức độ khó thay vì dùng
giá trị cố định, nhằm cân bằng giữa sự sáng tạo cần thiết và độ ổn định định dạng:

#table(
  columns: (auto, auto, auto, auto),
  align: (center, center, center, left),
  stroke: 0.5pt,
  table.header(
    [*Mức độ*], [*temperature*], [*top_p*], [*Lý do*],
  ),
  [EASY],  [0.50], [0.82],
  [Cân bằng giữa nhất quán định dạng và độ đa dạng nhỏ; tránh mô hình bị "đóng băng"
   ở nhiệt độ quá thấp (≤ 0.35 gây lỗi trả về `correct_index` dạng chuỗi)],
  [NORMAL], [0.55], [0.85], [Cân bằng: đủ sáng tạo cho phương án nhiễu hợp lý],
  [HARD],   [0.70], [0.90], [Nhiệt độ cao hơn → phương án nhiễu tinh vi và đa dạng hơn],
)

===== Ngân sách token theo số lượng câu hỏi

`maxTokens` được tính dựa trên số câu hỏi yêu cầu để tránh cắt xén đầu ra giữa chừng:

#table(
  columns: (auto, auto, auto, auto),
  align: (center, center, center, center),
  stroke: 0.5pt,
  table.header(
    [*Chế độ*], [*Số câu (min–max)*], [*maxTokens*], [*Top-up tokens*],
  ),
  [`normal`], [10–12], [4 000], [needed × 350 + 500],
  [`many`],   [15–18], [6 000], [needed × 350 + 500],
  [`more`],   [20–25], [9 000], [needed × 350 + 500],
)

===== Pipeline phân tích cú pháp JSON 4 bước

LLM đôi khi trả về JSON không hoàn toàn sạch (có markdown fence, có văn bản dẫn nhập,
hoặc bị cắt xén do hết token). Module triển khai pipeline 4 bước theo thứ tự giảm dần
ưu tiên:

+ *Trích xuất payload*: Loại bỏ thẻ `<think>...</think>` mà một số mô hình emit trước
  JSON, xử lý markdown fence (`` ```json `` hoặc `` ``` ``), duyệt bracket-depth để tìm
  đúng cặp `{...}` ngoài cùng — loại bỏ mọi văn bản thừa trước và sau JSON.

+ *Parse dạng wrapper object* `{"questions": [...]}`: Thử deserialize thẳng vào
  `QuizData`. Thành công → dùng kết quả này.

+ *Parse dạng bare array* `[{...}, {...}]`: Một số mô hình bỏ qua wrapper và trả thẳng
  mảng câu hỏi. Thử deserialize vào `List<QuizQuestion>`. Thành công → dùng kết quả này.

+ *Recovery từ JSON bị cắt xén*: Nếu tất cả bước trên thất bại, hàm
  `RecoverPartialQuestions` duyệt chuỗi JSON bằng đếm độ sâu bracket, trích xuất mọi
  object `{...}` hoàn chỉnh tìm được, bỏ qua phần bị cắt ở cuối. Chiến lược này đảm
  bảo dù LLM không sinh đủ câu, những câu đã sinh xong vẫn được cứu vớt.

Đặc biệt, các tùy chọn deserialize cho phép `correct_index` là chuỗi (`"0"`) hoặc số
nguyên (`0`) do một số mô hình không tuân thủ kiểu dữ liệu nghiêm ngặt.

===== Đảm bảo bất biến đặc tả — Explanation bắt buộc

Theo bất biến §3 của đặc tả hệ thống, mọi câu hỏi do AI sinh ra đều phải có trường
`explanation` khác rỗng. Sau khi phân tích cú pháp, hàm `BuildResponse` kiểm tra từng
câu và thay thế bất kỳ trường `explanation` rỗng nào bằng placeholder cảnh báo, thay vì
bỏ câu đó hoặc để trống:

#block(
  fill: luma(240),
  inset: 10pt,
  radius: 4pt,
  ```
  "(Explanation not provided by model — verify before publishing)"
  ```
)

Cơ chế này đảm bảo client luôn nhận được bộ câu hỏi hợp lệ về mặt cấu trúc, đồng thời
cảnh báo người dùng bổ sung giải thích trước khi công bố.

==== Kiểm soát hạn mức tổ chức (Quota Management)

Mỗi tổ chức trong Lumina có một hạn mức gọi AI riêng, được quản lý bởi
`AiQuotaService`. Quota chỉ bị trừ khi sinh câu hỏi *thành công*, tránh lãng phí khi
API lỗi. Bộ đếm quota tự động reset định kỳ bằng Hangfire job (`QuotaResetJob`). SysAdmin
có thể điều chỉnh hạn mức và API key của từng tổ chức thông qua `SysAdmin.Api`.

Luồng kiểm tra quota trong `QuizGenerationController`:

+ Đọc `org_id` từ JWT claim.
+ Nếu `org_id` tồn tại: gọi `CanMakeCallAsync(orgId)`. Nếu hết quota → trả `HTTP 429`.
+ Thực hiện sinh câu hỏi.
+ Chỉ khi thành công: gọi `IncrementUsageAsync(orgId)` để trừ một đơn vị.

Người dùng cá nhân (không thuộc tổ chức, `org_id` null trong JWT) được miễn kiểm tra
quota và có thể sử dụng tính năng AI tự do, đúng theo đặc tả hệ thống.
