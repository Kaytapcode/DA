import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { useCollections, type Collection, type CollectionItem } from '@/hooks/useCollections'
import { useUserLanguage } from './UserShell'
import { apiClient } from '@/utils/apiClient'

// Library resource types that can be added into a collection. Each maps to a list endpoint
// whose rows expose a `contentId` (the polymorphic Content id the collection stores).
const LIB_TYPES = [
  { key: 'PDF', endpoint: '/documents', labelEn: 'Documents', labelVi: 'Tài liệu' },
  { key: 'VIDEO', endpoint: '/videos', labelEn: 'Videos', labelVi: 'Video' },
  { key: 'QUIZ', endpoint: '/quizzes', labelEn: 'Quizzes', labelVi: 'Quiz' },
  { key: 'FLASHCARD', endpoint: '/flashcard-decks', labelEn: 'Decks', labelVi: 'Bộ thẻ' },
] as const

const itemHref = (item: CollectionItem, collection?: Collection | null): string | null => {
  const col = collection
    ? `&collectionId=${collection.id}&collectionTitle=${encodeURIComponent(collection.title)}`
    : ''
  switch (item.contentType) {
    case 'QUIZ': return item.quizId ? `/user/quiz?quizId=${item.quizId}&contentId=${item.contentId}${col}` : null
    case 'FLASHCARD': return item.deckId ? `/user/flashcards?deckId=${item.deckId}&contentId=${item.contentId}&owned=${collection?.ownedByCaller ?? true}${col}` : null
    case 'PDF': return item.documentId ? `/user/documents?docId=${item.documentId}&contentId=${item.contentId}${col}` : null
    case 'VIDEO': return item.videoId ? `/user/videos/watch/${item.videoId}${col}` : null
    default: return null
  }
}

const itemGradient = (contentType: string): string => {
  switch (contentType) {
    case 'QUIZ': return 'linear-gradient(140deg,#0f172a,#1e3a8a,#a78bfa)'
    case 'FLASHCARD': return 'linear-gradient(140deg,#d4dbe3,#e5eaef,#f59e0b)'
    case 'VIDEO': return 'linear-gradient(140deg,#0f766e,#155e75,#111827)'
    default: return 'linear-gradient(140deg,#f1ede7,#ded1c8,#d7d2de)'
  }
}

const FOLDER_GRADIENT = 'linear-gradient(140deg,#1463ff,#0f43b8,#7c3aed)'

