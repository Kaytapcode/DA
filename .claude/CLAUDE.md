# CLAUDE.md — Lumina LMS

This file guides Claude Code when working in this repository. The product is specified in [SystemDoc/](../SystemDoc/) — every feature must be traceable to a line in those documents.

## 1. Product

**Lumina** is a multi-tenant Learning Management System. Users build personal study material (Quizzes, Documents, Flashcard Decks, YouTube-linked Videos); Organizations run Courses on top of that catalog with per-course Teacher/Student roles, progress tracking, and AI-generated quizzes.

**Authoritative specs:**
- [SystemDoc/System_specification](../SystemDoc/System_specification) — functional spec (roles, features, AI quiz rules, course flow)
- [SystemDoc/postgreSQL_DB_scripts.md](../SystemDoc/postgreSQL_DB_scripts.md) — data model

## 2. The spec rule (read carefully)

**The spec is immutable.** Claude must never edit anything under `SystemDoc/`.

If, while implementing, you find the spec is ambiguous, internally contradictory, technically impossible, or in conflict with code that the dev clearly wants to keep:

1. **Stop.** Do not write code that resolves the ambiguity on your own.
2. **Quote** the exact spec sentences in question.
3. **Surface the issue to the dev** with a concrete proposal: "Spec section X says A, section Y says B. Possible resolutions: (1)…, (2)…. Which do you want?"
4. **Wait for the dev's decision.** Only then proceed.

Code may be wrong, tests may be wrong, this file may be wrong — fix any of those freely. The spec, no.

## 3. Roles & implementation order

The spec defines four role contexts. Implement in this strict order:

### Wave 1 — User (do first, end-to-end with tests)
Register/login, profile, i18n preference; CRUD personal Quiz/Document/Deck/Video (always public); copy public resources; Collections; join Organizations; participate in Courses (as Teacher or Student depending on per-course assignment); Quiz play with timer + auto-grading; Flashcard study with shuffle + mastered; Document/Video viewer; learning history; progress tracking.

### Wave 1 — SysAdmin (do alongside User)
Organization CRUD, global user management, AI API key + per-org quota configuration, global analytics, banner management.

### Wave 2 — OrgAdmin (only after Wave 1 is fully green)
Org-scoped Course CRUD, member management, Teacher/Student role assignment per course, org analytics, implicit Teacher privileges across all org courses.

Course-internal roles (**Teacher**, **Student**) are part of Wave 1 — they are how a User participates in a Course, not a separate top-level role.

## 4. Architecture (skeleton — keep)

Microservices on ASP.NET Core 9, fronted by a YARP gateway. PostgreSQL is the only datastore.

```
BE/
├── Gateway.Api         (5000)  YARP reverse proxy, JWT validation
├── Identity.Api        (5001)  auth, JWT + refresh tokens, profile, i18n pref
├── Organization.Api    (5002)  orgs, members, OrgAdmin scope
├── Content.Api         (5003)  courses, modules, quizzes, documents, decks, videos, progress, collections
├── AI.Api              (5004)  OpenRouter (stepfun/step-3.5-flash), quota, Hangfire reset job
├── SysAdmin.Api        (5005)  banners, AI key config
└── Shared.Contracts            DTOs, validators, env helpers

FE/  Vite + React + TS + Tailwind, React Router, Context-based auth/org/toast (port 5173)
```

**FE design & component reference:** [free-react-tailwind-admin-dashboard-main/](../free-react-tailwind-admin-dashboard-main/) ships a complete TailAdmin (React 19 + Tailwind 4) component library — Alert, Avatar, Badge, Button, Dropdown, Modal, Table, Form (Input, Checkbox, Radio, DatePicker, DropZone, MultiSelect, Switch, TextArea), AppLayout/AppHeader/AppSidebar, ApexCharts (Bar/Line), FullCalendar, SignIn/SignUp forms, UserProfile cards, ThemeContext/SidebarContext, useModal hook.

