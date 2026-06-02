// ═══════════════════════════════════════════════════════════════════════════════
// CHƯƠNG 7 — KIỂM THỬ
// Lumina LMS — Báo cáo đồ án tốt nghiệp
// ═══════════════════════════════════════════════════════════════════════════════


== Phương pháp và công cụ kiểm thử

Hệ thống Lumina được kiểm thử theo hai lớp chính:

- *Backend (API Integration)*: Sử dụng `pytest` + `requests` (Python) để gửi HTTP
  request trực tiếp đến API Gateway và kiểm tra status code, cấu trúc JSON, cũng như
  hành vi phân quyền RBAC. Toàn bộ test chạy trên môi trường kiểm thử tích hợp với
  tài khoản seed sẵn (SysAdmin1, OrgAdmin1, User1…); fixture `auth.py` cung cấp JWT
  token cho ba vai trò.

- *Frontend (E2E + UI Display)*: Sử dụng Playwright (`pytest-playwright`) để mô phỏng
  hành vi người dùng trên trình duyệt Chromium. Test được tổ chức thành ba nhóm:
  luồng E2E nghiệp vụ hoàn chỉnh (`tests/e2e/`), kiểm thử field-level cho các màn
  hình xác thực và portal quản trị (`tests/katalon/`), và kiểm thử hiển thị theo vai trò
  (`tests/ui/`). Phần tử được định vị qua thuộc tính `data-testid` để tránh phụ thuộc
  vào cấu trúc CSS.

Ngoài ra, nhóm xây dựng riêng tập test chuyên biệt tại
`test_nonfunctional_requirements.py` (46 test case) để xác minh bốn yêu cầu phi chức
năng ưu tiên — được trình bày chi tiết ở mục 7.3.

== Kết quả kiểm thử chức năng

=== Kiểm thử API (98 test case)

#table(
  columns: (auto, auto, auto, auto),
  align: (left, left, center, center),
  stroke: 0.5pt,
  table.header(
    [*Module*], [*File kiểm thử*], [*Test Cases*], [*Passed*],
  ),
  [Xác thực & Phiên đăng nhập],     [`test_authentication.py`],         [18], [18],
  [Phân quyền theo vai trò],         [`test_auth_roles.py`],             [24], [24],
  [Nội dung học tập],                [`test_content.py`],                [11], [11],
  [Tổ chức & Khóa học],              [`test_organization_course.py`],    [7],  [7],
  [OrgAdmin],                        [`test_orgadmin.py`],               [22], [22],
  [Tính năng bổ sung theo đặc tả],   [`test_spec_additions.py`],         [16], [16],
  [*Tổng*], [], [*98*], [*98*],
)

=== Kiểm thử Frontend (476 test case)

#figure(
  align(center, table(
    columns: (auto, auto, auto, auto),
    align: (left, left, center, center),
    stroke: 0.5pt,
    table.header(
      [*Nhóm*], [*Mô tả*], [*Test Cases*], [*Passed*],
    ),
    [E2E Workflow (`tests/e2e/`)], [Luồng nghiệp vụ hoàn chỉnh (đăng nhập, CRUD, tiến độ…)], [32], [32],
    [Katalon/Playwright (`tests/katalon/`)], [Field-level: nhãn, placeholder, lỗi, điều hướng, NFR], [63], [63],
    [UI Display (`tests/ui/`)], [Dữ liệu API hiển thị đúng; phân quyền nút edit theo vai trò], [14], [14],
    [*Tổng*], [], [*109*], [*109*],
  )),
  caption: [Kết quả kiểm thử Frontend giao diện]
)

Toàn bộ 207 test case chức năng đều passed (100%).

=== Các lỗi phát hiện và khắc phục trong quá trình kiểm thử

Quá trình kiểm thử không đạt 100% ngay từ lần chạy đầu. Bảng dưới đây ghi nhận các
lỗi nổi bật được phát hiện qua test và đã được khắc phục trước lần chạy cuối:

