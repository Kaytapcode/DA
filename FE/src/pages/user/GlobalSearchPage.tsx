import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { apiClient } from '@/utils/apiClient'
import { useUserLanguage } from './UserShell'

interface SearchResult {
	contentId: string
	title: string
	contentType: 'VIDEO' | 'QUIZ' | 'FLASHCARD' | 'PDF' | 'COLLECTION'
	ownedByCaller: boolean
	resourceId: string | null
	createdAt: string
}

type ScopeFilter = 'all' | 'owned' | 'public'
type TypeFilter = 'ALL' | 'VIDEO' | 'QUIZ' | 'FLASHCARD' | 'PDF' | 'COLLECTION'

const TYPE_META: Record<Exclude<TypeFilter, 'ALL'>, {
	icon: string
	labelEn: string
	labelVi: string
	gradient: string
}> = {
	VIDEO: {
		icon: 'play_circle',
		labelEn: 'Video',
		labelVi: 'Video',
		gradient: 'linear-gradient(140deg,#0f766e,#155e75,#111827)',
	},
	QUIZ: {
		icon: 'quiz',
		labelEn: 'Quiz',
		labelVi: 'Quiz',
		gradient: 'linear-gradient(140deg,#0f172a,#1e3a8a,#a78bfa)',
	},
	FLASHCARD: {
		icon: 'style',
		labelEn: 'Flashcard',
		labelVi: 'The ghi nho',
		gradient: 'linear-gradient(140deg,#d4dbe3,#e5eaef,#f59e0b)',
	},
	PDF: {
		icon: 'description',
		labelEn: 'Document',
		labelVi: 'Tai lieu',
		gradient: 'linear-gradient(140deg,#f1ede7,#ded1c8,#d7d2de)',
	},
	COLLECTION: {
		icon: 'folder',
		labelEn: 'Collection',
		labelVi: 'Bo suu tap',
		gradient: 'linear-gradient(140deg,#1463ff,#0f43b8,#7c3aed)',
	},
}

// Returns the React-Router href for all navigable content types.
// All PDFs (owned or not) open in the embedded DocumentViewerPage which fetches via
// authenticated apiClient — avoiding the JWT header gap of a raw browser link.
function resultHref(r: SearchResult): string | null {
	if (!r.resourceId) return null
	switch (r.contentType) {
		case 'VIDEO':
			return `/user/videos/watch/${r.resourceId}`
		case 'QUIZ':
			return `/user/quiz?quizId=${r.resourceId}`
		case 'FLASHCARD':
			return `/user/flashcards?deckId=${r.resourceId}&contentId=${r.contentId}&owned=${r.ownedByCaller}`
		case 'PDF':
			return `/user/documents?docId=${r.resourceId}&contentId=${r.contentId}`
		case 'COLLECTION':
			return `/user/collections?collectionId=${r.resourceId}`
		default:
			return null
	}
}

