import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { DocumentUploadModal } from '@components/DocumentUploadModal'
import { apiClient } from '@/utils/apiClient'
import { useUserLanguage } from './UserShell'
import type { Collection } from '@/hooks/useCollections'

type FilterKey = 'ALL' | 'VIDEO' | 'QUIZ' | 'DOC' | 'CARDS'

interface MaterialItem {
	id: string
	rawId: string
	contentId?: string
	type: Exclude<FilterKey, 'ALL'>
	title: string
	subtitle: string
	statusLabel: string
	href?: string
	trailing?: string
	createdAt?: string
}

interface UploadedDocument {
	id: string
	contentId?: string
	fileName: string
	fileType?: string
	fileSizeBytes?: number
	createdAt?: string
}

interface QuizSummary {
	quizId: string
	contentId: string
	title: string
	status: string
	createdAt: string
}

interface DeckSummary {
	deckId: string
	contentId: string
	title: string
	status: string
	cardCount: number
	masteredCount: number
	createdAt: string
}

interface VideoSummary {
	id: string
	contentId: string
	youTubeVideoId: string
	title?: string | null
	description?: string | null
	thumbnailUrl?: string | null
	embeddableUrl: string
	createdAt?: string
}

const filters: Array<{ key: FilterKey; icon: string; labelEn: string; labelVi: string }> = [
	{ key: 'ALL', icon: 'apps', labelEn: 'All Content', labelVi: 'Tất cả' },
	{ key: 'VIDEO', icon: 'movie', labelEn: 'Videos', labelVi: 'Video' },
	{ key: 'QUIZ', icon: 'quiz', labelEn: 'Quizzes', labelVi: 'Quiz' },
	{ key: 'DOC', icon: 'description', labelEn: 'Documents', labelVi: 'Tài liệu' },
	{ key: 'CARDS', icon: 'style', labelEn: 'Flashcards', labelVi: 'Thẻ ghi nhớ' },
]

