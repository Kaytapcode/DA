import React, { useMemo, useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Input } from '@components/ui/Input'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { getCurrentLanguage } from '@/i18n/translations'

const useLang = () => getCurrentLanguage() === 'vi'

interface UserShellProps {
  titleEn: string
  titleVi: string
  subtitleEn: string
  subtitleVi: string
  children: React.ReactNode
}

const UserShell: React.FC<UserShellProps> = ({
  titleEn,
  titleVi,
  subtitleEn,
  subtitleVi,
  children,
}) => {
  const isVi = useLang()

  return (
    <MainLayout
      navbar={<UserNavbar title={isVi ? titleVi : titleEn} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">
              {isVi ? titleVi : titleEn}
            </h2>
            <p className="text-on-surface-variant">{isVi ? subtitleVi : subtitleEn}</p>
          </div>
          {children}
        </div>
      </div>
    </MainLayout>
  )
}

export const UserHomePageLightPage: React.FC = () => {
  const isVi = useLang()
  const stats = useMemo(
    () => [
      { label: isVi ? 'Khóa đang học' : 'Active Courses', value: '6', icon: 'auto_stories' },
      { label: isVi ? 'Giờ học tuần này' : 'Learning Hours', value: '14h', icon: 'schedule' },
      { label: isVi ? 'Chuỗi ngày học' : 'Streak', value: '12', icon: 'local_fire_department' },
      { label: isVi ? 'Điểm XP' : 'XP Score', value: '1,840', icon: 'bolt' },
    ],
    [isVi]
  )

  return (
    <UserShell
      titleEn="Home"
      titleVi="Trang Chu"
      subtitleEn="Your personalized learning entry point"
      subtitleVi="Diem vao hoc tap ca nhan hoa"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item) => (
          <Card key={item.label} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <MaterialIcon icon={item.icon} className="text-primary" />
              <Badge variant="primary" size="sm">+2%</Badge>
            </div>
            <p className="text-2xl font-bold text-on-surface">{item.value}</p>
            <p className="text-sm text-on-surface-variant">{item.label}</p>
          </Card>
        ))}
      </div>
      <Card className="p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-on-surface">
              {isVi ? 'Tiep tuc khoa hoc Quantum Foundations' : 'Continue Quantum Foundations'}
            </h3>
            <p className="text-on-surface-variant mt-2">
              {isVi ? 'Ban da hoan thanh 68% noi dung' : 'You have completed 68% of the content'}
            </p>
          </div>
          <Button>{isVi ? 'Tiep tuc hoc' : 'Continue Learning'}</Button>
        </div>
      </Card>
    </UserShell>
  )
}

