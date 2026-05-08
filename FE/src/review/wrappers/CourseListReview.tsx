import React from 'react'
import { Link } from 'react-router-dom'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'
import { CourseList } from '@/hooks/useCourse'
import { MOCK_COURSES } from '@/review/reviewData'

const gradients = [
  'from-[#4f6cf7] via-[#dfe7ff] to-[#f7f9ff]',
  'from-[#f6b27a] via-[#fff1e6] to-[#fff9f5]',
  'from-[#7bc6ff] via-[#eaf6ff] to-[#f8fbff]',
  'from-[#9aa5ff] via-[#eef1ff] to-[#f7f8ff]',
  'from-[#6ee7b7] via-[#dcfce7] to-[#f0fdf4]',
]

const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : 'Not set')

export const CourseListReview: React.FC = () => {
  const courses: CourseList[] = MOCK_COURSES
  const featuredCourse = courses[0]

  return (
    <MainLayout
      navbar={<UserNavbar title="My Courses" />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7380a0]">Courses</p>
            <h2 className="mt-2 text-4xl font-black text-on-surface font-headline">Your Learning Path</h2>
            <p className="mt-3 max-w-2xl text-on-surface-variant">
              Continue your courses, open the detailed lesson view, and jump back into the next module.
            </p>
          </div>

          {/* Featured Card */}
          {featuredCourse && (
            <Card className="overflow-hidden border border-[#e3e8f3] p-0 shadow-[0_20px_50px_rgba(58,78,153,0.12)]">
              <div className="grid gap-0 lg:grid-cols-[1.5fr_0.9fr]">
                <div className="space-y-5 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef3ff] p-8">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#7885a6]">Featured Course</div>
                  <div>
                    <h3 className="max-w-2xl text-4xl font-black leading-[1.05] text-on-surface font-headline">
                      {featuredCourse.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
                      {featuredCourse.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/user/course/${featuredCourse.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-base font-medium text-on-primary transition hover:bg-primary/90"
                    >
                      Open Course
                    </Link>
                  </div>
                </div>

                <div className="flex items-center justify-center bg-white p-8 lg:p-10">
                  <div className="w-full max-w-[260px] rounded-[28px] border border-[#edf1f9] bg-white p-6 shadow-[0_18px_40px_rgba(57,74,150,0.08)]">
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-[#8a95af]">Course Details</div>
                    <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
                      <p><span className="font-semibold text-on-surface">Code:</span> {featuredCourse.courseCode || 'Not set'}</p>
                      <p><span className="font-semibold text-on-surface">Modules:</span> {featuredCourse.moduleCount ?? 0}</p>
                      <p><span className="font-semibold text-on-surface">Created:</span> {formatDate(featuredCourse.createdAt)}</p>
                    </div>
                    <Link
                      to={`/user/course/${featuredCourse.id}`}
                      className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary/90"
                    >
                      Open Course
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Courses Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => (
              <Card key={course.id} className="overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl">
                <div className={`mb-4 h-40 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center`}>
                  <div className="rounded-3xl bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                    <MaterialIcon icon="school" className="text-4xl text-[#4f6cf7]" />
                  </div>
                </div>

                <h3 className="mb-1 text-lg font-bold text-on-surface">{course.title}</h3>
                <p className="mb-4 text-sm text-on-surface-variant">
                  {course.description || 'No description available.'}
                </p>

                <div className="mb-4 space-y-2 text-xs text-on-surface-variant">
                  <div><span className="font-semibold text-on-surface">Code:</span> {course.courseCode || 'Not set'}</div>
                  <div><span className="font-semibold text-on-surface">Modules:</span> {course.moduleCount ?? 0}</div>
                  <div><span className="font-semibold text-on-surface">Created:</span> {formatDate(course.createdAt)}</div>
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                  <span className="text-xs text-on-surface-variant">Course</span>
                  <Link
                    to={`/user/course/${course.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary/90"
                  >
                    Continue
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