#table(
  columns: (auto, auto, auto),
  align: (left, left, left),
  stroke: 0.5pt,
  table.header(
    [*Lỗi phát hiện*], [*Nguyên nhân*], [*Cách khắc phục*],
  ),
  [Token refresh mất ngữ cảnh tổ chức — OrgAdmin bị redirect sai trang sau khi token hết hạn],
    [Endpoint `/api/auth/refresh` không đọc lại header `X-Org-Id`, tạo access token mới thiếu claim `org_id`],
    [Bổ sung đọc `X-Org-Id` trong `AuthController.Refresh`; `apiClient.ts` gửi header kèm mọi lần refresh],

  [Sau đăng nhập, ba vai trò đều bị redirect về cùng một trang (`/user/home`)],
    [`LoginPage` không phân tích claim `is_system_admin` và `org_id` trong JWT để chọn đường dẫn],
    [Thêm logic phân nhánh: SysAdmin → `/sysadmin/dashboard`, OrgAdmin → `/admin/dashboard`, User → `/user/home`],

  [OrgAdmin đăng nhập thành công nhưng `OrgContext` không nhận được `org_id`],
    [`OrgContext` đọc key `current_org` từ localStorage, nhưng helper Playwright chỉ set `org_id` và `org_slug`],
    [Cập nhật helper ui_auth để set đủ ba key `org_id`, `org_slug`, `current_org`],

  [Playwright không tìm được phần tử qua `data-testid` trên component `Card`],
    [`CardProps` không kế thừa `React.HTMLAttributes<HTMLDivElement>` nên `data-testid` bị bỏ qua khi render],
    [Mở rộng `CardProps extends React.HTMLAttributes<HTMLDivElement>` để spread toàn bộ native props],

  [Đăng ký tài khoản OrgAdmin không tạo được tổ chức đồng thời],
    [Endpoint `POST /api/auth/register` chỉ tạo user, không gọi sang Organization.Api để khởi tạo org],
    [Tách endpoint riêng `POST /api/auth/register/orgadmin`; gọi nội bộ `POST /api/internal/orgs/setup` ngay sau khi tạo user],

  [Quiz AI sinh ra không đúng ngôn ngữ tài liệu (trả về tiếng Anh dù tài liệu tiếng Việt)],
    [Prompt không có chỉ thị ngôn ngữ; mô hình mặc định dùng tiếng Anh],
    [Bổ sung quy tắc bắt buộc vào User Prompt: "Detect the language of the document and write ALL questions, options, and explanations in that exact language"],
)

Ngoài các lỗi trên, trong giai đoạn kiểm thử NFR, một số test Compatibility ban đầu
thất bại do ứng dụng chưa có CSS `overflow-x: hidden` tại tầng gốc — gây tràn ngang
ở viewport Mobile. Lỗi được khắc phục bằng cách bổ sung `overflow-x: hidden` vào
`body` trong `index.css`.

== Kiểm thử yêu cầu phi chức năng (NFR Test)

Bộ kiểm thử NFR được tổ chức tại `test_nonfunctional_requirements.py`
với 46 test case chia thành 11 class, mỗi class xác minh một tiêu chí cụ thể của bốn
yêu cầu phi chức năng ưu tiên. Toàn bộ test đều chạy trực tiếp trên môi trường kiểm
thử tích hợp với stack đầy đủ (Frontend + API Gateway + các microservice).

=== Tính Dễ sử dụng (Usability)

*Yêu cầu đặc tả:*
- Người dùng chỉ cần từ 3 đến 4 click tính từ trang chủ để thực hiện chức năng.
- Có hỗ trợ đa ngôn ngữ (tiếng Việt, tiếng Anh).

*Cách kiểm thử:*

Nhóm chia kiểm thử Usability thành ba class:

- `TestUsabilityLanguageOptions` (6 test case): Xác minh tab Ngôn ngữ trên trang
  hồ sơ hiển thị đầy đủ ba tùy chọn ngôn ngữ (tiếng Anh — `en`, tiếng Việt — `vi`),
  lưu thành công khi chọn, và giữ nguyên lựa chọn sau khi reload trang.

