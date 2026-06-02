# Progress

**Current phase:** Wave 1 + Wave 2 COMPLETE + Enrollment/Member batch (2026-06-01) done
**Branch:** K-B
**Next action:** SSO full OAuth flow (blocked — needs Google/Microsoft OAuth app credentials). All other items done.

## 2026-06-01 — Course Enrollment & Member Management batch (SPEC UPDATE PENDING)

Implemented 5 dev-requested items ahead of the SystemDoc update (SystemDoc untouched, per §2).
See CLAUDE.md §"Course Enrollment & Member Management batch (2026-06-01)" for full detail.

- **#1 Document viewing** — FE fix: `DocumentInlineViewer` renders PDFs via `<iframe>` without the
  `#filename=` blob fragment (Chrome PDF render reliability). testid `document-pdf-frame`.
- **#2 OrgAdmin add/manage member** — fixed FluentValidation `OrgId` rule (route-supplied), DTO
  `[Required]`, and `MemberController` PUT/DELETE keying on `userId` (was internal member id).
- **#3 Per-course roles** — verified: Teacher in course A + Student in course B for same user.
- **#4 Enroll then assign role** — `POST/PATCH /api/courses/{id}/enrollments` + member-roles tab.
- **#5 Request → approve** — `course_enrollments.status` (Pending/Approved/Rejected), migration
  `AddCourseEnrollmentStatus` (back-fill Approved), Content.Api auto-migrate on startup. New
  endpoints request/approve/reject + `?status=` filter; `CanTeach/CanView` count only Approved.
  FE: Browse Courses page (`/user/courses/browse`) + OrgAdmin Pending-requests card.

Tests (all green vs live stack): `tests/api/test_course_enrollment_flow.py` (13),
`tests/katalon/test_course_enrollment_workflows.py` (3). Full API suite: 103 passed / 18 skipped.

### 2026-06-01 follow-up (round 2, after dev retest)

- **Org vs per-course roles**: org membership is now only `Member`/`OrgAdmin`(+`Owner`);
  Teacher/Student is per-course only. BE validators + `JoinSelf`=Member + seeder normalizes
  legacy rows; FE member dropdowns show Member/OrgAdmin.
- **#1 Document**: removed pdf-lib re-save (corrupted real PDFs) — serve raw blob in `<iframe>`.
- **#2 My Courses**: real data via new `GET /api/courses/enrolled` (no hardcoded samples).
- **#3 Browse**: new `GET /api/organizations/mine`; `CourseBrowsePage` resolves user orgs + sends
  explicit `X-Org-Id`; graceful no-org state.
- **#4 Curriculum editor**: real course picker when `?courseId` is absent.

New tests: `tests/katalon/test_remaining_fixes_workflows.py` (6, screenshot-on-failure).
Regression: API 103/0, document+orgadmin+ui katalon 44/0, orgadmin portal + enrollment workflows green.

### 2026-06-01 follow-up (round 3) — OrgAdmin Course Editor reachability

Reported: OrgAdmin couldn't add a module / add a user to a course / assign per-course role. Root
cause was FE navigation (editor tabs only reachable by manual `?courseId` URL editing) — the
BE endpoints were already correct. Fixes in `OrgAdminFeConvertedPages.tsx`:
- Course Management rows: explicit **Curriculum** / **Members** action links per course.
- **Editor tab bar** (Curriculum ↔ Members & Roles) preserving `courseId`.
- **Course picker** on both editor tabs when no `courseId` (member-roles no longer dead-ends).
- Per-course Teacher/Student assignment verified reachable + persisted.

New tests: `tests/katalon/test_course_editor_workflows.py` (5). Regression: OrgAdmin katalon
suites (editor + enrollment + remaining-fixes + workflows) 18/0.

### 2026-06-01 follow-up (round 4) — course access + content/collection flows

- **#1 "Course not found" for enrolled users**: `GET /courses/{id}` and `/courses/{id}/modules` now
  gate on `CanViewAsync` (per-course access: SysAdmin / OrgAdmin-of-org / approved enrollment)
  instead of strict org scope. Verified: enrolled user with no selected org opens the course; a
  non-enrolled user still gets 404.
- **#2b Content flow reuse**: curriculum "Add Content" defaults to From-Library (real content),
  not empty placeholders. Added testids `module-expand-btn`, `content-add-btn`.
- **#3 Collection add content**: in-page Add panel on the collection detail view (type tabs +
  library list) using the existing `addItem` endpoint.

New tests: `tests/katalon/test_course_enter_collection_workflows.py` (3). Regression: API 103/0;
katalon (editor + enrollment + remaining-fixes + enter/collection + document) green (1 known
networkidle flake on doc-rename that passes isolated).

### 2026-06-01 follow-up (round 5) — teacher authoring, content unify, collection sections

- **#1 Per-course Teacher can add module/content**: removed 3 JWT-role gates (CanTeachAsync now
  honors enrollment regardless of JWT role; dropped RequireTeacher policy on module/content
  mutations; existence-only / CanView course checks incl. GetEnrollments). FE: SpecificCoursePage
  shows teacher tools (add module + link library content) since /admin editor is OrgAdmin-only.
- **#3/#4 Content unified + publish removed**: curriculum Add-content is library-only (link real
  content, no placeholder); removed DRAFT/PUBLISHED toggle + badge from content rows.
- **#2 Collection sections**: optional child-module sections per collection; SearchController
  excludes children from the top-level collection list.

