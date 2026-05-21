# Progress

**Current phase:** Wave 2 — COMPLETE & GREEN
**Branch:** K-B
**Next action:** All Wave 1 + Wave 2 boxes are [x]. Project is DONE. Consider opening PRs.

## Wave 2 — OrgAdmin — all 7 boxes [x]

- [x] Course CRUD scoped to org (Spec 4.2) — 6 API tests green
- [x] Add/remove org users to courses (Spec 4.2) — 5 API tests green
- [x] Teacher/Student role assignment per course (Spec 4.2) — covered in enrollment tests
- [x] Org analytics (Spec 1 OrgAdmin) — 4 API tests green; gateway + scope invariant enforced
- [x] Implicit Teacher privileges in every org course (Spec 1 OrgAdmin) — 2 API tests green
- [x] Course Module CRUD by Teacher / OrgAdmin (Spec 3) — 4 API tests green
- [x] 4 browser E2E workflows (login, course create, module add, enrollment) — all PASSED

## Wave 2 bugs discovered and fixed

1. **Org creation requires `slug` field** — tests updated to include slug
2. **Gateway `analyticsOrgMembersRoute` missing** — `/api/analytics/orgs/{id}/members` routed to Organization.Api
3. **AnalyticsController spec §1 invariant 7 gap** — `GetOrgOverview` didn't validate orgId vs JWT org_id; added `IOrgContextService` guard
4. **OrgContextService missing X-Org-Id header fallback** — FE sends `X-Org-Id` from localStorage; added as 3rd fallback in `GetCurrentOrgId()`
5. **FE useCourse.fetchCourses wrong paginated response shape** — BE returns flat `PaginatedResponse<T>` but hook did `response.data.data`; fixed to `response.data` directly

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
| **Total** | **187** | **ALL PASS** |

## Open questions for dev
None.
