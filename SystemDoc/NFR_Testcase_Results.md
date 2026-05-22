# Kết Quả Kiểm Thử Yêu Cầu Phi Chức Năng — Lumina LMS

**Ngày kiểm thử:** 2026-05-23  
**Nhánh:** K-B  
**Công cụ:** pytest + Playwright (Chromium headless) + requests  
**File test:** `tests/katalon/test_nonfunctional_requirements.py`  
**Tổng kết:** **46/46 PASS** — Tất cả yêu cầu phi chức năng được kiểm thử đều đạt  

---

## Tóm tắt tổng quan

| Yêu cầu | Số testcase | Kết quả |
|---|:---:|:---:|
| NFR 1 — Tính Dễ sử dụng (Usability) | 14 | ✅ 14/14 PASS |
| NFR 2 — Tính Bảo trì (Maintainability) | 12 | ✅ 12/12 PASS |
| NFR 3 — Tính Sẵn sàng (Availability) | 6 | ✅ 6/6 PASS |
| NFR 4 — Tính Tương thích (Compatibility) | 14 | ✅ 14/14 PASS |
| **Tổng cộng** | **46** | **✅ 46/46 PASS** |

---

## NFR 1 — Tính Dễ sử dụng (Usability)

### Yêu cầu gốc (từ SystemDoc/Nonfunctional_Requirement.md)

> - 90% người dùng thực hiện thành công các thao tác cơ bản ngay trong lần đầu tiên tiếp cận giao diện.
> - Có hỗ trợ đa ngôn ngữ (tiếng Việt, tiếng Anh).
> - Cung cấp hướng dẫn (tutorial/onboarding) khi người dùng mới đăng nhập.

### Nhóm 1.1 — Hỗ trợ đa ngôn ngữ (`TestUsabilityLanguageOptions`)

| STT | Tên testcase | Mô tả | Kết quả |
|:---:|---|---|:---:|
| TC-U01 | `test_language_tab_is_accessible` | Tab cài đặt ngôn ngữ hiển thị và truy cập được từ trang profile | ✅ PASS |
| TC-U02 | `test_english_language_option_present` | Tùy chọn tiếng Anh (EN) có mặt trong bộ chọn ngôn ngữ | ✅ PASS |
| TC-U03 | `test_vietnamese_language_option_present` | Tùy chọn tiếng Việt (VI) có mặt trong bộ chọn ngôn ngữ | ✅ PASS |
| TC-U04 | `test_japanese_language_option_present` | Tùy chọn tiếng Nhật (JA) có mặt trong bộ chọn ngôn ngữ | ✅ PASS |
| TC-U05 | `test_language_selection_saves_successfully` | Chọn ngôn ngữ lưu thành công và hiện thông báo xác nhận mà không reload trang | ✅ PASS |
| TC-U06 | `test_language_preference_persists_after_reload` | Ngôn ngữ đã chọn vẫn được giữ sau khi reload trang (persistence) | ✅ PASS |

**Ghi chú TC-U06:** Phát hiện bug trong quá trình kiểm thử — `UserProfilePage.tsx` không khởi tạo ngôn ngữ từ API/localStorage, luôn reset về 'en'. Đã sửa: khởi tạo từ `localStorage` và đồng bộ với `/api/auth/me` khi mount.

### Nhóm 1.2 — Điều hướng cơ bản (`TestUsabilityCoreNavigation`)

| STT | Tên testcase | Mô tả | Kết quả |
|:---:|---|---|:---:|
| TC-U07 | `test_quiz_page_reachable_from_home` | Trang thư viện nội dung (Content Library) truy cập được từ trang chủ | ✅ PASS |
| TC-U08 | `test_documents_page_reachable_from_home` | Trang tài liệu (Documents) truy cập được từ trang chủ | ✅ PASS |
| TC-U09 | `test_flashcards_page_reachable_from_home` | Trang flashcard truy cập được từ trang chủ | ✅ PASS |
| TC-U10 | `test_browse_public_page_reachable_from_home` | Trang duyệt công khai (Browse Public) truy cập được từ trang chủ | ✅ PASS |
| TC-U11 | `test_profile_page_reachable_from_home` | Trang hồ sơ người dùng truy cập được từ trang chủ | ✅ PASS |

### Nhóm 1.3 — Validation form inline (`TestUsabilityFormValidation`)

| STT | Tên testcase | Mô tả | Kết quả |
|:---:|---|---|:---:|
| TC-U12 | `test_login_empty_submit_stays_on_login_page` | Gửi form đăng nhập rỗng không chuyển trang — ở lại /login | ✅ PASS |
| TC-U13 | `test_login_wrong_credentials_shows_error` | Nhập sai thông tin đăng nhập → hiển thị lỗi inline, không reload trang | ✅ PASS |
| TC-U14 | `test_register_duplicate_username_shows_error` | Đăng ký username đã tồn tại → hiển thị lỗi inline, ở lại /register | ✅ PASS |

