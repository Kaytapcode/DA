import React from 'react'
import { Link } from 'react-router-dom'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { MainLayout } from '@layouts/MainLayout'

interface Course {
  id: string
  title: string
  instructor: string
  progress: number
  students: number
  thumbnail?: string
  slug: string
  theme: string
}

/**
 * User Course List Page
 */
export const CourseListPage: React.FC = () => {
  const courses: Course[] = [
    {
      id: '1',
      title: 'Advanced Quantum Mechanics',
      instructor: 'Dr. Sarah Chen',
      progress: 45,
      students: 1200,
      slug: 'advanced-quantum-mechanics',
      theme: 'from-[#4f6cf7] via-[#dfe7ff] to-[#f7f9ff]',
    },
    {
      id: '2',
      title: 'Quantum Field Foundations',
      instructor: 'Prof. Marcus V.',
      progress: 65,
      students: 950,
      slug: 'quantum-field-foundations',
      theme: 'from-[#f6b27a] via-[#fff1e6] to-[#fff9f5]',
    },
    {
      id: '3',
      title: 'Subatomic Simulation Lab',
      instructor: 'Dr. Linh Tran',
      progress: 80,
      students: 800,
      slug: 'subatomic-simulation-lab',
      theme: 'from-[#7bc6ff] via-[#eaf6ff] to-[#f8fbff]',
    },
  ]

  return (
    <MainLayout
      navbar={<UserNavbar title="My Courses" />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7380a0]">Courses</p>
            <h2 className="mt-2 text-4xl font-black text-on-surface font-headline">Your Learning Path</h2>
            <p className="mt-3 max-w-2xl text-on-surface-variant">
              Continue your courses, open the detailed lesson view, and jump back into the next module.
            </p>
          </div>

          {/* Featured Card */}
          <Card className="overflow-hidden border border-[#e3e8f3] p-0 shadow-[0_20px_50px_rgba(58,78,153,0.12)]">
            <div className="grid gap-0 lg:grid-cols-[1.5fr_0.9fr]">
              <div className="space-y-5 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef3ff] p-8">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#7885a6]">Featured Course</div>
                <div>
                  <h3 className="max-w-2xl text-4xl font-black leading-[1.05] text-on-surface font-headline">
                    Advanced <span className="text-[#4f6cf7]">Quantum Mechanics</span>
                  </h3>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">
                    Deep dive into wave-particle duality, Schrödinger&apos;s equation, and the mathematical foundations of subatomic phenomena.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Continue Learning</Button>
                  <Link
                    to="/user/course/advanced-quantum-mechanics"
                    className="inline-flex items-center justify-center rounded-lg border border-[#d6def0] bg-white px-6 py-2.5 text-base font-medium text-on-surface transition hover:bg-[#f6f8ff]"
                  >
                    Open Course
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-center bg-white p-8 lg:p-10">
                <div className="w-full max-w-[260px] rounded-[28px] border border-[#edf1f9] bg-white p-6 shadow-[0_18px_40px_rgba(57,74,150,0.08)]">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-[#8a95af]">Current Progress</div>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-4xl font-black text-on-surface">45%</div>
                      <p className="mt-1 text-sm text-on-surface-variant">8 / 18 units completed</p>
                    </div>
                    <div className="rounded-2xl bg-[#eef2ff] px-3 py-2 text-center text-xs font-bold text-[#4f6cf7]">
                      8 / 18
                      <br />
                      Units
                    </div>
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-[#e5eaf6]">
                    <div className="h-2 w-[45%] rounded-full bg-[#4f6cf7]" />
                  </div>
                  <Button className="mt-6 w-full justify-center" size="md">
                    Continue Learning
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button variant="primary">All Courses</Button>
            <Button variant="secondary">In Progress</Button>
            <Button variant="secondary">Completed</Button>
            <Button variant="secondary">Wishlist</Button>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map(course => (
              <Card key={course.id} className="overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl">
                <div className={`mb-4 h-40 rounded-xl bg-gradient-to-br ${course.theme} flex items-center justify-center`}>
                  <div className="rounded-3xl bg-white/75 p-4 shadow-sm backdrop-blur-sm">
                    <MaterialIcon icon="school" className="text-4xl text-[#4f6cf7]" />
                  </div>
                </div>
                
                <h3 className="mb-1 text-lg font-bold text-on-surface">{course.title}</h3>
                <p className="mb-4 text-sm text-on-surface-variant">{course.instructor}</p>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-on-surface-variant">Progress</span>
                    <span className="text-xs font-bold text-on-surface">{course.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-low">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                  <span className="text-xs text-on-surface-variant">{course.students} students</span>
                  <Link
                    to={`/user/course/${course.slug}`}
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