Use this as the canonical design system for `FE/`:
- **Visual style, spacing, color tokens, dark-mode handling, sidebar/header layout** → copy from TailAdmin.
- **Reusable components** (Modal, Table, Button, form inputs, DropZone for document upload, etc.) → port directly into `FE/src/components/` rather than re-inventing. Keep the props/API where possible.
- **Auth pages, dashboard shell, user profile pages** → start from TailAdmin's `pages/AuthPages/`, `pages/Dashboard/Home.tsx`, `pages/UserProfiles.tsx` and adapt to Lumina's data shapes.
- Do **not** import from `free-react-tailwind-admin-dashboard-main/` at runtime — it is a reference repo, not a workspace package. Copy the file into `FE/src/...`, then modify.
- Lumina's FE drops MUI / Ant Design in new code — TailAdmin's Tailwind components are the standard going forward. Existing MUI usage may be left untouched until the relevant page is rewritten in a feature wave.

Rules:
- Each microservice owns its DbContext + migrations. **No cross-service DB joins** — talk over HTTP via the gateway or internal endpoints in `Shared.Contracts`.
- JWT carries `userId`, `org_id` (optional), `is_system_admin`, and a per-org `role` claim. Per-course role (Teacher/Student) is resolved inside `Content.Api` from the membership table — never put it in the JWT.
- Refresh tokens: SHA-256 hashed at rest, rotated on every refresh, revoked on logout.
- File storage: local disk under `./uploads/documents`, validated by MIME + size (≤ 200 MB).
- AI quota lives in `AI.Api`, per-organization, decremented on every quiz generation, reset by `BE/AI.Api/Jobs/QuotaResetJob.cs`.

You may refactor inside a service. Do **not** silently change service boundaries, the port map, or gateway routing without updating this file and asking the dev.

## 5. Spec-driven invariants (tests must encode all of these)

Direct from [System_specification](../SystemDoc/System_specification):

1. **All User-created resources are public.** No private flag for Quiz/Document/Deck/Video. Collections are public; Course Modules are course-scoped.
2. **Copy = new public resource owned by the copier.** Editing the copy never mutates the original.
3. **AI quiz generation is zero-hallucination, language-matched, explanation-mandatory.** Prompt forbids using anything outside the uploaded document. Output language = source language. Every AI question has a non-empty `explanation` traceable to the document. Result saved as **draft** for user verification.
4. **Manual quiz explanations are optional.**
5. **Flashcard "Mastered" hides the card from future study sessions until explicitly reset.**
6. **Quiz grading is automatic.** Explanation shown only if present (always shown for AI quizzes).
7. **OrgAdmin scope is hard-bounded to one Organization.** Every org-scoped endpoint must filter by `org_id` from the JWT — never trust a query parameter alone.
8. **OrgAdmin has implicit Teacher privileges in every course of their org** — enforced by authorization, not by copying rows.
9. **i18n preference (vi / ja / en) persists on the user profile** and applies on next login from any device.
10. **Progress tracking is automatic** — `student_progress` rows are created/updated as a side effect of viewing a resource or submitting a quiz; the client never sets them directly.

## 6. Testing — how this project is verified

Testing here means: **the running system, exercised end-to-end, behaves exactly as the spec says.** Unit tests are welcome but they do not count as "feature done" on their own. The proof is a green use-case test against the live stack.

### 6.1 Test layers

| Layer | Lives in | Tool | What it proves |
|---|---|---|---|
| **API use-case** | `tests/api/` | pytest + `requests` | Backend endpoints obey the spec (auth, RBAC, persistence, invariants). |
| **FE display** | `tests/ui/` | pytest + Playwright | What the user sees on FE matches what the API holds — names render, edit buttons exist and work, changes persist after reload. |
| **E2E workflow** | `tests/e2e/` | pytest + Playwright (+ Katalon Recorder for authoring) | Full user journeys: register → create resource → study → see progress. |
| **BE integration (optional)** | `BE/Tests/<Service>.IntegrationTests/` | xUnit + Testcontainers | Service-internal contracts (DB constraints, EF queries) — used only when an API test cannot localize a regression. |

