# Progress

**Current phase:** Wave 1 + Wave 2 complete — running automated test fix loop
**Branch:** K-B
**Next action:** Wait for katalon full suite (`b2zfjz8j1`) to complete; fix any remaining failures; then check if `run_tests.py` (combined report) shows 0 failures.

## Session 2026-05-23 — katalon test fix loop

### Completed this round:

1. **OrgContext race condition fixed** — `useEffect` was clearing `org_id` from localStorage on init when `org=null`; now only `clearOrg()` removes storage entries
2. **SSO stub buttons added to LoginPage** — Google + Microsoft stub buttons with data-testids now visible on `/login` per Spec §1
3. **CourseManagementPage** — table headers always rendered (even when 0 courses)
4. **MemberManagementPage** — table headers always rendered (even when 0 members)
5. **test_orgadmin_workflows.py** — fixed local `_ui_login_orgadmin` to wait for `/admin/**` not `/user/**`
6. **test_orgadmin_portal_fields.py** — `h2:has-text` selector for Course Management heading
7. **test_sysadmin_portal_fields.py** — `label:has-text` for Provider/API Key; search for "Test Organization 1" (actual seeded name, not "TestOrg1")
8. **test_sso_flow.py** — updated to expect SSO buttons VISIBLE (stubs present now)
9. **OrgAdmin members API** — confirmed OrgAdmin1 IS in TestOrg1 after login with org_id
10. **SysAdminFeConvertedPages** — org directory pageSize increased 100→500 to cover all seeded orgs

### API test results (2026-05-23): 90/90 pass
### UI test results (2026-05-23): 37/37 pass
### Katalon test results: running in background (b2zfjz8j1)

## Commits this session
- `8ca7bf8` — fix TypeScript handleFieldChange param type (keyof FormErrors)
- `f286ff4` — fix 26 katalon test failures (OrgContext, SSO stubs, table headers, selectors)
- `009c769` — fix TestOrg1 search (name + pageSize)

## Remaining items

- [ ] SSO (Google + Microsoft OAuth2): stubs done, full OAuth flow blocked — requires OAuth app credentials from dev
- [ ] i18n: apply consistently across all pages

## Open questions for dev

- SSO: do you have Google/Microsoft OAuth app credentials to configure?
- Do you want the download/share/save toolbar restored in the Document Viewer?

## Recently completed (last 5)
- 2026-05-23 — OrgContext race condition fix (org_id cleared on init)
- 2026-05-23 — SSO stub buttons restored to LoginPage
- 2026-05-23 — katalon test strict-mode and selector fixes (26 failures → pending recheck)
- 2026-05-22 — All TypeScript errors cleared (0 errors in `npx tsc --noEmit`)
- 2026-05-22 — SysAdmin: dummy data removed from UserDetails + Logs pages
