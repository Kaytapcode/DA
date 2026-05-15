import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
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
    if (!confirm(isVi ? 'Xoa khoa hoc nay?' : 'Delete this course?')) return
    setBusyCourseId(id)
    await deleteCourse(id)
    setBusyCourseId(null)
  }

  return (
    <OrgShell
      titleEn="Course Management"
      titleVi="Quan ly khoa hoc"
      subtitleEn="Manage publishing, enrollment, and quality"
      subtitleVi="Quan ly xuat ban, ghi danh va chat luong"
    >
      <div className="flex gap-3">
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? (isVi ? 'Dong' : 'Cancel') : (isVi ? 'Tao khoa hoc' : 'Create Course')}
        </Button>
      </div>

      {showCreate && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={isVi ? 'Tieu de' : 'Title'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={isVi ? 'Vi du: Lap trinh React' : 'e.g. React Programming'}
            />
            <Input
              label={isVi ? 'Ma khoa hoc' : 'Course Code'}
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="CS101"
            />
            <Input
              label={isVi ? 'Mo ta' : 'Description'}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="md:col-span-2"
            />
          </div>
          {!orgId && (
            <p className="mt-3 text-sm text-error">
              {isVi ? 'Vui long chon mot to chuc truoc.' : 'Select an organization first.'}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void handleCreate()} disabled={submitting || !orgId || !newTitle.trim()}>
              {submitting ? (isVi ? 'Dang luu...' : 'Saving...') : (isVi ? 'Tao' : 'Create')}
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
        {!isLoading && courses.length === 0 && !error && (
          <p className="py-4 text-center text-sm text-on-surface-variant">
            {isVi ? 'Chua co khoa hoc nao.' : 'No courses yet.'}
          </p>
        )}
        {!isLoading && courses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left py-3">{isVi ? 'Khoa hoc' : 'Course'}</th>
                  <th className="text-left py-3">{isVi ? 'Ma' : 'Code'}</th>
                  <th className="text-left py-3">{isVi ? 'Mo-dun' : 'Modules'}</th>
                  <th className="text-left py-3">{isVi ? 'Ngay tao' : 'Created'}</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant/40">
                    <td className="py-3 font-medium">
                      <Link to={`/admin/editor/curriculum?courseId=${c.id}`} className="hover:text-primary">
                        {c.title}
                      </Link>
                    </td>
                    <td className="py-3 text-on-surface-variant">{c.courseCode ?? '—'}</td>
                    <td className="py-3 text-on-surface-variant">{c.moduleCount ?? 0}</td>
                    <td className="py-3 text-on-surface-variant">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDelete(c.id)}
                        disabled={busyCourseId === c.id}
                      >
                        <MaterialIcon icon="delete" size="xs" />
                      </Button>
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
  content, moduleId, index, total, onMove, onDelete, onToggleStatus,
}) => {
  const isVi = useLang()
  const isPublished = content.status === 'PUBLISHED'
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
        <Badge variant={isPublished ? 'success' : 'warning'} size="sm">
          {isPublished ? (isVi ? 'Da phat hanh' : 'Published') : (isVi ? 'Nhap' : 'Draft')}
        </Badge>
        <Badge variant="secondary" size="sm">{content.contentType}</Badge>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {openPath && (
          <Link
            to={openPath}
            className="inline-flex items-center rounded px-2 text-xs text-primary hover:bg-surface-container-high"
            title={isVi ? 'Mo noi dung' : 'Open content'}
          >
            {isVi ? 'Mo' : 'Open'}
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
          onClick={() => onToggleStatus(content.id, isPublished ? 'DRAFT' : 'PUBLISHED')}
          className="p-1 rounded hover:bg-surface-container-high text-xs text-primary"
          title={isPublished ? 'Set Draft' : 'Publish'}
        >
          <MaterialIcon icon={isPublished ? 'unpublished' : 'publish'} className="text-sm" />
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
          <button onClick={handleToggle} className="p-1 rounded hover:bg-surface-container">
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
            <p className="text-sm text-on-surface-variant ml-6">{isVi ? 'Dang tai...' : 'Loading...'}</p>
          )}
          {module.contents?.length === 0 && (
            <p className="text-sm text-on-surface-variant ml-6">{isVi ? 'Chua co bai hoc' : 'No content yet.'}</p>
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
            className="ml-6 mt-2 text-sm text-primary flex items-center gap-1 hover:underline"
          >
            <MaterialIcon icon="add" className="text-sm" />
            {isVi ? 'Them bai hoc' : 'Add Content'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Course Editor - Curriculum Tab ─────────────────────────────────────────────
export const CourseEditorCurriculumTabPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId') ?? ''

  const {
    modules, isLoading, error,
    fetchModules, fetchContents,
    createModule, deleteModule, moveModule,
    createContent, deleteContent, moveContent, setContentStatus,
  } = useModuleContent()

  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingModule, setAddingModule] = useState(false)
  const [addingContentForModule, setAddingContentForModule] = useState<string | null>(null)
  const [newContentTitle, setNewContentTitle] = useState('')
  const [newContentType, setNewContentType] = useState('VIDEO')

  useEffect(() => {
    if (courseId) fetchModules(courseId)
  }, [courseId, fetchModules])

  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !courseId) return
    await createModule(courseId, newModuleTitle.trim())
    setNewModuleTitle('')
    setAddingModule(false)
  }

  const handleAddContent = async (moduleId: string) => {
    if (!newContentTitle.trim() || !courseId) return
    await createContent(courseId, moduleId, newContentTitle.trim(), newContentType)
    setNewContentTitle('')
    setNewContentType('VIDEO')
    setAddingContentForModule(null)
  }

  return (
    <OrgShell
      titleEn="Course Editor - Curriculum"
      titleVi="Trinh sua khoa hoc - Chuong trinh"
      subtitleEn="Organize modules, lessons, and ordering"
      subtitleVi="Sap xep module, bai hoc va thu tu"
    >
      {!courseId && (
        <Card className="p-6">
          <p className="text-on-surface-variant text-sm">
            {isVi ? 'Khong tim thay courseId trong URL. Truy cap: /admin/editor/curriculum?courseId=...' : 'No courseId in URL. Navigate via: /admin/editor/curriculum?courseId=...'}
          </p>
        </Card>
      )}

      {courseId && (
        <>
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
                  onAddContent={(moduleId) => {
                    setAddingContentForModule(moduleId)
                    setNewContentTitle('')
                    setNewContentType('VIDEO')
                  }}
                />
              ))}

              {/* Add Content Dialog (inline) */}
              {addingContentForModule && (
                <Card className="p-4 border-primary space-y-3">
                  <p className="font-semibold text-sm">{isVi ? 'Them bai hoc moi' : 'Add New Content'}</p>
                  <Input
                    value={newContentTitle}
                    onChange={(e) => setNewContentTitle(e.target.value)}
                    placeholder={isVi ? 'Tieu de bai hoc' : 'Content title'}
                  />
                  <select
                    value={newContentType}
                    onChange={(e) => setNewContentType(e.target.value)}
                    className="w-full p-2 rounded border border-outline bg-surface text-on-surface text-sm"
                  >
                    <option value="VIDEO">VIDEO</option>
                    <option value="PDF">PDF</option>
                    <option value="QUIZ">QUIZ</option>
                    <option value="FLASHCARD">FLASHCARD</option>
                  </select>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAddContent(addingContentForModule)}>
                      {isVi ? 'Them' : 'Add'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddingContentForModule(null)}>
                      {isVi ? 'Huy' : 'Cancel'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Add Module */}
              {addingModule ? (
                <Card className="p-4 border-primary space-y-3">
                  <p className="font-semibold text-sm">{isVi ? 'Them module moi' : 'Add New Module'}</p>
                  <Input
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder={isVi ? 'Ten module' : 'Module title'}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddModule()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddModule}>{isVi ? 'Them' : 'Add'}</Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddingModule(false)}>
                      {isVi ? 'Huy' : 'Cancel'}
                    </Button>
                  </div>
                </Card>
              ) : (
                <button
                  onClick={() => setAddingModule(true)}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <MaterialIcon icon="add" />
                  {isVi ? 'Them module moi' : 'Add Module'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </OrgShell>
  )
}

export const CourseEditorMemberRolesTabPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('courseId')

  const { enrollments, isLoading, error, create, updateRole, remove } = useCourseEnrollment(courseId)
  const [newUserId, setNewUserId] = useState('')
  const [newRole, setNewRole] = useState<'Teacher' | 'Student'>('Student')
  const [submitting, setSubmitting] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newUserId.trim()) return
    setSubmitting(true)
    const ok = await create(newUserId.trim(), newRole)
    if (ok) {
      setNewUserId('')
      setNewRole('Student')
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
    if (!confirm(isVi ? 'Go bo nguoi nay khoi khoa hoc?' : 'Remove this user from the course?')) return
    setBusyUserId(e.userId)
    await remove(e.userId)
    setBusyUserId(null)
  }

  return (
    <OrgShell
      titleEn="Course Editor - Member Roles"
      titleVi="Trinh sua khoa hoc - Vai tro thanh vien"
      subtitleEn="Assign Teacher / Student roles per course (spec §4.2)"
      subtitleVi="Gan vai tro Teacher / Student cho tung khoa hoc"
    >
      {!courseId && (
        <Card className="p-4">
          <p className="text-sm text-on-surface-variant">
            {isVi
              ? 'Vui long mo trang nay tu mot khoa hoc cu the (?courseId=...).'
              : 'Open this page from a specific course (?courseId=...).'}
          </p>
        </Card>
      )}

      {error && courseId && (
        <Card className="p-4 border border-error/30">
          <p className="text-sm text-error">{error}</p>
        </Card>
      )}

      {courseId && (
        <Card className="p-6">
          <h3 className="mb-4 font-bold text-on-surface">
            {isVi ? 'Them nguoi vao khoa hoc' : 'Enroll a user'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3">
            <Input
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder={isVi ? 'User ID (UUID)' : 'User ID (UUID)'}
            />
            <select
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'Teacher' | 'Student')}
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>
            <Button onClick={() => void handleAdd()} disabled={submitting || !newUserId.trim()}>
              {submitting ? (isVi ? 'Dang them...' : 'Adding...') : (isVi ? 'Them' : 'Enroll')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">
            {isVi
              ? 'Tim ID nguoi dung tai trang "Quan ly thanh vien" cua to chuc.'
              : 'Find user IDs on the organization Members page.'}
          </p>
        </Card>
      )}

      {courseId && (
        <Card className="p-6">
          <h3 className="mb-4 font-bold text-on-surface">
            {isVi ? 'Danh sach ghi danh' : 'Course enrollments'}
          </h3>
          {isLoading && (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          )}
          {!isLoading && enrollments.length === 0 && (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              {isVi ? 'Chua co ai duoc ghi danh.' : 'No one is enrolled yet.'}
            </p>
          )}
          {!isLoading && enrollments.length > 0 && (
            <div className="space-y-2">
              {enrollments.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-3">
                  <Badge variant={e.role === 'Teacher' ? 'warning' : 'primary'} size="sm">
                    {e.role}
                  </Badge>
                  <span className="font-mono text-xs text-on-surface-variant">{e.userId}</span>
                  <span className="ml-auto text-xs text-on-surface-variant">
                    {new Date(e.enrolledAt).toLocaleDateString()}
                  </span>
                  <select
                    className="px-2 py-1 rounded border border-outline-variant bg-surface text-on-surface text-sm"
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
      titleVi="Danh ba to chuc"
      subtitleEn="Browse organizations linked with admin scope"
      subtitleVi="Duyet danh sach to chuc lien ket pham vi admin"
    >
      <Card className="p-6">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isVi ? 'Tim to chuc...' : 'Search organizations...'}
        />
      </Card>
      {isLoading && (
        <div className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}
      {error && !isLoading && <p className="text-sm text-error">{error}</p>}
      {!isLoading && filtered.length === 0 && !error && (
        <p className="text-sm text-on-surface-variant text-center py-4">
          {isVi ? 'Khong tim thay to chuc nao.' : 'No organizations found.'}
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
              <Button size="sm">{isVi ? 'Chi tiet' : 'Details'}</Button>
            </div>
          </Card>
        ))}
      </div>
    </OrgShell>
  )
}

export const UnifiedSettingsOrganizationsPage: React.FC = () => {
  const isVi = useLang()

  return (
    <OrgShell
      titleEn="Unified Settings - Organizations"
      titleVi="Cai dat hop nhat - To chuc"
      subtitleEn="Control organization-level defaults"
      subtitleVi="Dieu khien cac cai dat mac dinh cap to chuc"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-on-surface">{isVi ? 'Cau hinh hoc tap' : 'Learning Configuration'}</h3>
          <div className="space-y-3">
            {[
              isVi ? 'Bat che do duyet khoa hoc' : 'Enable course review flow',
              isVi ? 'Tu dong cap chung chi' : 'Auto-issue certificates',
              isVi ? 'Bat gio hoc toi da moi ngay' : 'Enable daily learning cap',
            ].map((label) => (
              <label key={label} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                <span className="text-sm text-on-surface">{label}</span>
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </label>
            ))}
          </div>
        </Card>
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-on-surface">{isVi ? 'Tuong tac thong bao' : 'Notification Rules'}</h3>
          <div className="space-y-3">
            {['Daily digest', 'Course publish alert', 'Weekly analytics summary'].map((rule) => (
              <div key={rule} className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
                <span>{rule}</span>
                <Badge variant="secondary" size="sm">{isVi ? 'Bat' : 'On'}</Badge>
              </div>
            ))}
          </div>
          <Button className="w-full">{isVi ? 'Luu cai dat' : 'Save Settings'}</Button>
        </Card>
      </div>
    </OrgShell>
  )
}

