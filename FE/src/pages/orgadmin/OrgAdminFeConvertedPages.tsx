import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { DocumentUploadModal } from '@components/DocumentUploadModal'
import { OrgAdminNavbar } from '@components/layout/orgadmin/OrgAdminNavbar'
import { OrgAdminSidebar } from '@components/layout/orgadmin/OrgAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { getCurrentLanguage } from '@/i18n/translations'
import { useModuleContent, ModuleItem, ContentItem } from '@/hooks/useModuleContent'
import { useCourse } from '@/hooks/useCourse'
import { useOrganization } from '@/hooks/useOrganization'
import { useCourseEnrollment, type CourseEnrollment } from '@/hooks/useCourseEnrollment'
import { useOrgContext } from '@/contexts/OrgContext'
import { apiClient } from '@/utils/apiClient'
import { GlobalContentList } from '@components/GlobalContentList'

const useLang = () => getCurrentLanguage() === 'vi'

interface OrgShellProps {
  titleEn: string
  titleVi: string
  subtitleEn: string
  subtitleVi: string
  children: React.ReactNode
}

const OrgShell: React.FC<OrgShellProps> = ({ titleEn, titleVi, subtitleEn, subtitleVi, children }) => {
  const isVi = useLang()

  return (
    <MainLayout
      navbar={<OrgAdminNavbar title={isVi ? titleVi : titleEn} />}
      sidebar={<OrgAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">{isVi ? titleVi : titleEn}</h2>
            <p className="text-on-surface-variant">{isVi ? subtitleVi : subtitleEn}</p>
          </div>
          {children}
        </div>
      </div>
    </MainLayout>
  )
}

// OrgAdmin content CMS — view/manage all content posted within the org (org-scoped by the BE).
export const OrgContentManagementPage: React.FC = () => {
  const isVi = useLang()
  return (
    <OrgShell
      titleEn="Content Management"
      titleVi="Quản lý nội dung"
      subtitleEn="View and manage content posted across your organization's courses"
      subtitleVi="Xem và quản lý nội dung trong các khóa học của tổ chức"
    >
      <GlobalContentList isVi={isVi} />
    </OrgShell>
  )
}

export const CourseManagementPage: React.FC = () => {
  const isVi = useLang()
  const { org } = useOrgContext()
  const orgId = org?.id ?? localStorage.getItem('org_id') ?? ''
  const { courses, isLoading, error, fetchCourses, createCourse, deleteCourse } = useCourse()
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [busyCourseId, setBusyCourseId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void fetchCourses(0, 50)
  }, [fetchCourses])

  const handleCreate = async () => {
    if (!orgId || !newTitle.trim()) return
    setSubmitting(true)
    const created = await createCourse({
      orgId,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      courseCode: newCode.trim() || undefined,
    })
    setSubmitting(false)
    if (created) {
      setNewTitle('')
      setNewCode('')
      setNewDescription('')
      setShowCreate(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(isVi ? 'Xóa khóa học này?' : 'Delete this course?')) return
    setBusyCourseId(id)
    await deleteCourse(id)
    setBusyCourseId(null)
  }

  return (
    <OrgShell
      titleEn="Course Management"
      titleVi="Quản lý khóa học"
      subtitleEn="Manage publishing, enrollment, and quality"
      subtitleVi="Quản lý xuất bản, ghi danh và chất lượng"
    >
      <div className="flex gap-3">
        <Button data-testid="course-create-toggle-btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? (isVi ? 'Đóng' : 'Cancel') : (isVi ? 'Tạo khóa học' : 'Create Course')}
        </Button>
      </div>

      {showCreate && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              data-testid="course-title-input"
              label={isVi ? 'Tiêu đề' : 'Title'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isVi ? 'Ví dụ: Lập trình React' : 'e.g. React Programming'}
            />
            <Input
              data-testid="course-code-input"
              label={isVi ? 'Mã khóa học' : 'Course Code'}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="CS101"
            />
            <Input
              data-testid="course-description-input"
              label={isVi ? 'Mô tả' : 'Description'}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="md:col-span-2"
            />
          </div>
          {!orgId && (
            <p className="mt-3 text-sm text-error">
              {isVi ? 'Vui lòng chọn một tổ chức trước.' : 'Select an organization first.'}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <Button data-testid="course-create-submit-btn" onClick={() => void handleCreate()} disabled={submitting || !orgId || !newTitle.trim()}>
              {submitting ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Tạo' : 'Create')}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        {isLoading && (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}
        {error && !isLoading && <p className="text-sm text-error mb-3">{error}</p>}
        {!isLoading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left py-3">{isVi ? 'Khóa học' : 'Course'}</th>
                  <th className="text-left py-3">{isVi ? 'Mã' : 'Code'}</th>
                  <th className="text-left py-3">{isVi ? 'Mô-đun' : 'Modules'}</th>
                  <th className="text-left py-3">{isVi ? 'Ngày tạo' : 'Created'}</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sm text-on-surface-variant">
                      {isVi ? 'Chưa có khóa học nào.' : 'No courses yet.'}
                    </td>
                  </tr>
                )}
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant/40" data-testid={`course-row-${c.id}`}>
                    <td className="py-3 font-medium">
                      <Link to={`/admin/editor/curriculum?courseId=${c.id}`} className="hover:text-primary" data-testid={`course-title-${c.id}`}>
                        {c.title}
                      </Link>
                    </td>
                    <td className="py-3 text-on-surface-variant">{c.courseCode ?? '—'}</td>
                    <td className="py-3 text-on-surface-variant">{c.moduleCount ?? 0}</td>
                    <td className="py-3 text-on-surface-variant">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/editor/curriculum?courseId=${c.id}`}
                          data-testid={`course-curriculum-btn-${c.id}`}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-low"
                        >
                          {isVi ? 'Chương trình' : 'Curriculum'}
                        </Link>
                        <Link
                          to={`/admin/editor/member-roles?courseId=${c.id}`}
                          data-testid={`course-members-btn-${c.id}`}
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-low"
                        >
                          {isVi ? 'Thành viên' : 'Members'}
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid={`course-delete-btn-${c.id}`}
                          onClick={() => void handleDelete(c.id)}
                          disabled={busyCourseId === c.id}
                        >
                          <MaterialIcon icon="delete" size="xs" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </OrgShell>
  )
}

// ── Content row inside a module ───────────────────────────────────────────────
interface ContentRowProps {
  content: ContentItem;
  moduleId: string;
  index: number;
  total: number;
  onMove: (contentId: string, newIndex: number) => void;
  onDelete: (contentId: string) => void;
  onToggleStatus: (contentId: string, status: 'DRAFT' | 'PUBLISHED') => void;
}

const ContentRow: React.FC<ContentRowProps> = ({
  content, moduleId, index, total, onMove, onDelete,
}) => {
  const isVi = useLang()
  const type = content.contentType.toUpperCase()
  const openPath =
    type === 'QUIZ' && content.quizId
      ? `/user/quiz?quizId=${content.quizId}`
      : type === 'FLASHCARD' && content.deckId
        ? `/user/flashcards?deckId=${content.deckId}`
        : type === 'PDF' && content.documentId
          ? `/user/documents?docId=${content.documentId}`
          : type === 'VIDEO'
            ? `/user/lesson?contentId=${content.id}${content.videoId ? `&videoId=${content.videoId}` : ''}${moduleId ? `&moduleId=${moduleId}` : ''}`
            : null

  return (
    <div className="ml-6 p-3 rounded-lg bg-surface-container flex items-center justify-between group">
      <div className="flex items-center gap-2">
        <MaterialIcon icon="drag_indicator" className="text-on-surface-variant text-sm" />
        <span className="text-sm text-on-surface">{content.title}</span>
        <Badge variant="secondary" size="sm">{content.contentType}</Badge>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {openPath && (
          <Link
            to={openPath}
            className="inline-flex items-center rounded px-2 text-xs text-primary hover:bg-surface-container-high"
            title={isVi ? 'Mở nội dung' : 'Open content'}
          >
            {isVi ? 'Mở' : 'Open'}
          </Link>
        )}
        <button
          disabled={index === 0}
          onClick={() => onMove(content.id, index - 1)}
          className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30"
          title="Move up"
        >
          <MaterialIcon icon="keyboard_arrow_up" className="text-sm" />
        </button>
        <button
          disabled={index === total - 1}
          onClick={() => onMove(content.id, index + 1)}
          className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30"
          title="Move down"
        >
          <MaterialIcon icon="keyboard_arrow_down" className="text-sm" />
        </button>
        <button
          onClick={() => onDelete(content.id)}
          className="p-1 rounded hover:bg-error-container text-error"
          title="Delete"
        >
          <MaterialIcon icon="delete" className="text-sm" />
        </button>
      </div>
    </div>
  )
}

// ── Module section (collapsible) ───────────────────────────────────────────────
interface ModuleSectionProps {
  module: ModuleItem;
  index: number;
  total: number;
  courseId: string;
  onMoveModule: (moduleId: string, newIndex: number) => void;
  onDeleteModule: (moduleId: string) => void;
  onLoadContents: (moduleId: string) => void;
  onMoveContent: (moduleId: string, contentId: string, newIndex: number) => void;
  onDeleteContent: (moduleId: string, contentId: string) => void;
  onToggleContentStatus: (moduleId: string, contentId: string, status: 'DRAFT' | 'PUBLISHED') => void;
  onAddContent: (moduleId: string) => void;
}

const ModuleSection: React.FC<ModuleSectionProps> = ({
  module, index, total,
  onMoveModule, onDeleteModule, onLoadContents,
  onMoveContent, onDeleteContent, onToggleContentStatus, onAddContent,
}) => {
  const isVi = useLang()
  const [open, setOpen] = useState(false)

  const handleToggle = () => {
    if (!open && !module.contents) onLoadContents(module.id)
    setOpen(v => !v)
  }

  return (
    <div className="rounded-lg border border-outline-variant overflow-hidden">
      <div className="p-4 bg-surface-container-low flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleToggle} data-testid="module-expand-btn" className="p-1 rounded hover:bg-surface-container">
            <MaterialIcon icon={open ? 'expand_less' : 'expand_more'} />
          </button>
          <span className="text-sm font-bold text-on-surface-variant">#{index + 1}</span>
          <span className="font-semibold text-on-surface">{module.title}</span>
          {module.contents && (
            <Badge variant="secondary" size="sm">{module.contents.length} items</Badge>
          )}
        </div>
        <div className="flex gap-1">
          <button
            disabled={index === 0}
            onClick={() => onMoveModule(module.id, index - 1)}
            className="p-1 rounded hover:bg-surface-container disabled:opacity-30"
            title="Move up"
          >
            <MaterialIcon icon="keyboard_arrow_up" />
          </button>
          <button
            disabled={index === total - 1}
            onClick={() => onMoveModule(module.id, index + 1)}
            className="p-1 rounded hover:bg-surface-container disabled:opacity-30"
            title="Move down"
          >
            <MaterialIcon icon="keyboard_arrow_down" />
          </button>
          <button
            onClick={() => onDeleteModule(module.id)}
            className="p-1 rounded hover:bg-error-container text-error"
            title="Delete module"
          >
            <MaterialIcon icon="delete" />
          </button>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-2 bg-surface">
          {module.contents === undefined && (
            <p className="text-sm text-on-surface-variant ml-6">{isVi ? 'Đang tải...' : 'Loading...'}</p>
          )}
          {module.contents?.length === 0 && (
            <p className="text-sm text-on-surface-variant ml-6">{isVi ? 'Chưa có bài học' : 'No content yet.'}</p>
          )}
            {module.contents?.map((content, ci) => (
              <ContentRow
                key={content.id}
                content={content}
                moduleId={module.id}
                index={ci}
                total={module.contents!.length}
                onMove={(contentId, newIdx) => onMoveContent(module.id, contentId, newIdx)}
                onDelete={(contentId) => onDeleteContent(module.id, contentId)}
              onToggleStatus={(contentId, status) => onToggleContentStatus(module.id, contentId, status)}
            />
          ))}
          <button
            onClick={() => onAddContent(module.id)}
            data-testid="content-add-btn"
            className="ml-6 mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
          >
            <MaterialIcon icon="add" className="text-sm" />
            {isVi ? 'Thêm bài học' : 'Add Content'}
          </button>
        </div>
      )}
    </div>
  )
}

// When a Course Editor tab is opened without a ?courseId, show a real list of the org's courses
// to pick from (no hardcoded data) instead of a dead-end error. `basePath` decides which tab the
// picked course opens (curriculum vs member-roles). testid `curriculum-pick-*` is kept stable.
const CourseEditorPicker: React.FC<{ isVi: boolean; basePath: string; label: string }> = ({ isVi, basePath, label }) => {
  const [courses, setCourses] = useState<Array<{ id: string; title: string; courseCode?: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    apiClient.get<Array<{ id: string; title: string; courseCode?: string | null }>>('/courses?pageIndex=0&pageSize=100')
      .then((res: any) => { setCourses(res.data ?? []) })
      .catch(() => setError(isVi ? 'Không thể tải danh sách khóa học.' : 'Failed to load courses.'))
      .finally(() => setLoading(false))
  }, [isVi])

  return (
    <Card className="p-6" data-testid="curriculum-course-picker">
      <h3 className="mb-1 font-bold text-on-surface">{label}</h3>
      <p className="mb-4 text-sm text-on-surface-variant">
        {isVi ? 'Chọn một khóa học bên dưới.' : 'Select one of your organization’s courses below.'}
      </p>
      {loading && <div className="flex justify-center py-6"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>}
      {error && <p className="text-sm text-error">{error}</p>}
      {!loading && !error && courses.length === 0 && (
        <p className="text-sm text-on-surface-variant" data-testid="curriculum-no-courses">
          {isVi ? 'Chưa có khóa học nào. Tạo khóa học ở mục Quản lý khóa học.' : 'No courses yet. Create one in Course Management first.'}
        </p>
      )}
      {!loading && courses.length > 0 && (
        <div className="space-y-2">
          {courses.map((c) => (
            <Link
              key={c.id}
              to={`${basePath}?courseId=${c.id}`}
              data-testid={`curriculum-pick-${c.id}`}
              className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3 hover:bg-surface-container-low"
            >
              <span className="font-medium text-on-surface">{c.title}</span>
              {c.courseCode && <span className="font-mono text-xs text-on-surface-variant">{c.courseCode}</span>}
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

// Tab bar shown at the top of both Course Editor tabs (Curriculum / Members) so an OrgAdmin can
// switch between editing a course's curriculum and its enrolled members while keeping the courseId.
const CourseEditorTabs: React.FC<{ isVi: boolean; courseId: string; active: 'curriculum' | 'members' }> = ({ isVi, courseId, active }) => {
  const tab = (key: 'curriculum' | 'members', path: string, labelEn: string, labelVi: string) => (
    <Link
      to={`${path}?courseId=${courseId}`}
      data-testid={`editor-tab-${key}`}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${active === key ? 'bg-primary text-on-primary' : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'}`}
    >
      {isVi ? labelVi : labelEn}
    </Link>
  )
  return (
    <div className="mb-4 flex gap-2" data-testid="course-editor-tabs">
      {tab('curriculum', '/admin/editor/curriculum', 'Curriculum', 'Chương trình')}
      {tab('members', '/admin/editor/member-roles', 'Members & Roles', 'Thành viên & Vai trò')}
    </div>
  )
}

// ── Course Editor - Curriculum Tab ─────────────────────────────────────────────
export const CourseEditorCurriculumTabPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId') ?? ''

  const navigate = useNavigate()
  const {
    modules, isLoading, error,
    fetchModules, fetchContents,
    createModule, deleteModule, moveModule,
    deleteContent, moveContent, setContentStatus, linkContent,
  } = useModuleContent()

  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [addingContentForModule, setAddingContentForModule] = useState<string | null>(null)
  // When set, the document upload modal is open for this module (Document is created inline since
  // upload is one step; Quiz/Video/Deck navigate to their full creator pages).
  const [uploadModuleId, setUploadModuleId] = useState<string | null>(null)

  useEffect(() => {
    if (courseId) fetchModules(courseId)
  }, [courseId, fetchModules])

  // Open the matching user CREATION page for the chosen type, carrying course+module context so the
  // new content auto-links into this module and returns here (CourseEditorPicker returnTo=curriculum).
  const goCreateContent = (type: string, moduleId: string) => {
    const ctx = `?courseId=${courseId}&moduleId=${moduleId}&returnTo=curriculum`
    if (type === 'VIDEO') navigate(`/user/videos/new${ctx}`)
    else if (type === 'QUIZ') navigate(`/user/quizzes/new${ctx}`)
    else if (type === 'FLASHCARD') navigate(`/user/decks/new${ctx}`)
    else if (type === 'PDF') setUploadModuleId(moduleId) // Document → inline upload modal
  }

  const handleDocUploaded = async (moduleId: string, doc?: { contentId?: string | null }) => {
    if (doc?.contentId) await linkContent(courseId, moduleId, doc.contentId)
    setUploadModuleId(null)
    setAddingContentForModule(null)
    await fetchModules(courseId)
  }

  const handleAddModule = async () => {
    if (!courseId) return
    // Title is optional: blank → default "Topic N" (N = next ordinal). Min 1 char if typed.
    const title = newModuleTitle.trim() || `Topic ${modules.length + 1}`
    // createModule surfaces server errors via the hook's `error` (shown below); only clear &
    // close the form when the module is actually created so failures stay visible & editable.
    const created = await createModule(courseId, title)
    if (created) {
      setNewModuleTitle('')
      setAddingModule(false)
    }
  }

  return (
    <OrgShell
      titleEn="Course Editor - Curriculum"
      titleVi="Trình sửa khóa học - Chương trình"
      subtitleEn="Organize modules, lessons, and ordering"
      subtitleVi="Sắp xếp module, bài học và thứ tự"
    >
      {!courseId && (
        <CourseEditorPicker
          isVi={isVi}
          basePath="/admin/editor/curriculum"
          label={isVi ? 'Chọn khóa học để chỉnh sửa chương trình' : 'Pick a course to edit its curriculum'}
        />
      )}

      {courseId && (
        <>
          <CourseEditorTabs isVi={isVi} courseId={courseId} active="curriculum" />
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {error && (
            <Card className="p-4 border-error">
              <p className="text-error text-sm">{error}</p>
            </Card>
          )}

          {!isLoading && (
            <div className="space-y-3">
              {modules.map((mod, idx) => (
                <ModuleSection
                  key={mod.id}
                  module={mod}
                  index={idx}
                  total={modules.length}
                  courseId={courseId}
                  onMoveModule={(moduleId, newIdx) => moveModule(courseId, moduleId, newIdx)}
                  onDeleteModule={(moduleId) => deleteModule(courseId, moduleId)}
                  onLoadContents={(moduleId) => fetchContents(courseId, moduleId)}
                  onMoveContent={(moduleId, contentId, newIdx) => moveContent(courseId, moduleId, contentId, newIdx)}
                  onDeleteContent={(moduleId, contentId) => deleteContent(courseId, moduleId, contentId)}
                  onToggleContentStatus={(moduleId, contentId, status) => setContentStatus(courseId, moduleId, contentId, status)}
                  onAddContent={(moduleId) => setAddingContentForModule(moduleId)}
                />
              ))}

              {/* Add Content — choose a type, then go through the SAME creation flow users use.
                  Document uploads inline; Quiz/Video/Deck open their full creator pages and
                  auto-link back into this module on save. */}
              {addingContentForModule && (
                <Card className="p-4 border-primary space-y-3" data-testid="content-add-panel">
                  <p className="font-semibold text-sm">{isVi ? 'Tạo nội dung mới cho module' : 'Create new content for this module'}</p>
                  <p className="text-xs text-on-surface-variant">
                    {isVi
                      ? 'Chọn loại nội dung — bạn sẽ tạo mới giống hệt luồng người dùng tự tạo, rồi tự động thêm vào module.'
                      : 'Pick a type — you create it through the same flow a user uses, then it is added to this module automatically.'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      { key: 'PDF', icon: 'picture_as_pdf', en: 'Document', vi: 'Tài liệu' },
                      { key: 'VIDEO', icon: 'play_circle', en: 'Video', vi: 'Video' },
                      { key: 'QUIZ', icon: 'quiz', en: 'Quiz', vi: 'Quiz' },
                      { key: 'FLASHCARD', icon: 'style', en: 'Flashcards', vi: 'Bộ thẻ' },
                    ] as const).map((t) => (
                      <button
                        key={t.key}
                        data-testid={`content-create-${t.key}`}
                        onClick={() => goCreateContent(t.key, addingContentForModule!)}
                        className="flex flex-col items-center gap-1 rounded-lg border border-outline-variant px-3 py-3 text-sm hover:border-primary hover:bg-surface-container-low"
                      >
                        <MaterialIcon icon={t.icon} />
                        <span>{isVi ? t.vi : t.en}</span>
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setAddingContentForModule(null)}>
                    {isVi ? 'Hủy' : 'Cancel'}
                  </Button>
                </Card>
              )}

              {uploadModuleId && (
                <DocumentUploadModal
                  isOpen={!!uploadModuleId}
                  onClose={() => setUploadModuleId(null)}
                  onUploaded={(doc) => void handleDocUploaded(uploadModuleId, doc)}
                />
              )}

              {/* Add Module */}
              {addingModule ? (
                <Card className="p-4 border-primary space-y-3">
                  <p className="font-semibold text-sm">{isVi ? 'Thêm module mới' : 'Add New Module'}</p>
                  <Input
                    data-testid="module-title-input"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder={isVi ? 'Tên module (để trống sẽ là "Topic N")' : 'Module title (blank → "Topic N")'}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                  />
                  {/* Server/validation errors are surfaced (no more silent failure). */}
                  {error && <p className="text-sm text-error" data-testid="module-add-error">{error}</p>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      data-testid="module-add-btn"
                      onClick={handleAddModule}
                    >
                      {isVi ? 'Thêm' : 'Add'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddingModule(false)}>
                      {isVi ? 'Hủy' : 'Cancel'}
                    </Button>
                  </div>
                </Card>
              ) : (
                <button
                  data-testid="module-add-toggle-btn"
                  onClick={() => setAddingModule(true)}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <MaterialIcon icon="add" />
                  {isVi ? 'Thêm module mới' : 'Add Module'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </OrgShell>
  )
}

interface OrgMemberBasic {
  userId: string
  username: string
  email: string
  role: string
}

export const CourseEditorMemberRolesTabPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')
  const { org } = useOrgContext()
  const orgId = org?.id ?? localStorage.getItem('org_id') ?? ''

  const { enrollments, isLoading, error, create, updateRole, remove, approve, reject } = useCourseEnrollment(courseId)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<'Teacher' | 'Student'>('Student')
  const [submitting, setSubmitting] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  // Org member search for enrollment
  const [orgMembers, setOrgMembers] = useState<OrgMemberBasic[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [selectedMember, setSelectedMember] = useState<OrgMemberBasic | null>(null)

  useEffect(() => {
    if (!orgId) return
    setIsLoadingMembers(true)
    apiClient.get<OrgMemberBasic[]>(`/orgs/${orgId}/members`)
      .then((res) => { if (res.success && res.data) setOrgMembers(res.data) })
      .catch(() => {})
      .finally(() => setIsLoadingMembers(false))
  }, [orgId])

  const filteredMembers = orgMembers.filter((m) => {
    const t = memberSearch.trim().toLowerCase()
    if (!t) return true
    return m.username.toLowerCase().includes(t) || m.email.toLowerCase().includes(t)
  })

  const handleAdd = async () => {
    const userId = selectedMember?.userId ?? newUserId.trim()
    if (!userId) return
    setSubmitting(true)
    const ok = await create(userId, newRole)
    if (ok) {
      setNewUserId('')
      setNewRole('Student')
      setSelectedMember(null)
      setMemberSearch('')
    }
    setSubmitting(false)
  }

  const handleChangeRole = async (e: CourseEnrollment, role: 'Teacher' | 'Student') => {
    if (role === e.role) return
    setBusyUserId(e.userId)
    await updateRole(e.userId, role)
    setBusyUserId(null)
  }

  const handleRemove = async (e: CourseEnrollment) => {
    if (!confirm(isVi ? 'Gỡ bỏ người này khỏi khóa học?' : 'Remove this user from the course?')) return
    setBusyUserId(e.userId)
    await remove(e.userId)
    setBusyUserId(null)
  }

  const handleApprove = async (e: CourseEnrollment) => {
    setBusyUserId(e.userId)
    await approve(e.userId)
    setBusyUserId(null)
  }

  const handleReject = async (e: CourseEnrollment) => {
    setBusyUserId(e.userId)
    await reject(e.userId)
    setBusyUserId(null)
  }

  // Pending self-service requests are surfaced separately so the OrgAdmin can approve/reject.
  // The main list shows only approved enrollments; rejected rows are retained in the DB so the
  // user can re-request, but are not shown as active members.
  const pendingRequests = enrollments.filter((e) => e.status === 'Pending')
  const activeEnrollments = enrollments.filter((e) => e.status === 'Approved')

  return (
    <OrgShell
      titleEn="Course Editor - Member Roles"
      titleVi="Trình sửa khóa học - Vai trò thành viên"
      subtitleEn="Assign Teacher / Student roles per course"
      subtitleVi="Gán vai trò Teacher / Student cho từng khóa học"
    >
      {!courseId && (
        <CourseEditorPicker
          isVi={isVi}
          basePath="/admin/editor/member-roles"
          label={isVi ? 'Chọn khóa học để quản lý thành viên' : 'Pick a course to manage its members'}
        />
      )}

      {courseId && <CourseEditorTabs isVi={isVi} courseId={courseId} active="members" />}

      {error && courseId && (
        <Card className="p-4 border border-error/30">
          <p className="text-sm text-error">{error}</p>
        </Card>
      )}

      {courseId && (
        <Card className="p-6">
          <h3 className="mb-4 font-bold text-on-surface">
            {isVi ? 'Thêm người vào khóa học' : 'Enroll a member'}
          </h3>
          {isLoadingMembers && (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-3">
              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
              {isVi ? 'Đang tải danh sách thành viên...' : 'Loading org members...'}
            </div>
          )}
          {!isLoadingMembers && orgMembers.length > 0 && (
            <div className="mb-3 space-y-2">
              <Input
                placeholder={isVi ? 'Tìm thành viên...' : 'Search org members...'}
                value={memberSearch}
                onChange={(e) => { setMemberSearch(e.target.value); setSelectedMember(null) }}
              />
              {memberSearch && !selectedMember && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-outline-variant">
                  {filteredMembers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-on-surface-variant">
                      {isVi ? 'Không tìm thấy.' : 'No match.'}
                    </p>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => { setSelectedMember(m); setMemberSearch(m.username); setNewUserId(m.userId) }}
                        className="flex w-full items-center gap-3 border-b border-outline-variant/30 px-4 py-2 text-left text-sm hover:bg-surface-container-low last:border-b-0"
                      >
                        <span className="font-medium text-on-surface">{m.username}</span>
                        <span className="text-on-surface-variant">{m.email}</span>
                        <Badge variant="secondary" size="sm" className="ml-auto">{m.role}</Badge>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {!isLoadingMembers && orgMembers.length === 0 && (
            <p className="mb-3 text-sm text-on-surface-variant">
              {isVi ? 'Chưa có thành viên nào trong tổ chức.' : 'No org members yet. Add members on the Members page first.'}
            </p>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            {selectedMember && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm">
                <span className="font-medium text-on-surface">{selectedMember.username}</span>
                <button type="button" onClick={() => { setSelectedMember(null); setMemberSearch(''); setNewUserId('') }}
                  className="text-on-surface-variant hover:text-error">✕</button>
              </div>
            )}
            {/* {!selectedMember && (
              <Input
                data-testid="enrollment-userid-input"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder={isVi ? 'User ID (UUID) — tự nhập nếu cần' : 'User ID (UUID) — manual entry'}
                className="flex-1 min-w-[200px]"
              />
            )} */}
            <select
              data-testid="enrollment-role-select"
               className="min-w-[140px] px-2 py-1 pr-8 rounded border border-outline-variant bg-surface text-on-surface text-sm mr-2"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'Teacher' | 'Student')}
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>
            <Button
              data-testid="enrollment-submit-btn"
              onClick={() => void handleAdd()}
              disabled={submitting || (!selectedMember && !newUserId.trim())}
            >
              {submitting ? (isVi ? 'Đang thêm...' : 'Adding...') : (isVi ? 'Thêm' : 'Enroll')}
            </Button>
          </div>
        </Card>
      )}

      {courseId && (
        <Card className="p-6" data-testid="enrollment-requests-card">
          <h3 className="mb-4 font-bold text-on-surface">
            {isVi ? 'Yêu cầu ghi danh đang chờ' : 'Pending enrollment requests'}
            {pendingRequests.length > 0 && (
              <Badge variant="warning" size="sm" className="ml-2">{pendingRequests.length}</Badge>
            )}
          </h3>
          {!isLoading && pendingRequests.length === 0 && (
            <p className="py-2 text-sm text-on-surface-variant">
              {isVi ? 'Không có yêu cầu nào đang chờ duyệt.' : 'No pending requests.'}
            </p>
          )}
          <div className="space-y-2">
            {pendingRequests.map((e) => (
              <div key={e.id} data-testid={`enrollment-request-${e.userId}`} className="flex flex-wrap items-center gap-3 rounded-lg bg-warning/5 border border-warning/30 p-3">
                <Badge variant="warning" size="sm">{isVi ? 'Đang chờ' : 'Pending'}</Badge>
                <span className="text-sm font-medium text-on-surface" title={e.userId}>{e.username ?? e.userId}</span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    data-testid={`enrollment-approve-${e.userId}`}
                    onClick={() => void handleApprove(e)}
                    disabled={busyUserId === e.userId}
                  >
                    {isVi ? 'Duyệt' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`enrollment-reject-${e.userId}`}
                    onClick={() => void handleReject(e)}
                    disabled={busyUserId === e.userId}
                  >
                    {isVi ? 'Từ chối' : 'Reject'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {courseId && (
        <Card className="p-6">
          <h3 className="mb-4 font-bold text-on-surface">
            {isVi ? 'Danh sách ghi danh' : 'Course enrollments'}
          </h3>
          {isLoading && (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          )}
          {!isLoading && activeEnrollments.length === 0 && (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              {isVi ? 'Chưa có ai được ghi danh.' : 'No one is enrolled yet.'}
            </p>
          )}
          {!isLoading && activeEnrollments.length > 0 && (
            <div className="space-y-2">
              {activeEnrollments.map((e) => (
                <div key={e.id} data-testid={`enrollment-row-${e.userId}`} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-3">
                  <Badge variant={e.role === 'Teacher' ? 'warning' : 'primary'} size="sm">
                    {e.role}
                  </Badge>
                  <span className="text-sm font-medium text-on-surface" title={e.userId}>{e.username ?? e.userId}</span>
                  <span className="ml-auto text-xs text-on-surface-variant">
                    {new Date(e.enrolledAt).toLocaleDateString()}
                  </span>
                  <select
                     className="min-w-[140px] px-2 py-1 pr-8 rounded border border-outline-variant bg-surface text-on-surface text-sm mr-2"
                    value={e.role}
                    disabled={busyUserId === e.userId}
                    onChange={(ev) => void handleChangeRole(e, ev.target.value as 'Teacher' | 'Student')}
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleRemove(e)}
                    disabled={busyUserId === e.userId}
                  >
                    <MaterialIcon icon="delete" size="xs" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </OrgShell>
  )
}

export const SystemadminOrganizationDirectoryPage: React.FC = () => {
  const isVi = useLang()
  const [search, setSearch] = useState('')
  const { organizations, isLoading, error, fetchOrganizations } = useOrganization()

  useEffect(() => { void fetchOrganizations(0, 100) }, [fetchOrganizations])

  const filtered = organizations.filter((org) =>
    org.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <OrgShell
      titleEn="Organization Directory"
      titleVi="Danh bạ tổ chức"
      subtitleEn="Browse organizations linked with admin scope"
      subtitleVi="Duyệt danh sách tổ chức liên kết phạm vi admin"
    >
      <Card className="p-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isVi ? 'Tìm tổ chức...' : 'Search organizations...'}
        />
      </Card>
      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}
      {/* {error && !isLoading && <p className="text-sm text-error">{error}</p>} */}
      {!isLoading && filtered.length === 0 && !error && (
        <p className="text-sm text-on-surface-variant text-center py-4">
          {isVi ? 'Không tìm thấy tổ chức nào.' : 'No organizations found.'}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((org) => (
          <Card key={org.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MaterialIcon icon="corporate_fare" className="text-primary" />
                <div>
                  <h3 className="font-semibold text-on-surface">{org.name}</h3>
                  <p className="text-xs text-on-surface-variant">
                    {isVi ? `${org.memberCount} thanh vien` : `${org.memberCount} members`}
                  </p>
                </div>
              </div>
              <Button size="sm">{isVi ? 'Chi tiết' : 'Details'}</Button>
            </div>
          </Card>
        ))}
      </div>
    </OrgShell>
  )
}


