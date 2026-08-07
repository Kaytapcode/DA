import React, { useEffect, useState } from 'react'
import { apiClient } from '@/utils/apiClient'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'

interface StudentRow {
  userId: string
  username: string
  progressPercentage: number
  lastActive: string | null
}
interface CourseAnalytics {
  courseId: string
  totalStudents: number
  averageProgress: number
  studentsCompleted: number
  studentProgress: StudentRow[]
}

/**
 * Teacher "Student Progress Tracking" dashboard for a course.
 * Reads GET /api/courses/{courseId}/progress/analytics (gated by CanTeachAsync — Teacher/OrgAdmin/
 * SysAdmin). Shows per-student completion %, last activity, and roll-up stats. No hardcoded data.
 */
export const TeacherProgressPanel: React.FC<{ courseId: string; isVi?: boolean }> = ({ courseId, isVi = false }) => {
  const [data, setData] = useState<CourseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    apiClient
      .get<CourseAnalytics>(`/courses/${courseId}/progress/analytics`)
      .then((res) => { if (!cancelled) { if (res.success && res.data) setData(res.data); else throw new Error(res.message || 'Failed to load') } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load progress') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [courseId])

  const t = (vi: string, en: string) => (isVi ? vi : en)

  return (
    <Card className="p-6" data-testid="teacher-progress-panel">
      <div className="mb-4 flex items-center gap-2">
        <MaterialIcon icon="insights" className="text-primary" />
        <h3 className="text-lg font-bold text-on-surface">{t('Tiến độ học viên', 'Student Progress')}</h3>
      </div>

      {loading && (
        <div className="flex justify-center py-6"><div className="h-7 w-7 animate-spin rounded-full border-b-2 border-primary" /></div>
      )}
      {error && !loading && <p className="text-sm text-error" data-testid="teacher-progress-error">{error}</p>}

      {!loading && !error && data && (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-surface-container-low p-3 text-center">
              <div className="text-2xl font-black text-on-surface" data-testid="tp-total-students">{data.totalStudents}</div>
              <div className="text-xs text-on-surface-variant">{t('Học viên', 'Students')}</div>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3 text-center">
              <div className="text-2xl font-black text-on-surface" data-testid="tp-avg-progress">{Math.round(data.averageProgress)}%</div>
              <div className="text-xs text-on-surface-variant">{t('Tiến độ TB', 'Avg progress')}</div>
            </div>
            <div className="rounded-lg bg-surface-container-low p-3 text-center">
              <div className="text-2xl font-black text-on-surface" data-testid="tp-completed">{data.studentsCompleted}</div>
              <div className="text-xs text-on-surface-variant">{t('Hoàn thành', 'Completed')}</div>
            </div>
          </div>

          {data.studentProgress.length === 0 ? (
            <p className="py-4 text-center text-sm text-on-surface-variant" data-testid="tp-empty">
              {t('Chưa có hoạt động học viên nào.', 'No student activity yet.')}
            </p>
          ) : (
            <div className="space-y-2" data-testid="tp-student-list">
              {data.studentProgress.map((s) => (
                <div key={s.userId} data-testid={`tp-student-${s.userId}`} className="flex items-center gap-3 rounded-lg bg-surface-container-low p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <MaterialIcon icon="person" size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-on-surface">{s.username || s.userId}</div>
                    <div className="text-xs text-on-surface-variant">
                      {s.lastActive ? `${t('Hoạt động', 'Last active')}: ${new Date(s.lastActive).toLocaleDateString()}` : t('Chưa hoạt động', 'No activity')}
                    </div>
                  </div>
                  <div className="w-28">
                    <div className="h-2 rounded-full bg-[#e5eaf6]">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${s.progressPercentage}%` }} />
                    </div>
                  </div>
                  <Badge variant={s.progressPercentage >= 100 ? 'success' : 'primary'} size="sm">{s.progressPercentage}%</Badge>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
