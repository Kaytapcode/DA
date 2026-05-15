import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { UserShell, useUserLanguage } from './UserShell'
import { useQuiz } from '@/hooks/useQuiz'
import { useFlashcard } from '@/hooks/useFlashcard'
import { useDocument } from '@/hooks/useDocument'
import { useOrganization, type OrganizationList } from '@/hooks/useOrganization'
import { useModuleContent, type ModuleItem, type ContentItem } from '@/hooks/useModuleContent'
import { apiClient } from '@/utils/apiClient'

const useLang = useUserLanguage

// UserHomePage imported from wrapper

interface DashboardHistoryEntry {
  courseId: string
  courseTitle: string | null
  moduleId: string | null
  moduleTitle: string | null
  contentId: string | null
  contentTitle: string | null
  contentType: string | null
  progressPercentage: number
  isCompleted: boolean
  activityAt: string
}

export const UserLearningDashboardPage: React.FC = () => {
  const isVi = useLang()
  const [rows, setRows] = useState<DashboardHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    apiClient
      .get<DashboardHistoryEntry[]>('/student-progress/recent?limit=50')
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) setRows(res.data)
        else throw new Error(res.message || 'Unable to load progress')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load progress')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const featured = rows[0] ?? null
  const completedItems = rows.filter((r) => r.isCompleted).length
  const distinctCourses = new Set(rows.map((r) => r.courseId)).size
  const avgProgress = rows.length === 0
    ? 0
    : Math.round(rows.reduce((sum, r) => sum + r.progressPercentage, 0) / rows.length)

  return (
    <UserShell
      titleEn="Learning Dashboard"
      titleVi="Bang dieu khien hoc tap"
      subtitleEn="Track progress and resume your courses"
      subtitleVi="Theo doi tien do va tiep tuc khoa hoc"
    >
      {error && !isLoading && <p className="mb-4 text-sm text-error">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                {isVi ? 'Hoat dong gan day' : 'Most recent activity'}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-on-surface">
                {isLoading
                  ? '…'
                  : featured?.courseTitle ?? (isVi ? 'Chua co khoa hoc nao' : 'No course activity yet')}
              </h3>
            </div>
            {featured && (
              <Badge variant="primary">{featured.progressPercentage}%</Badge>
            )}
          </div>
          {featured && (
            <p className="text-on-surface-variant">
              {featured.contentTitle ?? featured.moduleTitle ?? (isVi ? 'Tiep tuc bai hoc tiep theo.' : 'Continue with the next item.')}
            </p>
          )}
          <div className="mt-5 h-2 rounded-full bg-surface-container-low">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${featured?.progressPercentage ?? 0}%` }}
            />
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              to={featured ? `/user/course/${featured.courseId}` : '/user/courses'}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary"
            >
              {isVi ? 'Mo khoa hoc' : 'Open Course'}
            </Link>
            <Link
              to="/user/learning"
              className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-medium text-on-surface"
            >
              {isVi ? 'Xem lich su' : 'View History'}
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-on-surface">{isVi ? 'Chi so nhanh' : 'Quick stats'}</h3>
          <div className="space-y-4">
            {[
              { label: isVi ? 'Hoan thanh' : 'Completed items', value: isLoading ? '…' : `${completedItems}` },
              { label: isVi ? 'Khoa hoc' : 'Courses touched', value: isLoading ? '…' : `${distinctCourses}` },
              { label: isVi ? 'Tien do trung binh' : 'Avg. progress', value: isLoading ? '…' : `${avgProgress}%` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-3">
                <span className="text-sm text-on-surface-variant">{item.label}</span>
                <span className="font-semibold text-on-surface">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </UserShell>
  )
}

export const DocumentViewerPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const documentId = searchParams.get('docId')
  const courseId = searchParams.get('courseId')
  const {
    documents,
    selectedDocument,
    currentPage,
    totalPages,
    isLoading,
    error,
    selectDocument,
    nextPage,
    previousPage,
  } = useDocument(documentId, courseId)

  React.useEffect(() => {
    if (documentId || documents.length === 0) return
    const firstDocumentId = documents[0].id
    void selectDocument(firstDocumentId)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('docId', firstDocumentId)
      return next
    })
  }, [documentId, documents, selectDocument, setSearchParams])

  const openDocument = (id: string) => {
    void selectDocument(id)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('docId', id)
      return next
    })
  }

  const documentType = selectedDocument?.fileType || ''
  const documentUrl = selectedDocument?.fileUrl || selectedDocument?.filePath

  const renderDocumentPreview = () => {
    if (!selectedDocument) {
      return (
        <div className="text-center text-on-surface-variant">
          <MaterialIcon icon="menu_book" className="mb-3 text-5xl" />
          <p>{isVi ? 'Chon mot tai lieu de xem' : 'Select a document to preview'}</p>
        </div>
      )
    }

    if (documentType.includes('pdf') && documentUrl) {
      return (
        <iframe
          title={selectedDocument.fileName}
          src={`${documentUrl}#page=${currentPage}`}
          className="h-full w-full rounded-xl border border-outline-variant bg-white"
        />
      )
    }

    if ((documentType.includes('image') || /\.(png|jpe?g)$/i.test(selectedDocument.fileName)) && documentUrl) {
      return <img src={documentUrl} alt={selectedDocument.fileName} className="max-h-full max-w-full rounded-xl object-contain" />
    }

    if ((documentType.includes('text') || /\.txt$/i.test(selectedDocument.fileName)) && selectedDocument.contentText) {
      return (
        <pre className="h-full w-full overflow-auto rounded-xl bg-white p-4 text-left text-sm text-on-surface">
          {selectedDocument.contentText}
        </pre>
      )
    }

    if (documentUrl) {
      return (
        <a href={documentUrl} target="_blank" rel="noreferrer" className="text-primary underline">
          {isVi ? 'Mo tai lieu trong tab moi' : 'Open document in a new tab'}
        </a>
      )
    }

    return <p className="text-on-surface-variant">{isVi ? 'Khong the hien thi tai lieu nay.' : 'Preview is unavailable for this file.'}</p>
  }

  return (
    <UserShell
      titleEn="Document Viewer"
      titleVi="Trinh xem tai lieu"
      subtitleEn="Open and review course documents"
      subtitleVi="Mo va xem lai tai lieu khoa hoc"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-on-surface">{isVi ? 'Danh sach tai lieu' : 'Documents'}</h3>
          <div className="space-y-3">
            {documents.map((document) => (
              <button
                key={document.id}
                onClick={() => openDocument(document.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selectedDocument?.id === document.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant hover:bg-surface-container-low'
                }`}
              >
                <MaterialIcon icon="description" className="text-primary" />
                <span className="text-sm text-on-surface">{document.fileName}</span>
              </button>
            ))}
            {!isLoading && documents.length === 0 && (
              <p className="text-sm text-on-surface-variant">{isVi ? 'Chua co tai lieu nao.' : 'No documents available.'}</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-bold text-on-surface">{selectedDocument?.fileName || (isVi ? 'Xem truoc' : 'Preview')}</h4>
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <Button size="sm" variant="secondary" onClick={previousPage} disabled={currentPage <= 1 || isLoading}>
                <MaterialIcon icon="chevron_left" size="xs" />
              </Button>
              <span>{isVi ? `Trang ${currentPage} / ${totalPages}` : `Page ${currentPage} of ${totalPages}`}</span>
              <Button size="sm" variant="secondary" onClick={nextPage} disabled={currentPage >= totalPages || isLoading}>
                <MaterialIcon icon="chevron_right" size="xs" />
              </Button>
            </div>
          </div>
          <div className="flex h-[360px] items-center justify-center rounded-2xl bg-surface-container-low text-center text-on-surface-variant">
            {isLoading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            ) : error ? (
              <p className="text-error">{error}</p>
            ) : (
              renderDocumentPreview()
            )}
          </div>
        </Card>
      </div>
    </UserShell>
  )
}

export const InteractiveFlashcardsPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const deckId = searchParams.get('deckId')
  const {
    currentCard,
    currentIndex,
    totalCards,
    isFlipped,
    shuffleMode,
    isLoading,
    isUpdating,
    error,
    toggleShuffle,
    toggleFlip,
    nextCard,
    previousCard,
    markCurrentAsMastered,
    resetMastered,
  } = useFlashcard(deckId)

  return (
    <UserShell
      titleEn="Interactive Flashcards"
      titleVi="The ghi nho tuong tac"
      subtitleEn="Practice concepts with quick cards"
      subtitleVi="Luyen tap khai niem voi bo the nhanh"
    >
      <Card className="p-10 text-center">
        {!deckId && <p className="text-sm text-on-surface-variant">{isVi ? 'Them ?deckId=... vao URL de hoc bo the.' : 'Add ?deckId=... to URL to study a deck.'}</p>}

        {isLoading && <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />}

        {error && !isLoading && <p className="text-sm text-error">{error}</p>}

        {!isLoading && !error && currentCard && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">
                {isVi ? `The ${currentIndex + 1}/${totalCards}` : `Card ${currentIndex + 1}/${totalCards}`}
              </p>
              <Button variant="ghost" size="sm" onClick={toggleShuffle}>
                <MaterialIcon icon="shuffle" size="xs" className="mr-1" />
                {shuffleMode ? (isVi ? 'Bo tron' : 'Shuffled') : (isVi ? 'Tron the' : 'Shuffle')}
              </Button>
            </div>

            <button
              type="button"
              onClick={toggleFlip}
              className="flex min-h-[220px] w-full items-center justify-center rounded-xl bg-surface-container-low p-8 text-center transition-all duration-300 hover:bg-surface-container"
              style={{ transform: `perspective(1000px) rotateY(${isFlipped ? 180 : 0}deg)` }}
            >
              <div style={{ transform: `rotateY(${isFlipped ? 180 : 0}deg)` }}>
                <h3 className="mb-2 text-2xl font-bold font-headline text-on-surface">
                  {isFlipped ? currentCard.backText : currentCard.frontText}
                </h3>
                <p className="text-sm text-on-surface-variant">{isVi ? 'Cham de lat the' : 'Tap to flip'}</p>
              </div>
            </button>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={previousCard} disabled={totalCards <= 1}>
                {isVi ? 'The truoc' : 'Previous'}
              </Button>
              <Button variant="secondary" onClick={nextCard} disabled={totalCards <= 1}>
                {isVi ? 'The tiep theo' : 'Next Card'}
              </Button>
              <Button onClick={() => void markCurrentAsMastered()} disabled={isUpdating}>
                {isVi ? 'Danh dau da nho' : 'Mark as Mastered'}
              </Button>
            </div>
          </>
        )}

        {!isLoading && !error && !currentCard && deckId && (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Khong con the nao de hoc.' : 'No cards left to study.'}</p>
            <Button variant="secondary" onClick={() => void resetMastered()} disabled={isUpdating}>
              {isVi ? 'Dat lai cac the da nho' : 'Reset mastered cards'}
            </Button>
          </div>
        )}
      </Card>
    </UserShell>
  )
}

interface LearningHistoryEntry {
  courseId: string
  courseTitle: string | null
  moduleTitle: string | null
  contentTitle: string | null
  contentType: string | null
  progressPercentage: number
  isCompleted: boolean
  activityAt: string
}

export const LearningHistoryPage: React.FC = () => {
  const isVi = useLang()
  const [rows, setRows] = useState<LearningHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    apiClient.get<LearningHistoryEntry[]>('/student-progress/recent?limit=30')
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) setRows(res.data)
        else throw new Error(res.message || 'Unable to load history')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load history')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const describe = (r: LearningHistoryEntry) => {
    const parts = [r.contentTitle ?? r.moduleTitle ?? r.courseTitle ?? '—']
    if (r.contentType) parts.push(`(${r.contentType.toLowerCase()})`)
    return parts.join(' ')
  }
  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  return (
    <UserShell
      titleEn="Learning History"
      titleVi="Lich su hoc tap"
      subtitleEn="Your timeline of completed activities"
      subtitleVi="Dong thoi gian cac hoat dong da hoan thanh"
    >
      <Card className="p-6">
        {isLoading && <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />}
        {error && !isLoading && <p className="text-sm text-error">{error}</p>}
        {!isLoading && !error && rows.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-4">
            {isVi ? 'Chua co hoat dong nao.' : 'No activity yet.'}
          </p>
        )}
        {!isLoading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="py-3 text-left text-sm font-semibold">{isVi ? 'Hoat dong' : 'Activity'}</th>
                  <th className="py-3 text-left text-sm font-semibold">{isVi ? 'Thoi gian' : 'Time'}</th>
                  <th className="py-3 text-left text-sm font-semibold">{isVi ? 'Ket qua' : 'Result'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${row.courseId}-${row.activityAt}-${idx}`} className="border-b border-outline-variant/40">
                    <td className="py-3 text-on-surface">{describe(row)}</td>
                    <td className="py-3 text-on-surface-variant">{fmtTime(row.activityAt)}</td>
                    <td className="py-3 text-on-surface-variant">
                      {row.isCompleted ? (isVi ? 'Hoan thanh' : 'Completed') : `${row.progressPercentage}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </UserShell>
  )
}

export const OrganizationListPage: React.FC = () => {
  const isVi = useLang()
  const { organizations, isLoading, error, fetchOrganizations, joinSelf } = useOrganization()
  const [pendingJoin, setPendingJoin] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void fetchOrganizations(0, 50)
  }, [fetchOrganizations])

  const handleJoin = async (org: OrganizationList) => {
    setPendingJoin(org.id)
    const ok = await joinSelf(org.id)
    if (ok) setJoinedIds((prev) => new Set(prev).add(org.id))
    setPendingJoin(null)
  }

  return (
    <UserShell
      titleEn="Organization List"
      titleVi="Danh sach to chuc"
      subtitleEn="Join and follow learning organizations"
      subtitleVi="Tham gia va theo doi cac to chuc hoc tap"
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}
      {error && !isLoading && <p className="text-sm text-error">{error}</p>}
      {!isLoading && !error && organizations.length === 0 && (
        <p className="text-sm text-on-surface-variant text-center py-4">
          {isVi ? 'Chua co to chuc nao.' : 'No organizations yet.'}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MaterialIcon icon="corporate_fare" className="text-primary" />
            </div>
            <h3 className="mb-2 font-bold text-on-surface">{org.name}</h3>
            <p className="mb-4 text-sm text-on-surface-variant">
              {isVi ? `${org.memberCount} thanh vien` : `${org.memberCount} members`}
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => void handleJoin(org)}
              disabled={pendingJoin === org.id || joinedIds.has(org.id)}
            >
              {joinedIds.has(org.id)
                ? (isVi ? 'Da tham gia' : 'Joined')
                : pendingJoin === org.id
                  ? (isVi ? 'Dang xu ly...' : 'Joining...')
                  : (isVi ? 'Tham gia' : 'Join')}
            </Button>
          </Card>
        ))}
      </div>
    </UserShell>
  )
}

interface CourseDetail {
  id: string
  title: string
  description?: string | null
  courseCode?: string | null
  status?: string | null
  createdAt: string
}

const contentIcon = (type: string): string => {
  switch (type) {
    case 'VIDEO': return 'play_circle'
    case 'QUIZ': return 'quiz'
    case 'FLASHCARD': return 'style'
    case 'PDF': return 'description'
    default: return 'article'
  }
}

const contentHref = (c: { id: string; contentType: string; quizId?: string | null; deckId?: string | null; documentId?: string | null; videoId?: string | null }) => {
  switch (c.contentType) {
    case 'QUIZ': return c.quizId ? `/user/quiz?quizId=${c.quizId}` : null
    case 'FLASHCARD': return c.deckId ? `/user/flashcards?deckId=${c.deckId}` : null
    case 'PDF': return c.documentId ? `/user/documents?docId=${c.documentId}` : null
    case 'VIDEO': return `/user/lesson?contentId=${c.id}${c.videoId ? `&videoId=${c.videoId}` : ''}`
    default: return null
  }
}

interface ItemProgressRow {
  contentId: string
  moduleId: string | null
  progressPercentage: number
  isCompleted: boolean
  updatedAt: string
}

export const SpecificCoursePage: React.FC = () => {
  const { courseId } = useParams()
  const { modules, fetchModules, isLoading: modulesLoading } = useModuleContent()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressByContent, setProgressByContent] = useState<Record<string, ItemProgressRow>>({})

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    apiClient
      .get<CourseDetail>(`/courses/${courseId}`)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) setCourse(res.data)
        else throw new Error(res.message || 'Course not found')
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Course not found') })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    void fetchModules(courseId)

    // Pull per-item progress for the current user; quietly ignore failures
    // (the spec only requires display when data is present).
    apiClient
      .get<ItemProgressRow[]>(`/courses/${courseId}/progress/items`)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          const map: Record<string, ItemProgressRow> = {}
          for (const row of res.data) map[row.contentId] = row
          setProgressByContent(map)
        }
      })
      .catch(() => { /* progress is non-essential */ })

    return () => { cancelled = true }
  }, [courseId, fetchModules])

  const totalContents = modules.reduce((sum: number, m: ModuleItem) => sum + (m.contents?.length ?? 0), 0)
  const completedContents = Object.values(progressByContent).filter((p) => p.isCompleted).length
  const overallPct = totalContents > 0 ? Math.round((completedContents * 100) / totalContents) : 0

  return (
    <UserShell
      titleEn="Specific Course"
      titleVi="Chi tiet khoa hoc"
      subtitleEn="Detailed view of a selected course"
      subtitleVi="Thong tin chi tiet cua khoa hoc duoc chon"
    >
      <div className="space-y-8">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}
        {error && !isLoading && (
          <Card className="border border-error/30 p-4">
            <p className="text-sm text-error">{error}</p>
          </Card>
        )}

        {!isLoading && course && (
          <Card className="overflow-hidden border border-[#e7ebf6] p-0 shadow-[0_20px_50px_rgba(69,84,153,0.12)]">
            <div className="grid gap-0 lg:grid-cols-[1.7fr_0.95fr]">
              <div className="space-y-6 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef3ff] p-8 lg:p-10">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#7b86a3]">
                  Courses &gt; {course.courseCode ?? course.title}
                </div>
                <div>
                  <h3 className="max-w-3xl text-[44px] font-black leading-[1.02] text-on-surface font-headline lg:text-[54px]">
                    <span className="text-[#4f6cf7]">{course.title}</span>
                  </h3>
                  {course.description && (
                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">{course.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/user/learning" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4f6cf7] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#395de8]">
                    View History
                    <MaterialIcon icon="arrow_forward" size="sm" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center bg-white p-8 lg:p-10">
                <Card className="w-full max-w-[280px] border border-[#edf1f8] p-6 shadow-[0_18px_40px_rgba(73,89,162,0.08)]">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a95af]">Course Summary</div>
                  <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    <p><span className="font-semibold text-on-surface">Status:</span> {course.status ?? 'ACTIVE'}</p>
                    <p><span className="font-semibold text-on-surface">Code:</span> {course.courseCode ?? '—'}</p>
                    <p><span className="font-semibold text-on-surface">Modules:</span> {modules.length}</p>
                    <p><span className="font-semibold text-on-surface">Items:</span> {completedContents} / {totalContents}</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[#e5eaf6]">
                    <div className="h-2 rounded-full bg-[#4f6cf7]" style={{ width: `${overallPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#4f6cf7]">{overallPct}% complete</p>
                </Card>
              </div>
            </div>
          </Card>
        )}

        {!isLoading && course && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-bold text-on-surface font-headline">Learning Path</h4>
            </div>
            {modulesLoading && (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            )}
            {!modulesLoading && modules.length === 0 && (
              <p className="text-sm text-on-surface-variant">No modules have been added to this course yet.</p>
            )}
            {!modulesLoading && modules.length > 0 && modules.map((m: ModuleItem) => (
              <Card key={m.id} className="border border-[#edf1f8] p-4 shadow-[0_10px_28px_rgba(65,79,145,0.06)]">
                <div className="mb-3">
                  <h5 className="text-lg font-bold text-on-surface">{m.title}</h5>
                  {m.description && <p className="mt-1 text-sm text-on-surface-variant">{m.description}</p>}
                </div>
                <div className="space-y-2">
                  {(m.contents ?? []).length === 0 && (
                    <p className="text-xs text-on-surface-variant">No items yet.</p>
                  )}
                  {(m.contents ?? []).map((c: ContentItem) => {
                    const href = contentHref(c)
                    const progress = progressByContent[c.id]
                    const row = (
                      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eef2ff] text-[#4f6cf7]">
                          <MaterialIcon
                            icon={progress?.isCompleted ? 'check_circle' : contentIcon(c.contentType)}
                            size="sm"
                            fill={progress?.isCompleted}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-on-surface">{c.title}</p>
                          <p className="truncate text-xs text-on-surface-variant">
                            {c.contentType} • {c.status}
                            {progress && !progress.isCompleted && ` • ${progress.progressPercentage}%`}
                          </p>
                        </div>
                        {progress?.isCompleted ? (
                          <Badge variant="success" size="sm">Completed</Badge>
                        ) : progress ? (
                          <Badge variant="primary" size="sm">In progress</Badge>
                        ) : null}
                        {href && (
                          <span className="text-xs font-semibold text-[#4f6cf7]">Open</span>
                        )}
                      </div>
                    )
                    return href ? (
                      <Link key={c.id} to={href} className="block hover:opacity-80">{row}</Link>
                    ) : (
                      <div key={c.id}>{row}</div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </UserShell>
  )
}

// UserContentLibrary exported separately

export const UserQuizInterfacePage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const quizId = searchParams.get('quizId')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const {
    questions,
    answers,
    answeredCount,
    timeLimitSeconds,
    isLoading,
    isSubmitting,
    error,
    result,
    selectAnswer,
    submitQuiz,
    quizId: activeQuizId,
  } = useQuiz(quizId)

  const currentQuestion = questions[currentQuestionIndex] ?? null
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined

  React.useEffect(() => {
    setCurrentQuestionIndex(0)
    setElapsedSeconds(0)
  }, [quizId, questions.length])

  React.useEffect(() => {
    if (questions.length === 0 || result) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [questions.length, result])

  const remainingSeconds = timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - elapsedSeconds) : null
  const canGoNext = currentQuestionIndex < questions.length - 1
  const questionsById = React.useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])

  const getOptionText = (questionId: string, optionId: string) => {
    const question = questionsById.get(questionId)
    const option = question?.options.find((item) => item.id === optionId)
    return option?.text || optionId.slice(0, 8)
  }

  return (
    <UserShell
      titleEn="Quiz Interface"
      titleVi="Giao dien bai quiz"
      subtitleEn="Answer timed questions and submit results"
      subtitleVi="Tra loi cau hoi tinh gio va nop ket qua"
    >
      <Card className="p-8">
        {!activeQuizId && !isLoading && !error && (
          <p className="text-sm text-on-surface-variant">{isVi ? 'Khong tim thay bai quiz nao de lam.' : 'No quiz available for this account yet.'}</p>
        )}

        {isLoading && <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />}

        {error && !isLoading && <p className="text-sm text-error">{error}</p>}

        {!isLoading && !error && result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <h3 className="text-xl font-bold text-on-surface">{isVi ? 'Ket qua bai quiz' : 'Quiz Results'}</h3>
              <p className="mt-1 text-on-surface-variant">
                {isVi ? 'Diem so' : 'Score'}: <span className="font-semibold text-on-surface">{result.scorePercentage}%</span> ({result.correctCount}/{result.totalCount})
              </p>
            </div>

            <div className="space-y-3">
              {result.results.map((item) => (
                <div key={item.questionId} className="rounded-lg border border-outline-variant p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-on-surface">#{item.questionId.slice(0, 8)}</p>
                    <Badge variant={item.isCorrect ? 'success' : 'warning'} size="sm">
                      {item.isCorrect ? (isVi ? 'Dung' : 'Correct') : (isVi ? 'Sai' : 'Incorrect')}
                    </Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {isVi ? 'Ban chon' : 'Selected'}: {getOptionText(item.questionId, item.selectedOptionId)} • {isVi ? 'Dap an dung' : 'Correct'}:{' '}
                    {getOptionText(item.questionId, item.correctOptionId)}
                  </p>
                  {item.explanation && <p className="mt-2 text-sm text-on-surface">{item.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !error && !result && currentQuestion && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">
                {isVi ? `Cau ${currentQuestionIndex + 1}/${questions.length}` : `Question ${currentQuestionIndex + 1}/${questions.length}`}
              </p>
              {remainingSeconds !== null && (
                <p className="text-sm font-semibold text-on-surface">
                  {isVi ? 'Con lai' : 'Time left'}: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
                </p>
              )}
            </div>

            <h3 className="mb-6 text-xl font-bold text-on-surface">{currentQuestion.questionText}</h3>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => selectAnswer(currentQuestion.id, option.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedOptionId === option.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                disabled={currentQuestionIndex === 0}
              >
                {isVi ? 'Cau truoc' : 'Previous Question'}
              </Button>

              <div className="flex gap-3">
                {canGoNext ? (
                  <Button onClick={() => setCurrentQuestionIndex((index) => Math.min(questions.length - 1, index + 1))}>
                    {isVi ? 'Cau tiep theo' : 'Next Question'}
                  </Button>
                ) : (
                  <Button onClick={() => void submitQuiz()} disabled={isSubmitting}>
                    {isSubmitting ? (isVi ? 'Dang nop...' : 'Submitting...') : (isVi ? 'Nop bai' : 'Submit Quiz')}
                  </Button>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-on-surface-variant">
              {isVi ? 'Da tra loi' : 'Answered'}: {answeredCount}/{questions.length}
            </p>
          </>
        )}
      </Card>
    </UserShell>
  )
}

export const VideoLessonPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const videoIdFromUrl = searchParams.get('videoId')
  const moduleId = searchParams.get('moduleId')
  const contentId = searchParams.get('contentId')
  const [videos, setVideos] = useState<Array<{ id: string; title?: string; description?: string; embeddableUrl: string }>>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdFromUrl)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const role = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { role?: string }
      return parsed.role || null
    } catch {
      return null
    }
  }, [])
  const canManageVideo = role === 'Teacher' || role === 'OrgAdmin' || role === 'SysAdmin'

  const selectedVideo = React.useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [selectedVideoId, videos]
  )

  const fetchVideoById = React.useCallback(
    async (id: string) => {
      const response = await apiClient.get<{ id: string; title?: string; description?: string; embeddableUrl: string }>(`/videos/${id}`)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load video')
      return response.data
    },
    []
  )

  const fetchVideos = React.useCallback(async () => {
    if (!moduleId && !videoIdFromUrl) {
      setVideos([])
      setSelectedVideoId(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      if (moduleId) {
        const response = await apiClient.get<Array<{ id: string; title?: string; description?: string; embeddableUrl: string }>>(`/videos/modules/${moduleId}`)
        if (!response.success || !response.data) throw new Error(response.message || 'Unable to load videos')
        setVideos(response.data)

        const initialVideoId = videoIdFromUrl || response.data[0]?.id || null
        setSelectedVideoId(initialVideoId)
        if (initialVideoId && initialVideoId !== videoIdFromUrl) {
          setSearchParams((current) => {
            const next = new URLSearchParams(current)
            next.set('videoId', initialVideoId)
            return next
          })
        }
      } else if (videoIdFromUrl) {
        const video = await fetchVideoById(videoIdFromUrl)
        setVideos([video])
        setSelectedVideoId(video.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load videos'
      setError(message)
      setVideos([])
      setSelectedVideoId(null)
    } finally {
      setIsLoading(false)
    }
  }, [fetchVideoById, moduleId, setSearchParams, videoIdFromUrl])

  React.useEffect(() => {
    void fetchVideos()
  }, [fetchVideos])

  const handleCreateVideo = async () => {
    if (!contentId || !youtubeUrl.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await apiClient.post<{ id: string; title?: string; description?: string; embeddableUrl: string }>('/videos', {
        contentId,
        youtubeUrl: youtubeUrl.trim(),
        title: videoTitle.trim() || null,
        description: videoDescription.trim() || null,
      })
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to create video')

      setYoutubeUrl('')
      setVideoTitle('')
      setVideoDescription('')
      await fetchVideos()
      setSelectedVideoId(response.data.id)
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('videoId', response.data!.id)
        return next
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create video'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <UserShell
      titleEn="Video Lesson"
      titleVi="Bai hoc video"
      subtitleEn="Watch lessons and track playback progress"
      subtitleVi="Xem bai giang video va theo doi tien do"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          {isLoading && <div className="mx-auto my-10 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />}

          {!isLoading && selectedVideo?.embeddableUrl && (
            <>
              <iframe
                title={selectedVideo.title || 'Video player'}
                src={selectedVideo.embeddableUrl}
                className="mb-4 h-[380px] w-full rounded-xl border border-outline-variant bg-slate-900"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <h3 className="font-bold text-on-surface">{selectedVideo.title || (isVi ? 'Bai hoc video' : 'Video lesson')}</h3>
              {selectedVideo.description && <p className="mt-2 text-sm text-on-surface-variant">{selectedVideo.description}</p>}
            </>
          )}

          {!isLoading && !selectedVideo && (
            <div className="mb-4 flex h-[380px] items-center justify-center rounded-xl bg-slate-900 text-white">
              <div className="text-center">
                <MaterialIcon icon="play_circle" className="text-6xl" />
                <p className="mt-2 text-slate-300">
                  {isVi
                    ? 'Chon video bang ?videoId=... hoac ?moduleId=...'
                    : 'Load a video with ?videoId=... or list videos with ?moduleId=...'}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-4">
          <h4 className="mb-4 font-bold text-on-surface">{isVi ? 'Danh sach video' : 'Video list'}</h4>
          {error && <p className="mb-3 text-sm text-error">{error}</p>}

          <div className="space-y-3">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => {
                  setSelectedVideoId(video.id)
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current)
                    next.set('videoId', video.id)
                    return next
                  })
                }}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                  selectedVideoId === video.id ? 'border-primary bg-primary/10' : 'border-outline-variant'
                }`}
              >
                <span className="text-sm">{video.title || `Video ${video.id.slice(0, 8)}`}</span>
                <MaterialIcon icon={selectedVideoId === video.id ? 'check_circle' : 'play_arrow'} className={selectedVideoId === video.id ? 'text-primary' : 'text-on-surface-variant'} />
              </button>
            ))}

            {!isLoading && videos.length === 0 && (
              <p className="text-sm text-on-surface-variant">{isVi ? 'Chua co video nao.' : 'No videos available yet.'}</p>
            )}
          </div>

          {canManageVideo && contentId && (
            <div className="mt-6 space-y-3 border-t border-outline-variant pt-4">
              <h5 className="text-sm font-semibold text-on-surface">{isVi ? 'Them video YouTube' : 'Add YouTube video'}</h5>
              <input
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <input
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                placeholder={isVi ? 'Tieu de (tuy chon)' : 'Title (optional)'}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <textarea
                value={videoDescription}
                onChange={(event) => setVideoDescription(event.target.value)}
                placeholder={isVi ? 'Mo ta (tuy chon)' : 'Description (optional)'}
                className="min-h-[80px] w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <Button onClick={() => void handleCreateVideo()} disabled={isSubmitting || !youtubeUrl.trim()}>
                {isSubmitting ? (isVi ? 'Dang tao...' : 'Creating...') : (isVi ? 'Tao video' : 'Create Video')}
              </Button>
            </div>
          )}

          {canManageVideo && !contentId && (
            <p className="mt-4 text-xs text-on-surface-variant">
              {isVi ? 'Can ?contentId=... de tao video moi.' : 'Provide ?contentId=... in URL to create a new video.'}
            </p>
          )}
          {!canManageVideo && (
            <p className="mt-4 text-xs text-on-surface-variant">
              {isVi ? 'Chi Teacher/OrgAdmin/SysAdmin moi co the tao video.' : 'Only Teacher/OrgAdmin/SysAdmin can create videos.'}
            </p>
          )}
        </Card>
      </div>
    </UserShell>
  )
}