---

## NFR 2 — Tính Bảo trì (Maintainability)

### Yêu cầu gốc

> - Kiến trúc mã nguồn phải tuân thủ mô hình phân lớp bên trong các dịch vụ nghiệp vụ, cho phép bảo trì, nâng cấp hoặc thay thế các module riêng biệt mà không gây ảnh hưởng đến tính ổn định chung của toàn hệ thống.
> - Có test tự động (unit test, integration test).
> - Log và giám sát hệ thống tập trung Supabase logs + monitoring tool.

### Nhóm 2.1 — Kiểm tra sức sống dịch vụ (`TestMaintainabilityServiceHealth`)

_Tiêu chí: Một dịch vụ trả về HTTP 2xx hoặc 4xx được coi là đang hoạt động; 5xx hoặc không kết nối được là lỗi._

| STT | Tên testcase | Dịch vụ kiểm tra | Port | Kết quả |
|:---:|---|---|:---:|:---:|
| TC-M01 | `test_gateway_is_up` | API Gateway (YARP proxy) | 5000 | ✅ PASS |
| TC-M02 | `test_identity_service_is_up` | Identity.Api (auth, JWT, profile) | 5001 | ✅ PASS |
| TC-M03 | `test_organization_service_is_up` | Organization.Api (orgs, members) | 5002 | ✅ PASS |
| TC-M04 | `test_content_service_is_up` | Content.Api (quizzes, docs, decks, videos) | 5003 | ✅ PASS |
| TC-M05 | `test_ai_service_is_up` | AI.Api (OpenRouter, quota) | 5004 | ✅ PASS |
| TC-M06 | `test_sysadmin_service_is_up` | SysAdmin.Api (banners, AI key config) | 5005 | ✅ PASS |

### Nhóm 2.2 — Định dạng phản hồi lỗi (`TestMaintainabilityErrorFormat`)

_Tiêu chí: Phản hồi lỗi phải là JSON có cấu trúc (RFC 9110 ProblemDetails); không rò rỉ stack trace .NET._

| STT | Tên testcase | Mô tả | Kết quả |
|:---:|---|---|:---:|
| TC-M07 | `test_validation_error_is_structured_json` | HTTP 400 trả về JSON có trường `errors` hoặc `message`, không chứa `System.` hoặc `Microsoft.` | ✅ PASS |
| TC-M08 | `test_unauthorized_error_is_structured_json` | HTTP 401 trả về JSON có cấu trúc, không rò rỉ nội dung .NET | ✅ PASS |
| TC-M09 | `test_not_found_is_structured_json` | HTTP 404 trên route không tồn tại trả về JSON hoặc rỗng, không phải stack trace | ✅ PASS |
| TC-M10 | `test_api_returns_json_content_type_on_error` | Header `Content-Type` của phản hồi lỗi là `application/json` hoặc `application/problem+json` | ✅ PASS |

### Nhóm 2.3 — Tính nhất quán API (`TestMaintainabilityApiConsistency`)