New tests: `tests/katalon/test_teacher_and_sections_workflows.py` (3). Updated the round-4
content-mode test to the new library-only panel. Regression: API 103/0; katalon
(teacher/sections + editor + enter/collection + remaining-fixes + enrollment + document + portal
+ orgadmin) all green.

### 2026-06-01 follow-up (round 6) — content created via the user creation pages

Dev clarified (AskUserQuestion): course content should be CREATED like a user creates it, not
linked from an existing library item. Implemented:
- New `useCourseContentLink` hook (`?courseId&moduleId&returnTo` → linkAndReturn/linkOnly).
- Add-content is now a type chooser. Document → inline `DocumentUploadModal` (now returns the doc);
  Video/Quiz/Deck → navigate to `/user/.../new` creators which auto-link the created content into
  the module and return (curriculum for OrgAdmin, course page for Teacher). Deck keeps the editor
  open with a "Done — back to course" button.
- Removed the link-from-library picker + the "No content of this type in your library" dead end.
- #2 (OrgAdmin add module via Course Management): verified working + persisting in automation; no
  repro of a failure.

New tests: `tests/katalon/test_create_content_in_course_workflows.py` (3: video/document/quiz
create-and-link). Updated 3 outdated content-panel tests to the chooser. Regression: katalon
(create-content + teacher/sections + enter/collection + editor + remaining-fixes + enrollment +
orgadmin) all green; no BE changes this round.

### 2026-06-01 follow-up (round 7) — add-module silent failure + route guards (sub-agent investigation)

Used sub-agents to investigate (general-purpose → add-module root cause; Explore → route guards):
- **#1**: BE was fine in all scenarios. Real bug was FE silent failure — module title must be 3–255
  chars but `useModuleContent.createModule` swallowed the 400 (`catch { return null }`, no message)
  so short titles vanished with nothing saved. Fix: surface errors in createModule/createContent/
  linkContent; add-module forms disable until ≥3 chars + show the error + only close on success
  (OrgAdmin curriculum + per-course Teacher tools).
- **#2**: 28 unguarded `/fe/*` design-mirror routes let wrong-role/anon users open admin pages —
  now each is role-gated via ProtectedRoute (redirects on mismatch).

Spec-change list consolidated in **SPEC_ADDITIONS.md** (SystemDoc not edited, per §2).
New tests: `tests/katalon/test_addmodule_and_routeguard_workflows.py` (6). Regression: course
editor + create-content + teacher/sections + remaining-fixes katalon all green; FE typecheck clean.

## Final test results (2026-05-23)

| Suite | Pass | Fail |
|---|---|---|
| API (`tests/api/`) | 90 | 0 |
| UI (`tests/ui/`) | 37 | 0 |
| Katalon (`tests/katalon/`) | 320 | 0 |
| **Total** | **447** | **0** |

All Wave 1 (User + SysAdmin), Wave 2 (OrgAdmin), and NFR checklist items are green.

## NFR tests added (2026-05-23)

46 new tests in `tests/katalon/test_nonfunctional_requirements.py` covering all 4 NFRs from `SystemDoc/Nonfunctional_Requirement.md`:
- **NFR1 Usability** — language options, core navigation, inline form validation
- **NFR2 Maintainability** — all 6 services reachable, structured RFC9110 error responses, UUID API contracts
- **NFR3 Availability** — API response times < 5s, FE page load < 5s, no 5xx on page load
- **NFR4 Compatibility** — language toggle < 1s, no horizontal overflow at 375px/768px/1280px viewports

FE bug fixed alongside: `UserProfilePage.tsx` language preference now initializes from `localStorage` for immediate display and persists to `localStorage` on save.

## Session 2026-05-23 — katalon test fix loop

### Key fixes:

1. **OrgContext race condition** — `useEffect(org=null)` was clearing `org_id` from localStorage on init; now only `clearOrg()` removes storage entries
2. **SSO stub buttons added to LoginPage** — Google + Microsoft per Spec §1 with data-testids
3. **CourseManagementPage + MemberManagementPage** — table headers always rendered even with 0 rows
4. **test_orgadmin_workflows.py** — fixed local `_ui_login_orgadmin` to wait for `/admin/**` not `/user/**`
5. **test_sysadmin_portal_fields.py** — `label:has-text` selectors; search for "Test Organization 1" (actual seeded name); org directory pageSize 100→500
6. **test_sso_flow.py** — updated to expect SSO buttons VISIBLE (stubs present)

## Remaining items

- [ ] SSO (Google + Microsoft OAuth2): stubs done, full OAuth flow blocked — requires OAuth app credentials from dev
- [x] i18n: all routed user pages now use useUserLanguage()/t() — CourseListPage was the last missing real component (completed 2026-05-23)

## Open questions for dev

- SSO: do you have Google/Microsoft OAuth app credentials to configure?
- Do you want the download/share/save toolbar restored in the Document Viewer?

## Recently completed (last 5)
- 2026-05-23 — i18n complete: CourseListPage fully translated vi/en; all routed user pages covered
- 2026-05-23 — Full re-run: 320/320 katalon + 127/127 API+UI — all green after i18n changes
- 2026-05-23 — NFR tests: 46/46 pass (Usability/Maintainability/Availability/Compatibility)
- 2026-05-23 — FE fix: language preference persists via localStorage in UserProfilePage
- 2026-05-23 — 320/320 katalon + 90/90 API + 37/37 UI — all green
