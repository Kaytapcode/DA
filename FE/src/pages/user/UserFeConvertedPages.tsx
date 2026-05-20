import React, { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { DocumentInlineViewer } from '@components/ui/DocumentInlineViewer'
import { UserShell, useUserLanguage } from './UserShell'
import { useQuiz } from '@/hooks/useQuiz'
import { useFlashcard } from '@/hooks/useFlashcard'
import { useDocumentViewer } from '@/hooks/useDocumentViewer'
import { useOrganization, type OrganizationList } from '@/hooks/useOrganization'
import { useModuleContent, type ModuleItem, type ContentItem } from '@/hooks/useModuleContent'
import { apiClient } from '@/utils/apiClient'

const useLang = useUserLanguage

// Read the current user id from the cached auth_user record. Used by owner-edit gates on
// content viewer pages (deck/quiz/document) — pages render edit affordances only when this
// matches the resource's createdByUserId.
const getCurrentUserId = (): string | null => {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed.id ?? null
  } catch {
    return null
  }
}

// UserHomePage imported from wrapper

interface DashboardHistoryEntry {
  courseId: string | null
  courseTitle: string | null
  moduleId: string | null
  moduleTitle: string | null
  contentId: string | null
  contentTitle: string | null
  contentType: string | null
  progressPercentage: number
  isCompleted: boolean
  activityAt: string
}

