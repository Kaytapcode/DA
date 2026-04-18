import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

  return (
    <OrgShell
      titleEn="Course Management"
      titleVi="Quan ly khoa hoc"
      subtitleEn="Manage publishing, enrollment, and quality"
      subtitleVi="Quan ly xuat ban, ghi danh va chat luong"
    >
      <div className="flex gap-3">
        <Button>{isVi ? 'Tao khoa hoc' : 'Create Course'}</Button>
        <Button variant="secondary">{isVi ? 'Nhap CSV' : 'Import CSV'}</Button>
      </div>
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left py-3">{isVi ? 'Khoa hoc' : 'Course'}</th>
                <th className="text-left py-3">{isVi ? 'Giang vien' : 'Instructor'}</th>
                <th className="text-left py-3">{isVi ? 'Trang thai' : 'Status'}</th>
                <th className="text-left py-3">{isVi ? 'Hoc vien' : 'Learners'}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Frontend Mastery', 'Nguyen Anh', 'Published', '842'],
                ['Backend Reliability', 'Tran Linh', 'Draft', '0'],
                ['AI Product Basics', 'Le Minh', 'Published', '413'],
              ].map((row) => (
                <tr key={row[0]} className="border-b border-outline-variant/40">
                  <td className="py-3 font-medium">{row[0]}</td>
                  <td className="py-3 text-on-surface-variant">{row[1]}</td>
                  <td className="py-3">
                    <Badge variant={row[2] === 'Published' ? 'success' : 'warning'} size="sm">{row[2]}</Badge>
                  </td>
                  <td className="py-3">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </OrgShell>
  )
}

// ── Content row inside a module ───────────────────────────────────────────────
interface ContentRowProps {
  content: ContentItem;
  index: number;
  total: number;
  onMove: (contentId: string, newIndex: number) => void;
  onDelete: (contentId: string) => void;
  onToggleStatus: (contentId: string, status: 'DRAFT' | 'PUBLISHED') => void;
}

const ContentRow: React.FC<ContentRowProps> = ({
  content, index, total, onMove, onDelete, onToggleStatus,
}) => {
  const isVi = useLang()
  const isPublished = content.status === 'PUBLISHED'

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

  return (
    <OrgShell
      titleEn="Course Editor - Member Roles"
      titleVi="Trinh sua khoa hoc - Vai tro thanh vien"
      subtitleEn="Assign responsibilities per course"
      subtitleVi="Gan trach nhiem cho tung vai tro trong khoa hoc"
    >
      <Card className="p-6">
        <div className="space-y-4">
          {[
            ['Instructor', 'Can create and publish curriculum', 'primary'],
            ['Teaching Assistant', 'Can review submissions and comments', 'secondary'],
            ['Reviewer', 'Can only review and leave feedback', 'warning'],
          ].map((role) => (
            <div key={role[0]} className="p-4 rounded-lg bg-surface-container-low">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-on-surface">{role[0]}</h3>
                <Badge variant={role[2] as 'primary' | 'secondary' | 'warning'} size="sm">{isVi ? 'Dang bat' : 'Active'}</Badge>
              </div>
              <p className="text-sm text-on-surface-variant">{role[1]}</p>
            </div>
          ))}
        </div>
      </Card>
    </OrgShell>
  )
}

export const SystemadminOrganizationDirectoryLight1Page: React.FC = () => {
  const isVi = useLang()
  const [search, setSearch] = useState('')
  const items = ['Lumi Academy', 'Quantum College', 'Future Skills Hub', 'Delta Learning']

  return (
    <OrgShell
      titleEn="Organization Directory (Light 1)"
      titleVi="Danh ba to chuc (Light 1)"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.filter((item) => item.toLowerCase().includes(search.toLowerCase())).map((item) => (
          <Card key={item} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MaterialIcon icon="corporate_fare" className="text-primary" />
                <div>
                  <h3 className="font-semibold text-on-surface">{item}</h3>
                  <p className="text-xs text-on-surface-variant">{isVi ? '18 khoa hoc dang chay' : '18 running courses'}</p>
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

