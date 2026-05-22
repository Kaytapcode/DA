# Progress

**Current phase:** Wave 1 complete → Bug fixes + UX improvements
**Branch:** K-B
**Next action:** Restart Identity.Api + Organization.Api + AI.Api với code mới → Test các luồng trong DEMO_FLOWS.md thủ công → Xác nhận OrgAdmin login không cần OrgID, AI quiz difficulty hoạt động đúng.

## Session 2026-05-22 (round 2) — Bug fixes + UX hardening

### Thay đổi trong session này:

**CLAUDE.md:**
- Thêm rule 7–10 vào Section 10: no hardcode, self-test, demo flows contract, PDF label requirement.

**DEMO_FLOWS.md (mới):**
- File `DEMO_FLOWS.md` tại root — danh sách đầy đủ 19 luồng demo cho dev duyệt.
- Gợi ý tinh gọn hệ thống (bỏ System Health widget, tạm hoãn banner, tạm hoãn SSO).

**BE fixes:**

1. **AI Quiz difficulty (BE/AI.Api/Services/OpenRouterService.cs):**
   - `DifficultyLine()` — criteria chi tiết 3 cấp: Easy = nhận biết/trích xuất trực tiếp; Normal = kết nối 2-3 đoạn; Hard = tổng hợp/tình huống giả định
   - `DifficultyParams()` — temperature theo cấp: Easy (0.35, 0.80), Normal (0.55, 0.85), Hard (0.70, 0.90)
   - `BuildQuizPrompt()` — cấu trúc rõ hơn, JSON-only rules, output format có `A. ...` prefix
   - `CallApiAsync()` — nhận temperature + topP params
   - System message cập nhật: nhấn mạnh JSON-only, no markdown, no extra text

2. **OrgAdmin auto-org login:**
   - `BE/Organization.Api/Data/MemberRepository.cs` — thêm `GetOrgAdminOrgAsync(userId)`
   - `BE/Organization.Api/Controllers/InternalOrgController.cs` — thêm `GET /api/internal/orgs/admin/{userId}`
   - `BE/Identity.Api/Services/OrganizationServiceClient.cs` — thêm `GetOrgIdForAdminAsync(userId)`
   - `BE/Identity.Api/Controllers/AuthController.cs` — Login tự động resolve org cho OrgAdmin (không cần X-Org-Id header)

**FE fixes:**

3. **LoginPage.tsx:**
   - Xóa trường Org ID (OrgAdmin tự resolve từ BE)
   - Xóa `useSearchParams` và `useEffect` cho orgId pre-fill
   - Form đơn giản: chỉ còn identifier + password

4. **SysAdminDashboardPage.tsx:**
   - Thay toàn bộ hardcode bằng `useSysAdminAnalytics()` hook
   - Hiện: Total Orgs, Total Users, Total Courses, Total Quizzes (top stats) + 6 content stats phụ
   - Bỏ: System Health widget (CPU/RAM/Disk — không phải LMS metric)

5. **OrgAdminDashboardPage.tsx:**
   - Recent Courses: dùng `useCourse()` hook thay cho dummy data
   - Link trực tiếp vào course editor
   - Quick Actions: link thật đến `/admin/courses`, `/admin/members`, `/admin/analytics`

6. **AppRouter.tsx:**
   - `/user/home`, `/user/dashboard`, `/user/learning`, `/user/courses`, `/user/course/:courseId`, `/user/organizations` → chỉ Student + Teacher
   - `ProtectedRoute` tự redirect SysAdmin/OrgAdmin đến dashboard đúng
   - Thêm component `RoleBasedRedirect` + route `/dashboard`

7. **AiKeysPage.tsx:**
   - Disabled "Add new key" form
   - Thay bằng read-only info: stepfun/step-3.5-flash via OpenRouter, cấu hình qua environment variables

**Build status:** Organization.Api ✅ | Identity.Api ✅ | AI.Api ✅ | FE pre-existing TS errors (Navbar.tsx, UserAnalyticsDashboardPage.tsx — không liên quan đến thay đổi này)

## Các vấn đề còn lại cần làm

- [ ] OrgAdmin: thêm user vào org từ danh sách user hệ thống (search + add)
- [ ] OrgAdmin: thêm user vào course từ danh sách thành viên org
- [ ] SSO: blocked — cần OAuth credentials (Google + Microsoft)
- [ ] i18n: áp dụng đồng bộ trên toàn bộ UI
- [ ] Fix pre-existing TypeScript errors (Navbar.tsx, UserFeConvertedPages.tsx, UserAnalyticsDashboardPage.tsx)
- [ ] Test DEMO_FLOWS.md end-to-end sau khi restart services

## Open questions for dev

- Bạn muốn gợi ý tinh gọn nào trong DEMO_FLOWS.md được áp dụng? (bỏ System Health, tạm hoãn banner, tạm hoãn Copy resource?)
- OrgAdmin thêm user vào org: flow nên là "search user có sẵn trong hệ thống" hay "invite qua email"?

## Recently completed (last 5)
- 2026-05-22 — DEMO_FLOWS.md tạo xong, 19 luồng demo + status table + feature streamlining suggestions
- 2026-05-22 — AI quiz difficulty: 3-level criteria chi tiết + temperature tuning per level
- 2026-05-22 — OrgAdmin login: xóa OrgID requirement, BE auto-resolve qua Organization.Api
- 2026-05-22 — SysAdmin dashboard: xóa toàn bộ hardcode, dùng analytics API thật
- 2026-05-22 — AppRouter: role guard fix — SysAdmin/OrgAdmin không thể backward-nav vào /user/* pages