export const UserLearningDashboardLightPage: React.FC = () => {
  const isVi = useLang()
  const progressItems = [
    { label: 'AI Ethics', progress: 78 },
    { label: 'TypeScript Advanced', progress: 56 },
    { label: 'System Design', progress: 42 },
  ]

  return (
    <UserShell
      titleEn="Learning Dashboard"
      titleVi="Bang dieu khien hoc tap"
      subtitleEn="Track learning momentum and weekly goals"
      subtitleVi="Theo doi tien do va muc tieu hang tuan"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-xl font-bold text-on-surface mb-6">{isVi ? 'Tien do khoa hoc' : 'Course Progress'}</h3>
          <div className="space-y-5">
            {progressItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-on-surface">{item.label}</span>
                  <span className="font-semibold text-primary">{item.progress}%</span>
                </div>
                <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-tertiary" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-xl font-bold text-on-surface mb-4">{isVi ? 'Muc tieu tuan' : 'Weekly Goal'}</h3>
          <p className="text-on-surface-variant mb-4">{isVi ? 'Hoan thanh 3 bai hoc moi' : 'Finish 3 new lessons'}</p>
          <Button className="w-full">{isVi ? 'Xem chi tiet' : 'View Details'}</Button>
        </Card>
      </div>
    </UserShell>
  )
}

export const DocumentViewerLightPage: React.FC = () => {
  const isVi = useLang()
  const docs = ['Week 1 Notes.pdf', 'Design Patterns.docx', 'API Contract.pdf', 'Lecture Slides.pptx']
  const [selectedDoc, setSelectedDoc] = useState(docs[0])

  return (
    <UserShell
      titleEn="Document Viewer"
      titleVi="Trinh xem tai lieu"
      subtitleEn="Read course files and references"
      subtitleVi="Doc tai lieu va tham khao khoa hoc"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4 p-6">
          <h3 className="font-bold text-on-surface mb-4">{isVi ? 'Danh sach tai lieu' : 'Documents'}</h3>
          <div className="space-y-2">
            {docs.map((doc) => (
              <button
                key={doc}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedDoc === doc ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <MaterialIcon icon="description" className="mr-2 text-sm" />
                {doc}
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-on-surface">{selectedDoc}</h3>
            <Button size="sm" variant="secondary">{isVi ? 'Tai xuong' : 'Download'}</Button>
          </div>
          <div className="h-[420px] rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
            <div className="text-center">
              <MaterialIcon icon="menu_book" className="text-5xl mb-3" />
              <p>{isVi ? 'Khu vuc xem truoc tai lieu' : 'Document preview area'}</p>
            </div>
          </div>
        </Card>
      </div>
    </UserShell>
  )
}

export const InteractiveFlashcardsLightPage: React.FC = () => {
  const isVi = useLang()
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <UserShell
      titleEn="Interactive Flashcards"
      titleVi="The ghi nho tuong tac"
      subtitleEn="Practice concepts with quick cards"
      subtitleVi="Luyen tap khai niem voi bo the nhanh"
    >
      <Card className="p-10 text-center">
        <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-3">{isVi ? 'The 04/20' : 'Card 04/20'}</p>
        <h3 className="text-2xl font-bold font-headline text-on-surface mb-6">
          {isVi ? 'HTTP 304 co y nghia gi?' : 'What does HTTP 304 represent?'}
        </h3>
        <div className="rounded-xl bg-surface-container-low p-8 min-h-[180px] flex items-center justify-center">
          {showAnswer ? (
            <p className="text-on-surface">{isVi ? 'Tai nguyen khong thay doi, trinh duyet dung cache.' : 'Resource is unchanged; browser should use cached data.'}</p>
          ) : (
            <p className="text-on-surface-variant">{isVi ? 'Nhan xem dap an' : 'Tap to reveal answer'}</p>
          )}
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => setShowAnswer((prev) => !prev)}>
            {showAnswer ? (isVi ? 'An dap an' : 'Hide Answer') : (isVi ? 'Xem dap an' : 'Show Answer')}
          </Button>
          <Button>{isVi ? 'The tiep theo' : 'Next Card'}</Button>
        </div>
      </Card>
    </UserShell>
  )
}

export const LearningHistoryLightPage: React.FC = () => {
  const isVi = useLang()
  const rows = [
    { action: 'Completed module: Async JS', time: '2026-04-02 20:15', score: '92%' },
    { action: 'Submitted quiz: SQL Basics', time: '2026-04-01 19:02', score: '85%' },
    { action: 'Watched lesson: React Suspense', time: '2026-03-31 21:00', score: '-' },
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
                <th className="text-left py-3 text-sm font-semibold">{isVi ? 'Hoat dong' : 'Activity'}</th>
                <th className="text-left py-3 text-sm font-semibold">{isVi ? 'Thoi gian' : 'Time'}</th>
                <th className="text-left py-3 text-sm font-semibold">{isVi ? 'Ket qua' : 'Result'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.action} className="border-b border-outline-variant/40">
                  <td className="py-3 text-on-surface">{row.action}</td>
                  <td className="py-3 text-on-surface-variant">{row.time}</td>
                  <td className="py-3">
                    <Badge variant="success" size="sm">{row.score}</Badge>
                  </td>
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
      <Card className="p-10 bg-gradient-to-br from-primary/10 via-white to-tertiary/10 border border-primary/20">
        <h3 className="text-4xl font-black font-headline text-on-surface mb-4">{isVi ? 'Mo khoa che do Quantum' : 'Unlock Quantum Mode'}</h3>
        <p className="text-on-surface-variant mb-6 max-w-2xl">
          {isVi ? 'Che do hoc tap nang cao voi lo trinh ca nhan hoa va tro ly AI theo ngu canh.' : 'Advanced learning mode with adaptive pathing and context-aware AI tutoring.'}
        </p>
        <div className="flex gap-3">
          <Button>{isVi ? 'Bat dau ngay' : 'Start Now'}</Button>
          <Button variant="secondary">{isVi ? 'Xem demo' : 'View Demo'}</Button>
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Neural Notes', 'Adaptive Quiz', 'Realtime Coach'].map((feature) => (
          <Card key={feature} className="p-6">
            <MaterialIcon icon="auto_awesome" className="text-primary mb-3" />
            <h4 className="font-bold text-on-surface mb-2">{feature}</h4>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orgs.map((org) => (
          <Card key={org} className="p-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <MaterialIcon icon="corporate_fare" className="text-primary" />
            </div>
            <h3 className="font-bold text-on-surface mb-2">{org}</h3>
            <p className="text-sm text-on-surface-variant mb-4">{isVi ? '24 khoa hoc dang hoat dong' : '24 active courses available'}</p>
            <Button size="sm" className="w-full">{isVi ? 'Tham gia' : 'Join'}</Button>
          </Card>
        ))}
      </div>
    </UserShell>
  )
}

export const SpecificCoursePageLightPage: React.FC = () => {
  const isVi = useLang()

  return (
    <UserShell
      titleEn="Specific Course"
      titleVi="Chi tiet khoa hoc"
      subtitleEn="Detailed view of a selected course"
      subtitleVi="Thong tin chi tiet cua khoa hoc duoc chon"
    >
      <Card className="p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3 space-y-6">
            <div>
              <h3 className="text-2xl font-bold font-headline text-on-surface">Mastering TypeScript in Enterprise</h3>
              <p className="text-on-surface-variant mt-2">{isVi ? 'Lo trinh 12 bai hoc tu co ban den nang cao.' : '12-lesson path from fundamentals to advanced architecture.'}</p>
            </div>
            <div className="space-y-3">
              {['Module 1: Types', 'Module 2: Generics', 'Module 3: Patterns', 'Module 4: Testing'].map((m) => (
                <div key={m} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <span>{m}</span>
                  <MaterialIcon icon="play_circle" className="text-primary" />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-1/3">
            <Card className="p-5 bg-surface-container-low">
              <p className="text-sm text-on-surface-variant mb-2">{isVi ? 'Giang vien' : 'Instructor'}</p>
              <p className="font-bold text-on-surface mb-4">Dr. Linh Tran</p>
              <Button className="w-full">{isVi ? 'Dang ky khoa hoc' : 'Enroll Course'}</Button>
            </Card>
          </div>
        </div>
      </Card>
    </UserShell>
  )
}

export const UserContentLibraryLightPage: React.FC = () => {
  const isVi = useLang()
  const [query, setQuery] = useState('')
  const resources = ['Ebook: AI Systems', 'Template: Architecture Review', 'Checklist: API Security']

  return (
    <UserShell
      titleEn="Content Library"
      titleVi="Thu vien noi dung"
      subtitleEn="Search and browse your saved learning assets"
      subtitleVi="Tim kiem va duyet tai nguyen da luu"
    >
      <Card className="p-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isVi ? 'Tim tai nguyen...' : 'Search resources...'}
        />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {resources
          .filter((r) => r.toLowerCase().includes(query.toLowerCase()))
          .map((resource) => (
            <Card key={resource} className="p-6">
              <MaterialIcon icon="library_books" className="text-primary mb-3" />
              <h3 className="font-semibold text-on-surface">{resource}</h3>
              <p className="text-sm text-on-surface-variant mt-2">{isVi ? 'Cap nhat 2 ngay truoc' : 'Updated 2 days ago'}</p>
            </Card>
          ))}
      </div>
    </UserShell>
  )
}

export const UserQuizInterfaceLightPage: React.FC = () => {
  const isVi = useLang()
  const options = [
    'A. Stateless protocol for hypertext',
    'B. Local database schema',
    'C. CSS rendering pipeline',
    'D. Browser memory model',
  ]
  const [selected, setSelected] = useState('')

  return (
    <UserShell
      titleEn="Quiz Interface"
      titleVi="Giao dien bai quiz"
      subtitleEn="Answer timed questions and submit results"
      subtitleVi="Tra loi cau hoi tinh gio va nop ket qua"
    >
      <Card className="p-8">
        <p className="text-sm text-on-surface-variant mb-2">{isVi ? 'Cau 3/10' : 'Question 3/10'}</p>
        <h3 className="text-xl font-bold text-on-surface mb-6">HTTP la viet tat cua gi?</h3>
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selected === opt
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant hover:bg-surface-container-low text-on-surface'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button>{isVi ? 'Cau tiep theo' : 'Next Question'}</Button>
        </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 p-6">
          <div className="rounded-xl bg-slate-900 text-white h-[380px] flex items-center justify-center mb-4">
            <div className="text-center">
              <MaterialIcon icon="play_circle" className="text-6xl" />
              <p className="mt-2 text-slate-300">{isVi ? 'Trinh phat video' : 'Video player'}</p>
            </div>
          </div>
          <h3 className="font-bold text-on-surface">React Performance Deep Dive</h3>
        </Card>
        <Card className="lg:col-span-4 p-6">
          <h3 className="font-bold text-on-surface mb-4">{isVi ? 'Danh sach bai hoc' : 'Playlist'}</h3>
          <div className="space-y-2">
            {lessons.map((lesson, idx) => (
              <div key={lesson} className={`p-3 rounded-lg flex items-center justify-between ${idx === 2 ? 'bg-primary/10 text-primary' : 'bg-surface-container-low'}`}>
                <span>{lesson}</span>
                <MaterialIcon icon="play_arrow" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </UserShell>
  )
}
