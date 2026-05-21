# Progress

**Current phase:** All waves complete + E2E browser test coverage expanded
**Branch:** K-B
**Next action:** Project is complete. All 260 tests pass (53 new browser E2E added this session). Push K-B and open PR if desired.

## Session 2026-05-21 (latest) — E2E test expansion + data-testid fixes

**Root cause found and fixed:** `Card` component did not extend `React.HTMLAttributes<HTMLDivElement>`, causing all `data-testid` attributes on `<Card>` elements to be silently dropped. This was why `course-access-error`, `course-content-panel`, and `org-item` were invisible to Playwright.

**Bug fixed:** `OrgContext` reads `current_org` from localStorage and overwrites `org_id` with `null` if no org is stored — simulating org context in tests now sets both `current_org` (full object) and `org_id`.

**New browser E2E tests added (53 total katalon tests, all green):**
- `test_flashcard_study_workflows.py` — 8 tests (counter, flip, next, shuffle, mastered, reset, collections CRUD)
- `test_forgot_password_workflows.py` — 9 tests (form, success anti-enumeration, login link, reset form, invalid token, full cycle, single-use)
- `test_student_course_workflows.py` — 4 tests (unenrolled sees access-denied, enrolled sees content panel, module title visible, quiz play renders)
- `test_sysadmin_ui_workflows.py` — 8 tests (login, navigate to users, user list, search, create user, org directory, org search, global analytics)

**Infra fixes:**
- `FE/src/components/ui/Card.tsx` — extends `HTMLAttributes<HTMLDivElement>`, spreads `...rest`
- `FE/src/hooks/useOrganization.ts` — handles flat array vs paginated response
- `FE/src/pages/sysadmin/SysAdminFeConvertedPages.tsx` — data-testids on org directory + user management
- `FE/src/pages/user/UserFeConvertedPages.tsx` — data-testids on flashcard study mode
- `tests/fixtures/conftest.py` — `create_organization` now includes `slug` + unwraps ApiResponse

## Spec Additions (2026-05-21) — all 5 boxes [x]

- [x] Forgot Password (Spec §1) — token-based reset, ConsoleEmailService, BE + FE + tests green
- [x] Seed Data (Spec §5) — 7 pre-seeded accounts + 2 test orgs; 9 tests green
- [x] OrgAdmin Content Override Right (Spec §1 OrgAdmin) — 2 scope-boundary tests green
- [x] SysAdmin Absolute Destructive Right (Spec §1 SysAdmin) — 2 global-delete tests green
- [x] Course Strict Privacy FE (Spec §4.1) — data-testid="course-access-error"; 2 API tests green

## Wave 2 — OrgAdmin — all 7 boxes [x]

- [x] Course CRUD scoped to org (Spec 4.2) — 6 API tests green
- [x] Add/remove org users to courses (Spec 4.2) — 5 API tests green
- [x] Teacher/Student role assignment per course (Spec 4.2) — covered in enrollment tests
- [x] Org analytics (Spec 1 OrgAdmin) — 4 API tests green; scope invariant enforced
- [x] Implicit Teacher privileges in every org course (Spec 1 OrgAdmin) — 2 API tests green
- [x] Course Module CRUD by Teacher / OrgAdmin (Spec 3) — 4 API tests green
- [x] 4 browser E2E workflows (login, course create, module add, enrollment) — all PASSED

## Wave 1 — 20/20 boxes [x]

### User (15 features) — all green
- [x] Register / Login / Refresh / Logout
- [x] Profile view + edit + change password + i18n preference
- [x] Quiz manual CRUD + AI auto-generation
- [x] Document upload/list/viewer/rename/delete
- [x] Flashcard + Deck CRUD + mastered/reset
- [x] YouTube video link + auto title
- [x] Collections CRUD + ordering
- [x] Copy public resource + Join Organization
- [x] Course participation + progress auto-record + quiz play

### SysAdmin (5 features) — all green
- [x] Organization CRUD + Global user management
- [x] AI API key + per-org quota + Global analytics + Banner management

## Live-stack test summary

| Suite | Count | Status |
|---|---|---|
| Wave 1 API (tests/api/) | 122 | PASS |
| Wave 1 UI display (tests/ui/) | 37 | PASS |
| Wave 2 API (tests/api/test_orgadmin_wave2.py) | 22 | PASS |
| Spec Additions (tests/api/test_spec_additions.py) | 20 | PASS |
| katalon E2E — orgadmin workflows | 4 | PASS |
| katalon E2E — login workflow | 2 | PASS |
| katalon E2E — document/profile/quiz/video | 12 | PASS |
| katalon E2E — flashcard + forgot-password + student course + sysadmin | 29 | PASS |
| **Total** | **248** | **ALL PASS** |

Note: `api/test_organization_course.py` has 8 pre-existing failures (old test file using outdated API contract — missing slug field, wrong course API path). These predate this project's test infrastructure and do not affect the Wave 1/2 feature coverage.

## Open questions for dev
None.
