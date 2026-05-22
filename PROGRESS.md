# Progress

**Current phase:** Wave 1 + Wave 2 COMPLETE — all tests green
**Branch:** K-B
**Next action:** Run `python run_tests.py` for the combined 4-suite report; then optionally do final manual DEMO_FLOWS.md walkthrough.

## Final test results (2026-05-23)

| Suite | Pass | Fail |
|---|---|---|
| API (`tests/api/`) | 90 | 0 |
| UI (`tests/ui/`) | 37 | 0 |
| Katalon (`tests/katalon/`) | 274 | 0 |
| **Total** | **401** | **0** |

All Wave 1 (User + SysAdmin) and Wave 2 (OrgAdmin) checklist items are green.

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
- [ ] i18n: apply consistently across all pages

## Open questions for dev

- SSO: do you have Google/Microsoft OAuth app credentials to configure?
- Do you want the download/share/save toolbar restored in the Document Viewer?

## Recently completed (last 5)
- 2026-05-23 — 274/274 katalon + 90/90 API + 37/37 UI — all green
- 2026-05-23 — OrgContext race condition fix (org_id cleared on init)
- 2026-05-23 — SSO stub buttons restored to LoginPage
- 2026-05-23 — katalon test strict-mode and selector fixes (26 failures → 0)
- 2026-05-22 — All TypeScript errors cleared (0 errors in `npx tsc --noEmit`)
