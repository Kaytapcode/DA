# Progress

**Current phase:** Spec Additions — COMPLETE & GREEN
**Branch:** K-B
**Next action:** All Wave 1 + Wave 2 + Spec Addition boxes are [x]. Project is DONE. Push branch K-B and open PRs if desired.

## Spec Additions (2026-05-21) — all 5 boxes [x]

New items found in updated System_specification:

- [x] Forgot Password (Spec §1) — token-based reset, ConsoleEmailService (dev mode returns token in response), BE + FE + 5 tests green
- [x] Seed Data (Spec §5) — 7 pre-seeded accounts (SysAdmin1/2, OrgAdmin1/2, User1/2/3) + 2 test orgs; 9 tests green
- [x] OrgAdmin Content Override Right (Spec §1 OrgAdmin) — already implemented via CanTeachAsync; added 2 scope-boundary tests
- [x] SysAdmin Absolute Destructive Right (Spec §1 SysAdmin) — already implemented; added 2 global-delete tests
- [x] Course Strict Privacy FE (Spec §4.1) — SpecificCoursePage distinguishes 403 vs 404, shows "Access denied" with data-testid; 2 API tests green

## Spec Additions bugs discovered and fixed

1. **useCourse.fetchCourses wrong paginated response shape** (Wave 2 discovery) — documented in previous session
2. **ForgotPasswordPage / ResetPasswordPage had TODO stubs** — wired to real API calls with data-testids added
3. **SpecificCoursePage generic error msg** — now shows "Access denied. You are not enrolled in this course." on forbidden responses

## Wave 2 — OrgAdmin — all 7 boxes [x]

- [x] Course CRUD scoped to org (Spec 4.2) — 6 API tests green
- [x] Add/remove org users to courses (Spec 4.2) — 5 API tests green
- [x] Teacher/Student role assignment per course (Spec 4.2) — covered in enrollment tests
- [x] Org analytics (Spec 1 OrgAdmin) — 4 API tests green; gateway + scope invariant enforced
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
| Wave 1 katalon-E2E | 2 | PASS |
| Wave 2 API (tests/api/test_orgadmin_wave2.py) | 22 | PASS |
| Wave 2 katalon-E2E (tests/katalon/test_orgadmin_workflows.py) | 4 | PASS |
| Spec Additions (tests/api/test_spec_additions.py) | 20 | PASS |
| **Total** | **207** | **ALL PASS** |

## Open questions for dev
None.
