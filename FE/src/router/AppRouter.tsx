import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { OrgLayout } from '@layouts/OrgLayout'
import {
  LoginPage,
  RegisterPage,
  RegisterOrgAdminPage,
  ResetPasswordPage,
  TwoFactorPage,
  ForgotPasswordPage,
  HomePage
} from '@pages/auth'
import {
  CourseListPage,
  UserDashboardPage,
  UserAnalyticsDashboardPage,
  UserProfilePage,
  UserHomePageLightPage,
  UserLearningDashboardPage,
  DocumentViewerPage,
  InteractiveFlashcardsPage,
  LearningHistoryPage,
  OrganizationListPage,
  SpecificCoursePage,
  UserContentLibraryPage,
  UserQuizInterfacePage,
  VideoLessonPage,
  QuizCreatePage,
  DeckEditorPage,
  VideoCreatePage,
  VideoWatchPage,
  CollectionsPage,
  BrowsePublicPage,
  GlobalSearchPage,
} from '@pages/user'
import {
  OrgAdminDashboardPage,
  MemberManagementPage,
  CourseManagementPage,
  CourseEditorCurriculumTabPage,
  CourseEditorMemberRolesTabPage,
  SystemadminOrganizationDirectoryPage,
  UnifiedSettingsOrganizationsPage,
} from '@pages/orgadmin'
import GuestHomePage from '@pages/public/GuestHomePage'
import {
  SysAdminDashboardPage,
  GlobalContentCoursesPage,
  GlobalUserManagementPage,
  OrganizationDirectoryPage,
  OrgDetailsSystemadminPage,
  PlatformSettingsLogsPage,
  SystemadminOrganizationDirectoryAltPage,
  UserDetailsSystemadminPage,
  AiKeysPage,
} from '@pages/sysadmin'
import { NotificationPage } from '@pages/notification'