function formatBytes(bytes?: number) {
	if (typeof bytes !== 'number') return ''
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export const UserContentLibraryPage: React.FC = () => {
	const isVi = useUserLanguage()
	const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL')
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
	const [documents, setDocuments] = useState<UploadedDocument[]>([])
	const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
	const [decks, setDecks] = useState<DeckSummary[]>([])
	const [videos, setVideos] = useState<VideoSummary[]>([])
	const [loading, setLoading] = useState(true)
	const [errors, setErrors] = useState<string[]>([])
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [addPickerItemId, setAddPickerItemId] = useState<string | null>(null)
	const [pickerCollections, setPickerCollections] = useState<Collection[] | null>(null)
	const [pickerLoading, setPickerLoading] = useState(false)
	const [addingToCollectionId, setAddingToCollectionId] = useState<string | null>(null)

	const fetchAll = useCallback(async () => {
		setLoading(true)
		const errs: string[] = []

		const [docRes, quizRes, deckRes, videoRes] = await Promise.allSettled([
			apiClient.get<UploadedDocument[]>('/documents'),
			apiClient.get<QuizSummary[]>('/quizzes'),
			apiClient.get<DeckSummary[]>('/decks'),
			apiClient.get<VideoSummary[]>('/videos/personal'),
		])

		if (docRes.status === 'fulfilled' && docRes.value.success && docRes.value.data) {
			setDocuments(docRes.value.data)
		} else if (docRes.status === 'rejected') {
			errs.push(isVi ? 'Không tải được danh sách tài liệu.' : 'Unable to load documents.')
			setDocuments([])
		}

		if (quizRes.status === 'fulfilled' && quizRes.value.success && quizRes.value.data) {
			setQuizzes(quizRes.value.data)
		} else if (quizRes.status === 'rejected') {
			errs.push(isVi ? 'Không tải được danh sách quiz.' : 'Unable to load quizzes.')
			setQuizzes([])
		}

		if (deckRes.status === 'fulfilled' && deckRes.value.success && deckRes.value.data) {
			setDecks(deckRes.value.data)
		} else if (deckRes.status === 'rejected') {
			errs.push(isVi ? 'Không tải được danh sách thẻ ghi nhớ.' : 'Unable to load decks.')
			setDecks([])
		}

		if (videoRes.status === 'fulfilled' && videoRes.value.success && videoRes.value.data) {
			setVideos(videoRes.value.data)
		} else if (videoRes.status === 'rejected') {
			errs.push(isVi ? 'Không tải được danh sách video.' : 'Unable to load videos.')
			setVideos([])
		}

		setErrors(errs)
		setLoading(false)
	}, [isVi])

	useEffect(() => {
		void fetchAll()
	}, [fetchAll])

	const handleDeleteItem = useCallback(async (item: MaterialItem) => {
		const endpointMap: Record<Exclude<FilterKey, 'ALL'>, string> = {
			DOC: `/documents/${item.rawId}`,
			QUIZ: `/quizzes/${item.rawId}`,
			CARDS: `/decks/${item.rawId}`,
			VIDEO: `/videos/${item.rawId}`,
		}
		const endpoint = endpointMap[item.type]
		setIsDeleting(true)
		try {
			await apiClient.delete(endpoint)
			if (item.type === 'DOC') setDocuments((prev) => prev.filter((d) => d.id !== item.rawId))
			else if (item.type === 'QUIZ') setQuizzes((prev) => prev.filter((q) => q.quizId !== item.rawId))
			else if (item.type === 'CARDS') setDecks((prev) => prev.filter((d) => d.deckId !== item.rawId))
			else if (item.type === 'VIDEO') setVideos((prev) => prev.filter((v) => v.id !== item.rawId))
			setConfirmDeleteId(null)
		} catch {
			// silent — card stays visible so the user can retry
		} finally {
			setIsDeleting(false)
		}
	}, [])

	const handleOpenPicker = useCallback(async (item: MaterialItem, e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setConfirmDeleteId(null)
		setAddPickerItemId(item.id)
		if (pickerCollections !== null) return
		setPickerLoading(true)
		try {
			const res = await apiClient.get<Collection[]>('/collections')
			setPickerCollections(res.success && res.data ? res.data : [])
		} catch {
			setPickerCollections([])
		} finally {
			setPickerLoading(false)
		}
	}, [pickerCollections])

	const handleAddToCollection = useCallback(async (item: MaterialItem, collectionId: string) => {
		if (!item.contentId) return
		setAddingToCollectionId(collectionId)
		try {
			await apiClient.post(`/collections/${collectionId}/items`, { contentId: item.contentId })
			setAddPickerItemId(null)
		} catch {
			// silent
		} finally {
			setAddingToCollectionId(null)
		}
	}, [])

	const allMaterials = useMemo<MaterialItem[]>(() => {
		const docItems: MaterialItem[] = documents.map((d) => ({
			id: `doc-${d.id}`,
			rawId: d.id,
			contentId: d.contentId,
			type: 'DOC',
			title: d.fileName,
			subtitle: (d.fileType ?? 'FILE').toUpperCase(),
			statusLabel: formatBytes(d.fileSizeBytes),
			href: `/user/documents?docId=${d.id}`,
			trailing: formatBytes(d.fileSizeBytes),
			createdAt: d.createdAt,
		}))

		const quizItems: MaterialItem[] = quizzes.map((q) => ({
			id: `quiz-${q.quizId}`,
			rawId: q.quizId,
			contentId: q.contentId,
			type: 'QUIZ',
			title: q.title,
			subtitle: q.status.charAt(0) + q.status.slice(1).toLowerCase(),
			statusLabel: isVi ? 'Làm bài' : 'Take Quiz',
			href: `/user/quiz?quizId=${q.quizId}`,
			createdAt: q.createdAt,
		}))

		const deckItems: MaterialItem[] = decks.map((d) => ({
			id: `deck-${d.deckId}`,
			rawId: d.deckId,
			contentId: d.contentId,
			type: 'CARDS',
			title: d.title,
			subtitle: `${d.cardCount} ${isVi ? 'thẻ' : 'cards'}`,
			statusLabel: d.cardCount > 0
				? `${d.masteredCount}/${d.cardCount} ${isVi ? 'đã nắm' : 'mastered'}`
				: (isVi ? 'Chưa có thẻ' : 'No cards yet'),
			// Card opens the study/review page; empty decks land in the editor so the user can add cards.
			href: d.cardCount > 0
				? `/user/flashcards?deckId=${d.deckId}&contentId=${d.contentId}`
				: `/user/decks/${d.deckId}/edit`,
			trailing: `${d.cardCount}`,
			createdAt: d.createdAt,
		}))

		const videoItems: MaterialItem[] = videos.map((v) => ({
			id: `video-${v.id}`,
			rawId: v.id,
			contentId: v.contentId,
			type: 'VIDEO',
			title: v.title || (isVi ? 'Video YouTube' : 'YouTube Video'),
			subtitle: v.youTubeVideoId,
			statusLabel: isVi ? 'Sẵn sàng' : 'Ready',
			href: `/user/videos/watch/${v.id}`,
			createdAt: v.createdAt,
		}))

		return [...quizItems, ...deckItems, ...docItems, ...videoItems].sort((a, b) => {
			if (!a.createdAt || !b.createdAt) return 0
			return b.createdAt.localeCompare(a.createdAt)
		})
	}, [documents, quizzes, decks, videos, isVi])

	const visibleMaterials = useMemo(
		() => (activeFilter === 'ALL' ? allMaterials : allMaterials.filter((item) => item.type === activeFilter)),
		[activeFilter, allMaterials]
	)

	const stats = useMemo(() => ({
		quizzes: quizzes.length,
		decks: decks.length,
		documents: documents.length,
		videos: videos.length,
	}), [quizzes.length, decks.length, documents.length, videos.length])

	return (
		<MainLayout navbar={<UserNavbar title="Lumina" />} sidebar={<UserSidebar />}>
			<DocumentUploadModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				onUploaded={() => {
					void fetchAll()
				}}
			/>

			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[1320px] space-y-6">
					<section className="grid gap-6 border-b border-[#dde3ec] pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
						<div>
							<h2 className="text-5xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">{isVi ? 'Thư Viện Học Tập' : 'My Learning Library'}</h2>
							<p className="mt-2 text-base text-[#60708a]">
								{isVi
									? 'Quản lý nội dung học tập, theo dõi tiến độ và tiếp tục đúng lúc.'
									: 'Manage your educational content, track progress, and resume where you left off.'}
							</p>
						</div>

						<div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-[#dfe5ef] bg-white">
							{[
								{ value: stats.quizzes.toString(), labelEn: 'Quizzes', labelVi: 'Quiz' },
								{ value: stats.decks.toString(), labelEn: 'Decks', labelVi: 'Bộ thẻ' },
								{ value: stats.documents.toString(), labelEn: 'Documents', labelVi: 'Tài liệu' },
								{ value: stats.videos.toString(), labelEn: 'Videos', labelVi: 'Video' },
							].map((stat, index) => (
								<div key={stat.labelEn} className={`px-6 py-4 text-center ${index < 3 ? 'border-r border-[#e6ecf4]' : ''}`}>
									<div className="text-4xl font-black text-[#1463ff]">{stat.value}</div>
									<div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6c7b94]">{isVi ? stat.labelVi : stat.labelEn}</div>
								</div>
							))}
						</div>
					</section>

					<section className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dde3ec] pb-6">
						<div className="flex flex-wrap gap-2">
							{filters.map((filter) => {
								const active = activeFilter === filter.key
								return (
									<button
										key={filter.key}
										onClick={() => setActiveFilter(filter.key)}
										className={[
											'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
											active
												? 'border-[#1463ff] bg-[#1463ff] text-white'
												: 'border-[#d5dde9] bg-white text-[#5e6f88] hover:border-[#9bb4df] hover:text-[#2a4c88]',
										].join(' ')}
									>
										<MaterialIcon icon={filter.icon} size="xs" fill={active} />
										{isVi ? filter.labelVi : filter.labelEn}
									</button>
								)
							})}
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<Link
								to="/user/quizzes/new"
								className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff] transition hover:bg-[#eef4ff]"
							>
								<MaterialIcon icon="quiz" size="xs" />
								<span>{isVi ? 'Tạo Quiz' : 'New Quiz'}</span>
							</Link>
							<Link
								to="/user/decks/new"
								className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff] transition hover:bg-[#eef4ff]"
							>
								<MaterialIcon icon="style" size="xs" />
								<span>{isVi ? 'Tạo Bộ Thẻ' : 'New Deck'}</span>
							</Link>
							<Link
								to="/user/videos/new"
								className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff] transition hover:bg-[#eef4ff]"
							>
								<MaterialIcon icon="play_circle" size="xs" />
								<span>{isVi ? 'Xem YouTube' : 'Watch YouTube'}</span>
							</Link>
							<button
								type="button"
								onClick={() => setIsUploadModalOpen(true)}
								data-testid="library-upload-btn"
								className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
							>
								<MaterialIcon icon="upload_file" size="xs" />
								<span>{isVi ? 'Tải lên' : 'Upload'}</span>
							</button>
						</div>
					</section>

					{errors.length > 0 && (
						<Card className="border border-red-200 bg-red-50">
							<ul className="list-disc pl-5 text-sm text-red-700">
								{errors.map((e) => <li key={e}>{e}</li>)}
							</ul>
						</Card>
					)}

					<section className="space-y-4">
						<h3 className="text-2xl font-bold text-[#111b2d]">{isVi ? 'Tài liệu của bạn' : 'All Materials'}</h3>

						{loading && (
							<Card>
								<p className="text-sm text-on-surface-variant">{isVi ? 'Đang tải...' : 'Loading...'}</p>
							</Card>
						)}

						{!loading && visibleMaterials.length === 0 && (
							<Card className="border-dashed">
								<div className="flex flex-col items-center gap-3 py-8 text-center">
									<MaterialIcon icon="inbox" size="md" className="text-[#9aa5b5]" />
									<p className="text-sm text-[#60708a]">
										{activeFilter === 'ALL'
											? (isVi ? 'Chưa có tài liệu nào. Bắt đầu bằng cách tạo Quiz, Bộ Thẻ hoặc tải lên tài liệu.' : 'No materials yet. Start by creating a Quiz, Deck, or uploading a Document.')
											: (isVi ? 'Không có mục nào trong bộ lọc này.' : 'No items in this filter.')}
									</p>
									{activeFilter === 'ALL' && (
										<div className="flex flex-wrap justify-center gap-2 pt-2">
											<Link to="/user/quizzes/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white">
												<MaterialIcon icon="add" size="xs" />
												{isVi ? 'Tạo Quiz' : 'Create Quiz'}
											</Link>
											<Link to="/user/decks/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white">
												<MaterialIcon icon="add" size="xs" />
												{isVi ? 'Tạo Bộ Thẻ' : 'Create Deck'}
											</Link>
											<Link to="/user/videos/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white">
												<MaterialIcon icon="play_circle" size="xs" />
												{isVi ? 'Xem YouTube' : 'Watch YouTube'}
											</Link>
											<button onClick={() => setIsUploadModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff]">
												<MaterialIcon icon="upload_file" size="xs" />
												{isVi ? 'Tải lên' : 'Upload'}
											</button>
										</div>
									)}
								</div>
							</Card>
						)}

						{!loading && visibleMaterials.length > 0 && (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								{visibleMaterials.map((item) => {
									const headerGradient =
										item.type === 'QUIZ'
											? 'linear-gradient(140deg,#0f172a,#1e3a8a,#a78bfa)'
											: item.type === 'CARDS'
											? 'linear-gradient(140deg,#d4dbe3,#e5eaef,#f59e0b)'
											: item.type === 'VIDEO'
											? 'linear-gradient(140deg,#0f766e,#155e75,#111827)'
											: 'linear-gradient(140deg,#f1ede7,#ded1c8,#d7d2de)'

									const cardInner = (
										<Card className="overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none transition hover:border-[#1463ff] hover:shadow-md">
											<div
												className="relative h-32 rounded-t-2xl overflow-hidden"
												style={{ background: headerGradient }}
											>
												<span className="absolute left-2 top-2 rounded-full bg-[#111b2d]/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
													{item.type}
												</span>
											</div>
											<div className="space-y-2 p-5">
												<h4 className="line-clamp-2 min-h-[44px] text-base font-bold text-[#111b2d]">{item.title}</h4>
												<p className="text-xs text-[#6d7f98]">{item.subtitle}</p>
												<div className="text-right text-xs font-semibold text-[#1463ff]">{item.statusLabel}</div>
											</div>
										</Card>
									)

									return (
										<div key={item.id} className="relative">
											{confirmDeleteId === item.id ? (
												<div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6">
													<p className="mb-4 text-center text-sm font-semibold text-red-700">
														{isVi ? 'Xoá vĩnh viễn mục này?' : 'Permanently delete this item?'}
													</p>
													<div className="flex gap-2">
														<button
															type="button"
															onClick={() => void handleDeleteItem(item)}
															disabled={isDeleting}
															className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
														>
															{isDeleting ? (isVi ? 'Đang xoá...' : 'Deleting…') : (isVi ? 'Xác nhận xoá' : 'Confirm Delete')}
														</button>
														<button
															type="button"
															onClick={() => setConfirmDeleteId(null)}
															disabled={isDeleting}
															className="rounded-lg border border-[#d5dde9] bg-white px-4 py-2 text-sm font-semibold text-[#5e6f88] transition hover:bg-[#f0f4f9]"
														>
															{isVi ? 'Huỷ' : 'Cancel'}
														</button>
													</div>
												</div>
											) : addPickerItemId === item.id ? (
												<div className="flex min-h-[220px] flex-col rounded-2xl border border-[#dde3ec] bg-white p-4 shadow-sm">
													<div className="mb-3 flex items-center justify-between">
														<p className="text-sm font-semibold text-[#111b2d]">
															{isVi ? 'Thêm vào bộ sưu tập' : 'Add to collection'}
														</p>
														<button
															type="button"
															onClick={() => setAddPickerItemId(null)}
															className="rounded-full p-1 text-[#8a98b0] hover:bg-[#f0f4f9] hover:text-[#111b2d] transition"
														>
															<MaterialIcon icon="close" size="xs" />
														</button>
													</div>
													{pickerLoading ? (
														<div className="flex flex-1 items-center justify-center">
															<div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
														</div>
													) : pickerCollections === null || pickerCollections.length === 0 ? (
														<div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
															<MaterialIcon icon="folder_off" size="sm" className="text-[#9aa5b5]" />
															<p className="text-xs text-[#60708a]">
																{isVi ? 'Chưa có bộ sưu tập nào.' : 'No collections yet.'}
															</p>
															<Link
																to="/user/collections"
																className="text-xs font-semibold text-[#1463ff] hover:underline"
																onClick={() => setAddPickerItemId(null)}
															>
																{isVi ? 'Tạo bộ sưu tập' : 'Create one'}
															</Link>
														</div>
													) : (
														<div className="flex-1 space-y-1 overflow-y-auto">
															{pickerCollections.map((c) => (
																<button
																	key={c.id}
																	type="button"
																	onClick={() => void handleAddToCollection(item, c.id)}
																	disabled={addingToCollectionId === c.id}
																	className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-[#f0f4f9] disabled:opacity-50"
																>
																	<MaterialIcon icon="folder" size="xs" className="shrink-0 text-[#1463ff]" />
																	<span className="truncate font-medium text-[#111b2d]">{c.title}</span>
																	{addingToCollectionId === c.id && (
																		<div className="ml-auto h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
																	)}
																</button>
															))}
														</div>
													)}
												</div>
											) : (
												<>
													{item.href ? (
														<Link to={item.href} className="block">{cardInner}</Link>
													) : (
														cardInner
													)}
													<div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
														{item.contentId && (
															<button
																type="button"
																onClick={(e) => void handleOpenPicker(item, e)}
																className="rounded-full bg-black/40 p-1.5 text-white/70 transition-colors hover:bg-[#1463ff] hover:text-white"
																title={isVi ? 'Thêm vào bộ sưu tập' : 'Add to collection'}
															>
																<MaterialIcon icon="bookmark_add" size="xs" />
															</button>
														)}
														<button
															type="button"
															onClick={(e) => { e.preventDefault(); setAddPickerItemId(null); setConfirmDeleteId(item.id) }}
															className="rounded-full bg-black/40 p-1.5 text-white/70 transition-colors hover:bg-red-600 hover:text-white"
															title={isVi ? 'Xoá' : 'Delete'}
														>
															<MaterialIcon icon="delete" size="xs" />
														</button>
													</div>
												</>
											)}
										</div>
									)
								})}
							</div>
						)}
					</section>
				</div>
			</div>
		</MainLayout>
	)
}
