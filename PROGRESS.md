# Progress

**Current phase:** Wave 1 complete → All TS errors fixed, UX gaps closed
**Branch:** K-B
**Next action:** Run full test suite against live stack (`cd tests && python run_tests.py`), then verify DEMO_FLOWS.md end-to-end manually.

## Session 2026-05-22 (round 3) — UX gaps + TS clean-up

### Completed this round:

1. **Quiz create page** — AI tab: "PDF · TXT · max 10 MB" badge + "From My Library" tab (loads user docs, downloads blob, feeds into AI generation)
2. **UserLookupController** — `GET /api/users/lookup` accessible to OrgAdmin + SysAdmin; gateway auto-routes via existing `/api/users/{**remainder}` pattern
3. **MemberManagementPage** — "Add Member" expandable panel: search system users → select → role picker → POST `/orgs/{orgId}/members`
4. **CourseEditorMemberRolesTabPage** — org member search dropdown replaces UUID-entry for enrollment
5. **ContentRepository** — `LinkExistingAsync`: creates only ModuleContent join row (no new ContentModel); `ContentsController` exposes `POST .../contents/link`; `useModuleContent.linkContent()` hook wired
6. **CourseEditorCurriculumTabPage** — "From Library" mode: picks content type → loads user resources → calls `linkContent` on click
7. **SysAdminFeConvertedPages** — removed dummy data from UserDetails + Logs pages; UserDetails now loads real user by `?userId=` param with role-change action; Logs page shows "not implemented" placeholder
8. **All pre-existing TypeScript errors cleared** — zero compiler errors after fixing Navbar, useCourse, UserAnalyticsDashboardPage (MUI v9 Grid/Stack shims), UserFeConvertedPages (dead code removal)

## Remaining items

- [ ] SSO (Google + Microsoft OAuth2): blocked — requires OAuth app credentials from dev
- [ ] i18n: apply consistently across all pages (currently mixed vi/en)
- [ ] Run DEMO_FLOWS.md end-to-end against live stack to verify all 19 flows

## Open questions for dev

- SSO: do you have Google/Microsoft OAuth app credentials to configure? Without them, the SSO buttons are stubs only.
- Do you want the download/share/save toolbar restored in the Document Viewer? (was commented out — code removed in this session)

## Recently completed (last 5)
- 2026-05-22 — All TypeScript errors cleared (0 errors in `npx tsc --noEmit`)
- 2026-05-22 — SysAdmin: dummy data removed from UserDetails + Logs pages
- 2026-05-22 — Course content link-from-library: BE LinkExistingAsync + FE library picker
- 2026-05-22 — OrgAdmin member add: UserLookupController + MemberManagementPage search+add
- 2026-05-22 — AI quiz: PDF/TXT badge + "From My Library" document picker