const loadingPage = (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
      <p className="text-gray-500">Loading...</p>
    </div>
  </div>
)

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={loadingPage}>
        <Routes>
          <Route path="/" element={<GuestHomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/orgadmin" element={<RegisterOrgAdminPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/2fa" element={<TwoFactorPage />} />

          {/* ── User Routes (any authenticated user) ──────────── */}
          <Route path="/user/home" element={
            <ProtectedRoute roles={['Student', 'Teacher', 'OrgAdmin', 'SysAdmin']}>
              <UserHomePageLightPage />
            </ProtectedRoute>
          } />
          <Route path="/user/dashboard" element={
            <ProtectedRoute>
              <UserAnalyticsDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/user/dashboard-legacy" element={
            <ProtectedRoute><UserDashboardPage /></ProtectedRoute>
          } />
          <Route path="/user/courses" element={
            <ProtectedRoute><CourseListPage /></ProtectedRoute>
          } />
          <Route path="/user/profile" element={
            <ProtectedRoute><UserProfilePage /></ProtectedRoute>
          } />
          <Route path="/user/settings" element={
            <ProtectedRoute><UserProfilePage /></ProtectedRoute>
          } />
          <Route path="/user/learning" element={
            <ProtectedRoute><LearningHistoryPage /></ProtectedRoute>
          } />
          <Route path="/user/library" element={
            <ProtectedRoute><UserContentLibraryPage /></ProtectedRoute>
          } />
          <Route path="/user/quizzes/new" element={
            <ProtectedRoute><QuizCreatePage /></ProtectedRoute>
          } />
          <Route path="/user/decks/new" element={
            <ProtectedRoute><DeckEditorPage /></ProtectedRoute>
          } />
          <Route path="/user/decks/:deckId/edit" element={
            <ProtectedRoute><DeckEditorPage /></ProtectedRoute>
          } />
          <Route path="/user/videos/new" element={
            <ProtectedRoute><VideoCreatePage /></ProtectedRoute>
          } />
          <Route path="/user/videos/watch/:videoId" element={
            <ProtectedRoute><VideoWatchPage /></ProtectedRoute>
          } />
          <Route path="/user/quiz" element={
            <ProtectedRoute><UserQuizInterfacePage /></ProtectedRoute>
          } />
          <Route path="/user/lesson" element={
            <ProtectedRoute><VideoLessonPage /></ProtectedRoute>
          } />
          <Route path="/user/flashcards" element={
            <ProtectedRoute><InteractiveFlashcardsPage /></ProtectedRoute>
          } />
          <Route path="/user/documents" element={
            <ProtectedRoute><DocumentViewerPage /></ProtectedRoute>
          } />
          <Route path="/user/messages" element={
            <ProtectedRoute><NotificationPage /></ProtectedRoute>
          } />
          <Route path="/user/organizations" element={
            <ProtectedRoute><OrganizationListPage /></ProtectedRoute>
          } />
          <Route path="/user/collections" element={
            <ProtectedRoute><CollectionsPage /></ProtectedRoute>
          } />
          <Route path="/user/search" element={
            <ProtectedRoute><GlobalSearchPage /></ProtectedRoute>
          } />
          <Route path="/user/browse" element={
            <ProtectedRoute><BrowsePublicPage /></ProtectedRoute>
          } />
          <Route path="/user/course/:courseId" element={
            <ProtectedRoute><SpecificCoursePage /></ProtectedRoute>
          } />

          {/* ── OrgAdmin Routes (OrgAdmin, Teacher, SysAdmin) ─── */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
              <OrgAdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/courses" element={
            <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
              <CourseManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/members" element={
            <ProtectedRoute roles={['OrgAdmin', 'SysAdmin']}>
              <MemberManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
              <OrgAdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/editor" element={
            <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
              <CourseEditorCurriculumTabPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/editor/curriculum" element={
            <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
              <CourseEditorCurriculumTabPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/editor/member-roles" element={
            <ProtectedRoute roles={['OrgAdmin', 'SysAdmin']}>
              <CourseEditorMemberRolesTabPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute roles={['OrgAdmin', 'SysAdmin']}>
              <UnifiedSettingsOrganizationsPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/system-organization-directory-light-1" element={
            <ProtectedRoute roles={['OrgAdmin', 'SysAdmin']}>
              <SystemadminOrganizationDirectoryPage />
            </ProtectedRoute>
          } />

          {/* ── SysAdmin Routes (SysAdmin only) ───────────────── */}
          <Route path="/sysadmin/overview" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <SysAdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/dashboard" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <SysAdminDashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/users" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <GlobalUserManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/orgs" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <OrganizationDirectoryPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/courses" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <GlobalContentCoursesPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/logs" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <PlatformSettingsLogsPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/settings" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <PlatformSettingsLogsPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/ai-keys" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <AiKeysPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/org-details" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <OrgDetailsSystemadminPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/orgs-light-2" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <SystemadminOrganizationDirectoryAltPage />
            </ProtectedRoute>
          } />
          <Route path="/sysadmin/user-details" element={
            <ProtectedRoute roles={['SysAdmin']}>
              <UserDetailsSystemadminPage />
            </ProtectedRoute>
          } />

          {/* ── Global Routes ─────────────────────────────────── */}
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationPage /></ProtectedRoute>
          } />
          <Route path="/help" element={<NotificationPage />} />

          {/* ── FE Mirror Routes (design system) ──────────────── */}
          <Route path="/fe/auth/futuristic_2fa_otp_verification" element={<TwoFactorPage />} />
          <Route path="/fe/auth/futuristic_forgot_password_screen" element={<ForgotPasswordPage />} />
          <Route path="/fe/auth/futuristic_reset_password_screen" element={<ResetPasswordPage />} />
          <Route path="/fe/auth/futuristic_user_registration_screen" element={<RegisterPage />} />
          <Route path="/fe/auth/guest_homepage_light_mode" element={<HomePage />} />
          <Route path="/fe/auth/user_login_light_mode" element={<LoginPage />} />
          <Route path="/fe/user/course_list_light" element={<CourseListPage />} />
          <Route path="/fe/user/document_viewer_light" element={<DocumentViewerPage />} />
          <Route path="/fe/user/interactive_flashcards_light" element={<InteractiveFlashcardsPage />} />
          <Route path="/fe/user/learning_history_light" element={<LearningHistoryPage />} />
          <Route path="/fe/user/organization_list_light" element={<OrganizationListPage />} />
          <Route path="/fe/user/specific_course_page_light" element={<SpecificCoursePage />} />
          <Route path="/fe/user/user_content_library_light" element={<UserContentLibraryPage />} />
          <Route path="/fe/user/user_home_page_light" element={<UserHomePageLightPage />} />
          <Route path="/fe/user/user_learning_dashboard_light" element={<UserLearningDashboardPage />} />
          <Route path="/fe/user/user_profile_settings_light" element={<UserProfilePage />} />
          <Route path="/fe/user/user_quiz_interface_light" element={<UserQuizInterfacePage />} />
          <Route path="/fe/user/video_lesson_light" element={<VideoLessonPage />} />
          <Route path="/fe/orgadmin/course_editor_curriculum_tab" element={<CourseEditorCurriculumTabPage />} />
          <Route path="/fe/orgadmin/course_editor_member_roles_tab" element={<CourseEditorMemberRolesTabPage />} />
          <Route path="/fe/orgadmin/course_management" element={<CourseManagementPage />} />
          <Route path="/fe/orgadmin/member_management" element={<MemberManagementPage />} />
          <Route path="/fe/orgadmin/orgadmin_dashboard_reports" element={<OrgAdminDashboardPage />} />
          <Route path="/fe/orgadmin/systemadmin_organization_directory_light_1" element={<SystemadminOrganizationDirectoryPage />} />
          <Route path="/fe/orgadmin/unified_settings_organizations" element={<UnifiedSettingsOrganizationsPage />} />
          <Route path="/fe/sysadmin/global_content_courses" element={<GlobalContentCoursesPage />} />
          <Route path="/fe/sysadmin/global_user_management" element={<GlobalUserManagementPage />} />
          <Route path="/fe/sysadmin/organization_directory" element={<OrganizationDirectoryPage />} />
          <Route path="/fe/sysadmin/org_details_systemadmin" element={<OrgDetailsSystemadminPage />} />
          <Route path="/fe/sysadmin/platform_settings_logs" element={<PlatformSettingsLogsPage />} />
          <Route path="/fe/sysadmin/systemadmin_dashboard_overview" element={<SysAdminDashboardPage />} />
          <Route path="/fe/sysadmin/systemadmin_organization_directory_light_2" element={<SystemadminOrganizationDirectoryAltPage />} />
          <Route path="/fe/sysadmin/user_details_systemadmin" element={<UserDetailsSystemadminPage />} />
          <Route path="/fe/notification/system_notifications_success_error_states" element={<NotificationPage />} />

          {/* ── Org-scoped Routes /org/:slug/ ──────────────────── */}
          <Route path="/org/:slug" element={
            <ProtectedRoute>
              <OrgLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<UserHomePageLightPage />} />
            <Route path="courses" element={<CourseListPage />} />
            <Route path="course/:courseId" element={<SpecificCoursePage />} />
            <Route path="quiz" element={<UserQuizInterfacePage />} />
            <Route path="admin/courses" element={
              <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
                <CourseManagementPage />
              </ProtectedRoute>
            } />
            <Route path="admin/editor/curriculum" element={
              <ProtectedRoute roles={['OrgAdmin', 'Teacher', 'SysAdmin']}>
                <CourseEditorCurriculumTabPage />
              </ProtectedRoute>
            } />
            <Route path="admin/members" element={
              <ProtectedRoute roles={['OrgAdmin', 'SysAdmin']}>
                <MemberManagementPage />
              </ProtectedRoute>
            } />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

      </Suspense>
    </Router>
  )
}

