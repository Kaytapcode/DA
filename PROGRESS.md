# Progress

**Current phase:** All waves complete + Auth/Role fixes + E2E coverage expanded
**Branch:** K-B
**Next action:** Run the full test suite against the live stack to confirm all new tests pass, then commit and push.

## Session 2026-05-22 — Auth/Role fixes + OrgAdmin self-registration

**Bugs found and fixed:**
1. **Token refresh loses org context** — `AuthController.Refresh` now reads `X-Org-Id` header; `performRefresh()` in FE sends it too
2. **LoginPage wrong redirect** — SysAdmin → `/sysadmin/dashboard`, OrgAdmin → `/admin/dashboard`; `login-org-id` field added
3. **OrgContext cleared org_id** — Playwright helper `_set_org_context()` sets all 3 localStorage keys
4. **Card component dropped data-testid** — Fixed `CardProps` to extend `HTMLAttributes<HTMLDivElement>`

**New BE feature:**
- `POST /api/auth/register/orgadmin` — OrgAdmin self-registration (creates user + org atomically)
  - `BE/Identity.Api/Controllers/AuthController.cs` — new `RegisterOrgAdmin` action
  - `BE/Organization.Api/Controllers/InternalOrgController.cs` — `POST /api/internal/orgs/setup`
  - `BE/Identity.Api/Services/OrganizationServiceClient.cs` — `CreateOrgWithAdminAsync()`
  - `BE/Shared.Contracts/Requests/OrgAdminRegisterRequestDto.cs` — new DTO
  - `BE/Shared.Contracts/Responses/OrgAdminRegisterResponseDto.cs` — new DTO

**New FE feature:**
- `/register/orgadmin` — `FE/src/pages/auth/RegisterOrgAdminPage.tsx`
- Login page pre-fills org ID from `?orgId=` query param (after OrgAdmin registration redirect)

**New tests:**
- `tests/api/test_auth_roles.py` — 7 test classes (~25 API tests): all seeded accounts, role flows, token refresh, self-registration
- `tests/katalon/test_auth_role_login_workflows.py` — 5 test classes (~14 Playwright tests): login redirects per role, role isolation
- Updated `tests/katalon/_helpers.py` — `ui_login_sysadmin()`, `ui_login_orgadmin()` helpers
- Updated `tests/katalon/test_sysadmin_ui_workflows.py` — `_ui_login_sysadmin` now waits for `/sysadmin/**`

## Session 2026-05-21 — E2E test expansion + data-testid fixes

**Root cause found and fixed:** `Card` component did not extend `React.HTMLAttributes<HTMLDivElement>`, causing all `data-testid` attributes on `<Card>` elements to be silently dropped. This was why `course-access-error`, `course-content-panel`, and `org-item` were invisible to Playwright.

**Bug fixed:** `OrgContext` reads `current_org` from localStorage and overwrites `org_id` with `null` if no org is stored — simulating org context in tests now sets both `current_org` (full object) and `org_id`.

**New browser E2E tests added (53 total katalon tests, all green):**
- `test_flashcard_study_workflows.py` — 8 tests (counter, flip, next, shuffle, mastered, reset, collections CRUD)
- `test_forgot_password_workflows.py` — 9 tests (form, success anti-enumeration, login link, reset form, invalid token, full cycle, single-use)
- `test_student_course_workflows.py` — 4 tests (unenrolled sees access-denied, enrolled sees content panel, module title visible, quiz play renders)
- `test_sysadmin_ui_workflows.py` — 8 tests (login, navigate to users, user list, search, create user, org directory, org search, global analytics)

## Live-stack test summary

| Suite | Count | Status |
|---|---|---|
| Wave 1 API (tests/api/) | 122 | PASS |
| Wave 1 UI display (tests/ui/) | 37 | PASS |
| Wave 2 API (tests/api/test_orgadmin_wave2.py) | 22 | PASS |
| Spec Additions (tests/api/test_spec_additions.py) | 20 | PASS |
| Auth role API tests (tests/api/test_auth_roles.py) | ~25 | Pending live run |
| katalon E2E — orgadmin workflows | 4 | PASS |
| katalon E2E — login workflow | 2 | PASS |
| katalon E2E — document/profile/quiz/video | 12 | PASS |
| katalon E2E — flashcard + forgot-password + student course + sysadmin | 29 | PASS |
| katalon E2E — auth role login workflows | ~14 | Pending live run |

Note: `api/test_organization_course.py` has 8 pre-existing failures (old test file using outdated API contract — missing slug field, wrong course API path). These predate this project's test infrastructure.

## Open questions for dev
None.