export const GlobalSearchPage: React.FC = () => {
	const isVi = useUserLanguage()
	const [query, setQuery] = useState('')
	const [scope, setScope] = useState<ScopeFilter>('all')
	const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
	const [results, setResults] = useState<SearchResult[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)
	const [searchError, setSearchError] = useState<string | null>(null)
	const [cloningId, setCloningId] = useState<string | null>(null)
	const [clonedIds, setClonedIds] = useState<Set<string>>(new Set())
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const doSearch = useCallback(async (q: string, s: ScopeFilter, t: TypeFilter) => {
		setIsLoading(true)
		setHasSearched(true)
		setSearchError(null)
		try {
			const params = new URLSearchParams({ scope: s, limit: '100' })
			if (q.trim()) params.set('q', q.trim())
			if (t !== 'ALL') params.set('type', t)
			const res = await apiClient.get<SearchResult[]>(`/search?${params.toString()}`)
			setResults(res.success && res.data ? res.data : [])
		} catch (err) {
			setResults([])
			setSearchError(
				err instanceof Error ? err.message : 'Search service unavailable. Please try again.'
			)
		} finally {
			setIsLoading(false)
		}
	}, [])

	const handleClone = async (contentId: string) => {
		setCloningId(contentId)
		try {
			const res = await apiClient.post(`/contents/${contentId}/clone`)
			if (res.success) setClonedIds((prev) => new Set(prev).add(contentId))
		} finally {
			setCloningId(null)
		}
	}

	// Debounce: fire search 350 ms after the last change to any filter.
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			void doSearch(query, scope, typeFilter)
		}, 350)
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [query, scope, typeFilter, doSearch])

	const t = (vi: string, en: string) => (isVi ? vi : en)

	const scopeOptions: Array<[ScopeFilter, string]> = [
		['all', t('Tat ca', 'All')],
		['owned', t('Cua ban', 'Mine')],
		['public', t('Cong khai', 'Public')],
	]

	const typeOptions: TypeFilter[] = ['ALL', 'VIDEO', 'QUIZ', 'FLASHCARD', 'PDF', 'COLLECTION']

	return (
		<MainLayout navbar={<UserNavbar title="Lumina" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[1320px] space-y-6">
					{/* Header */}
					<section className="border-b border-[#dde3ec] pb-6">
						<h2 className="text-5xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">
							{t('Tim Kiem Noi Dung', 'Global Search')}
						</h2>
						<p className="mt-2 text-base text-[#60708a]">
							{t(
								'Tim kiem tai lieu, quiz, the ghi nho va video tu tat ca nguoi dung.',
								'Search your own and public learning assets from across the platform.',
							)}
						</p>
					</section>

					{/* Search input */}
					<div className="relative">
						<div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
							<MaterialIcon icon="search" size="sm" className="text-[#8a98b0]" />
						</div>
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={t(
								'Nhap tu khoa tim kiem…',
								'Search quizzes, videos, flashcard decks, documents…',
							)}
							className="w-full rounded-2xl border border-[#dfe5ef] bg-white py-4 pl-12 pr-12 text-base text-[#111b2d] shadow-sm outline-none placeholder:text-[#9aa5b5] focus:border-[#1463ff] focus:ring-2 focus:ring-[#1463ff]/20"
							autoFocus
						/>
						{isLoading && (
							<div className="absolute inset-y-0 right-4 flex items-center">
								<div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[#1463ff]" />
							</div>
						)}
					</div>

					{/* Filter row */}
					<div className="flex flex-wrap items-center gap-4">
						{/* Scope toggle */}
						<div className="flex items-center gap-1 rounded-xl border border-[#dfe5ef] bg-white p-1">
							{scopeOptions.map(([s, label]) => (
								<button
									key={s}
									type="button"
									onClick={() => setScope(s)}
									className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
										scope === s
											? 'bg-[#1463ff] text-white'
											: 'text-[#5e6f88] hover:bg-[#f0f4f9]'
									}`}
								>
									{label}
								</button>
							))}
						</div>

						{/* Type chips */}
						<div className="flex flex-wrap gap-2">
							{typeOptions.map((tp) => {
								const meta = tp !== 'ALL' ? TYPE_META[tp] : null
								const active = typeFilter === tp
								return (
									<button
										key={tp}
										type="button"
										onClick={() => setTypeFilter(tp)}
										className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
											active
												? 'border-[#1463ff] bg-[#1463ff] text-white'
												: 'border-[#d5dde9] bg-white text-[#5e6f88] hover:border-[#9bb4df]'
										}`}
									>
										{meta && <MaterialIcon icon={meta.icon} size="xs" />}
										{tp === 'ALL'
											? t('Tat ca loai', 'All Types')
											: isVi
											? meta?.labelVi
											: meta?.labelEn}
									</button>
								)
							})}
						</div>
					</div>

					{/* Error banner */}
					{searchError && !isLoading && (
						<div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
							<MaterialIcon icon="error_outline" size="sm" className="mt-0.5 shrink-0 text-red-500" />
							<div>
								<p className="text-sm font-semibold text-red-700">
									{t('Loi tim kiem', 'Search error')}
								</p>
								<p className="text-xs text-red-600">{searchError}</p>
							</div>
						</div>
					)}

					{/* Results count */}
					{hasSearched && !isLoading && results.length > 0 && (
						<p className="text-sm text-[#60708a]">
							{results.length} {t('ket qua', 'results')}
							{query.trim() ? ` ${t('cho', 'for')} "${query.trim()}"` : ''}
						</p>
					)}

					{/* Initial state */}
					{!hasSearched && !isLoading && (
						<div className="flex flex-col items-center gap-3 py-20 text-center">
							<MaterialIcon icon="manage_search" size="md" className="text-[#9aa5b5]" />
							<p className="text-sm text-[#60708a]">
								{t(
									'Nhap tu khoa de bat dau tim kiem.',
									'Start typing to search across all accessible content.',
								)}
							</p>
						</div>
					)}

					{/* Empty results */}
					{hasSearched && !isLoading && results.length === 0 && !searchError && (
						<Card className="border-dashed">
							<div className="flex flex-col items-center gap-3 py-12 text-center">
								<MaterialIcon icon="search_off" size="md" className="text-[#9aa5b5]" />
								<p className="text-sm font-semibold text-[#111b2d]">
									{t('Khong tim thay ket qua', 'No results found')}
								</p>
								<p className="text-xs text-[#60708a]">
									{t(
										'Thu dung tu khoa khac hoac thay doi bo loc.',
										'Try different keywords or adjust the scope and type filters.',
									)}
								</p>
							</div>
						</Card>
					)}

					{/* Result grid */}
					{results.length > 0 && (
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							{results.map((r) => {
								const meta =
									r.contentType in TYPE_META
										? TYPE_META[r.contentType as Exclude<TypeFilter, 'ALL'>]
										: null
								const href = resultHref(r)

								const cardBody = (
									<Card className="overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none transition hover:border-[#1463ff] hover:shadow-md">
										<div
											className="relative h-24 overflow-hidden rounded-t-2xl"
											style={{
												background:
													meta?.gradient ??
													'linear-gradient(140deg,#e2e8f0,#cbd5e1)',
											}}
										>
											<span className="absolute left-2 top-2 rounded-full bg-[#111b2d]/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
												{r.contentType === 'FLASHCARD'
													? (isVi ? 'THE' : 'CARDS')
													: r.contentType === 'COLLECTION'
													? (isVi ? 'BST' : 'FOLDER')
													: r.contentType}
											</span>
											{!r.ownedByCaller && (
												<span className="absolute right-2 top-2 rounded-full bg-[#f59e0b]/90 px-2 py-1 text-[10px] font-bold text-white">
													{t('Cong khai', 'Public')}
												</span>
											)}
											{r.ownedByCaller && (
												<span className="absolute right-2 top-2 rounded-full bg-[#1463ff]/80 px-2 py-1 text-[10px] font-bold text-white">
													{t('Cua ban', 'Yours')}
												</span>
											)}
										</div>
										<div className="space-y-2 p-4">
											<h4 className="line-clamp-2 min-h-[40px] text-sm font-bold text-[#111b2d]">
												{r.title}
											</h4>
											<div className="flex items-center justify-between">
												<p className="text-xs text-[#6d7f98]">
													{meta
														? isVi
															? meta.labelVi
															: meta.labelEn
														: r.contentType}
												</p>
												<div className="flex items-center gap-1.5">
													{/* Add to Library — only for non-owned cloneable types */}
													{!r.ownedByCaller && r.contentType !== 'COLLECTION' && (
														clonedIds.has(r.contentId) ? (
															<span className="text-[10px] font-bold text-green-600">
																{t('Da them', 'Added ✓')}
															</span>
														) : (
															<button
																type="button"
																onClick={(e) => {
																	e.preventDefault()
																	e.stopPropagation()
																	void handleClone(r.contentId)
																}}
																disabled={cloningId === r.contentId}
																className="inline-flex items-center gap-1 rounded-full border border-[#d5dde9] px-2 py-0.5 text-[10px] font-semibold text-[#5e6f88] transition hover:border-[#1463ff] hover:text-[#1463ff] disabled:opacity-40"
															>
																<MaterialIcon icon="bookmark_add" size="xs" />
																{cloningId === r.contentId
																	? '…'
																	: (isVi ? 'Them vao' : 'Add')}
															</button>
														)
													)}
													{/* Navigation hint for linked cards */}
													{href && (
														<span className="text-xs font-semibold text-[#1463ff]">
															{t('Xem', 'View →')}
														</span>
													)}
												</div>
											</div>
										</div>
									</Card>
								)

								return (
									<div key={r.contentId}>
										{href ? (
											<Link to={href} className="block">
												{cardBody}
											</Link>
										) : (
											cardBody
										)}
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
