import React, { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/utils/apiClient'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'

interface AdminContent {
  contentId: string
  title: string
  contentType: string
  status: string
  isCourseScoped: boolean
  resourceId: string | null
  authorName?: string | null
  createdAt: string
}

// Per-type DELETE endpoint (owner / SysAdmin; OrgAdmin can delete course content of their org).
const DELETE_PATH: Record<string, (id: string) => string> = {
  PDF: (id) => `/documents/${id}`,
  DOCUMENT: (id) => `/documents/${id}`,
  QUIZ: (id) => `/quizzes/${id}`,
  FLASHCARD: (id) => `/decks/${id}`,
  VIDEO: (id) => `/videos/${id}`,
}

/**
 * Global content management list. Reads GET /api/contents/all — the BE scopes it by role
 * (SysAdmin = ALL content incl course-scoped; OrgAdmin = content in their org). Supports search +
 * per-type delete. No hardcoded data.
 */
export const GlobalContentList: React.FC<{ isVi?: boolean }> = ({ isVi = false }) => {
  const [items, setItems] = useState<AdminContent[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const t = (vi: string, en: string) => (isVi ? vi : en)

  const load = useCallback(async (q = '') => {
    setLoading(true); setError(null)
    try {
      const res = await apiClient.get<AdminContent[]>(`/contents/all${q ? `?query=${encodeURIComponent(q)}` : ''}`)
      if (res.success && res.data) setItems(res.data)
      else throw new Error(res.message || 'Failed to load content')
    } catch (e: any) {
      setError(e?.message || 'Failed to load content')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load('') }, [load])

  const remove = async (it: AdminContent) => {
    const pathFn = DELETE_PATH[it.contentType]
    if (!pathFn || !it.resourceId) { setError(`Cannot delete ${it.contentType}.`); return }
    if (!window.confirm(t(`Xoá "${it.title}" vĩnh viễn?`, `Permanently delete "${it.title}"?`))) return
    setBusyId(it.contentId); setError(null)
    try {
      const res = await apiClient.delete(pathFn(it.resourceId))
      if (res.success) setItems((prev) => prev.filter((x) => x.contentId !== it.contentId))
      else setError(res.message || 'Delete failed')
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
    } finally { setBusyId(null) }
  }

  const typeColor = (ty: string) => ty === 'QUIZ' ? 'primary' : ty === 'VIDEO' ? 'warning' : 'secondary'

  return (
    <Card className="p-6" data-testid="global-content-card">
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Tìm nội dung...', 'Search content...')}
          onKeyDown={(e) => e.key === 'Enter' && load(query)}
          className="flex-1 min-w-[220px]"
          data-testid="global-content-search"
        />
        <Button variant="secondary" onClick={() => load(query)} data-testid="global-content-search-btn">
          {t('Tìm', 'Search')}
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-error" data-testid="global-content-error">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-on-surface-variant" data-testid="global-content-empty">
          {t('Không có nội dung.', 'No content found.')}
        </p>
      ) : (
        <div className="space-y-2" data-testid="global-content-list">
          {items.map((it) => (
            <div key={it.contentId} data-testid={`global-content-row-${it.contentId}`} className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container-low p-3">
              <Badge variant={typeColor(it.contentType)} size="sm">{it.contentType}</Badge>
              <span className="font-medium text-on-surface">{it.title}</span>
              {it.isCourseScoped && <Badge variant="warning" size="sm">{t('Trong khoá học', 'In course')}</Badge>}
              {it.authorName && <span className="text-xs text-on-surface-variant">{t('Tác giả', 'By')}: {it.authorName}</span>}
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto"
                disabled={busyId === it.contentId}
                onClick={() => void remove(it)}
                data-testid={`global-content-delete-${it.contentId}`}
              >
                <MaterialIcon icon="delete" size="xs" className="mr-1" />
                {t('Xoá', 'Delete')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