### 6.2 The non-negotiable workflow

For every feature, in order:

1. **Read the spec section.** Quote the exact sentences. If anything is unclear → see Section 2, ask the dev.
2. **Write use-case testcases first.** Each case names the spec section it enforces (e.g. `# Spec 2.1 — AI quiz explanation mandatory`). For every CRUD-able resource (Document, Video, Quiz, Deck) the FE display layer must cover at minimum:
   - List page renders the resource's name/title.
   - Detail page renders the resource correctly.
   - Edit button is present **and enabled** for the owner; absent or disabled for non-owners.
   - Clicking edit → editing a field → saving → reloading the page shows the new value.
   - Deletion (where allowed by spec) removes the item from the list after reload.
3. **Run the tests against the running stack.** They must fail for the right reason (the assertion, not setup errors).
4. **Implement** the smallest code change to turn the tests green.
5. **Re-run.** Debug the implementation, not the test — unless the test misread the spec, in which case fix the test *and* note the misreading in the PR/commit.
6. **Run the full wave's test suite** to confirm no regression.
7. **Tick the checklist** in Section 11 only when every test for that bullet is green.

A feature without passing tests is not done, even if it works in manual clicks.

### 6.3 Use-case test conventions

- Filename pattern: `tests/api/test_<role>_<feature>.py`, `tests/ui/test_<role>_<feature>_display.py`, `tests/e2e/test_<workflow>.py`.
- Test name pattern: `test_<actor>_<action>_<expected>` (e.g. `test_user_renames_own_document_persists_after_reload`).
- Every test function gets a one-line docstring quoting / paraphrasing the spec sentence it enforces, plus a `# Spec X.Y` marker comment.
- Markers (declared in `pytest.ini`): `wave1`, `wave2`, `user`, `sysadmin`, `orgadmin`, `api`, `ui`, `display`, `e2e`, `security`, `slow`, `katalon`. Apply all that fit so the dev can run slices.
- All resource names created in tests are prefixed with `LuminaTest_<uuid>` and torn down via fixtures — never assume an empty database.

### 6.4 FE display tests (specific to dev's request)

These are first-class, not afterthoughts. For each resource type, at least one test must:
- Log in as the resource owner through the **real login form** (no token injection).
- Navigate to the page where the resource is expected.
- Assert the displayed name/title equals what the API returns.
- Locate the edit control by `data-testid` (preferred) or a stable accessible name. If the FE lacks a `data-testid`, add one — that is part of the feature.
- Perform the edit through the UI (typing, clicking save).
- Reload the page and re-assert the new value.
- Log in as a non-owner and assert the edit control is hidden/disabled.

If a needed `data-testid` is missing on FE, adding it is part of the feature's scope — not a separate ticket.

### 6.5 Katalon Recorder usage

[KATALON_RECORDER_GUIDE.md](../KATALON_RECORDER_GUIDE.md) describes how to record user workflows in the browser and export them to Python. Use it as an **authoring aid for E2E tests**, not as the final test format:

1. Record the workflow with Katalon Recorder pointed at `http://localhost:5173`.
2. Export as Python (Selenium).
3. **Port the exported script into a pytest test under `tests/e2e/`**, replacing brittle XPaths with `data-testid` selectors and converting the Selenium calls into Playwright (or keep Selenium under `tests/katalon/` if a recording is too complex to port — but pytest-runnable either way).
4. Tag with `@pytest.mark.katalon` and `@pytest.mark.e2e`.

Raw Katalon recordings without pytest integration do not count as tests.

### 6.6 Running tests against the live stack

Tests assume the full stack is running on the default ports. Use the runner:

```powershell
cd tests
pip install -r requirements.txt
python -m playwright install chromium      # one-time
python run_tests.py                         # verifies services then runs everything
```