// Spec §3.1 "Collection (For Users)": user-created groupings of learning resources.
export const CollectionsPage: React.FC = () => {
  const isVi = useUserLanguage()
  const location = useLocation()
  const { collections, isLoading, error, create, remove, getSections, getItems, addItem, removeItem } = useCollections()
  const autoOpenRef = useRef(false)

  // In-page "Add content" panel (so users don't have to leave for the Library).
  // `addTargetId` is the module the content is added to: the collection root, or a section.
  const [showAddContent, setShowAddContent] = useState(false)
  const [addType, setAddType] = useState<(typeof LIB_TYPES)[number]['key']>('PDF')
  const [libResources, setLibResources] = useState<Array<{ contentId: string; title: string }>>([])
  const [libLoading, setLibLoading] = useState(false)
  const [addingContentId, setAddingContentId] = useState<string | null>(null)
  const [addTargetId, setAddTargetId] = useState<string | null>(null)

  // Optional "sections" (child modules) that divide a collection's content into parts.
  const [sections, setSections] = useState<Collection[]>([])
  const [sectionItems, setSectionItems] = useState<Record<string, CollectionItem[]>>({})
  const [showAddSection, setShowAddSection] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const [creatingSection, setCreatingSection] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [items, setItems] = useState<CollectionItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [busyContentId, setBusyContentId] = useState<string | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadSections = useCallback(async (collectionId: string) => {
    const secs = await getSections(collectionId)
    setSections(secs)
    const entries = await Promise.all(secs.map(async (s) => [s.id, await getItems(s.id)] as const))
    setSectionItems(Object.fromEntries(entries))
  }, [getSections, getItems])

  const handleSelectCollection = useCallback(async (c: Collection) => {
    setSelectedCollection(c)
    setShowAddContent(false)
    setShowAddSection(false)
    setAddTargetId(c.id)
    setItemsLoading(true)
    const result = await getItems(c.id)
    setItems(result)
    setItemsLoading(false)
    await loadSections(c.id)
  }, [getItems, loadSections])

  const handleBack = useCallback(() => {
    setSelectedCollection(null)
    setItems([])
    setSections([])
    setSectionItems({})
  }, [])

  const handleCreateSection = async () => {
    if (!selectedCollection || !sectionTitle.trim()) return
    setCreatingSection(true)
    const ok = await create(sectionTitle.trim(), undefined, selectedCollection.id)
    if (ok) {
      setSectionTitle('')
      setShowAddSection(false)
      await loadSections(selectedCollection.id)
    }
    setCreatingSection(false)
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsCreating(true)
    const result = await create(title.trim(), description.trim() || undefined)
    if (result) {
      setTitle('')
      setDescription('')
      setShowCreateForm(false)
    }
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    const target = collections.find((c) => c.id === id)
    if (!target?.ownedByCaller) return
    setBusyId(id)
    await remove(id)
    setConfirmDeleteId(null)
    setBusyId(null)
  }

  const handleRemoveItem = async (contentId: string) => {
    if (!selectedCollection || !selectedCollection.ownedByCaller) return
    setBusyContentId(contentId)
    await removeItem(selectedCollection.id, contentId)
    setItems((prev) => prev.filter((i) => i.contentId !== contentId))
    setBusyContentId(null)
  }

  // Load the user's library content of the chosen type so it can be added to the collection.
  // Reuses the same list endpoints the rest of the app uses (no hardcoded data).
  const loadLibrary = useCallback(async (typeKey: (typeof LIB_TYPES)[number]['key']) => {
    const cfg = LIB_TYPES.find((t) => t.key === typeKey)
    if (!cfg) return
    setLibLoading(true)
    setLibResources([])
    try {
      const res = await apiClient.get<any[]>(cfg.endpoint)
      if (res.success && res.data) {
        setLibResources(
          res.data
            .map((r: any) => ({ contentId: r.contentId ?? r.id, title: r.title ?? r.fileName ?? r.name ?? '(untitled)' }))
            .filter((r: { contentId?: string }) => !!r.contentId)
        )
      }
    } catch {
      setLibResources([])
    } finally {
      setLibLoading(false)
    }
  }, [])

  // Open the add-content panel targeting either the collection root (default) or a section.
  const openAddContent = async (targetId?: string) => {
    setAddTargetId(targetId ?? selectedCollection?.id ?? null)
    setShowAddContent(true)
    await loadLibrary(addType)
  }

  const handleAddToCollection = async (contentId: string) => {
    const target = addTargetId ?? selectedCollection?.id
    if (!target) return
    setAddingContentId(contentId)
    const ok = await addItem(target, contentId)
    if (ok) {
      if (selectedCollection && target === selectedCollection.id) {
        setItems(await getItems(selectedCollection.id))
      } else {
        setSectionItems((prev) => ({ ...prev }))
        const refreshed = await getItems(target)
        setSectionItems((prev) => ({ ...prev, [target]: refreshed }))
      }
    }
    setAddingContentId(null)
  }

  // Content ids already in the CURRENT add target — hide them from the add list.
  const targetExistingIds = new Set(
    (addTargetId && selectedCollection && addTargetId !== selectedCollection.id
      ? (sectionItems[addTargetId] ?? [])
      : items
    ).map((i) => i.contentId)
  )

  // Auto-open a collection when navigated from search results (?collectionId=).
  useEffect(() => {
    if (autoOpenRef.current || isLoading || selectedCollection) return
    const collectionId = new URLSearchParams(location.search).get('collectionId')
    if (!collectionId) { autoOpenRef.current = true; return }
    const target = collections.find((c) => c.id === collectionId)
    if (target) { autoOpenRef.current = true; void handleSelectCollection(target) }
  }, [isLoading, collections, selectedCollection, location.search, handleSelectCollection])

  // ── Collection detail view ─────────────────────────────────────────────────
  if (selectedCollection) {
    return (
      <MainLayout navbar={<UserNavbar title={isVi ? 'Bộ Sưu Tập' : 'Collections'} />} sidebar={<UserSidebar />}>
        <div className="min-h-screen bg-[#f6f8fb] p-8">
          <div className="mx-auto max-w-[1100px] space-y-6">
            <div className="flex items-start gap-4 border-b border-[#dde3ec] pb-6">
              <button
                type="button"
                onClick={handleBack}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-[#d5dde9] bg-white px-3 py-2 text-sm font-medium text-[#5e6f88] transition hover:bg-[#f0f4f9]"
              >
                <MaterialIcon icon="arrow_back" size="xs" />
                {isVi ? 'Quay lại' : 'Back'}
              </button>
              <div>
                <h2 className="text-4xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">
                  {selectedCollection.title}
                </h2>
                {selectedCollection.description && (
                  <p className="mt-1 text-sm text-[#60708a]">{selectedCollection.description}</p>
                )}
                <p className="mt-1 text-xs text-[#8a98b0]">
                  {items.length} {isVi ? 'mục' : 'items'}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#1463ff]">
                  {selectedCollection.ownedByCaller ? (isVi ? 'Bộ sưu tập của bạn' : 'Your collection') : (isVi ? 'Bộ sưu tập công khai' : 'Public collection')}
                </p>
              </div>
            </div>

            {selectedCollection.ownedByCaller && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => { setShowAddSection((v) => !v) }}
                  data-testid="collection-add-section-btn"
                >
                  <MaterialIcon icon="create_new_folder" size="xs" />
                  {isVi ? 'Thêm phần (module)' : 'Add section'}
                </Button>
                <Button
                  onClick={() => { if (showAddContent && (addTargetId === selectedCollection.id)) { setShowAddContent(false) } else { void openAddContent(selectedCollection.id) } }}
                  data-testid="collection-add-content-btn"
                >
                  <MaterialIcon icon="add" size="xs" />
                  {isVi ? 'Thêm nội dung' : 'Add content'}
                </Button>
              </div>
            )}

            {showAddSection && selectedCollection.ownedByCaller && (
              <Card className="p-4" data-testid="collection-add-section-panel">
                <p className="mb-2 text-sm font-semibold text-on-surface">
                  {isVi ? 'Tạo phần mới để chia nội dung' : 'Create a section to organize content'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    data-testid="collection-section-title-input"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder={isVi ? 'Tên phần, ví dụ: Chương 1' : 'Section name, e.g. Chapter 1'}
                    className="flex-1 min-w-[220px]"
                  />
                  <Button
                    data-testid="collection-section-create-btn"
                    onClick={() => void handleCreateSection()}
                    disabled={creatingSection || !sectionTitle.trim()}
                  >
                    {creatingSection ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo phần' : 'Create section')}
                  </Button>
                </div>
              </Card>
            )}

            {showAddContent && selectedCollection.ownedByCaller && (
              <Card className="p-6" data-testid="collection-add-content-panel">
                <p className="mb-3 text-sm font-semibold text-on-surface" data-testid="collection-add-target">
                  {addTargetId && addTargetId !== selectedCollection.id
                    ? `${isVi ? 'Thêm vào phần' : 'Adding to section'}: ${sections.find((s) => s.id === addTargetId)?.title ?? ''}`
                    : (isVi ? 'Thêm vào bộ sưu tập' : 'Adding to collection')}
                </p>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-on-surface-variant">{isVi ? 'Loại:' : 'Type:'}</span>
                  {LIB_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      data-testid={`collection-addtype-${t.key}`}
                      onClick={() => { setAddType(t.key); void loadLibrary(t.key) }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${addType === t.key ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'}`}
                    >
                      {isVi ? t.labelVi : t.labelEn}
                    </button>
                  ))}
                </div>
                {libLoading && (
                  <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>
                )}
                {!libLoading && libResources.filter((r) => !targetExistingIds.has(r.contentId)).length === 0 && (
                  <p className="py-3 text-sm text-on-surface-variant" data-testid="collection-add-empty">
                    {isVi ? 'Không có nội dung loại này trong thư viện của bạn.' : 'No content of this type in your library.'}
                  </p>
                )}
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {libResources.filter((r) => !targetExistingIds.has(r.contentId)).map((r) => (
                    <div key={r.contentId} className="flex items-center justify-between rounded-lg border border-outline-variant px-3 py-2">
                      <span className="truncate text-sm text-on-surface">{r.title}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        data-testid={`collection-add-item-${r.contentId}`}
                        disabled={addingContentId === r.contentId}
                        onClick={() => void handleAddToCollection(r.contentId)}
                      >
                        {addingContentId === r.contentId ? (isVi ? 'Đang thêm...' : 'Adding...') : (isVi ? 'Thêm' : 'Add')}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {itemsLoading && (
              <Card>
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              </Card>
            )}

            {!itemsLoading && items.length === 0 && sections.length === 0 && (
              <Card className="border-dashed">
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <MaterialIcon icon="inventory_2" size="md" className="text-[#9aa5b5]" />
                  <p className="text-sm text-[#60708a]">
                    {isVi ? 'Chưa có mục nào trong bộ sưu tập này.' : 'No items in this collection yet.'}
                  </p>
                   {selectedCollection.ownedByCaller ? (
                     <>
                       <p className="text-xs text-[#8a98b0]">
                         {isVi
                           ? 'Vào Thư Viện và bấm nút thêm vào bộ sưu tập trên mỗi thẻ tài liệu.'
                           : 'Go to your Library and tap the bookmark icon on any content card.'}
                       </p>
                       <Link
                         to="/user/library"
                         className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
                       >
                         <MaterialIcon icon="library_books" size="xs" />
                         {isVi ? 'Mở Thư Viện' : 'Go to Library'}
                       </Link>
                     </>
                   ) : (
                     <p className="text-xs text-[#8a98b0]">
                       {isVi
                         ? 'Bộ sưu tập công khai này hiện không có mục nào bạn có thể truy cập.'
                         : 'This public collection currently has no accessible items for your account.'}
                     </p>
                   )}
                 </div>
               </Card>
             )}

            {!itemsLoading && items.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const href = itemHref(item, selectedCollection)
                  const cardBody = (
                    <Card className="overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none transition hover:border-[#1463ff] hover:shadow-md">
                      <div
                        className="relative h-24 overflow-hidden rounded-t-2xl"
                        style={{ background: itemGradient(item.contentType) }}
                      >
                        <span className="absolute left-2 top-2 rounded-full bg-[#111b2d]/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                          {item.contentType}
                        </span>
                      </div>
                      <div className="p-4">
                        <h4 className="mb-2 line-clamp-2 text-sm font-bold text-[#111b2d]">{item.title}</h4>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1463ff]">
                            {href ? (isVi ? 'Mở' : 'Open') : '—'}
                          </span>
                          {selectedCollection.ownedByCaller && (
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); void handleRemoveItem(item.contentId) }}
                              disabled={busyContentId === item.contentId}
                              className="rounded-full p-1 text-[#8a98b0] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                              title={isVi ? 'Xóa khỏi bộ sưu tập' : 'Remove from collection'}
                            >
                              <MaterialIcon icon="remove_circle_outline" size="xs" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                  return href ? (
                    <Link key={item.contentId} to={href} className="block">{cardBody}</Link>
                  ) : (
                    <div key={item.contentId}>{cardBody}</div>
                  )
                })}
              </div>
            )}

            {/* Optional sections (child modules) dividing the collection into parts. */}
            {sections.length > 0 && (
              <div className="space-y-4" data-testid="collection-sections">
                <h3 className="text-lg font-bold text-[#111b2d]">{isVi ? 'Các phần' : 'Sections'}</h3>
                {sections.map((sec) => {
                  const secItems = sectionItems[sec.id] ?? []
                  return (
                    <Card key={sec.id} className="p-4" data-testid={`collection-section-${sec.id}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-[#111b2d]">{sec.title}</h4>
                          <p className="text-xs text-[#8a98b0]">{secItems.length} {isVi ? 'mục' : 'items'}</p>
                        </div>
                        {selectedCollection.ownedByCaller && (
                          <Button
                            size="sm"
                            variant="secondary"
                            data-testid={`collection-section-add-${sec.id}`}
                            onClick={() => { if (showAddContent && addTargetId === sec.id) { setShowAddContent(false) } else { void openAddContent(sec.id) } }}
                          >
                            <MaterialIcon icon="add" size="xs" />
                            {isVi ? 'Thêm nội dung' : 'Add content'}
                          </Button>
                        )}
                      </div>
                      {secItems.length === 0 ? (
                        <p className="text-sm text-[#8a98b0]">{isVi ? 'Phần này chưa có nội dung.' : 'No content in this section yet.'}</p>
                      ) : (
                        <ul className="space-y-1">
                          {secItems.map((it) => (
                            <li key={it.contentId} className="flex items-center gap-2 rounded-lg border border-[#e3e8f3] px-3 py-2 text-sm">
                              <span className="rounded bg-[#eef2ff] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#1463ff]">{it.contentType}</span>
                              <span className="truncate text-[#111b2d]">{it.title}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Collections grid view ──────────────────────────────────────────────────
  return (
    <MainLayout navbar={<UserNavbar title={isVi ? 'Bộ Sưu Tập' : 'Collections'} />} sidebar={<UserSidebar />}>
      <div className="min-h-screen bg-[#f6f8fb] p-8">
        <div className="mx-auto max-w-[1100px] space-y-6">

          <section className="flex items-end justify-between border-b border-[#dde3ec] pb-6">
            <div>
              <h2 className="text-5xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">
                {isVi ? 'Bộ Sưu Tập' : 'Collections'}
              </h2>
              <p className="mt-2 text-base text-[#60708a]">
                {isVi
                  ? 'Truy cập bộ sưu tập của bạn và các bộ sưu tập công khai từ người dùng khác.'
                  : 'Access your collections and public collections created by other users.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              data-testid="collection-new-btn"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
            >
              <MaterialIcon icon="add" size="xs" />
              {isVi ? 'Tạo mới' : 'New Collection'}
            </button>
          </section>

          {showCreateForm && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
                <MaterialIcon icon="create_new_folder" />
                {isVi ? 'Tạo bộ sưu tập mới' : 'Create a new collection'}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label={isVi ? 'Tiêu đề' : 'Title'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isVi ? 'Ví dụ: Ôn thi giữa kỳ' : 'e.g. Midterm review'}
                  data-testid="collection-title-input"
                />
                <Input
                  label={isVi ? 'Mô tả (tuỳ chọn)' : 'Description (optional)'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="collection-description-input"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowCreateForm(false); setTitle(''); setDescription('') }} data-testid="collection-cancel-btn">
                  {isVi ? 'Hủy' : 'Cancel'}
                </Button>
                <Button onClick={() => void handleCreate()} disabled={isCreating || !title.trim()} data-testid="collection-create-btn">
                  {isCreating ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo' : 'Create')}
                </Button>
              </div>
            </Card>
          )}

          {error && (
            <Card className="border border-error/30 p-4">
              <p className="text-sm text-error">{error}</p>
            </Card>
          )}

          {isLoading && (
            <Card>
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            </Card>
          )}

          {!isLoading && collections.length === 0 && (
            <Card className="border-dashed">
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <MaterialIcon icon="folder_open" size="md" className="text-[#9aa5b5]" />
                <p className="text-sm text-[#60708a]">
                  {isVi ? 'Chưa có bộ sưu tập nào.' : 'No collections yet. Create one to get started.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
                >
                  <MaterialIcon icon="add" size="xs" />
                  {isVi ? 'Tạo bộ sưu tập đầu tiên' : 'Create first collection'}
                </button>
              </div>
            </Card>
          )}

          {!isLoading && collections.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {collections.map((c) => (
                <div key={c.id} className="relative">
                  {confirmDeleteId === c.id ? (
                    <div className="flex min-h-[190px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6">
                      <p className="mb-4 text-center text-sm font-semibold text-red-700">
                        {isVi ? 'Xóa vĩnh viễn bộ sưu tập này?' : 'Permanently delete this collection?'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          disabled={busyId === c.id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {busyId === c.id ? (isVi ? 'Đang xóa...' : 'Deleting…') : (isVi ? 'Xác nhận' : 'Confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[#d5dde9] bg-white px-4 py-2 text-sm font-semibold text-[#5e6f88] transition hover:bg-[#f0f4f9]"
                        >
                          {isVi ? 'Hủy' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSelectCollection(c)}
                        className="block w-full text-left"
                      >
                        <Card className="cursor-pointer overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none transition hover:border-[#1463ff] hover:shadow-md">
                          <div
                            className="relative flex h-28 items-center justify-center overflow-hidden rounded-t-2xl"
                            style={{ background: FOLDER_GRADIENT }}
                          >
                            <MaterialIcon icon="folder" className="text-[56px] text-white/30" />
                          </div>
                          <div className="space-y-1 p-4">
                            <h4 className="line-clamp-1 font-bold text-[#111b2d]">{c.title}</h4>
                            {c.description && (
                              <p className="line-clamp-1 text-xs text-[#60708a]">{c.description}</p>
                            )}
                            <p className="text-xs text-[#8a98b0]">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-[11px] font-semibold text-[#1463ff]">
                              {c.ownedByCaller ? (isVi ? 'Của bạn' : 'Yours') : (isVi ? 'Công khai' : 'Public')}
                            </p>
                          </div>
                        </Card>
                      </button>
                      {c.ownedByCaller && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1.5 text-white/70 transition-colors hover:bg-red-600 hover:text-white"
                          title={isVi ? 'Xóa' : 'Delete'}
                        >
                          <MaterialIcon icon="delete" size="xs" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

export default CollectionsPage
