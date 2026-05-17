import React, { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { useCollections, type Collection, type CollectionItem } from '@/hooks/useCollections'
import { useUserLanguage } from './UserShell'

const itemHref = (item: CollectionItem, collection?: Collection | null): string | null => {
  const col = collection
    ? `&collectionId=${collection.id}&collectionTitle=${encodeURIComponent(collection.title)}`
    : ''
  switch (item.contentType) {
    case 'QUIZ': return item.quizId ? `/user/quiz?quizId=${item.quizId}${col}` : null
    case 'FLASHCARD': return item.deckId ? `/user/flashcards?deckId=${item.deckId}&contentId=${item.contentId}${col}` : null
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
  const { collections, isLoading, error, create, remove, getItems, removeItem } = useCollections()

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

  const handleSelectCollection = useCallback(async (c: Collection) => {
    setSelectedCollection(c)
    setItemsLoading(true)
    const result = await getItems(c.id)
    setItems(result)
    setItemsLoading(false)
  }, [getItems])

  const handleBack = useCallback(() => {
    setSelectedCollection(null)
    setItems([])
  }, [])

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
    setBusyId(id)
    await remove(id)
    setConfirmDeleteId(null)
    setBusyId(null)
  }

  const handleRemoveItem = async (contentId: string) => {
    if (!selectedCollection) return
    setBusyContentId(contentId)
    await removeItem(selectedCollection.id, contentId)
    setItems((prev) => prev.filter((i) => i.contentId !== contentId))
    setBusyContentId(null)
  }

  // ── Collection detail view ─────────────────────────────────────────────────
  if (selectedCollection) {
    return (
      <MainLayout navbar={<UserNavbar title={isVi ? 'Bo Suu Tap' : 'Collections'} />} sidebar={<UserSidebar />}>
        <div className="min-h-screen bg-[#f6f8fb] p-8">
          <div className="mx-auto max-w-[1100px] space-y-6">
            <div className="flex items-start gap-4 border-b border-[#dde3ec] pb-6">
              <button
                type="button"
                onClick={handleBack}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-[#d5dde9] bg-white px-3 py-2 text-sm font-medium text-[#5e6f88] transition hover:bg-[#f0f4f9]"
              >
                <MaterialIcon icon="arrow_back" size="xs" />
                {isVi ? 'Quay lai' : 'Back'}
              </button>
              <div>
                <h2 className="text-4xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">
                  {selectedCollection.title}
                </h2>
                {selectedCollection.description && (
                  <p className="mt-1 text-sm text-[#60708a]">{selectedCollection.description}</p>
                )}
                <p className="mt-1 text-xs text-[#8a98b0]">
                  {items.length} {isVi ? 'muc' : 'items'}
                </p>
              </div>
            </div>

            {itemsLoading && (
              <Card>
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              </Card>
            )}

            {!itemsLoading && items.length === 0 && (
              <Card className="border-dashed">
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <MaterialIcon icon="inventory_2" size="md" className="text-[#9aa5b5]" />
                  <p className="text-sm text-[#60708a]">
                    {isVi ? 'Chua co muc nao trong bo suu tap nay.' : 'No items in this collection yet.'}
                  </p>
                  <p className="text-xs text-[#8a98b0]">
                    {isVi
                      ? 'Vao Thu Vien va bam nut them vao bo suu tap tren moi the tai lieu.'
                      : 'Go to your Library and tap the bookmark icon on any content card.'}
                  </p>
                  <Link
                    to="/user/library"
                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
                  >
                    <MaterialIcon icon="library_books" size="xs" />
                    {isVi ? 'Mo Thu Vien' : 'Go to Library'}
                  </Link>
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
                            {href ? (isVi ? 'Mo' : 'Open') : '—'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); void handleRemoveItem(item.contentId) }}
                            disabled={busyContentId === item.contentId}
                            className="rounded-full p-1 text-[#8a98b0] transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                            title={isVi ? 'Xoa khoi bo suu tap' : 'Remove from collection'}
                          >
                            <MaterialIcon icon="remove_circle_outline" size="xs" />
                          </button>
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
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── Collections grid view ──────────────────────────────────────────────────
  return (
    <MainLayout navbar={<UserNavbar title={isVi ? 'Bo Suu Tap' : 'Collections'} />} sidebar={<UserSidebar />}>
      <div className="min-h-screen bg-[#f6f8fb] p-8">
        <div className="mx-auto max-w-[1100px] space-y-6">

          <section className="flex items-end justify-between border-b border-[#dde3ec] pb-6">
            <div>
              <h2 className="text-5xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">
                {isVi ? 'Bo Suu Tap' : 'Collections'}
              </h2>
              <p className="mt-2 text-base text-[#60708a]">
                {isVi
                  ? 'Nhom cac tai nguyen hoc tap thanh bo suu tap ca nhan.'
                  : 'Group learning resources into personal, customizable collections.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
            >
              <MaterialIcon icon="add" size="xs" />
              {isVi ? 'Tao moi' : 'New Collection'}
            </button>
          </section>

          {showCreateForm && (
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
                <MaterialIcon icon="create_new_folder" />
                {isVi ? 'Tao bo suu tap moi' : 'Create a new collection'}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label={isVi ? 'Tieu de' : 'Title'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isVi ? 'Vi du: On thi giua ky' : 'e.g. Midterm review'}
                />
                <Input
                  label={isVi ? 'Mo ta (tuy chon)' : 'Description (optional)'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowCreateForm(false); setTitle(''); setDescription('') }}>
                  {isVi ? 'Huy' : 'Cancel'}
                </Button>
                <Button onClick={() => void handleCreate()} disabled={isCreating || !title.trim()}>
                  {isCreating ? (isVi ? 'Dang tao...' : 'Creating...') : (isVi ? 'Tao' : 'Create')}
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
                  {isVi ? 'Chua co bo suu tap nao.' : 'No collections yet. Create one to get started.'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
                >
                  <MaterialIcon icon="add" size="xs" />
                  {isVi ? 'Tao bo suu tap dau tien' : 'Create first collection'}
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
                        {isVi ? 'Xoa vinh vien bo suu tap nay?' : 'Permanently delete this collection?'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDelete(c.id)}
                          disabled={busyId === c.id}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {busyId === c.id ? (isVi ? 'Dang xoa...' : 'Deleting…') : (isVi ? 'Xac nhan' : 'Confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[#d5dde9] bg-white px-4 py-2 text-sm font-semibold text-[#5e6f88] transition hover:bg-[#f0f4f9]"
                        >
                          {isVi ? 'Huy' : 'Cancel'}
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
                          </div>
                        </Card>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1.5 text-white/70 transition-colors hover:bg-red-600 hover:text-white"
                        title={isVi ? 'Xoa' : 'Delete'}
                      >
                        <MaterialIcon icon="delete" size="xs" />
                      </button>
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