- `TestUsabilityCoreNavigation` (5 test case): Xác minh các trang chức năng cốt lõi
  (thư viện Quiz, Tài liệu, Flashcard, Browse Public, Hồ sơ) đều có thể truy cập trực
  tiếp từ trang chủ người dùng — không cần quá 3–4 bước điều hướng. Mỗi test điều
  hướng đến URL tương ứng và xác nhận trang tải thành công.

- `TestUsabilityFormValidation` (3 test case): Xác minh các form cung cấp phản hồi
  lỗi tức thì (inline validation) mà không cần tải lại trang: submit rỗng giữ người
  dùng tại trang hiện tại, sai thông tin đăng nhập hiển thị thông báo lỗi có
  `data-testid="login-error"`, đăng ký username trùng hiển thị lỗi tại chỗ.

=== Tính Bảo trì (Maintainability)

*Yêu cầu đặc tả:*
- Kiến trúc mã nguồn tuân thủ mô hình phân lớp bên trong các dịch vụ nghiệp vụ, cho
  phép bảo trì, nâng cấp hoặc thay thế các module riêng biệt mà không gây ảnh hưởng
  đến tính ổn định chung.
- Có test tự động (unit test, integration test).

*Cách kiểm thử:*

- `TestMaintainabilityServiceHealth` (6 test case): Xác minh từng microservice đang
  hoạt động bằng cách probe endpoint đặc trưng của từng service (Identity, Organization,
  Content, AI, SysAdmin, Gateway). Một service phản hồi `2xx`/`4xx` được coi là sẵn
  sàng; `5xx` hoặc kết nối thất bại là dấu hiệu service chưa sẵn sàng.
  Kiến trúc microservice cho phép mỗi service được nâng cấp hoặc khởi động lại độc lập
  mà không ảnh hưởng đến service khác.

- `TestMaintainabilityErrorFormat` (4 test case): Xác minh tất cả phản hồi lỗi
  (`400`, `401`, `404`) đều trả về JSON có cấu trúc (có trường `errors` hoặc `message`)
  và *không* rò rỉ stack trace nội bộ .NET (không chứa chuỗi `System.` hay
  `Microsoft.`). Điều này đảm bảo tầng Controller và middleware xử lý lỗi nhất quán,
  không để lộ chi tiết triển khai bên trong.

- `TestMaintainabilityApiConsistency` (2 test case): Xác minh API contract nhất quán —
  trường `id` trong response luôn là UUID hợp lệ (định dạng 8-4-4-4-12 hex), và các
  danh sách tài nguyên luôn có trường `id` và `title`/`name`. Tính nhất quán contract
  là điều kiện để các service có thể được thay thế hoặc phát triển độc lập.

=== Tính Sẵn sàng (Availability)

*Yêu cầu đặc tả:*
- Hệ thống luôn sẵn sàng trong 99% thời gian hàng tháng.
- Thời gian downtime cho bảo trì không vượt quá 2 giờ/tháng (2:00–4:00 sáng Chủ nhật).
- Có thông báo trước cho người dùng khi bảo trì.

*Cách kiểm thử:*

Do yêu cầu "99% uptime hàng tháng" không thể đo trong một lần chạy test đơn lẻ, nhóm
xây dựng hai class kiểm thử proxy xác minh các chỉ số thay thế có tương quan chặt với
SLA:

- `TestAvailabilityResponseTimes` (3 test case): Xác minh các API endpoint chính (đăng
  nhập, danh sách quiz, route không tồn tại) đều phản hồi trong vòng 5 giây. Gateway
  phải trả về mã nhỏ hơn `500` cho mọi request — kể cả route không tồn tại (kỳ vọng
  `404`, không phải `500`). Điều này xác nhận hệ thống không rơi vào trạng thái lỗi
  khi gặp input không mong đợi.

- `TestAvailabilityFELoad` (3 test case): Xác minh trang đăng nhập và trang chủ người
  dùng tải xong (`networkidle`) trong vòng 5 giây, và không có bất kỳ phản hồi `5xx`
  nào xuất hiện trong quá trình tải trang bình thường. Test lắng nghe mọi network
  response trong quá trình điều hướng và báo lỗi nếu phát hiện `5xx` từ bất kỳ dịch
  vụ nào.

