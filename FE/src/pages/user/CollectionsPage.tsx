import React, { useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { useCollections } from '@/hooks/useCollections'
import { useUserLanguage } from './UserShell'

// Spec §3.1 "Collection (For Users)": user-created groupings of learning resources.
export const CollectionsPage: React.FC = () => {
  const isVi = useUserLanguage()
  const { collections, isLoading, error, create, remove } = useCollections()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim()) return
    setIsCreating(true)
    const result = await create(title.trim(), description.trim() || undefined)
    if (result) {
      setTitle('')
      setDescription('')
    }
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(isVi ? 'Xoa bo suu tap nay?' : 'Delete this collection?')) return
    setBusyId(id)
    await remove(id)
    setBusyId(null)
  }

  return (
    <MainLayout
      navbar={<UserNavbar title={isVi ? 'Bo Suu Tap' : 'Collections'} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-on-surface font-headline">
              {isVi ? 'Bo suu tap cua ban' : 'Your collections'}
            </h2>
            <p className="text-on-surface-variant">
              {isVi
                ? 'Nhom Quiz, tai lieu, video va the ghi nho thanh cac bo suu tap ca nhan.'
                : 'Group quizzes, documents, videos, and flashcard decks into personal collections.'}
            </p>
          </div>

          {error && (
            <Card className="border border-error/30 p-4">
              <p className="text-sm text-error">{error}</p>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-on-surface">
              <MaterialIcon icon="add_circle" />
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
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void handleCreate()} disabled={isCreating || !title.trim()}>
                {isCreating ? (isVi ? 'Dang tao...' : 'Creating...') : (isVi ? 'Tao' : 'Create')}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-on-surface">{isVi ? 'Danh sach' : 'All collections'}</h3>
            </div>
            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            )}
            {!isLoading && collections.length === 0 && (
              <p className="py-4 text-center text-sm text-on-surface-variant">
                {isVi ? 'Chua co bo suu tap nao.' : 'No collections yet.'}
              </p>
            )}
            {!isLoading && collections.length > 0 && (
              <div className="space-y-2">
                {collections.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-3">
                    <MaterialIcon icon="folder" className="text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-on-surface">{c.title}</p>
                      {c.description && (
                        <p className="truncate text-sm text-on-surface-variant">{c.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDelete(c.id)}
                      disabled={busyId === c.id}
                    >
                      <MaterialIcon icon="delete" size="xs" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

export default CollectionsPage
