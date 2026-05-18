import React, { useCallback, useEffect, useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { apiClient } from '@/utils/apiClient'
import { useUserLanguage } from './UserShell'

// Spec §1 User: "Can view other public resources but cannot edit resources not owned by them.
// Can copy other public resources to create a personal version..."
// Talks to BE/Content.Api/Controllers/PublicContentController.cs and ContentCloneController.cs.

interface PublicContentRow {
  id: string
  title: string
  contentType: 'QUIZ' | 'FLASHCARD' | 'VIDEO' | 'PDF' | string
  status: string
  createdByUserId: string | null
  createdAt: string
  ownedByCaller: boolean
}

const TYPES: Array<{ key: '' | PublicContentRow['contentType']; labelEn: string; labelVi: string; icon: string }> = [
  { key: '', labelEn: 'All', labelVi: 'Tat ca', icon: 'apps' },
  { key: 'QUIZ', labelEn: 'Quizzes', labelVi: 'Quiz', icon: 'quiz' },
  { key: 'FLASHCARD', labelEn: 'Flashcards', labelVi: 'The ghi nho', icon: 'style' },
  { key: 'VIDEO', labelEn: 'Videos', labelVi: 'Video', icon: 'play_circle' },
  { key: 'PDF', labelEn: 'Documents', labelVi: 'Tai lieu', icon: 'description' },
]

export const BrowsePublicPage: React.FC = () => {
  const isVi = useUserLanguage()
  const [rows, setRows] = useState<PublicContentRow[]>([])
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'' | PublicContentRow['contentType']>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [clonedIds, setClonedIds] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (query.trim()) params.set('query', query.trim())
      params.set('limit', '50')
      const res = await apiClient.get<PublicContentRow[]>(`/public-content?${params}`)
      if (res.success && res.data) setRows(res.data)
      else throw new Error(res.message || 'Failed to load')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setIsLoading(false)
    }
  }, [type, query])

  useEffect(() => { void refresh() }, [refresh])

  const handleClone = async (row: PublicContentRow) => {
    setCloningId(row.id)
    setError(null)
    try {
      const res = await apiClient.post(`/contents/${row.id}/clone`)
      if (!res.success) throw new Error(res.message || 'Failed to copy')
      setClonedIds((prev) => new Set(prev).add(row.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy')
    } finally {
      setCloningId(null)
    }
  }

  const typeIcon = (t: string): string => {
    switch (t) {
      case 'QUIZ': return 'quiz'
      case 'FLASHCARD': return 'style'
      case 'VIDEO': return 'play_circle'
      case 'PDF': return 'description'
      default: return 'article'
    }
  }

  return (
    <MainLayout
      navbar={<UserNavbar title={isVi ? 'Kham pha' : 'Browse Public'} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-on-surface font-headline">
              {isVi ? 'Tai nguyen cong cong' : 'Public resources'}
            </h2>
            <p className="text-on-surface-variant">
              {isVi
                ? 'Xem tai nguyen cong cong tu nguoi dung khac. Sao chep ve thu vien ca nhan de tao phien ban cua rieng ban.'
                : 'Browse public resources shared by other users. Copy any of them to your personal library.'}
            </p>
          </div>

          {/* {error && (
            <Card className="border border-error/30 p-4">
              <p className="text-sm text-error">{error}</p>
            </Card>
          )} */}

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isVi ? 'Tim kiem...' : 'Search...'}
                onKeyDown={(e) => e.key === 'Enter' && void refresh()}
              />
              <Button variant="secondary" onClick={() => void refresh()}>
                {isVi ? 'Tim' : 'Search'}
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TYPES.map((t) => {
                const active = type === t.key
                return (
                  <button
                    key={t.key || 'ALL'}
                    onClick={() => setType(t.key)}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition',
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-low',
                    ].join(' ')}
                  >
                    <MaterialIcon icon={t.icon} size="xs" fill={active} />
                    {isVi ? t.labelVi : t.labelEn}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="p-6">
            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            )}
            {!isLoading && rows.length === 0 && !error && (
              <p className="py-6 text-center text-sm text-on-surface-variant">
                {isVi ? 'Khong tim thay tai nguyen nao.' : 'No resources found.'}
              </p>
            )}
            {!isLoading && rows.length > 0 && (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eef2ff] text-[#4f6cf7]">
                      <MaterialIcon icon={typeIcon(row.contentType)} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-on-surface">{row.title}</p>
                      <p className="truncate text-xs text-on-surface-variant">
                        {row.contentType} • {new Date(row.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {row.ownedByCaller ? (
                      <Badge variant="secondary" size="sm">
                        {isVi ? 'Cua ban' : 'Yours'}
                      </Badge>
                    ) : clonedIds.has(row.id) ? (
                      <Badge variant="success" size="sm">
                        {isVi ? 'Da sao chep' : 'Copied'}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void handleClone(row)}
                        disabled={cloningId === row.id}
                      >
                        <MaterialIcon icon="content_copy" size="xs" className="mr-1" />
                        {cloningId === row.id
                          ? (isVi ? 'Dang sao chep...' : 'Copying...')
                          : (isVi ? 'Sao chep' : 'Copy to library')}
                      </Button>
                    )}
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

export default BrowsePublicPage
