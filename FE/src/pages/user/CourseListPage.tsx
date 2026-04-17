import React from 'react'
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
}

/**
 * User Course List Page
 */
export const CourseListPage: React.FC = () => {
  const courses: Course[] = [
    { id: '1', title: 'Advanced React Patterns', instructor: 'Dr. Smith', progress: 65, students: 1200 },
    { id: '2', title: 'TypeScript Masterclass', instructor: 'Prof. Johnson', progress: 45, students: 950 },
    { id: '3', title: 'Web Performance Optimization', instructor: 'Dr. Williams', progress: 80, students: 800 },
  ]

  return (
    <MainLayout
      navbar={<UserNavbar title="My Courses" />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-on-surface mb-2 font-headline">Your Learning Path</h2>
            <p className="text-on-surface-variant">Continue your courses and explore new subjects</p>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            <Button variant="primary">All Courses</Button>
            <Button variant="secondary">In Progress</Button>
            <Button variant="secondary">Completed</Button>
            <Button variant="secondary">Wishlist</Button>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                {/* Placeholder thumbnail */}
                <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-surface-tint/20 rounded-lg mb-4 flex items-center justify-center">
                  <MaterialIcon icon="school" className="text-4xl text-primary/50" />
                </div>
                
                <h3 className="text-lg font-bold text-on-surface mb-1">{course.title}</h3>
                <p className="text-sm text-on-surface-variant mb-4">{course.instructor}</p>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-on-surface-variant">Progress</span>
                    <span className="text-xs font-bold text-on-surface">{course.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                  <span className="text-xs text-on-surface-variant">{course.students} students</span>
                  <Button size="sm">Continue</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