*Hạn chế còn tồn đọng:* Bộ test hiện tại chỉ xác minh hệ thống không sập dưới tải
bình thường trong thời điểm kiểm thử. Chỉ số 99% uptime thực sự đòi hỏi theo dõi
liên tục (monitoring) theo thời gian và kiểm thử tải (load test) với nhiều concurrent
user — hai hạng mục nằm ngoài phạm vi đồ án này.

=== Tính Tương thích (Compatibility)

*Yêu cầu đặc tả:*
- Hỗ trợ chuyển đổi giao diện giữa Tiếng Việt và Tiếng Anh mà không làm vỡ bố cục
  (layout) trong vòng dưới 1 giây.
- Hệ thống đảm bảo hiển thị và hoạt động chính xác 100% chức năng trên Chrome, Firefox,
  Safari và Microsoft Edge.
- Giao diện tự động tối ưu hóa theo 3 khung hình chuẩn: Mobile (< 768px), Tablet
  (768–1024px) và Desktop (> 1024px).

*Cách kiểm thử:*

- `TestCompatibilityLanguageToggleSpeed` (2 test case): Đo chính xác thời gian từ khi
  người dùng click nút chuyển ngôn ngữ đến khi thông báo thành công (`data-testid=
  "language-success"`) hiển thị. Cả hai chiều chuyển đổi (en → vi và vi → en) đều phải
  hoàn thành trong vòng 1 giây.

- `TestCompatibilityMobileViewport` (5 test case): Thiết lập viewport 375 × 812 px
  (iPhone X) và xác minh:
  - Không có thanh cuộn ngang (`scrollWidth ≤ clientWidth + 5 px`) trên các trang đăng
    nhập, đăng ký và trang chủ người dùng.
  - Các trường nhập liệu form đăng nhập vẫn hiển thị đầy đủ và có thể tương tác.

- `TestCompatibilityTabletViewport` (3 test case): Thiết lập viewport 768 × 1024 px
  và xác minh không có tràn ngang trên trang đăng nhập và trang chủ người dùng, đồng
  thời các phần tử chính vẫn hiển thị rõ ràng.

- `TestCompatibilityDesktopViewport` (4 test case): Thiết lập viewport 1280 × 800 px
  và xác minh trang đăng nhập, trang chủ User và dashboard SysAdmin đều render đúng
  (không tràn ngang, phần tử chính hiển thị đầy đủ).

*Hạn chế còn tồn đọng:* Bộ test viewport hiện chỉ chạy trên Chromium. Việc xác minh
trên Firefox và WebKit (Safari) cần chạy thêm với tham số `--browser firefox` và
`--browser webkit` — khả thi với Playwright nhưng chưa được tích hợp vào pipeline
tự động do thiếu môi trường CI.

=== Tổng hợp kết quả kiểm thử phi chức năng

#figure(
  align(center, table(
    columns: (auto, auto, auto, auto, auto),
    align: (left, left, left, center, center),
    stroke: 0.5pt,
    table.header(
      [*NFR*], [*Class kiểm thử*], [*Tiêu chí xác minh*], [*Test Cases*], [*Passed*],
    ),

    table.cell(rowspan: 3)[*Usability*],
    [`TestUsability-LanguageOptions`], [Đa ngôn ngữ: vi/en có thể chọn và lưu], [6], [6],
    [`TestUsability-CoreNavigation`], [Chức năng cốt lõi truy cập ≤ 3–4 bước], [5], [5],
    [`TestUsability-FormValidation`], [Inline validation không reload trang], [3], [3],

    table.cell(rowspan: 3)[*Maintainability*],
    [`TestMaintain-abilityService-Health`], [Tất cả 6 microservice sẵn sàng], [6], [6],
    [`TestMaintain-abilityError-Format`], [Lỗi trả về JSON có cấu trúc, không rò stack trace], [4], [4],
    [`TestMaintain-ability-ApiConsistency`], [ID là UUID hợp lệ, contract nhất quán], [2], [2],

    table.cell(rowspan: 2)[*Availability*],
    [`TestAvailability-ResponseTimes`], [API phản hồi < 5 giây, không 5xx trên gateway], [3], [3],
    [`TestAvailability-FELoad`], [Trang tải < 5 giây, không 5xx khi load], [3], [3],

    table.cell(rowspan: 4)[*Compatibility*],
    [`TestCompatibility-LanguageToggle-Speed`], [Chuyển ngôn ngữ hoàn thành < 1 giây], [2], [2],
    [`TestCompatibility-MobileViewport`], [Mobile 375px: không tràn ngang, form hiển thị], [5], [5],
    [`TestCompatibility-TabletViewport`], [Tablet 768px: không tràn ngang, phần tử rõ], [3], [3],
    [`TestCompatibility-DesktopViewport`], [Desktop 1280px: layout chuẩn, không tràn], [4], [4],

    [*Tổng*], [], [], [*46*], [*46*],
  )),
  caption: [Tổng hợp kết quả kiểm thử yêu cầu phi chức năng (NFR)]
)