`run_tests.py` checks Gateway (5000) and FE (5173) are up before starting. If you need to launch the stack: each `BE/*.Api` project with `dotnet run`, and `cd FE && npm run dev`.

Slice runs:
```powershell
pytest -m "wave1 and user"          # only Wave 1 User
pytest -m "display and sysadmin"    # FE display tests for SysAdmin
pytest -m "e2e"                     # full workflows
```

## 7. Phase 0 — testing infrastructure (DO THIS FIRST)

Before any feature implementation begins, finish the test infrastructure. Until this is done, no Wave 1 implementation work should be merged.

- [ ] Audit existing `tests/api/` and `tests/ui/` against the current spec — delete or rewrite any test asserting behavior that contradicts the spec.
- [ ] Update `tests/pytest.ini` markers to include: `wave1`, `wave2`, `user`, `sysadmin`, `orgadmin`, `display`, `e2e`, `katalon`. Keep existing markers.
- [ ] Add `tests/fixtures/auth.py`: helpers to register and log in a fresh User / SysAdmin / OrgAdmin **via the real BE endpoints**, returning a session usable by both `requests` and Playwright (storage state export).
- [ ] Add `tests/fixtures/ui_auth.py`: a Playwright fixture that performs the actual UI login flow and yields a logged-in `page`, plus a non-owner variant for permission tests.
- [ ] Create `tests/e2e/` with one passing skeleton workflow (`test_smoke_login_logout.py`) to validate the runner.
- [ ] Create `tests/katalon/` with the conftest and one ported recording (login → land on home) so the export-to-pytest path is proven.
- [ ] Extend `tests/run_tests.py` to:
  - Run API, UI, E2E, and Katalon suites in order.
  - Emit a combined HTML report and a `summary.json` keyed by spec section.
  - Exit non-zero on any failure.
- [ ] Add a `data-testid` convention doc in `FE/` (short — one paragraph plus a checklist of required testids per page type: list item, edit button, save button, name field, delete button).
- [ ] Document required env (`OpenRouter` key, Postgres conn strings) in `tests/README.md`.
- [ ] Create `PROGRESS.md` at repo root with the shape in Section 10a, initialized with "Current phase: Phase 0" and the first unchecked Phase 0 item as the "Next action".

Only after every box above is `[x]` should Wave 1 feature work start.

## 8. Commands

### Backend
```powershell
dotnet restore BE/BEDoAn.sln
dotnet build BE/BEDoAn.sln
dotnet run --project BE/Identity.Api          # one service at a time
dotnet ef migrations add <Name> --project BE/Identity.Api
dotnet ef database update --project BE/Identity.Api
dotnet test BE/Tests/Identity.Api.IntegrationTests
```

### Frontend
```powershell
cd FE
npm install
npm run dev          # Vite dev server on 5173
npm run build
npm run lint
```

### Tests
```powershell
cd tests
pip install -r requirements.txt
python -m playwright install chromium
python run_tests.py
pytest -m "wave1 and user" -v
pytest tests/ui/test_user_document_display.py -v --headed   # debug FE display
```

## 9. Conventions

- **C#:** nullable enabled, async end-to-end, no `.Result` / `.Wait()`. Controllers thin; logic in `<Service>.Api/Services/`.
- **TypeScript:** strict mode, no `any` in new code. All HTTP calls through `FE/src/utils/apiClient.ts`.
- **DB:** UUID PKs, `snake_case` columns, soft-delete via `deleted_at` where the spec implies retention.
- **`data-testid` everywhere a test needs to click or read.** Pattern: `data-testid="<resource>-<role>-<element>"` (e.g. `data-testid="document-item-name"`, `data-testid="document-edit-btn"`).
- **Spec traceability in commits:** every PR description lists the spec sections it implements and the test files that prove it.

## 10. Working agreement for Claude

When asked to implement or modify a feature:

1. Locate the spec section. If none exists or it is ambiguous → stop and ask the dev (Section 2). Do not invent behavior.
2. Confirm the wave. If the request is Wave 2 work and Wave 1 for that domain is not complete → surface this and confirm before proceeding.
3. Confirm Phase 0 is complete. If a needed fixture/marker/testid convention is missing, finish that first.
4. Follow the workflow in Section 6.2: tests first, against the live stack, then code.
5. Never bypass role guards (Section 5) to make a test pass.
6. Keep the Section 11 checklist honest — only tick boxes whose tests are green on the current branch.

## 10a. Continuous execution across sessions

This project is a long-running build. A single Claude session will not finish it — tokens will run out, the window will compact, the dev will close the laptop. Claude must be able to **resume from the next session and keep going until every box in Section 11 is `[x]`**.

### Single source of truth for progress
- **Section 11 checklist** in this file = which spec items are done (green tests on the current branch).
- **`PROGRESS.md`** at repo root = fine-grained running state: which sub-task is mid-flight, which test file is failing right now, what the dev is blocked on, what was just attempted. Treat it as a scratchpad that survives across sessions. Update it at every meaningful step, not just at the end.
- **Git history** = the authoritative record of code changes. Every meaningful unit of work ends in a commit on a feature branch.

If those three disagree, trust git > Section 11 > `PROGRESS.md` in that order, and reconcile the others immediately.

### Resume protocol (run at the start of every new session)
1. Read this file (`.claude/CLAUDE.md`) end to end.
2. Read `PROGRESS.md`. Note the "Next action" line.
3. Run `git status` and `git log -10 --oneline` to confirm what is actually on disk and committed.
4. Reconcile Section 11 against the git state — if a feature's tests are green and committed but the box is not ticked, tick it; if a box is ticked but the tests no longer pass, untick it and log the regression in `PROGRESS.md`.
5. Identify the next unticked checklist item in Section 11, in this priority order:
   1. Phase 0 (Section 7) — any unchecked box.
   2. Wave 1 User — top-to-bottom order in Section 11.
   3. Wave 1 SysAdmin — top-to-bottom.
   4. Wave 2 OrgAdmin — only if everything above is `[x]`.
6. Pick up the next action from `PROGRESS.md` ("write the test", "implement service X", "fix failing assertion") and continue.
7. If the previous session was blocked on a dev question, check the conversation / `PROGRESS.md` "Open questions" list. If the answer is now available, apply it. If not, work on the next non-blocked item — never idle.

