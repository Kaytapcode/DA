import React, { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { UserShell, useUserLanguage } from './UserShell'
import { useQuiz } from '@/hooks/useQuiz'
import { useFlashcard } from '@/hooks/useFlashcard'
import { useDocument } from '@/hooks/useDocument'

const useLang = useUserLanguage

export { UserHomePageLightPage } from './UserHomePageLightPage'

export const UserLearningDashboardLightPage: React.FC = () => {
  const isVi = useLang()

  return (
    <UserShell
      titleEn="Learning Dashboard"
      titleVi="Bang dieu khien hoc tap"
      subtitleEn="Track progress and resume your courses"
      subtitleVi="Theo doi tien do va tiep tuc khoa hoc"
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">{isVi ? 'Khoa hoc noi bat' : 'Featured Course'}</p>
              <h3 className="mt-1 text-2xl font-bold text-on-surface">Advanced Quantum Mechanics</h3>
            </div>
            <Badge variant="primary">45%</Badge>
          </div>
          <p className="text-on-surface-variant">{isVi ? 'Tiep tuc lo trinh va hoan thanh phan bai hoc con lai.' : 'Continue the current path and finish the remaining units.'}</p>
          <div className="mt-5 h-2 rounded-full bg-surface-container-low">
            <div className="h-2 w-[45%] rounded-full bg-primary" />
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/user/course/advanced-quantum-mechanics" className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary">
              {isVi ? 'Mo khoa hoc' : 'Open Course'}
            </Link>
            <Link to="/user/lesson" className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-medium text-on-surface">
              {isVi ? 'Xem bai hoc' : 'View Lesson'}
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-on-surface">{isVi ? 'Chi so nhanh' : 'Quick stats'}</h3>
          <div className="space-y-4">
            {[
              { label: isVi ? 'Hoan thanh' : 'Completed', value: '8 units' },
              { label: isVi ? 'Dang hoc' : 'In progress', value: '1 course' },
              { label: isVi ? 'Diem so' : 'Score', value: '92%' },
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

export const DocumentViewerLightPage: React.FC = () => {
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

export const InteractiveFlashcardsLightPage: React.FC = () => {
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
          <p className="text-sm text-on-surface-variant">{isVi ? 'Khong con the nao de hoc.' : 'No cards left to study.'}</p>
        )}
      </Card>
    </UserShell>
  )
}

export const LearningHistoryLightPage: React.FC = () => {
  const isVi = useLang()
  const rows = [
    { action: 'Completed module: Async JS', time: '2026-04-02 20:15', score: '92%' },
    { action: 'Submitted quiz: SQL Basics', time: '2026-04-01 19:02', score: '85%' },
    { action: 'Reviewed flashcards: React Hooks', time: '2026-03-31 18:40', score: '78%' },
  ]

  return (
    <UserShell
      titleEn="Learning History"
      titleVi="Lich su hoc tap"
      subtitleEn="Your timeline of completed activities"
      subtitleVi="Dong thoi gian cac hoat dong da hoan thanh"
    >
      <Card className="p-6">
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
              {rows.map((row) => (
                <tr key={row.action} className="border-b border-outline-variant/40">
                  <td className="py-3 text-on-surface">{row.action}</td>
                  <td className="py-3 text-on-surface-variant">{row.time}</td>
                  <td className="py-3 text-on-surface-variant">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </UserShell>
  )
}

export const LuminaQuantumPage: React.FC = () => {
  const isVi = useLang()

  return (
    <UserShell
      titleEn="Lumina Quantum"
      titleVi="Lumina Quantum"
      subtitleEn="Futuristic learning experience"
      subtitleVi="Trai nghiem hoc tap tuong lai"
    >
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-tertiary/10 p-10">
        <h3 className="mb-4 text-4xl font-black font-headline text-on-surface">{isVi ? 'Mo khoa che do Quantum' : 'Unlock Quantum Mode'}</h3>
        <p className="mb-6 max-w-2xl text-on-surface-variant">
          {isVi ? 'Che do hoc tap nang cao voi lo trinh ca nhan hoa va tro ly AI theo ngu canh.' : 'Advanced learning mode with adaptive pathing and context-aware AI tutoring.'}
        </p>
        <div className="flex gap-3">
          <Button>{isVi ? 'Bat dau ngay' : 'Start Now'}</Button>
          <Button variant="secondary">{isVi ? 'Xem demo' : 'View Demo'}</Button>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {['Neural Notes', 'Adaptive Quiz', 'Realtime Coach'].map((feature) => (
          <Card key={feature} className="p-6">
            <MaterialIcon icon="auto_awesome" className="mb-3 text-primary" />
            <h4 className="mb-2 font-bold text-on-surface">{feature}</h4>
            <p className="text-sm text-on-surface-variant">{isVi ? 'Tinh nang thong minh cho hoc tap toc do cao.' : 'Smart capability for high-velocity learning.'}</p>
          </Card>
        ))}
      </div>
    </UserShell>
  )
}

export const OrganizationListLightPage: React.FC = () => {
  const isVi = useLang()
  const orgs = ['Lumina Research Hub', 'AI Innovators Guild', 'Quantum Labs Network']

  return (
    <UserShell
      titleEn="Organization List"
      titleVi="Danh sach to chuc"
      subtitleEn="Join and follow learning organizations"
      subtitleVi="Tham gia va theo doi cac to chuc hoc tap"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {orgs.map((org) => (
          <Card key={org} className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MaterialIcon icon="corporate_fare" className="text-primary" />
            </div>
            <h3 className="mb-2 font-bold text-on-surface">{org}</h3>
            <p className="mb-4 text-sm text-on-surface-variant">{isVi ? '24 khoa hoc dang hoat dong' : '24 active courses available'}</p>
            <Button size="sm" className="w-full">{isVi ? 'Tham gia' : 'Join'}</Button>
          </Card>
        ))}
      </div>
    </UserShell>
  )
}

export const SpecificCoursePageLightPage: React.FC = () => {
  const { courseId } = useParams()

  const course = {
    breadcrumb: 'Physics',
    description:
      'Deep dive into wave-particle duality, Schrödinger\'s equation, and the mathematical foundations of subatomic phenomena.',
    progress: 45,
    unitsCompleted: 8,
    totalUnits: 18,
    instructor: 'Dr. Sarah Chen',
    duration: '12h 45m',
    status: 'In Progress',
    courseCode: courseId || 'quantum-mechanics',
  }

  const learningPath = [
    { title: 'Hilbert Space Fundamentals', description: 'Understanding the mathematical arena of quantum states.', time: '12:45 MIN', icon: 'play_circle', accent: '#4f6cf7', bg: '#eef2ff', completed: true },
    { title: 'Operators & Observables', description: 'Comprehensive guide on Hermitian operators and physical values.', time: 'READING', icon: 'description', accent: '#d07a44', bg: '#fff2ea', completed: false },
    { title: 'Key Postulates Review', description: '24 interactive cards to master the fundamental axioms.', time: 'NEW', icon: 'assignment', accent: '#4f6cf7', bg: '#f4f7ff', completed: false },
    { title: 'Unit 2 Mid-term Assessment', description: 'Unlock after completing all Unit 2 modules.', time: '45 QUESTIONS', icon: 'lock', accent: '#9aa4b7', bg: '#f2f4f8', completed: false, locked: true },
  ] as const

  const courseLobby = [
    { author: 'Dr. Sarah Chen', text: 'The visualization in module 4 really clarifies the wave packet dispersion. Check it out!' },
    { author: 'Marcus V.', text: 'Is anyone struggling with the Hamiltonian operator proof? Looking for a study partner.' },
    { author: 'Alex Thorne', text: 'I can help, Marcus. Let\'s meet in the virtual lab after the next lesson.' },
  ]

  return (
    <UserShell
      titleEn="Specific Course"
      titleVi="Chi tiet khoa hoc"
      subtitleEn="Detailed view of a selected course"
      subtitleVi="Thong tin chi tiet cua khoa hoc duoc chon"
    >
      <div className="space-y-8">
        <Card className="overflow-hidden border border-[#e7ebf6] p-0 shadow-[0_20px_50px_rgba(69,84,153,0.12)]">
          <div className="grid gap-0 lg:grid-cols-[1.7fr_0.95fr]">
            <div className="space-y-6 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef3ff] p-8 lg:p-10">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[#7b86a3]">Courses &gt; {course.breadcrumb}</div>
              <div>
                <h3 className="max-w-3xl text-[44px] font-black leading-[1.02] text-on-surface font-headline lg:text-[54px]">
                  Advanced <span className="text-[#4f6cf7]">Quantum Mechanics</span>
                </h3>
                <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">{course.description}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/user/lesson" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4f6cf7] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#395de8]">
                  Continue Learning
                  <MaterialIcon icon="arrow_forward" size="sm" />
                </Link>
                <Link to="/user/quiz" className="inline-flex items-center justify-center rounded-full border border-[#d8e0f0] bg-white px-6 py-3 text-sm font-semibold text-on-surface transition hover:bg-[#f6f8ff]">
                  Open Course
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center bg-white p-8 lg:p-10">
              <Card className="w-full max-w-[280px] border border-[#edf1f8] p-6 shadow-[0_18px_40px_rgba(73,89,162,0.08)]">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a95af]">Current Progress</div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-5xl font-black text-on-surface">{course.progress}%</div>
                    <p className="mt-1 text-sm text-on-surface-variant">{course.unitsCompleted} / {course.totalUnits} Units</p>
                  </div>
                  <div className="rounded-2xl bg-[#eef2ff] px-4 py-3 text-center text-xs font-bold text-[#4f6cf7]">
                    {course.unitsCompleted} / {course.totalUnits}
                    <br />
                    Units
                  </div>
                </div>
                <div className="mt-5 h-2 rounded-full bg-[#e5eaf6]">
                  <div className="h-2 w-[45%] rounded-full bg-[#4f6cf7]" />
                </div>
                <Button className="mt-6 w-full justify-center" size="md">Continue Learning</Button>
              </Card>
            </div>
          </div>
        </Card>

        <div className="grid gap-8 xl:grid-cols-[1.5fr_0.75fr]">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-bold text-on-surface font-headline">Learning Path</h4>
              <div className="flex items-center gap-3 text-[#6e7890]"><MaterialIcon icon="filter_list" size="sm" /><MaterialIcon icon="grid_view" size="sm" /></div>
            </div>

            <div className="space-y-4">
              {learningPath.map((item) => (
                <div key={item.title} className="rounded-[24px] border border-[#edf1f8] bg-white p-4 shadow-[0_10px_28px_rgba(65,79,145,0.06)]">
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: item.bg, color: item.accent }}>
                      <MaterialIcon icon={item.icon} size="md" fill />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h5 className="text-lg font-bold text-on-surface">{item.title}</h5>
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#a0a8b8]">{item.time}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {'locked' in item && item.locked ? (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#f3f5f9] text-[#a2abbb]"><MaterialIcon icon="lock" size="sm" /></div>
                      ) : item.completed ? (
                        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eef2ff] text-[#4f6cf7]"><MaterialIcon icon="check_circle" size="sm" fill /></div>
                      ) : (
                        <button className="rounded-full bg-[#4f6cf7] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#395de8]">{item.time === 'NEW' ? 'Start' : 'Open'}</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="border border-[#edf1f8] p-5 shadow-[0_10px_28px_rgba(65,79,145,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a95af]">Course Lobby</div>
                  <h4 className="mt-1 text-xl font-bold text-on-surface">12 online</h4>
                </div>
                <div className="flex -space-x-2">
                  {['S', 'M', 'A'].map((avatar) => <div key={avatar} className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[#4f6cf7] text-xs font-bold text-white">{avatar}</div>)}
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {courseLobby.map((message) => (
                  <div key={message.author} className="rounded-[20px] bg-[#f8fafe] p-4">
                    <div className="mb-2 text-sm font-bold text-[#4f6cf7]">{message.author}</div>
                    <p className="text-sm leading-6 text-on-surface-variant">{message.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border border-[#edf1f8] p-5 shadow-[0_10px_28px_rgba(65,79,145,0.06)]">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-[#8a95af]">Course Summary</div>
              <div className="mt-3 space-y-3 text-sm text-on-surface-variant">
                <p><span className="font-semibold text-on-surface">Instructor:</span> {course.instructor}</p>
                <p><span className="font-semibold text-on-surface">Duration:</span> {course.duration}</p>
                <p><span className="font-semibold text-on-surface">Status:</span> {course.status}</p>
                <p><span className="font-semibold text-on-surface">Course ID:</span> {course.courseCode}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </UserShell>
  )
}

export { UserContentLibraryLightPage } from './UserContentLibraryLightPage'

export const UserQuizInterfaceLightPage: React.FC = () => {
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
  } = useQuiz(quizId)

  const currentQuestion = questions[currentQuestionIndex] ?? null
  const selectedIndex = currentQuestion ? answers[currentQuestion.id] : undefined

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

  return (
    <UserShell
      titleEn="Quiz Interface"
      titleVi="Giao dien bai quiz"
      subtitleEn="Answer timed questions and submit results"
      subtitleVi="Tra loi cau hoi tinh gio va nop ket qua"
    >
      <Card className="p-8">
        {!quizId && <p className="text-sm text-on-surface-variant">{isVi ? 'Them ?quizId=... vao URL de bat dau quiz.' : 'Add ?quizId=... to URL to start the quiz.'}</p>}

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
                    {isVi ? 'Ban chon' : 'Selected'}: {item.selectedIndex + 1} • {isVi ? 'Dap an dung' : 'Correct'}: {item.correctIndex + 1}
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
              {currentQuestion.options.map((option, optionIndex) => (
                <button
                  key={option}
                  onClick={() => selectAnswer(currentQuestion.id, optionIndex)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedIndex === optionIndex
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {option}
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

export const VideoLessonLightPage: React.FC = () => {
  const isVi = useLang()
  const lessons = ['Intro', 'State Management', 'Routing', 'Performance', 'Deployment']

  return (
    <UserShell
      titleEn="Video Lesson"
      titleVi="Bai hoc video"
      subtitleEn="Watch lessons and track playback progress"
      subtitleVi="Xem bai giang video va theo doi tien do"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          <div className="mb-4 flex h-[380px] items-center justify-center rounded-xl bg-slate-900 text-white">
            <div className="text-center">
              <MaterialIcon icon="play_circle" className="text-6xl" />
              <p className="mt-2 text-slate-300">{isVi ? 'Trinh phat video' : 'Video player'}</p>
            </div>
          </div>
          <h3 className="font-bold text-on-surface">React Performance Deep Dive</h3>
          <p className="mt-2 text-sm text-on-surface-variant">{isVi ? 'Bai hoc video don giai ve toan bo hieu nang giao dien.' : 'A focused lesson on frontend performance fundamentals.'}</p>
        </Card>

        <Card className="p-6 lg:col-span-4">
          <h4 className="mb-4 font-bold text-on-surface">{isVi ? 'Danh sach bai hoc' : 'Lesson list'}</h4>
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div key={lesson} className={`flex items-center justify-between rounded-lg border p-3 ${index === 0 ? 'border-primary bg-primary/10' : 'border-outline-variant'}`}>
                <span className="text-sm">{lesson}</span>
                <MaterialIcon icon={index === 0 ? 'check_circle' : 'play_arrow'} className={index === 0 ? 'text-primary' : 'text-on-surface-variant'} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </UserShell>
  )
}
