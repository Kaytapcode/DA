import React from 'react'
import { Link } from 'react-router-dom'

interface RouteEntry {
  label: string
  path: string
}

interface Section {
  title: string
  icon: string
  routes: RouteEntry[]
}

const sections: Section[] = [
  {
    title: 'Auth',
    icon: '🔐',
    routes: [
      { label: 'Login', path: '/login_review' },
      { label: 'Register', path: '/register_review' },
      { label: 'Forgot Password', path: '/forgot-password_review' },
      { label: 'Reset Password', path: '/reset-password_review' },
      { label: 'Two-Factor Auth', path: '/2fa_review' },
      { label: 'Guest Home', path: '/home_review' },
    ],
  },
  {
    title: 'User',
    icon: '🎓',
    routes: [
      { label: 'Home', path: '/user/home_review' },
      { label: 'Learning Dashboard', path: '/user/dashboard_review' },
      { label: 'Course List', path: '/user/courses_review' },
      { label: 'Profile & Settings', path: '/user/profile_review' },
      { label: 'Learning History', path: '/user/learning_review' },
      { label: 'Content Library', path: '/user/library_review' },
      { label: 'Quiz Interface', path: '/user/quiz_review' },
      { label: 'Video Lesson', path: '/user/lesson_review' },
      { label: 'Flashcards', path: '/user/flashcards_review' },
      { label: 'Document Viewer', path: '/user/documents_review' },
      { label: 'Messages / Notifications', path: '/user/messages_review' },
      { label: 'Lumina Quantum', path: '/user/lumina-quantum_review' },
      { label: 'Organization List', path: '/user/organizations_review' },
      { label: 'Specific Course', path: '/user/course_review' },
    ],
  },
  {
    title: 'Org Admin',
    icon: '🏫',
    routes: [
      { label: 'Dashboard', path: '/admin/dashboard_review' },
      { label: 'Reports', path: '/admin/reports_review' },
      { label: 'Course Management', path: '/admin/courses_review' },
      { label: 'Member Management', path: '/admin/members_review' },
      { label: 'Course Editor — Curriculum', path: '/admin/editor/curriculum_review' },
      { label: 'Course Editor — Member Roles', path: '/admin/editor/member-roles_review' },
      { label: 'Organization Directory', path: '/admin/system-org-directory_review' },
      { label: 'Settings', path: '/admin/settings_review' },
    ],
  },
  {
    title: 'Sys Admin',
    icon: '⚙️',
    routes: [
      { label: 'Overview', path: '/sysadmin/overview_review' },
      { label: 'Dashboard', path: '/sysadmin/dashboard_review' },
      { label: 'Global User Management', path: '/sysadmin/users_review' },
      { label: 'Organization Directory', path: '/sysadmin/orgs_review' },
      { label: 'Global Courses', path: '/sysadmin/courses_review' },
      { label: 'Platform Logs', path: '/sysadmin/logs_review' },
      { label: 'Platform Settings', path: '/sysadmin/settings_review' },
      { label: 'Org Details', path: '/sysadmin/org-details_review' },
      { label: 'Org Directory (Light 2)', path: '/sysadmin/orgs-light-2_review' },
      { label: 'User Details', path: '/sysadmin/user-details_review' },
    ],
  },
  {
    title: 'Other',
    icon: '🔔',
    routes: [
      { label: 'Notifications', path: '/notifications_review' },
    ],
  },
]

export const ReviewIndex: React.FC = () => {
  const total = sections.reduce((sum, s) => sum + s.routes.length, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7380a0] mb-2">
            Design System
          </p>
          <h1 className="text-4xl font-black text-gray-900">Page Review Gallery</h1>
          <p className="mt-3 text-gray-500">
            {total} pages available for review — no login required, all using demo data.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>{section.icon}</span>
                <span>{section.title}</span>
                <span className="ml-1 text-xs font-normal text-gray-400">
                  ({section.routes.length})
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.routes.map((route) => (
                  <Link
                    key={route.path}
                    to={route.path}
                    className="group flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-400 hover:shadow-md"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 group-hover:text-blue-600 transition">
                        {route.label}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{route.path}</p>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition flex-shrink-0 ml-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-gray-400">
          Review routes are additive — production routes are unchanged.
        </p>
      </div>
    </div>
  )
}