export const UserLearningDashboardPage: React.FC = () => {
  const isVi = useLang()
  const [rows, setRows] = useState<DashboardHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    apiClient
      .get<DashboardHistoryEntry[]>('/student-progress/recent?limit=50')
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) setRows(res.data)
        else throw new Error(res.message || 'Unable to load progress')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Unable to load progress')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const featured = rows[0] ?? null
  const completedItems = rows.filter((r) => r.isCompleted).length
  const distinctCourses = new Set(rows.map((r) => r.courseId).filter(Boolean)).size
  const avgProgress = rows.length === 0
    ? 0
    : Math.round(rows.reduce((sum, r) => sum + r.progressPercentage, 0) / rows.length)

  return (
    <UserShell
      titleEn="Learning Dashboard"
      titleVi="Bang dieu khien hoc tap"
      subtitleEn="Track progress and resume your courses"
      subtitleVi="Theo doi tien do va tiep tuc khoa hoc"
    >
      {/* {error && !isLoading && <p className="mb-4 text-sm text-error">{error}</p>} */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                {isVi ? 'Hoat dong gan day' : 'Most recent activity'}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-on-surface">
                {isLoading
                  ? '…'
                  : featured?.courseTitle ?? (isVi ? 'Chua co khoa hoc nao' : 'No course activity yet')}
              </h3>
            </div>
            {featured && (
              <Badge variant="primary">{featured.progressPercentage}%</Badge>
            )}
          </div>
          {featured && (
            <p className="text-on-surface-variant">
              {featured.contentTitle ?? featured.moduleTitle ?? (isVi ? 'Tiep tuc bai hoc tiep theo.' : 'Continue with the next item.')}
            </p>
          )}
          <div className="mt-5 h-2 rounded-full bg-surface-container-low">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${featured?.progressPercentage ?? 0}%` }}
            />
          </div>
          <div className="mt-6 flex gap-3">
            <Link
              to={featured?.courseId ? `/user/course/${featured.courseId}` : '/user/courses'}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary"
            >
              {isVi ? 'Mo khoa hoc' : 'Open Course'}
            </Link>
            <Link
              to="/user/learning"
              className="inline-flex items-center justify-center rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-medium text-on-surface"
            >
              {isVi ? 'Xem lich su' : 'View History'}
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-bold text-on-surface">{isVi ? 'Chi so nhanh' : 'Quick stats'}</h3>
          <div className="space-y-4">
            {[
              { label: isVi ? 'Hoan thanh' : 'Completed items', value: isLoading ? '…' : `${completedItems}` },
              { label: isVi ? 'Khoa hoc' : 'Courses touched', value: isLoading ? '…' : `${distinctCourses}` },
              { label: isVi ? 'Tien do trung binh' : 'Avg. progress', value: isLoading ? '…' : `${avgProgress}%` },
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

export const DocumentViewerPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedId = searchParams.get('docId')
  const contentIdFromUrl = searchParams.get('contentId')
  const collectionTitle = searchParams.get('collectionTitle')
  const {
    documents,
    loaded,
    isDocLoading,
    error,
    fetchList,
    openDocument,
  } = useDocumentViewer()
  const [saved, setSaved] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [resolvedCollectionTitle, setResolvedCollectionTitle] = useState<string | null>(null)
  const docActivityRef = React.useRef<string | null>(null)
  // Always-current snapshot of the document list — updated synchronously before effects run.
  const documentsRef = React.useRef(documents)
  React.useEffect(() => { documentsRef.current = documents }, [documents])

  React.useEffect(() => {
    void fetchList()
  }, [fetchList])

  // Resolve collection name from backend when it isn't already in the URL (e.g. navigating
  // from Library, course view, or a direct link rather than from CollectionsPage).
  React.useEffect(() => {
    if (collectionTitle) { setResolvedCollectionTitle(collectionTitle); return }
    if (!contentIdFromUrl) { setResolvedCollectionTitle(null); return }
    apiClient
      .get<{ id: string; title: string }>(`/collections/for-content/${contentIdFromUrl}`)
      .then((res) => { setResolvedCollectionTitle(res.success && res.data ? res.data.title : null) })
      .catch(() => { setResolvedCollectionTitle(null) })
  }, [contentIdFromUrl, collectionTitle])

  // Open the document when the requested ID changes. We intentionally do NOT include
  // `documents` in the dep array — the list loading should not trigger a second blob fetch.
  // We read the latest list value via documentsRef to pass filename hints when available.
  React.useEffect(() => {
    if (!requestedId) return
    const entry = documentsRef.current.find((d) => d.id === requestedId)
    void openDocument(requestedId, entry?.fileName, entry?.fileType)
  }, [requestedId, openDocument])

  React.useEffect(() => {
    if (requestedId || documents.length === 0) return
    const first = documents[0]
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('docId', first.id)
      return next
    })
  }, [requestedId, documents, setSearchParams])

  const fromHistory = searchParams.get('fromHistory') === 'true'

  React.useEffect(() => {
    if (!loaded || fromHistory) return
    const cId = contentIdFromUrl ?? documents.find((d) => d.id === loaded.id)?.contentId ?? null
    if (!cId || docActivityRef.current === loaded.id) return
    docActivityRef.current = loaded.id
    void apiClient.post('/student-progress/activity', {
      contentId: cId,
      isCompleted: false,
      progressPercentage: 0,
      timeSpentSeconds: 0,
    })
  }, [loaded, contentIdFromUrl, documents, fromHistory])

  const currentEntry = loaded ? documents.find((d) => d.id === loaded.id) : null
  const docYear = currentEntry?.createdAt
    ? new Date(currentEntry.createdAt).getFullYear()
    : null
  // Prefer the real filename from the document list over the placeholder in `loaded.fileName`
  const baseTitle = ((currentEntry?.fileName || loaded?.fileName) || '').replace(/\.[^/.]+$/, '') || (isVi ? 'Tai lieu' : 'Document')

  // Owner-only rename UI: matches the document's createdByUserId against the cached user id.
  // Case-insensitive to be defensive about GUID casing differences.
  const currentUserId = getCurrentUserId()
  const isOwner = !!currentEntry?.createdByUserId && !!currentUserId
    && currentEntry.createdByUserId.toLowerCase() === currentUserId.toLowerCase()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  React.useEffect(() => {
    setIsEditingTitle(false)
    setRenameError(null)
    setTitleDraft(baseTitle)
  }, [baseTitle, currentEntry?.id])

  const saveRename = async () => {
    if (!currentEntry || !titleDraft.trim()) return
    setIsSavingTitle(true)
    setRenameError(null)
    try {
      const res = await apiClient.patch(`/documents/${currentEntry.id}`, { fileName: titleDraft.trim() })
      if (!res.success) throw new Error(res.message || 'Rename failed')
      setIsEditingTitle(false)
      await fetchList()
    } catch (err: any) {
      setRenameError(err?.message || err?.data?.message || (isVi ? 'Khong the doi ten' : 'Rename failed'))
    } finally {
      setIsSavingTitle(false)
    }
  }

  const handleDownload = () => {
    if (!loaded) return
    const link = document.createElement('a')
    link.href = loaded.blobUrl
    link.download = loaded.fileName || 'document'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 1800)
    } catch {
      // clipboard blocked — silent
    }
  }

  const chipBase = 'inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface shadow-sm hover:bg-surface-container-low transition-colors'
  const iconBtn = 'inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors'

  return (
    <UserShell
      titleEn="Document Viewer"
      titleVi="Trinh xem tai lieu"
      subtitleEn="Open and review course documents"
      subtitleVi="Mo va xem lai tai lieu khoa hoc"
    >
      <div className="space-y-6">

          {/* Document title bar — read-only for non-owners; click pencil to rename if you own it. */}
          <div className="flex flex-wrap items-center gap-3">
            {isEditingTitle ? (
              <>
                <input
                  type="text"
                  value={titleDraft}
                  autoFocus
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveRename()
                    if (e.key === 'Escape') { setIsEditingTitle(false); setTitleDraft(baseTitle) }
                  }}
                  className="flex-1 min-w-[280px] rounded-lg border border-outline-variant bg-surface px-3 py-2 text-2xl font-bold text-on-surface focus:border-primary focus:outline-none"
                />
                <Button size="sm" onClick={() => void saveRename()} disabled={isSavingTitle || !titleDraft.trim()}>
                  {isSavingTitle ? (isVi ? 'Dang luu...' : 'Saving...') : (isVi ? 'Luu' : 'Save')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setIsEditingTitle(false); setTitleDraft(baseTitle); setRenameError(null) }} disabled={isSavingTitle}>
                  {isVi ? 'Huy' : 'Cancel'}
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-on-surface">{baseTitle}</h2>
                {isOwner && loaded && (
                  <button
                    type="button"
                    onClick={() => { setTitleDraft(baseTitle); setIsEditingTitle(true) }}
                    className="inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant hover:bg-surface-container-low"
                    title={isVi ? 'Doi ten tai lieu' : 'Rename document'}
                  >
                    <MaterialIcon icon="edit" size="xs" />
                    <span>{isVi ? 'Doi ten' : 'Rename'}</span>
                  </button>
                )}
              </>
            )}
          </div>
          {renameError && <p className="text-sm text-error">{renameError}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-2">
              <MaterialIcon icon="folder" size="xs" />
              <span>{resolvedCollectionTitle ?? (isVi ? 'Tai lieu ca nhan' : 'Personal documents')}</span>
              <span className="text-on-surface-variant/80">| {documents.length} {isVi ? 'tai lieu' : 'documents'}</span>
            </span>
            {docYear && (
              <span className="inline-flex items-center gap-2">
                <MaterialIcon icon="calendar_today" size="xs" />
                <span>{docYear}</span>
              </span>
            )}
            {loaded?.mimeType && (
              <span className="inline-flex items-center gap-2 uppercase tracking-wide">
                <MaterialIcon icon="description" size="xs" />
                <span>{loaded.mimeType.split('/').pop()}</span>
              </span>
            )}
          </div>
          {/* <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="primary"
              onClick={handleDownload}
              disabled={!loaded || isDocLoading}
            >
              <MaterialIcon icon="download" size="xs" className="mr-1.5" />
              {isVi ? 'Tai xuong' : 'Download'}
            </Button>
            <button type="button" className={iconBtn} disabled>
              <MaterialIcon icon="thumb_up" size="xs" />
              <span>0</span>
            </button>
            <button type="button" className={iconBtn} disabled>
              <MaterialIcon icon="thumb_down" size="xs" />
              <span>0</span>
            </button>
            <button
              type="button"
              onClick={() => setSaved((s) => !s)}
              className={`${iconBtn} ${saved ? 'border-primary text-primary' : ''}`}
            >
              <MaterialIcon icon={saved ? 'bookmark' : 'bookmark_border'} size="xs" />
              <span>{isVi ? 'Luu' : 'Save'}</span>
            </button>
            <button type="button" onClick={handleShare} className={iconBtn}>
              <MaterialIcon icon="share" size="xs" />
              <span>{shareToast ? (isVi ? 'Da sao chep' : 'Copied') : (isVi ? 'Chia se' : 'Share')}</span>
            </button>
          </div> */}
          <div className="min-h-[90vh] rounded-2xl bg-surface-container-low">
            {isDocLoading ? (
              <div className="flex h-[90vh] items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="flex h-[90vh] items-center justify-center">
                <p className="text-error">{error}</p>
              </div>
            ) : (
              <div className="h-[90vh]">
                <DocumentInlineViewer
                  blobUrl={loaded?.blobUrl ?? null}
                  mimeType={loaded?.mimeType ?? null}
                  fileName={loaded?.fileName ?? ''}
                  emptyLabel={isVi ? 'Chon mot tai lieu de xem' : 'Select a document to preview'}
                />
              </div>
            )}
          </div>
        
      </div>

      {/* <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-outline-variant bg-surface/95 p-3 shadow-xl backdrop-blur">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <Link to="/user/quiz" className={chipBase}>
              <MaterialIcon icon="quiz" size="xs" />
              {isVi ? 'Thi thu' : 'Mock exam'}
            </Link>
            <Link to="/user/decks/new" className={chipBase}>
              <MaterialIcon icon="edit_note" size="xs" />
              {isVi ? 'Tom tat' : 'Summary'}
            </Link>
            <Link to="/user/quizzes/new" className={chipBase}>
              <MaterialIcon icon="psychology" size="xs" />
              {isVi ? 'Tao Quiz' : 'Quiz'}
            </Link>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2">
            <input
              type="text"
              disabled
              placeholder={isVi ? 'Hoi mot cau ve tai lieu nay... (sap ra mat)' : 'Ask a question about this document... (coming soon)'}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none disabled:cursor-not-allowed"
              title={isVi ? 'Sap ra mat' : 'Coming soon'}
            />
            <button
              type="button"
              disabled
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/30 text-on-primary disabled:cursor-not-allowed"
              title={isVi ? 'Sap ra mat' : 'Coming soon'}
            >
              <MaterialIcon icon="arrow_forward" size="xs" />
            </button>
          </div>
        </div>
      </div> */}
    </UserShell>
  )
}

interface DeckSummaryInfo {
  deckId: string
  contentId: string
  title: string
  theme?: string | null
  createdByUserId?: string | null
}

interface AllFlashcardItem {
  id: string
  frontText: string
  backText: string
  orderIndex: number
}

export const InteractiveFlashcardsPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams] = useSearchParams()
  const deckId = searchParams.get('deckId')
  const contentId = searchParams.get('contentId')
  // 'owned' is absent when navigating from Library (always owned) or Collections.
  // Explicitly 'false' only when navigated from Global Search for a non-owned deck.
  const ownedByMe = searchParams.get('owned') !== 'false'
  const fromHistory = searchParams.get('fromHistory') === 'true'
  const activitySentRef = React.useRef(false)
  const {
    currentCard,
    currentIndex,
    totalCards,
    isFlipped,
    shuffleMode,
    isLoading,
    isUpdating,
    error,
    masteryError,
    toggleShuffle,
    toggleFlip,
    nextCard,
    previousCard,
    markCurrentAsMastered,
    resetMastered,
    refresh: refreshDeck,
  } = useFlashcard(deckId)

  // Owner-edit state. Pattern mirrors UserQuizInterfacePage: pre-load editable items
  // (existing cards get serverId; new draft cards don't) and batch-save on a single Save Deck.
  const currentUserId = getCurrentUserId()
  const [deckInfo, setDeckInfo] = useState<DeckSummaryInfo | null>(null)
  const [allCards, setAllCards] = useState<AllFlashcardItem[]>([])
  const [editMode, setEditMode] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  interface CardEditItem { serverId?: string; frontText: string; backText: string }
  const blankCard = (): CardEditItem => ({ frontText: '', backText: '' })
  const [editCards, setEditCards] = useState<CardEditItem[]>([])
  const [removedCardIds, setRemovedCardIds] = useState<string[]>([])

  // Case-insensitive Guid compare — defends against any case mismatch between FE-stored
  // user id and BE-serialized GUIDs.
  const idsMatch = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase()
  const isOwner = idsMatch(deckInfo?.createdByUserId, currentUserId) && ownedByMe

  // Loads deck meta. Tries the single-deck endpoint first (cleanest), then falls back to
  // scanning the deck list — that fallback is essential when the BE binary is older than
  // the FE and the single-deck route 404s.
  const fetchDeckMeta = React.useCallback(async () => {
    if (!deckId) { setDeckInfo(null); return }
    try {
      const single = await apiClient.get<DeckSummaryInfo>(`/decks/${deckId}`)
      if (single.success && single.data && single.data.createdByUserId) {
        setDeckInfo(single.data); return
      }
    } catch { /* fall through to list */ }
    try {
      const list = await apiClient.get<DeckSummaryInfo[]>('/decks')
      if (list.success && list.data) {
        const found = list.data.find((d) => idsMatch(d.deckId, deckId))
        if (found) setDeckInfo(found)
      }
    } catch { /* non-critical for non-owners */ }
  }, [deckId])

  const fetchAllCards = React.useCallback(async () => {
    if (!deckId) { setAllCards([]); return }
    try {
      const res = await apiClient.get<AllFlashcardItem[]>(`/decks/${deckId}/flashcards`)
      if (res.success && res.data) setAllCards(res.data)
    } catch { /* non-critical */ }
  }, [deckId])

  React.useEffect(() => {
    void fetchDeckMeta()
    void fetchAllCards()
  }, [fetchDeckMeta, fetchAllCards])

  React.useEffect(() => {
    if (deckInfo?.title) setTitleDraft(deckInfo.title)
  }, [deckInfo?.title])

  // Seed editable form whenever edit mode is entered (or server cards refresh). Hard-resets
  // any in-progress unsaved edits — same behavior as the quiz editor.
  React.useEffect(() => {
    if (!editMode) return
    setEditCards(allCards
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((c) => ({ serverId: c.id, frontText: c.frontText, backText: c.backText }))
    )
    setRemovedCardIds([])
    setEditError(null)
    setEditSuccess(null)
  }, [editMode, allCards])

  const updateCard = (idx: number, patch: Partial<CardEditItem>) =>
    setEditCards((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))

  const removeCardItem = (idx: number) =>
    setEditCards((prev) => {
      const target = prev[idx]
      if (target?.serverId) setRemovedCardIds((r) => [...r, target.serverId!])
      return prev.filter((_, i) => i !== idx)
    })

  const addCardItem = () => setEditCards((prev) => [...prev, blankCard()])

  const validateDeckEdit = (): string | null => {
    if (!titleDraft.trim()) return isVi ? 'Tieu de bo the khong duoc trong.' : 'Deck title is required.'
    for (let i = 0; i < editCards.length; i++) {
      const c = editCards[i]
      if (!c.frontText.trim() || !c.backText.trim())
        return isVi ? `The #${i + 1}: thieu noi dung mat truoc/sau.` : `Card #${i + 1}: front and back are required.`
    }
    return null
  }

  // Three-pass save: PATCH title (if changed) → PUT existing / POST new → DELETE removed.
  const saveDeck = async () => {
    if (!deckId) return
    const validationError = validateDeckEdit()
    if (validationError) { setEditError(validationError); return }
    setEditBusy(true); setEditError(null); setEditSuccess(null)
    try {
      if (titleDraft.trim() !== deckInfo?.title) {
        const tRes = await apiClient.patch<DeckSummaryInfo>(`/decks/${deckId}`, { title: titleDraft.trim() })
        if (!tRes.success) throw new Error(tRes.message || 'Save title failed')
        if (tRes.data) setDeckInfo(tRes.data)
      }

      for (let i = 0; i < editCards.length; i++) {
        const c = editCards[i]
        const payload = { frontText: c.frontText.trim(), backText: c.backText.trim() }
        const res = c.serverId
          ? await apiClient.put(`/decks/${deckId}/flashcards/${c.serverId}`, payload)
          : await apiClient.post(`/decks/${deckId}/flashcards`, { ...payload, orderIndex: i })
        if (!res.success) throw new Error(res.message || `Failed at card ${i + 1}`)
      }

      for (const id of removedCardIds) {
        const res = await apiClient.delete(`/decks/${deckId}/flashcards/${id}`)
        if (!res.success) throw new Error(res.message || 'Delete failed')
      }

      setEditSuccess(isVi ? 'Da luu bo the.' : 'Deck saved.')
      setRemovedCardIds([])
      await fetchAllCards()
      await refreshDeck()
    } catch (err: any) {
      setEditError(err?.message || err?.data?.message || (isVi ? 'Khong the luu bo the' : 'Save failed'))
    } finally { setEditBusy(false) }
  }

  React.useEffect(() => {
    if (!contentId || isLoading || activitySentRef.current || fromHistory) return
    activitySentRef.current = true
    void apiClient.post('/student-progress/activity', {
      contentId,
      isCompleted: false,
      progressPercentage: 0,
      timeSpentSeconds: 0,
    })
  }, [contentId, isLoading, fromHistory])

  return (
    <UserShell
      titleEn="Interactive Flashcards"
      titleVi="The ghi nho tuong tac"
      subtitleEn="Practice concepts with quick cards"
      subtitleVi="Luyen tap khai niem voi bo the nhanh"
    >
      {deckInfo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">{deckInfo.title}</h2>
            {deckInfo.theme && <p className="text-xs text-on-surface-variant">{deckInfo.theme}</p>}
          </div>
          {isOwner && (
            <Button size="sm" variant={editMode ? 'primary' : 'secondary'} onClick={() => setEditMode((v) => !v)}>
              <MaterialIcon icon={editMode ? 'visibility' : 'edit'} size="xs" className="mr-1" />
              {editMode ? (isVi ? 'Quay lai hoc' : 'Back to Study') : (isVi ? 'Chinh sua' : 'Edit Deck')}
            </Button>
          )}
        </div>
      )}

      {editMode && isOwner && (
        <div className="space-y-4">
          <Card className="p-6">
            <div>
              <label className="mb-1 block text-sm font-semibold text-on-surface">
                {isVi ? 'Tieu de bo the' : 'Deck Title'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder={isVi ? 'Vi du: Tu vung Tieng Anh - Du lich' : 'e.g., English Vocab - Travel'}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </Card>

          {editError && (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{editError}</p>
            </Card>
          )}
          {editSuccess && (
            <Card className="border border-green-200 bg-green-50">
              <p className="text-sm text-green-700">{editSuccess}</p>
            </Card>
          )}

          {/* Per-card editable forms — text on both sides is editable inline. */}
          {editCards.map((c, idx) => (
            <Card key={c.serverId ?? `new-${idx}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">
                    {isVi ? 'The' : 'Card'} #{idx + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeCardItem(idx)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    <MaterialIcon icon="delete" size="xs" />
                    <span className="ml-1">{isVi ? 'Xoa' : 'Remove'}</span>
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                      {isVi ? 'Mat truoc (tu khoa)' : 'Front (keyword)'}
                    </label>
                    <textarea
                      value={c.frontText}
                      onChange={(e) => updateCard(idx, { frontText: e.target.value })}
                      rows={3}
                      placeholder={isVi ? 'Tu hoac khai niem' : 'Word or concept'}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                      {isVi ? 'Mat sau (dinh nghia)' : 'Back (definition)'}
                    </label>
                    <textarea
                      value={c.backText}
                      onChange={(e) => updateCard(idx, { backText: e.target.value })}
                      rows={3}
                      placeholder={isVi ? 'Dinh nghia hoac mo ta' : 'Definition or description'}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {editCards.length === 0 && (
            <Card className="border border-dashed border-outline-variant">
              <p className="py-3 text-center text-sm text-on-surface-variant">
                {isVi ? 'Chua co the nao. Bam "Them the" de bat dau.' : 'No cards yet. Click "Add Card" to start.'}
              </p>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={addCardItem} disabled={editBusy}>
              <MaterialIcon icon="add" size="xs" />
              <span className="ml-1">{isVi ? 'Them the' : 'Add Card'}</span>
            </Button>
            <Button onClick={() => void saveDeck()} disabled={editBusy}>
              {editBusy ? (isVi ? 'Dang luu...' : 'Saving...') : (isVi ? 'Luu bo the' : 'Save Deck')}
            </Button>
          </div>
        </div>
      )}

      {editMode && isOwner ? null : (
      <Card className="p-10 text-center">
        {!deckId && <p className="text-sm text-on-surface-variant">{isVi ? 'Them ?deckId=... vao URL de hoc bo the.' : 'Add ?deckId=... to URL to study a deck.'}</p>}

        {isLoading && <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />}

        {!ownedByMe && !isLoading && (
          <p className="mb-4 text-xs text-on-surface-variant">
            {isVi
              ? 'Dang xem bo the cua nguoi khac. Tien trinh hoc duoc luu rieng cho ban.'
              : "Viewing someone else's deck. Your mastery progress is saved independently."}
          </p>
        )}

        {masteryError && (
          <p className="mb-3 text-xs text-error">{masteryError}</p>
        )}
        {error && !isLoading && (
          <p className="mb-3 text-xs text-error">{error}</p>
        )}

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
              className={`flex min-h-[220px] w-full items-center justify-center rounded-xl p-8 text-center transition-all duration-300 ${
                isFlipped
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : 'bg-amber-50 hover:bg-amber-100'
              }`}
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
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">{isVi ? 'Khong con the nao de hoc.' : 'No cards left to study.'}</p>
            <Button variant="secondary" onClick={() => void resetMastered()} disabled={isUpdating}>
              {isVi ? 'Dat lai cac the da nho' : 'Reset mastered cards'}
            </Button>
          </div>
        )}
      </Card>
      )}
    </UserShell>
  )
}

interface LearningHistoryEntry {
  courseId: string | null
  courseTitle: string | null
  moduleTitle: string | null
  contentId: string | null
  contentTitle: string | null
  contentType: string | null
  progressPercentage: number
  isCompleted: boolean
  activityAt: string
  attemptId?: string | null
  subEntityId?: string | null
}

interface AttemptAnswerItem {
  questionId: string
  questionText: string
  selectedOptionId: string
  selectedOptionText: string
  correctOptionId: string
  correctOptionText: string
  isCorrect: boolean
  explanation?: string | null
}

interface AttemptReviewDto {
  attemptId: string
  quizId: string
  quizTitle: string
  scorePercentage: number
  attemptedAt: string
  answers: AttemptAnswerItem[]
}

const typeIcon = (contentType: string | null): string => {
  switch (contentType) {
    case 'QUIZ': return 'quiz'
    case 'VIDEO': return 'play_circle'
    case 'FLASHCARD': return 'style'
    case 'PDF': return 'description'
    default: return 'article'
  }
}

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export const LearningHistoryPage: React.FC = () => {
  const isVi = useLang()
  const [rows, setRows] = useState<LearningHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<Record<string, AttemptReviewDto | null>>({})
  const [reviewLoading, setReviewLoading] = useState(false)
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false)
  const [isPurging, setIsPurging] = useState(false)

  const loadHistory = React.useCallback(() => {
    let cancelled = false
    setIsLoading(true)
    apiClient.get<LearningHistoryEntry[]>('/student-progress/recent?limit=30')
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) setRows(res.data)
      })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    return loadHistory()
  }, [loadHistory])

  const toggleReview = async (attemptId: string) => {
    if (expandedAttemptId === attemptId) { setExpandedAttemptId(null); return }
    setExpandedAttemptId(attemptId)
    if (reviews[attemptId] !== undefined) return
    setReviewLoading(true)
    try {
      const res = await apiClient.get<AttemptReviewDto>(`/student-progress/quiz-attempts/${attemptId}`)
      setReviews((prev) => ({ ...prev, [attemptId]: res.success && res.data ? res.data : null }))
    } catch {
      setReviews((prev) => ({ ...prev, [attemptId]: null }))
    } finally {
      setReviewLoading(false)
    }
  }

  const handlePurge = async () => {
    setIsPurging(true)
    try {
      await apiClient.delete('/student-progress/purge')
      setRows([])
      setExpandedAttemptId(null)
      setReviews({})
    } catch { /* non-critical */ }
    finally { setIsPurging(false); setShowPurgeConfirm(false) }
  }

  const getResult = (row: LearningHistoryEntry) => {
    if (row.contentType === 'QUIZ')
      return isVi ? `Diem: ${row.progressPercentage}%` : `Score: ${row.progressPercentage}%`
    if (row.isCompleted)
      return isVi ? 'Hoan thanh' : 'Completed'
    if (row.progressPercentage > 0)
      return `${row.progressPercentage}%`
    return isVi ? 'Da xem' : 'Viewed'
  }

  const buildContentUrl = (row: LearningHistoryEntry): string | null => {
    if (!row.contentId || !row.subEntityId) return null
    switch (row.contentType) {
      case 'VIDEO':
        return `/user/lesson?contentId=${row.contentId}&videoId=${row.subEntityId}&fromHistory=true`
      case 'PDF':
        return `/user/documents?docId=${row.subEntityId}&contentId=${row.contentId}&fromHistory=true`
      case 'FLASHCARD':
        return `/user/flashcards?deckId=${row.subEntityId}&contentId=${row.contentId}&fromHistory=true`
      default:
        return null
    }
  }

  return (
    <UserShell
      titleEn="Learning History"
      titleVi="Lich su hoc tap"
      subtitleEn="Your timeline of completed activities"
      subtitleVi="Dong thoi gian cac hoat dong da hoan thanh"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-on-surface-variant">
            {isVi ? 'Cac hoat dong hoc tap gan day cua ban.' : 'Your recent learning activities.'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPurgeConfirm(true)}
            className="text-error hover:bg-error/10"
          >
            <MaterialIcon icon="delete_sweep" size="xs" className="mr-1" />
            {isVi ? 'Xoa lich su' : 'Purge History'}
          </Button>
        </div>

        {showPurgeConfirm && (
          <Card className="border border-error/30 bg-error/5 p-4">
            <p className="mb-3 text-sm font-medium text-error">
              {isVi
                ? 'Hanh dong nay se xoa vinh vien toan bo lich su hoc tap va ket qua quiz. Khong the hoan tac!'
                : 'This will permanently delete all learning history and quiz results. This action cannot be undone!'}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handlePurge()}
                disabled={isPurging}
                className="bg-error text-white hover:bg-error/90"
              >
                {isPurging ? (isVi ? 'Dang xoa...' : 'Purging…') : (isVi ? 'Xac nhan xoa' : 'Confirm Purge')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPurgeConfirm(false)} disabled={isPurging}>
                {isVi ? 'Huy' : 'Cancel'}
              </Button>
            </div>
          </Card>
        )}

        <Card className="p-6">
          {isLoading && <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />}

          {!isLoading && rows.length === 0 && (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              {isVi ? 'Chua co hoat dong nao.' : 'No activity yet.'}
            </p>
          )}

          {!isLoading && rows.length > 0 && (
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
                  {rows.map((row, idx) => {
                    const isQuiz = row.contentType === 'QUIZ' && !!row.attemptId
                    const contentUrl = !isQuiz ? buildContentUrl(row) : null
                    const isExpanded = isQuiz && expandedAttemptId === row.attemptId
                    const review = row.attemptId ? reviews[row.attemptId] : undefined

                    return (
                    <React.Fragment key={`${row.contentType}-${row.activityAt}-${idx}`}>
                      <tr
                        className={`border-b border-outline-variant/40 ${isQuiz ? 'cursor-pointer hover:bg-surface-container-low' : ''}`}
                        onClick={isQuiz ? () => void toggleReview(row.attemptId!) : undefined}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <MaterialIcon icon={typeIcon(row.contentType)} size="xs" className="shrink-0 text-on-surface-variant" />
                            <span className="text-on-surface">
                              {row.contentTitle ?? row.moduleTitle ?? row.courseTitle ?? '—'}
                            </span>
                            {isQuiz && (
                              <MaterialIcon
                                icon={isExpanded ? 'expand_less' : 'expand_more'}
                                size="xs"
                                className="ml-auto text-on-surface-variant"
                              />
                            )}
                            {contentUrl && (
                              <Link
                                to={contentUrl}
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto inline-flex items-center gap-1 rounded-full border border-outline-variant px-2.5 py-0.5 text-xs text-on-surface-variant hover:bg-surface-container-low"
                              >
                                <MaterialIcon icon="open_in_new" size="xs" />
                                {isVi ? 'Xem lai' : 'View again'}
                              </Link>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm text-on-surface-variant">{fmtTime(row.activityAt)}</td>
                        <td className="py-3 text-sm text-on-surface-variant">{getResult(row)}</td>
                      </tr>

                      {isQuiz && isExpanded && (
                        <tr>
                          <td colSpan={3} className="pb-4 pt-1">
                            {reviewLoading && review === undefined && (
                              <div className="flex justify-center py-4">
                                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
                              </div>
                            )}
                            {review === null && (
                              <p className="py-2 text-center text-sm text-error">
                                {isVi ? 'Khong tai duoc ket qua.' : 'Unable to load review.'}
                              </p>
                            )}
                            {review && (
                              <div className="space-y-3 rounded-xl bg-surface-container-low p-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-on-surface">
                                    {isVi ? `Diem: ${review.scorePercentage}%` : `Score: ${review.scorePercentage}%`}
                                  </p>
                                  <Link
                                    to={`/user/quiz?quizId=${review.quizId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary hover:bg-primary/90"
                                  >
                                    <MaterialIcon icon="replay" size="xs" />
                                    {isVi ? 'Lam lai' : 'Retake'}
                                  </Link>
                                </div>
                                {review.answers.map((answer, aIdx) => (
                                  <div key={answer.questionId} className="rounded-lg border border-outline-variant/60 bg-surface p-3">
                                    <p className="mb-2 text-sm font-semibold text-on-surface">
                                      {`${aIdx + 1}. ${answer.questionText}`}
                                    </p>
                                    <p className={`text-sm ${answer.isCorrect ? 'text-[#22c55e]' : 'text-error'}`}>
                                      {answer.isCorrect
                                        ? (isVi ? '✓ Dung: ' : '✓ Correct: ')
                                        : (isVi ? '✗ Ban chon: ' : '✗ Your answer: ')}
                                      {answer.selectedOptionText}
                                    </p>
                                    {!answer.isCorrect && (
                                      <p className="text-sm text-[#22c55e]">
                                        {isVi ? '✓ Dap an dung: ' : '✓ Correct answer: '}
                                        {answer.correctOptionText}
                                      </p>
                                    )}
                                    {answer.explanation && (
                                      <p className="mt-1 text-xs text-on-surface-variant italic">{answer.explanation}</p>
                                    )}
                                  </div>
                                ))}
                                {review.answers.length === 0 && (
                                  <p className="text-center text-sm text-on-surface-variant">
                                    {isVi ? 'Khong co cau tra loi nao duoc luu.' : 'No answers recorded for this attempt.'}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )})}

                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </UserShell>
  )
}

export const OrganizationListPage: React.FC = () => {
  const isVi = useLang()
  const { organizations, isLoading, error, fetchOrganizations, joinSelf } = useOrganization()
  const [pendingJoin, setPendingJoin] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    void fetchOrganizations(0, 50)
  }, [fetchOrganizations])

  const handleJoin = async (org: OrganizationList) => {
    setPendingJoin(org.id)
    const ok = await joinSelf(org.id)
    if (ok) setJoinedIds((prev) => new Set(prev).add(org.id))
    setPendingJoin(null)
  }

  return (
    <UserShell
      titleEn="Organization List"
      titleVi="Danh sach to chuc"
      subtitleEn="Join and follow learning organizations"
      subtitleVi="Tham gia va theo doi cac to chuc hoc tap"
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )}
      {/* {error && !isLoading && <p className="text-sm text-error">{error}</p>} */}
      {!isLoading && !error && organizations.length === 0 && (
        <p className="text-sm text-on-surface-variant text-center py-4">
          {isVi ? 'Chua co to chuc nao.' : 'No organizations yet.'}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <MaterialIcon icon="corporate_fare" className="text-primary" />
            </div>
            <h3 className="mb-2 font-bold text-on-surface">{org.name}</h3>
            <p className="mb-4 text-sm text-on-surface-variant">
              {isVi ? `${org.memberCount} thanh vien` : `${org.memberCount} members`}
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => void handleJoin(org)}
              disabled={pendingJoin === org.id || joinedIds.has(org.id)}
            >
              {joinedIds.has(org.id)
                ? (isVi ? 'Da tham gia' : 'Joined')
                : pendingJoin === org.id
                  ? (isVi ? 'Dang xu ly...' : 'Joining...')
                  : (isVi ? 'Tham gia' : 'Join')}
            </Button>
          </Card>
        ))}
      </div>
    </UserShell>
  )
}