| STT | Tên testcase | Mô tả | Kết quả |
|:---:|---|---|:---:|
| TC-M11 | `test_user_profile_returns_uuid_id` | `GET /api/auth/me` trả về trường `id` là UUID hợp lệ (định dạng `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) | ✅ PASS |
| TC-M12 | `test_quiz_list_items_have_id_and_title` | `GET /api/quizzes` trả về items có đủ trường `id` và `title` | ✅ PASS |

---

## NFR 3 — Tính Sẵn sàng (Availability)

### Yêu cầu gốc

> - Hệ thống luôn sẵn sàng trong 99% thời gian hàng tháng.
> - Thời gian downtime cho bảo trì không vượt quá 2 giờ/tháng. (2h00 - 4h00 sáng Chủ nhật)
> - Có thông báo trước cho người dùng khi bảo trì.

_Lưu ý: Chỉ số 99% uptime hàng tháng đòi hỏi monitoring dài hạn, không đo được trong một lần chạy test. Các testcase dưới đây là proxy kiểm tra: thời gian phản hồi < 5 giây và không có lỗi 5xx là dấu hiệu hệ thống đang hoạt động ổn định._

### Nhóm 3.1 — Thời gian phản hồi API (`TestAvailabilityResponseTimes`)

| STT | Tên testcase | Mô tả | Ngưỡng | Kết quả |
|:---:|---|---|:---:|:---:|
| TC-A01 | `test_login_responds_under_5_seconds` | API đăng nhập (`POST /api/auth/login`) phản hồi trong giới hạn | < 5 giây | ✅ PASS |
| TC-A02 | `test_quiz_list_responds_under_5_seconds` | API danh sách quiz (`GET /api/quizzes`) phản hồi trong giới hạn | < 5 giây | ✅ PASS |
| TC-A03 | `test_gateway_handles_unknown_route_gracefully` | Gateway trả về HTTP < 500 cho route không tồn tại (không crash) | HTTP 404 | ✅ PASS |

### Nhóm 3.2 — Tải trang Frontend (`TestAvailabilityFELoad`)

| STT | Tên testcase | Mô tả | Ngưỡng | Kết quả |
|:---:|---|---|:---:|:---:|
| TC-A04 | `test_login_page_loads_under_5_seconds` | Trang đăng nhập tải hoàn toàn (networkidle) trong giới hạn | < 5 giây | ✅ PASS |
| TC-A05 | `test_user_home_loads_under_5_seconds` | Trang chủ người dùng tải hoàn toàn sau đăng nhập trong giới hạn | < 5 giây | ✅ PASS |
| TC-A06 | `test_no_5xx_errors_on_page_load` | Không có phản hồi HTTP 5xx nào xảy ra trong quá trình tải trang chủ | 0 lỗi 5xx | ✅ PASS |

---

## NFR 4 — Tính Tương thích (Compatibility)

### Yêu cầu gốc

> - Hỗ trợ chuyển đổi giao diện giữa Tiếng Việt và Tiếng Anh mà không làm vỡ bố cục (layout) trong vòng dưới 1 giây.
> - Hệ thống đảm bảo hiển thị và hoạt động chính xác 100% chức năng trên các phiên bản mới nhất (với độ trễ cập nhật không quá 2 phiên bản) của Chrome, Firefox, Safari và Microsoft Edge.
> - Giao diện hệ thống tự động tối ưu hóa theo 3 khung hình chuẩn: Mobile (chiều rộng < 768px), Tablet (768px - 1024px) và Desktop (> 1024px).

### Nhóm 4.1 — Tốc độ chuyển ngôn ngữ (`TestCompatibilityLanguageToggleSpeed`)

_Tiêu chí: Thời gian từ khi click đến khi thông báo xác nhận hiển thị < 1 giây._

| STT | Tên testcase | Mô tả | Ngưỡng | Kết quả |
|:---:|---|---|:---:|:---:|
| TC-C01 | `test_language_toggle_en_to_vi_under_1_second` | Chuyển từ Tiếng Anh sang Tiếng Việt hoàn tất trong giới hạn | < 1 giây | ✅ PASS |
| TC-C02 | `test_language_toggle_vi_to_en_under_1_second` | Chuyển từ Tiếng Việt sang Tiếng Anh hoàn tất trong giới hạn | < 1 giây | ✅ PASS |

### Nhóm 4.2 — Màn hình Mobile (375px × 812px) (`TestCompatibilityMobileViewport`)

_Tiêu chí: Không có thanh cuộn ngang (`scrollWidth ≤ clientWidth + 5px`); các phần tử quan trọng hiển thị đầy đủ._

| STT | Tên testcase | Trang kiểm tra | Kết quả |
|:---:|---|---|:---:|
| TC-C03 | `test_login_page_no_horizontal_scroll_mobile` | Trang đăng nhập — không tràn ngang | ✅ PASS |
| TC-C04 | `test_login_form_visible_on_mobile` | Trang đăng nhập — các trường nhập liệu và nút submit hiển thị | ✅ PASS |
| TC-C05 | `test_register_page_no_horizontal_scroll_mobile` | Trang đăng ký — không tràn ngang | ✅ PASS |
| TC-C06 | `test_user_home_no_horizontal_scroll_mobile` | Trang chủ người dùng — không tràn ngang | ✅ PASS |
| TC-C07 | `test_quiz_list_no_horizontal_scroll_mobile` | Trang danh sách quiz — không tràn ngang | ✅ PASS |

### Nhóm 4.3 — Màn hình Tablet (768px × 1024px) (`TestCompatibilityTabletViewport`)

| STT | Tên testcase | Trang kiểm tra | Kết quả |
|:---:|---|---|:---:|
| TC-C08 | `test_login_page_no_horizontal_scroll_tablet` | Trang đăng nhập — không tràn ngang | ✅ PASS |
| TC-C09 | `test_login_form_visible_on_tablet` | Trang đăng nhập — form nhập liệu hiển thị đầy đủ | ✅ PASS |
| TC-C10 | `test_user_home_no_horizontal_scroll_tablet` | Trang chủ người dùng — không tràn ngang | ✅ PASS |

### Nhóm 4.4 — Màn hình Desktop (1280px × 800px) (`TestCompatibilityDesktopViewport`)

| STT | Tên testcase | Trang kiểm tra | Kết quả |
|:---:|---|---|:---:|
| TC-C11 | `test_login_page_renders_on_desktop` | Trang đăng nhập — hiển thị đầy đủ form | ✅ PASS |
| TC-C12 | `test_sysadmin_dashboard_renders_on_desktop` | Dashboard SysAdmin — không tràn ngang | ✅ PASS |
| TC-C13 | `test_user_home_no_horizontal_scroll_desktop` | Trang chủ người dùng — không tràn ngang | ✅ PASS |
| TC-C14 | `test_sysadmin_dashboard_no_horizontal_scroll_desktop` | Dashboard SysAdmin — không tràn ngang (xác nhận) | ✅ PASS |

---

## Kết quả tổng hợp & nhận xét

### Bảng tổng hợp theo NFR

| NFR | Yêu cầu cụ thể | Testcase liên quan | Đạt? |
|---|---|---|:---:|
| NFR 1 | Hỗ trợ tiếng Việt, tiếng Anh, tiếng Nhật | TC-U01 → TC-U06 | ✅ |
| NFR 1 | Thao tác cơ bản truy cập được trong ≤ 2 bước | TC-U07 → TC-U11 | ✅ |
| NFR 1 | Form báo lỗi inline, không reload trang | TC-U12 → TC-U14 | ✅ |
| NFR 2 | Tất cả 6 microservice hoạt động (không 5xx, không mất kết nối) | TC-M01 → TC-M06 | ✅ |
| NFR 2 | Phản hồi lỗi có cấu trúc JSON (RFC 9110), không rò rỉ stack trace | TC-M07 → TC-M10 | ✅ |
| NFR 2 | API trả về UUID và các trường bắt buộc nhất quán | TC-M11 → TC-M12 | ✅ |
| NFR 3 | API phản hồi < 5 giây (proxy cho 99% uptime) | TC-A01 → TC-A03 | ✅ |
| NFR 3 | Trang FE tải < 5 giây, không có lỗi 5xx | TC-A04 → TC-A06 | ✅ |
| NFR 4 | Chuyển ngôn ngữ vi ↔ en < 1 giây | TC-C01 → TC-C02 | ✅ |
| NFR 4 | Mobile (375px): không tràn ngang, form hiển thị đủ | TC-C03 → TC-C07 | ✅ |
| NFR 4 | Tablet (768px): không tràn ngang, layout ổn định | TC-C08 → TC-C10 | ✅ |
| NFR 4 | Desktop (1280px): layout đầy đủ, không tràn ngang | TC-C11 → TC-C14 | ✅ |

### Bug phát hiện và đã sửa trong quá trình kiểm thử

| Bug | Mô tả | File sửa | TC phát hiện |
|---|---|---|---|
| Ngôn ngữ không persist sau reload | `UserProfilePage` luôn khởi tạo state với 'en', không đọc từ localStorage hay API | `FE/src/pages/user/UserProfilePage.tsx` | TC-U06 |

### Hạn chế của bộ testcase

| NFR | Phần chưa kiểm thử được | Lý do |
|---|---|---|
| NFR 1 | Onboarding/tutorial cho người dùng mới | Tính năng onboarding chưa được triển khai |
| NFR 2 | Log tập trung (Supabase logs + monitoring) | Yêu cầu cấu hình môi trường production |
| NFR 3 | 99% uptime hàng tháng (≤ 7.3 giờ downtime/tháng) | Đòi hỏi monitoring 30 ngày liên tục |
| NFR 3 | Thông báo bảo trì trước cho người dùng | Tính năng banner bảo trì cần được kích hoạt thủ công |
| NFR 4 | Kiểm thử trên Firefox, Safari, Edge thực | Playwright trong CI chỉ dùng Chromium; cần bổ sung cấu hình multi-browser |

---

## Cách chạy lại testcase

```powershell
# Chạy toàn bộ NFR tests
cd tests
pytest katalon/test_nonfunctional_requirements.py -v --timeout=30

# Chạy theo NFR cụ thể
pytest katalon/test_nonfunctional_requirements.py -k "Usability" -v
pytest katalon/test_nonfunctional_requirements.py -k "Maintainability" -v
pytest katalon/test_nonfunctional_requirements.py -k "Availability" -v
pytest katalon/test_nonfunctional_requirements.py -k "Compatibility" -v

# Chạy riêng nhóm responsive
pytest katalon/test_nonfunctional_requirements.py -k "Viewport" -v --headed
```

**Yêu cầu trước khi chạy:** Stack đang chạy đầy đủ — Gateway (5000), Identity (5001), Organization (5002), Content (5003), AI (5004), SysAdmin (5005), Frontend Vite (5173).