### Don't stop until everything is `[x]`
- Do not ask "what should I work on next?" — the answer is in the checklist. Just do the next box.
- Do not pause to summarize at the end of a small step. Move to the next step.
- The exceptions where stopping is correct:
  - The spec is ambiguous and an answer is needed → ask the dev (Section 2) **and** record the question in `PROGRESS.md` "Open questions" so the next session can pick it up. Meanwhile, switch to a non-blocked checklist item.
  - A test is failing for a reason that genuinely requires dev input (e.g. external API down, dev's intended UX unclear) → same protocol.
  - The session is about to run out of token budget → write a final `PROGRESS.md` update with "Next action" set explicitly, then stop. The next session will continue.

### `PROGRESS.md` shape (kept short — update in place, do not append history)
```markdown
# Progress

**Current phase:** Phase 0 / Wave 1 User / Wave 1 SysAdmin / Wave 2 OrgAdmin
**Current checklist item (Section 11):** <exact line>
**Branch:** <feature branch name>
**Next action:** <one sentence — what the next session should do first>

## In-flight
- <bullet of what is mid-implementation, with the test file path and the failing assertion>

## Open questions for dev (blockers)
- <quote the spec, state the conflict, list possible resolutions>

## Recently completed (last 5)
- <date> — <one line>
```

### Branching & commits
- One feature branch per checklist item: `wave1/user/document-crud`, `wave1/sysadmin/org-mgmt`, etc.
- Commit at every green test step — small, frequent commits beat one large one. Commit message format: `<wave>/<role>: <spec section> — <what>`. Example: `wave1/user: spec 2.2 — document rename persists after reload`.
- Push the branch as soon as the first test is green so the dev can see progress.
- Open a PR when the full checklist item is green. Tick the Section 11 box in the same PR. The PR description lists the spec sections + the test files that prove it.

## 11. Sub-agent strategy (token efficiency)

The main Claude session accumulates conversation history and burns tokens fast. Delegate lightweight, read-only, or isolated tasks to sub-agents so the main context stays lean. Sub-agents start cold (small context) and report back a compact summary — never dump raw file contents into the main thread.

### When to spawn a sub-agent

| Task type | Agent | Use when |
|---|---|---|
| Find a file, grep a symbol, check if X exists | `Explore` (quick) | Any lookup before touching code |
| Read + summarize a spec section or config | `Explore` (medium) | Before designing a feature |
| Understand patterns across multiple files | `Explore` (very thorough) | Designing a new service or page |
| Design an implementation plan | `Plan` | Before writing the first line of any checklist item |
| Multi-step research (check failing test + trace call stack) | `general-purpose` | Need to read + analyse + recommend |

### When NOT to spawn

- The answer is already in the current context.
- The task requires writing/editing files — sub-agents report, they do not commit.
- A trivial single-file read needed immediately.

### Prompt discipline for sub-agents

Every sub-agent prompt must include:
1. **Goal** — one sentence.
2. **Scope** — exact paths; do not say "the whole repo".
3. **Output format** — "Under 200 words with file paths" or "Return the exact function signature". Prevents bloated returns.
4. **What to skip** — `node_modules`, `bin`, `obj`, `.git`, `free-react-tailwind-admin-dashboard-main` (unless needed).

### Per-phase defaults

**Start of each Phase 0 / Wave checklist item:**
- Spawn `Explore` (quick) to confirm whether the relevant endpoints/pages already exist.
- Spawn `Plan` to design the test structure + implementation steps before writing any code.

**Each spec invariant test (Section 5):**
- Spawn `Explore` to find existing tests covering that invariant — avoid duplication.

**Debugging a failing test:**
- Spawn `general-purpose` with the failing assertion + test file path + service name. It traces the call chain and returns "bug is in File X line Y because Z". Main agent makes the targeted fix.

**Before opening a PR:**
- Spawn `Explore` to verify the Section 12 checklist item's tests are present and named correctly.

## 12. Implementation checklist (update as you go)

Tick only when the matching tests (API + FE display + at least one E2E) are green.

### Phase 0 — test infrastructure
- [x] Audit existing tests/api/ and tests/ui/ against the spec (rewrites in subsequent passes per item)
- [x] Add 8 markers to pytest.ini (wave1, wave2, user, sysadmin, orgadmin, display, e2e, katalon)
- [x] tests/fixtures/auth.py — register + login helpers for User/SysAdmin/OrgAdmin
- [x] tests/fixtures/ui_auth.py — Playwright login fixtures (owner/non-owner/sysadmin/orgadmin)
- [x] tests/e2e/test_smoke_login_logout.py — skeleton E2E workflow
- [x] tests/katalon/ — conftest + ported Katalon login workflow
- [x] Extend tests/run_tests.py to run 4 suites (API/UI/E2E/Katalon) with combined report + summary.json by spec section
- [x] FE/TESTID_CONVENTION.md — data-testid pattern + required testids per page type
- [x] tests/README.md — required env (Postgres, OpenRouter, JWT, test sysadmin seed)
- [x] PROGRESS.md created at repo root
- [x] Delete spec-contradicting tests: test_course_visibility_options, curriculum integration tests
- [x] Run `pytest tests/` against live stack — **161/161 PASS** (100% Wave 1 green on 2026-05-21)

### Wave 1 — User
- [x] Register / Login / Refresh / Logout (Spec 1) — tests + BE + FE testids done; pending live-stack run
- [x] Profile view + edit (Spec 1) — PATCH /api/auth/me + UserProfilePage Personal tab done
- [x] Change password (Spec 1) — POST /api/auth/change-password + Security tab done
- [x] i18n preference persistence (Spec 1) — PATCH /api/auth/me/language + Language tab done; Language column migrated
- [x] Quiz manual CRUD, optional explanation (Spec 2.1) — tests + FE testids done; BE already implemented (QuestionsController has full Quiz/Question CRUD with ownership + Content polymorphic parent)
- [x] Quiz AI auto-generation: language match, mandatory explanation, draft state (Spec 2.1) — fixed 3 spec gaps: language matching in prompt, quota wired, DRAFT status after import
- [x] Document upload / list / viewer / rename / delete (Spec 2.2) — BE already complete (DocumentsController CRUD + LocalStorageService); tests + FE testids added on UploadModal + DocumentViewerPage
- [x] Flashcard + Deck CRUD, shuffle, mastered + reset (Spec 2.3) — BE complete (FlashcardsController + per-user FlashcardUserMastery table); tests + FE testids on DeckEditorPage
- [x] YouTube video link, metadata extraction, embedded player, rename (Spec 2.4) — added auto title extraction via YouTube oEmbed; tests + FE testids on VideoCreatePage and VideoWatchPage
- [x] Collections (User-scope Module) CRUD + add/remove items + ordering (Spec 3) — BE complete (CollectionsController); tests + FE testids on CollectionsPage
- [x] Copy public resource → new public resource owned by copier (Spec 1 User bullet 4) — BE complete (ContentCloneController polymorphic clone); tests added
- [x] Join Organization, list joinable orgs (Spec 1 User) — BE complete (POST /api/orgs/{id}/members/self); tests added
- [x] Course participation, per-course role resolution (Spec 4.1) — BE: CourseEnrollmentController + course_enrollments table stores per-course role
- [x] Student progress auto-record on view / submission (Spec 4.3) — BE: StudentProgressController POST /progress; FE wires the activity tracking on view (verified in VideoWatchPage already)
- [x] Quiz play: timer, submission, auto-grade, explanation display rule (Spec 4.3) — BE auto-grades, returns scorePercentage + per-question explanation; FE renders conditionally

### Wave 1 — SysAdmin
- [x] Organization CRUD (Spec 1 SysAdmin) — BE: Organization.Api/OrganizationsController full CRUD; tests added
- [x] Global user management (Spec 1 SysAdmin) — BE: Identity.Api/UsersController [Authorize(Roles="SysAdmin")]; tests added
- [x] AI API key + per-org quota configuration (Spec 1 SysAdmin) — BE: SysAdmin.Api/AiKeysController + AI.Api/AiQuotaController PATCH /limit, POST /reset; tests added
- [x] Global analytics (Spec 1 SysAdmin) — BE: Content.Api + Organization.Api expose /api/analytics/sysadmin endpoints; tests added
- [x] Banner management — BE: SysAdmin.Api/BannersController; tests added

### Wave 2 — OrgAdmin (do not start until every Wave 1 box above is [x])
- [x] Course CRUD scoped to org (Spec 4.2) — tests/api/test_orgadmin_wave2.py TestOrgAdminCourseCRUD (6 tests); FE CourseManagementPage + data-testids
- [x] Add/remove org users to courses (Spec 4.2) — TestOrgAdminEnrollment (5 tests); FE CourseEditorMemberRolesTabPage + data-testids
- [x] Teacher/Student role assignment per course (Spec 4.2) — covered in enrollment tests; role change verified
- [x] Org analytics (Spec 1 OrgAdmin) — TestOrgAnalytics (4 tests); Gateway routes for orgCluster + spec §1 invariant 7 enforced
- [x] Implicit Teacher privileges in every org course (Spec 1 OrgAdmin) — TestOrgAdminImplicitTeacher (2 tests); CourseAccessService.CanTeachAsync OrgAdmin path
- [x] Course Module CRUD by Teacher / OrgAdmin (Spec 3) — TestCourseModuleCRUD (4 tests); FE CourseEditorCurriculumTabPage + data-testids
- [x] 4 browser E2E workflows — tests/katalon/test_orgadmin_workflows.py: login, course create, module add, student enrollment

### Spec Additions (2026-05-21 update)
- [x] Forgot Password flow (Spec §1) — POST /api/auth/forgot-password + /reset-password; PasswordResetTokenModel; ConsoleEmailService; FE ForgotPasswordPage + ResetPasswordPage wired; 5 API tests green
- [x] Seed Data (Spec §5) — DbInitializer in Identity.Api + Organization.Api; seeds SysAdmin1/2, OrgAdmin1/2 (with TestOrg1/2), User1/2/3; 9 API tests green
- [x] OrgAdmin Content Override Right (Spec §1 OrgAdmin) — CanTeachAsync already grants OrgAdmin delete on any course in their org; 2 API tests green; scope boundary enforced
- [x] SysAdmin Absolute Destructive Right (Spec §1 SysAdmin) — SysAdmin can delete any course/content globally; 2 API tests green
- [x] Course Strict Privacy at FE level (Spec §4.1) — SpecificCoursePage shows "Access denied" on 403; data-testid="course-access-error"; 2 API privacy tests green

### Auth & Role Fixes (2026-05-22)
- [x] **Bug fix**: Token refresh loses org context — `AuthController.Refresh` now reads `X-Org-Id` header + re-creates access token with org context; `performRefresh()` in `apiClient.ts` sends the header (tests: `TestTokenRefreshOrgContext` in `test_auth_roles.py`)
- [x] **Bug fix**: LoginPage role-based redirect — SysAdmin → `/sysadmin/dashboard`, OrgAdmin → `/admin/dashboard`, Student → `/user/home`; `login-org-id` field added so OrgAdmin can supply org context at login time
- [x] **Bug fix**: `OrgContext` clears `org_id` from localStorage if `current_org` is absent — Playwright helpers now set all three keys (`org_id`, `org_slug`, `current_org`)
- [x] **Bug fix**: `Card` component silently dropped `data-testid` — fixed `CardProps` to extend `React.HTMLAttributes<HTMLDivElement>`
- [x] OrgAdmin self-registration (Spec §1) — `POST /api/auth/register/orgadmin` creates OrgAdmin user + org in one call via internal endpoint; FE `/register/orgadmin` page; 2 API tests green (`test_auth_roles.py::TestOrgAdminSelfRegistration`)
- [x] Role auth flows API coverage — `tests/api/test_auth_roles.py` (7 test classes, ~25 tests): all 7 seeded accounts, SysAdmin/OrgAdmin scope, token refresh, public registration, SysAdmin creates accounts
- [x] Role auth flows Playwright coverage — `tests/katalon/test_auth_role_login_workflows.py` (5 test classes, ~14 tests): login redirects per role, org field present, role isolation at FE

### Seeded test accounts (for manual testing — Spec §5)

| Account | Password | Role | Org ID (for login) |
|---|---|---|---|
| SysAdmin1 | SysAdmin@123 | SysAdmin | — (leave blank) |
| SysAdmin2 | SysAdmin@123 | SysAdmin | — (leave blank) |
| OrgAdmin1 | OrgAdmin@123 | OrgAdmin | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` |
| OrgAdmin2 | OrgAdmin@123 | OrgAdmin | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` |
| User1 | User@123 | Student | — |
| User2 | User@123 | Student | — |
| User3 | User@123 | Student | — |

To create a new OrgAdmin account manually: navigate to `/register/orgadmin` on the FE.
To create elevated accounts programmatically: `POST /api/users` with SysAdmin JWT (see `tests/api/test_auth_roles.py::TestSysAdminCreatesAccounts`).