interface CourseDetail {
  id: string
  title: string
  description?: string | null
  courseCode?: string | null
  status?: string | null
  createdAt: string
}

const contentIcon = (type: string): string => {
  switch (type) {
    case 'VIDEO': return 'play_circle'
    case 'QUIZ': return 'quiz'
    case 'FLASHCARD': return 'style'
    case 'PDF': return 'description'
    default: return 'article'
  }
}

const contentHref = (c: { id: string; contentType: string; quizId?: string | null; deckId?: string | null; documentId?: string | null; videoId?: string | null }) => {
  switch (c.contentType) {
    case 'QUIZ': return c.quizId ? `/user/quiz?quizId=${c.quizId}` : null
    case 'FLASHCARD': return c.deckId ? `/user/flashcards?deckId=${c.deckId}&contentId=${c.id}` : null
    case 'PDF': return c.documentId ? `/user/documents?docId=${c.documentId}&contentId=${c.id}` : null
    case 'VIDEO': return `/user/lesson?contentId=${c.id}${c.videoId ? `&videoId=${c.videoId}` : ''}`
    default: return null
  }
}

interface ItemProgressRow {
  contentId: string
  moduleId: string | null
  progressPercentage: number
  isCompleted: boolean
  updatedAt: string
}

export const SpecificCoursePage: React.FC = () => {
  const { courseId } = useParams()
  const { modules, fetchModules, isLoading: modulesLoading } = useModuleContent()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressByContent, setProgressByContent] = useState<Record<string, ItemProgressRow>>({})

  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    apiClient
      .get<CourseDetail>(`/courses/${courseId}`)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) setCourse(res.data)
        else throw new Error(res.message || 'Course not found')
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Course not found') })
      .finally(() => { if (!cancelled) setIsLoading(false) })

    void fetchModules(courseId)

    // Pull per-item progress for the current user; quietly ignore failures
    // (the spec only requires display when data is present).
    apiClient
      .get<ItemProgressRow[]>(`/courses/${courseId}/progress/items`)
      .then((res) => {
        if (cancelled) return
        if (res.success && res.data) {
          const map: Record<string, ItemProgressRow> = {}
          for (const row of res.data) map[row.contentId] = row
          setProgressByContent(map)
        }
      })
      .catch(() => { /* progress is non-essential */ })

    return () => { cancelled = true }
  }, [courseId, fetchModules])

  const totalContents = modules.reduce((sum: number, m: ModuleItem) => sum + (m.contents?.length ?? 0), 0)
  const completedContents = Object.values(progressByContent).filter((p) => p.isCompleted).length
  const overallPct = totalContents > 0 ? Math.round((completedContents * 100) / totalContents) : 0

  return (
    <UserShell
      titleEn="Specific Course"
      titleVi="Chi tiet khoa hoc"
      subtitleEn="Detailed view of a selected course"
      subtitleVi="Thong tin chi tiet cua khoa hoc duoc chon"
    >
      <div className="space-y-8">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        )}
        {error && !isLoading && (
          <Card className="border border-error/30 p-4">
            <p className="text-sm text-error">{error}</p>
          </Card>
        )}

        {!isLoading && course && (
          <Card className="overflow-hidden border border-[#e7ebf6] p-0 shadow-[0_20px_50px_rgba(69,84,153,0.12)]">
            <div className="grid gap-0 lg:grid-cols-[1.7fr_0.95fr]">
              <div className="space-y-6 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef3ff] p-8 lg:p-10">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#7b86a3]">
                  Courses &gt; {course.courseCode ?? course.title}
                </div>
                <div>
                  <h3 className="max-w-3xl text-[44px] font-black leading-[1.02] text-on-surface font-headline lg:text-[54px]">
                    <span className="text-[#4f6cf7]">{course.title}</span>
                  </h3>
                  {course.description && (
                    <p className="mt-4 max-w-2xl text-base leading-7 text-on-surface-variant">{course.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link to="/user/learning" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#4f6cf7] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#395de8]">
                    View History
                    <MaterialIcon icon="arrow_forward" size="sm" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center bg-white p-8 lg:p-10">
                <Card className="w-full max-w-[280px] border border-[#edf1f8] p-6 shadow-[0_18px_40px_rgba(73,89,162,0.08)]">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#8a95af]">Course Summary</div>
                  <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                    <p><span className="font-semibold text-on-surface">Status:</span> {course.status ?? 'ACTIVE'}</p>
                    <p><span className="font-semibold text-on-surface">Code:</span> {course.courseCode ?? '—'}</p>
                    <p><span className="font-semibold text-on-surface">Modules:</span> {modules.length}</p>
                    <p><span className="font-semibold text-on-surface">Items:</span> {completedContents} / {totalContents}</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[#e5eaf6]">
                    <div className="h-2 rounded-full bg-[#4f6cf7]" style={{ width: `${overallPct}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-[#4f6cf7]">{overallPct}% complete</p>
                </Card>
              </div>
            </div>
          </Card>
        )}

        {!isLoading && course && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-2xl font-bold text-on-surface font-headline">Learning Path</h4>
            </div>
            {modulesLoading && (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            )}
            {!modulesLoading && modules.length === 0 && (
              <p className="text-sm text-on-surface-variant">No modules have been added to this course yet.</p>
            )}
            {!modulesLoading && modules.length > 0 && modules.map((m: ModuleItem) => (
              <Card key={m.id} className="border border-[#edf1f8] p-4 shadow-[0_10px_28px_rgba(65,79,145,0.06)]">
                <div className="mb-3">
                  <h5 className="text-lg font-bold text-on-surface">{m.title}</h5>
                  {m.description && <p className="mt-1 text-sm text-on-surface-variant">{m.description}</p>}
                </div>
                <div className="space-y-2">
                  {(m.contents ?? []).length === 0 && (
                    <p className="text-xs text-on-surface-variant">No items yet.</p>
                  )}
                  {(m.contents ?? []).map((c: ContentItem) => {
                    const href = contentHref(c)
                    const progress = progressByContent[c.id]
                    const row = (
                      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eef2ff] text-[#4f6cf7]">
                          <MaterialIcon
                            icon={progress?.isCompleted ? 'check_circle' : contentIcon(c.contentType)}
                            size="sm"
                            fill={progress?.isCompleted}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-on-surface">{c.title}</p>
                          <p className="truncate text-xs text-on-surface-variant">
                            {c.contentType} • {c.status}
                            {progress && !progress.isCompleted && ` • ${progress.progressPercentage}%`}
                          </p>
                        </div>
                        {progress?.isCompleted ? (
                          <Badge variant="success" size="sm">Completed</Badge>
                        ) : progress ? (
                          <Badge variant="primary" size="sm">In progress</Badge>
                        ) : null}
                        {href && (
                          <span className="text-xs font-semibold text-[#4f6cf7]">Open</span>
                        )}
                      </div>
                    )
                    return href ? (
                      <Link key={c.id} to={href} className="block hover:opacity-80">{row}</Link>
                    ) : (
                      <div key={c.id}>{row}</div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </UserShell>
  )
}

// UserContentLibrary exported separately

interface QuizSummaryInfo {
  quizId: string
  contentId: string
  title: string
  status: string
  timeLimit?: number | null
  passingScore?: number | null
  createdByUserId?: string | null
}

interface QuizQuestionWithCorrect {
  id: string
  questionText: string
  explanation?: string | null
  orderIndex: number
  options: Array<{ id: string; optionText: string; isCorrect: boolean; orderIndex: number }>
}

export const UserQuizInterfacePage: React.FC = () => {
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
    quizId: activeQuizId,
    reloadQuestions,
  } = useQuiz(quizId)

  // Owner-edit state. The owner sees an "Edit Quiz" toggle that swaps the study UI for a
  // QuizCreatePage-style editor pre-populated with existing questions. Non-owners never see this.
  const currentUserId = getCurrentUserId()
  const [quizInfo, setQuizInfo] = useState<QuizSummaryInfo | null>(null)
  const [allQuestions, setAllQuestions] = useState<QuizQuestionWithCorrect[]>([])
  const [editMode, setEditMode] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState<string | null>(null)

  // Editable question list — items with `serverId` are existing questions (PUT on save);
  // items without are new drafts (POST on save). Removed existing IDs are tracked separately
  // for batch DELETE at save time.
  interface QEditOption { text: string; isCorrect: boolean }
  interface QEditItem {
    serverId?: string
    questionText: string
    explanation: string
    options: QEditOption[]
  }
  const blankQuestion = (): QEditItem => ({
    questionText: '',
    explanation: '',
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  })
  const [editQuestions, setEditQuestions] = useState<QEditItem[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])

  const idsMatchQ = (a?: string | null, b?: string | null) =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase()
  const isOwner = idsMatchQ(quizInfo?.createdByUserId, currentUserId)

  // Same fallback strategy as the deck page — try single-quiz endpoint, then scan the list.
  const fetchQuizMeta = React.useCallback(async () => {
    if (!quizId) { setQuizInfo(null); return }
    try {
      const single = await apiClient.get<QuizSummaryInfo>(`/quizzes/${quizId}`)
      if (single.success && single.data && single.data.createdByUserId) {
        setQuizInfo(single.data); return
      }
    } catch { /* fall through to list */ }
    try {
      const list = await apiClient.get<QuizSummaryInfo[]>('/quizzes')
      if (list.success && list.data) {
        const found = list.data.find((q) => idsMatchQ(q.quizId, quizId))
        if (found) setQuizInfo(found)
      }
    } catch { /* non-critical */ }
  }, [quizId])

  const fetchAllQuestions = React.useCallback(async () => {
    if (!quizId) { setAllQuestions([]); return }
    try {
      const res = await apiClient.get<QuizQuestionWithCorrect[]>(`/quizzes/${quizId}/questions`)
      if (res.success && res.data) setAllQuestions(res.data)
    } catch { /* non-critical */ }
  }, [quizId])

  React.useEffect(() => {
    void fetchQuizMeta()
    void fetchAllQuestions()
  }, [fetchQuizMeta, fetchAllQuestions])

  React.useEffect(() => {
    if (quizInfo?.title) setTitleDraft(quizInfo.title)
  }, [quizInfo?.title])

  // When entering edit mode (or when the loaded server question list changes), seed the
  // editable form from the canonical server data. Drops any unsaved in-progress edits
  // intentionally — re-entering edit mode is a hard reset.
  React.useEffect(() => {
    if (!editMode) return
    setEditQuestions(allQuestions.map((q) => ({
      serverId: q.id,
      questionText: q.questionText,
      explanation: q.explanation ?? '',
      options: q.options
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((o) => ({ text: o.optionText, isCorrect: o.isCorrect })),
    })))
    setRemovedIds([])
    setEditError(null)
    setEditSuccess(null)
  }, [editMode, allQuestions])

  // ---- Editable-list mutation helpers (mirror QuizCreatePage manual-mode shape). ----
  const updateQ = (idx: number, patch: Partial<QEditItem>) =>
    setEditQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<QEditOption>) =>
    setEditQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        return { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) }
      })
    )

  const setCorrect = (qIdx: number, oIdx: number) =>
    setEditQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        return { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIdx })) }
      })
    )

  const addOption = (qIdx: number) =>
    setEditQuestions((prev) => prev.map((q, i) =>
      i === qIdx ? { ...q, options: [...q.options, { text: '', isCorrect: false }] } : q
    ))

  const removeOption = (qIdx: number, oIdx: number) =>
    setEditQuestions((prev) => prev.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
    ))

  const addQuestionItem = () => setEditQuestions((prev) => [...prev, blankQuestion()])

  // Removing an existing (server-backed) question records its id for DELETE at save time.
  // Removing a new (unsaved) draft is purely local.
  const removeQuestionItem = (idx: number) =>
    setEditQuestions((prev) => {
      const target = prev[idx]
      if (target?.serverId) setRemovedIds((r) => [...r, target.serverId!])
      return prev.filter((_, i) => i !== idx)
    })

  const validateEdit = (): string | null => {
    if (!titleDraft.trim()) return isVi ? 'Vui long nhap tieu de quiz.' : 'Quiz title is required.'
    if (editQuestions.length === 0) return isVi ? 'Can it nhat 1 cau hoi.' : 'At least one question is required.'
    for (let i = 0; i < editQuestions.length; i++) {
      const q = editQuestions[i]
      if (!q.questionText.trim()) return isVi ? `Cau ${i + 1}: thieu noi dung.` : `Question ${i + 1}: text required.`
      if (q.options.length < 2) return isVi ? `Cau ${i + 1}: can it nhat 2 lua chon.` : `Question ${i + 1}: at least 2 options.`
      if (q.options.some((o) => !o.text.trim())) return isVi ? `Cau ${i + 1}: co lua chon bo trong.` : `Question ${i + 1}: empty option text.`
      if (!q.options.some((o) => o.isCorrect)) return isVi ? `Cau ${i + 1}: chua chon dap an dung.` : `Question ${i + 1}: pick a correct answer.`
    }
    return null
  }

  // Saves the whole quiz in three passes: title PATCH, then per-question PUT (existing) or
  // POST (new), then DELETE for every question removed during this edit session. Order
  // matters only loosely — deletes happen last so a slow request doesn't surface a 404 race.
  const saveQuiz = async () => {
    if (!quizId) return
    const validationError = validateEdit()
    if (validationError) { setEditError(validationError); return }
    setEditBusy(true); setEditError(null); setEditSuccess(null)
    try {
      if (titleDraft.trim() !== quizInfo?.title) {
        const tRes = await apiClient.patch<QuizSummaryInfo>(`/quizzes/${quizId}`, { title: titleDraft.trim() })
        if (!tRes.success) throw new Error(tRes.message || 'Save title failed')
        if (tRes.data) setQuizInfo(tRes.data)
      }

      for (let i = 0; i < editQuestions.length; i++) {
        const q = editQuestions[i]
        const payload = {
          questionText: q.questionText.trim(),
          explanation: q.explanation.trim() || null,
          orderIndex: i,
          options: q.options.map((o, j) => ({
            optionText: o.text.trim(),
            isCorrect: o.isCorrect,
            orderIndex: j,
          })),
        }
        const res = q.serverId
          ? await apiClient.put(`/quizzes/${quizId}/questions/${q.serverId}`, payload)
          : await apiClient.post(`/quizzes/${quizId}/questions`, payload)
        if (!res.success) throw new Error(res.message || `Failed at question ${i + 1}`)
      }

      for (const id of removedIds) {
        const res = await apiClient.delete(`/quizzes/${quizId}/questions/${id}`)
        if (!res.success) throw new Error(res.message || 'Delete failed')
      }

      setEditSuccess(isVi ? 'Da luu quiz.' : 'Quiz saved.')
      setRemovedIds([])
      await fetchAllQuestions()
      await reloadQuestions()
    } catch (err: any) {
      setEditError(err?.message || err?.data?.message || (isVi ? 'Khong the luu quiz' : 'Save failed'))
    } finally { setEditBusy(false) }
  }

  const currentQuestion = questions[currentQuestionIndex] ?? null
  const selectedOptionId = currentQuestion ? answers[currentQuestion.id] : undefined

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
  const questionsById = React.useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions])

  const getOptionText = (questionId: string, optionId: string) => {
    const question = questionsById.get(questionId)
    const option = question?.options.find((item) => item.id === optionId)
    return option?.text || optionId.slice(0, 8)
  }

  return (
    <UserShell
      titleEn="Quiz Interface"
      titleVi="Giao dien bai quiz"
      subtitleEn="Answer timed questions and submit results"
      subtitleVi="Tra loi cau hoi tinh gio va nop ket qua"
    >
      {quizInfo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">{quizInfo.title}</h2>
            <p className="text-xs text-on-surface-variant">
              {allQuestions.length} {isVi ? 'cau hoi' : 'questions'}
              {quizInfo.timeLimit ? ` • ${quizInfo.timeLimit} ${isVi ? 'phut' : 'min'}` : ''}
            </p>
          </div>
          {isOwner && (
            <Button size="sm" variant={editMode ? 'primary' : 'secondary'} onClick={() => setEditMode((v) => !v)}>
              <MaterialIcon icon={editMode ? 'visibility' : 'edit'} size="xs" className="mr-1" />
              {editMode ? (isVi ? 'Quay lai lam quiz' : 'Back to Take Quiz') : (isVi ? 'Chinh sua quiz' : 'Edit Quiz')}
            </Button>
          )}
        </div>
      )}

      {editMode && isOwner && (
        <div className="space-y-4">
          {/* Title + meta */}
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-on-surface">
                  {isVi ? 'Tieu de quiz' : 'Quiz Title'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder={isVi ? 'Vi du: He Mat Troi' : 'e.g., Solar System Basics'}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-on-surface">
                  {isVi ? 'Gioi han thoi gian (phut)' : 'Time Limit (min)'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={quizInfo?.timeLimit ?? ''}
                  disabled
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant"
                  placeholder={isVi ? 'Khong gioi han' : 'Unlimited'}
                />
              </div>
            </div>
          </Card>

          {editError && (
            <Card className="border border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{editError}</p>
            </Card>
          )}
          {editSuccess && (
            <Card className="border border-green-200 bg-green-50">
              <p className="text-sm text-green-700">{editSuccess}</p>
            </Card>
          )}

          {/* Per-question editable cards — mirrors QuizCreatePage manual mode. */}
          {editQuestions.map((q, qIdx) => (
            <Card key={q.serverId ?? `new-${qIdx}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">
                    {isVi ? 'Cau hoi' : 'Question'} {qIdx + 1}
                  </h3>
                  {editQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestionItem(qIdx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      <MaterialIcon icon="delete" size="xs" />
                      <span className="ml-1">{isVi ? 'Xoa' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                <textarea
                  value={q.questionText}
                  onChange={(e) => updateQ(qIdx, { questionText: e.target.value })}
                  placeholder={isVi ? 'Noi dung cau hoi...' : 'Question text...'}
                  rows={2}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />

                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`edit-correct-${qIdx}`}
                        checked={opt.isCorrect}
                        onChange={() => setCorrect(qIdx, oIdx)}
                        className="h-4 w-4 cursor-pointer"
                        title={isVi ? 'Danh dau dap an dung' : 'Mark as correct answer'}
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
                        placeholder={isVi ? `Lua chon ${oIdx + 1}` : `Option ${oIdx + 1}`}
                        className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIdx, oIdx)}
                          className="text-on-surface-variant hover:text-error"
                        >
                          <MaterialIcon icon="close" size="xs" />
                        </button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addOption(qIdx)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      + {isVi ? 'Them lua chon' : 'Add option'}
                    </button>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                    {isVi ? 'Giai thich (tuy chon)' : 'Explanation (optional)'}
                  </label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) => updateQ(qIdx, { explanation: e.target.value })}
                    placeholder={isVi ? 'Giai thich vi sao dap an dung...' : 'Why this answer is correct...'}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </Card>
          ))}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={addQuestionItem} disabled={editBusy}>
              <MaterialIcon icon="add" size="xs" />
              <span className="ml-1">{isVi ? 'Them cau hoi' : 'Add Question'}</span>
            </Button>
            <Button onClick={() => void saveQuiz()} disabled={editBusy}>
              {editBusy ? (isVi ? 'Dang luu...' : 'Saving...') : (isVi ? 'Luu quiz' : 'Save Quiz')}
            </Button>
          </div>
        </div>
      )}

      {editMode && isOwner ? null : (
      <Card className="p-8">
        {!activeQuizId && !isLoading && !error && (
          <p className="text-sm text-on-surface-variant">{isVi ? 'Khong tim thay bai quiz nao de lam.' : 'No quiz available for this account yet.'}</p>
        )}

        {isLoading && <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />}

        {/* {error && !isLoading && <p className="text-sm text-error">{error}</p>} */}

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
                    <p className="text-sm font-semibold text-on-surface">
                      {questionsById.get(item.questionId)?.questionText ?? `#${item.questionId.slice(0, 8)}`}
                    </p>
                    <Badge variant={item.isCorrect ? 'success' : 'warning'} size="sm">
                      {item.isCorrect ? (isVi ? 'Dung' : 'Correct') : (isVi ? 'Sai' : 'Incorrect')}
                    </Badge>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {isVi ? 'Ban chon' : 'Selected'}: {getOptionText(item.questionId, item.selectedOptionId)} • {isVi ? 'Dap an dung' : 'Correct'}:{' '}
                    {getOptionText(item.questionId, item.correctOptionId)}
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
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => selectAnswer(currentQuestion.id, option.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedOptionId === option.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {option.text}
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
      )}
    </UserShell>
  )
}

