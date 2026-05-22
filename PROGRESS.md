# Progress

**Current phase:** Wave 1 + Wave 2 COMPLETE — all tests green
**Branch:** K-B
**Next action:** SSO full OAuth flow (blocked — needs Google/Microsoft OAuth app credentials from dev). All other Wave 1, Wave 2, NFR, and i18n items are done.

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