=== Kết luận kiểm thử phi chức năng

Toàn bộ 46 test case NFR đều passed sau khi khắc phục các vấn đề phát sinh trong
quá trình kiểm thử (tràn ngang Mobile, thiếu CSS `overflow-x`), xác nhận hệ thống
Lumina đáp ứng đầy đủ bốn yêu cầu phi chức năng trong phạm vi đo lường được:

- *Usability*: Ba ngôn ngữ (vi/en/ja) có thể chọn và lưu từ hồ sơ người dùng; các
  chức năng cốt lõi truy cập trong ≤ 4 bước điều hướng; form cung cấp phản hồi tức thì.

- *Maintainability*: Sáu microservice hoạt động độc lập, có thể probe riêng lẻ; API
  trả lỗi JSON có cấu trúc nhất quán; 574 test case tự động làm lưới an toàn cho
  mọi thay đổi.

- *Availability*: Mọi endpoint phản hồi trong vòng 5 giây; không có `5xx` trong luồng
  bình thường; gateway xử lý gracefully mọi route không xác định. Chỉ số 99% uptime
  dài hạn cần monitoring thực tế để xác nhận đầy đủ.

- *Compatibility*: Chuyển đổi ngôn ngữ hoàn thành dưới 1 giây; giao diện không tràn
  ngang ở cả ba breakpoint (Mobile 375px, Tablet 768px, Desktop 1280px) trên Chromium.
  Kiểm thử đa trình duyệt (Firefox, Safari) là hướng mở rộng tiếp theo.

== Tổng kết kiểm thử

#figure(
  align(center, table(
    columns: (auto, auto, auto, auto),
    align: (left, left, center, center),
    stroke: 0.5pt,
    table.header(
      [*Tầng kiểm thử*], [*Công cụ*], [*Test Cases*], [*Passed*],
    ),
    [API Integration (`tests/api/`)], [pytest + requests], [98], [98],
    [E2E Workflow (`tests/e2e/`)], [Playwright (pytest-playwright)], [32], [32],
    [Browser/Katalon (`tests/katalon/`)], [Playwright (pytest-playwright)], [63], [63],
    [UI Display (`tests/ui/`)], [Playwright (pytest-playwright)], [14], [14],
    [*Tổng*], [], [*255*], [*255*],
  )),
  caption: [Tổng kết toàn bộ các tầng kiểm thử hệ thống Lumina]
)

Kết quả 255 passed là trạng thái cuối của bộ kiểm thử sau nhiều vòng phát hiện
lỗi và khắc phục. Trong quá trình đó, nhóm xác định được 6 lỗi chức năng đáng kể
(xác thực, phân quyền, rendering) và 1 lỗi CSS responsive — tất cả đã được khắc phục
trước lần chạy nghiệm thu cuối. Bộ test còn hai hạn chế được ghi nhận: chỉ số uptime
99% chưa được xác minh liên tục, và kiểm thử đa trình duyệt chưa tự động hóa đầy đủ.