export const VideoLessonPage: React.FC = () => {
  const isVi = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const videoIdFromUrl = searchParams.get('videoId')
  const moduleId = searchParams.get('moduleId')
  const contentId = searchParams.get('contentId')
  const [videos, setVideos] = useState<Array<{ id: string; title?: string; description?: string; embeddableUrl: string }>>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(videoIdFromUrl)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDescription, setVideoDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const role = React.useMemo(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { role?: string }
      return parsed.role || null
    } catch {
      return null
    }
  }, [])
  const canManageVideo = role === 'Teacher' || role === 'OrgAdmin' || role === 'SysAdmin'

  const selectedVideo = React.useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [selectedVideoId, videos]
  )

  const fetchVideoById = React.useCallback(
    async (id: string) => {
      const response = await apiClient.get<{ id: string; title?: string; description?: string; embeddableUrl: string }>(`/videos/${id}`)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load video')
      return response.data
    },
    []
  )

  const fetchVideos = React.useCallback(async () => {
    if (!moduleId && !videoIdFromUrl) {
      setVideos([])
      setSelectedVideoId(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      if (moduleId) {
        const response = await apiClient.get<Array<{ id: string; title?: string; description?: string; embeddableUrl: string }>>(`/videos/modules/${moduleId}`)
        if (!response.success || !response.data) throw new Error(response.message || 'Unable to load videos')
        setVideos(response.data)

        const initialVideoId = videoIdFromUrl || response.data[0]?.id || null
        setSelectedVideoId(initialVideoId)
        if (initialVideoId && initialVideoId !== videoIdFromUrl) {
          setSearchParams((current) => {
            const next = new URLSearchParams(current)
            next.set('videoId', initialVideoId)
            return next
          })
        }
      } else if (videoIdFromUrl) {
        const video = await fetchVideoById(videoIdFromUrl)
        setVideos([video])
        setSelectedVideoId(video.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load videos'
      setError(message)
      setVideos([])
      setSelectedVideoId(null)
    } finally {
      setIsLoading(false)
    }
  }, [fetchVideoById, moduleId, setSearchParams, videoIdFromUrl])

  React.useEffect(() => {
    void fetchVideos()
  }, [fetchVideos])

  const fromHistory = searchParams.get('fromHistory') === 'true'
  const videoActivityRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!selectedVideo || !contentId || fromHistory) return
    if (videoActivityRef.current === selectedVideo.id) return
    videoActivityRef.current = selectedVideo.id
    void apiClient.post('/student-progress/activity', {
      contentId,
      isCompleted: false,
      progressPercentage: 0,
      timeSpentSeconds: 0,
    })
  }, [selectedVideo, contentId, fromHistory])

  const handleCreateVideo = async () => {
    if (!contentId || !youtubeUrl.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await apiClient.post<{ id: string; title?: string; description?: string; embeddableUrl: string }>('/videos', {
        contentId,
        youtubeUrl: youtubeUrl.trim(),
        title: videoTitle.trim() || null,
        description: videoDescription.trim() || null,
      })
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to create video')

      setYoutubeUrl('')
      setVideoTitle('')
      setVideoDescription('')
      await fetchVideos()
      setSelectedVideoId(response.data.id)
      setSearchParams((current) => {
        const next = new URLSearchParams(current)
        next.set('videoId', response.data!.id)
        return next
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create video'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <UserShell
      titleEn="Video Lesson"
      titleVi="Bai hoc video"
      subtitleEn="Watch lessons and track playback progress"
      subtitleVi="Xem bai giang video va theo doi tien do"
    >
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          {isLoading && <div className="mx-auto my-10 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />}

          {!isLoading && selectedVideo?.embeddableUrl && (
            <>
              <iframe
                title={selectedVideo.title || 'Video player'}
                src={selectedVideo.embeddableUrl}
                className="mb-4 h-[380px] w-full rounded-xl border border-outline-variant bg-slate-900"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
              <h3 className="font-bold text-on-surface">{selectedVideo.title || (isVi ? 'Bai hoc video' : 'Video lesson')}</h3>
              {selectedVideo.description && <p className="mt-2 text-sm text-on-surface-variant">{selectedVideo.description}</p>}
            </>
          )}

          {!isLoading && !selectedVideo && (
            <div className="mb-4 flex h-[380px] items-center justify-center rounded-xl bg-slate-900 text-white">
              <div className="text-center">
                <MaterialIcon icon="play_circle" className="text-6xl" />
                <p className="mt-2 text-slate-300">
                  {isVi
                    ? 'Chon video bang ?videoId=... hoac ?moduleId=...'
                    : 'Load a video with ?videoId=... or list videos with ?moduleId=...'}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-4">
          <h4 className="mb-4 font-bold text-on-surface">{isVi ? 'Danh sach video' : 'Video list'}</h4>
          {error && <p className="mb-3 text-sm text-error">{error}</p>}

          <div className="space-y-3">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => {
                  setSelectedVideoId(video.id)
                  setSearchParams((current) => {
                    const next = new URLSearchParams(current)
                    next.set('videoId', video.id)
                    return next
                  })
                }}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left ${
                  selectedVideoId === video.id ? 'border-primary bg-primary/10' : 'border-outline-variant'
                }`}
              >
                <span className="text-sm">{video.title || `Video ${video.id.slice(0, 8)}`}</span>
                <MaterialIcon icon={selectedVideoId === video.id ? 'check_circle' : 'play_arrow'} className={selectedVideoId === video.id ? 'text-primary' : 'text-on-surface-variant'} />
              </button>
            ))}

            {!isLoading && videos.length === 0 && (
              <p className="text-sm text-on-surface-variant">{isVi ? 'Chua co video nao.' : 'No videos available yet.'}</p>
            )}
          </div>

          {canManageVideo && contentId && (
            <div className="mt-6 space-y-3 border-t border-outline-variant pt-4">
              <h5 className="text-sm font-semibold text-on-surface">{isVi ? 'Them video YouTube' : 'Add YouTube video'}</h5>
              <input
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <input
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                placeholder={isVi ? 'Tieu de (tuy chon)' : 'Title (optional)'}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <textarea
                value={videoDescription}
                onChange={(event) => setVideoDescription(event.target.value)}
                placeholder={isVi ? 'Mo ta (tuy chon)' : 'Description (optional)'}
                className="min-h-[80px] w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
              />
              <Button onClick={() => void handleCreateVideo()} disabled={isSubmitting || !youtubeUrl.trim()}>
                {isSubmitting ? (isVi ? 'Dang tao...' : 'Creating...') : (isVi ? 'Tao video' : 'Create Video')}
              </Button>
            </div>
          )}

          {canManageVideo && !contentId && (
            <p className="mt-4 text-xs text-on-surface-variant">
              {isVi ? 'Can ?contentId=... de tao video moi.' : 'Provide ?contentId=... in URL to create a new video.'}
            </p>
          )}
          {!canManageVideo && (
            <p className="mt-4 text-xs text-on-surface-variant">
              {isVi ? 'Chi Teacher/OrgAdmin/SysAdmin moi co the tao video.' : 'Only Teacher/OrgAdmin/SysAdmin can create videos.'}
            </p>
          )}
        </Card>
      </div>
    </UserShell>
  )
}
