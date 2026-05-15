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

type FilterKey = 'ALL' | 'VIDEO' | 'QUIZ' | 'DOC' | 'CARDS'

interface MaterialItem {
	id: string
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
	youTubeVideoId: string
	title?: string | null
	description?: string | null
	thumbnailUrl?: string | null
	embeddableUrl: string
	createdAt?: string
}

const filters: Array<{ key: FilterKey; icon: string; labelEn: string; labelVi: string }> = [
	{ key: 'ALL', icon: 'apps', labelEn: 'All Content', labelVi: 'Tat ca' },
	{ key: 'VIDEO', icon: 'movie', labelEn: 'Videos', labelVi: 'Video' },
	{ key: 'QUIZ', icon: 'quiz', labelEn: 'Quizzes', labelVi: 'Quiz' },
	{ key: 'DOC', icon: 'description', labelEn: 'Documents', labelVi: 'Tai lieu' },
	{ key: 'CARDS', icon: 'style', labelEn: 'Flashcards', labelVi: 'The ghi nho' },
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
			errs.push(isVi ? 'Khong tai duoc danh sach tai lieu.' : 'Unable to load documents.')
			setDocuments([])
		}

		if (quizRes.status === 'fulfilled' && quizRes.value.success && quizRes.value.data) {
			setQuizzes(quizRes.value.data)
		} else if (quizRes.status === 'rejected') {
			errs.push(isVi ? 'Khong tai duoc danh sach quiz.' : 'Unable to load quizzes.')
			setQuizzes([])
		}

		if (deckRes.status === 'fulfilled' && deckRes.value.success && deckRes.value.data) {
			setDecks(deckRes.value.data)
		} else if (deckRes.status === 'rejected') {
			errs.push(isVi ? 'Khong tai duoc danh sach the ghi nho.' : 'Unable to load decks.')
			setDecks([])
		}

		if (videoRes.status === 'fulfilled' && videoRes.value.success && videoRes.value.data) {
			setVideos(videoRes.value.data)
		} else if (videoRes.status === 'rejected') {
			errs.push(isVi ? 'Khong tai duoc danh sach video.' : 'Unable to load videos.')
			setVideos([])
		}

		setErrors(errs)
		setLoading(false)
	}, [isVi])

	useEffect(() => {
		void fetchAll()
	}, [fetchAll])

	const allMaterials = useMemo<MaterialItem[]>(() => {
		const docItems: MaterialItem[] = documents.map((d) => ({
			id: `doc-${d.id}`,
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
			type: 'QUIZ',
			title: q.title,
			subtitle: q.status,
			statusLabel: q.status,
			href: `/user/quiz?quizId=${q.quizId}`,
			createdAt: q.createdAt,
		}))

		const deckItems: MaterialItem[] = decks.map((d) => ({
			id: `deck-${d.deckId}`,
			type: 'CARDS',
			title: d.title,
			subtitle: `${d.cardCount} ${isVi ? 'the' : 'cards'}`,
			statusLabel: d.cardCount > 0
				? `${d.masteredCount}/${d.cardCount} ${isVi ? 'da nam' : 'mastered'}`
				: (isVi ? 'Chua co the' : 'No cards yet'),
			href: `/user/decks/${d.deckId}/edit`,
			trailing: `${d.cardCount}`,
			createdAt: d.createdAt,
		}))

		const videoItems: MaterialItem[] = videos.map((v) => ({
			id: `video-${v.id}`,
			type: 'VIDEO',
			title: v.title || (isVi ? 'Video YouTube' : 'YouTube Video'),
			subtitle: v.youTubeVideoId,
			statusLabel: isVi ? 'San sang' : 'Ready',
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
		<MainLayout navbar={<UserNavbar title="EduFutura" />} sidebar={<UserSidebar />}>
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
							<h2 className="text-5xl font-black tracking-[-0.02em] text-[#111b2d] font-headline">{isVi ? 'Thu Vien Hoc Tap' : 'My Learning Library'}</h2>
							<p className="mt-2 text-base text-[#60708a]">
								{isVi
									? 'Quan ly noi dung hoc tap, theo doi tien do va tiep tuc dung luc.'
									: 'Manage your educational content, track progress, and resume where you left off.'}
							</p>
						</div>

						<div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-[#dfe5ef] bg-white">
							{[
								{ value: stats.quizzes.toString(), labelEn: 'Quizzes', labelVi: 'Quiz' },
								{ value: stats.decks.toString(), labelEn: 'Decks', labelVi: 'Bo the' },
								{ value: stats.documents.toString(), labelEn: 'Documents', labelVi: 'Tai lieu' },
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

						<div className="flex items-center gap-2">
							<Link
								to="/user/quizzes/new"
								className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff] transition hover:bg-[#eef4ff]"
							>
								<MaterialIcon icon="quiz" size="xs" />
								<span>{isVi ? 'Tao Quiz' : 'New Quiz'}</span>
							</Link>
							<Link
								to="/user/decks/new"
								className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff] transition hover:bg-[#eef4ff]"
							>
								<MaterialIcon icon="style" size="xs" />
								<span>{isVi ? 'Tao Bo The' : 'New Deck'}</span>
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
								className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
							>
								<MaterialIcon icon="upload_file" size="xs" />
								<span>{isVi ? 'Tai len' : 'Upload'}</span>
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
						<h3 className="text-2xl font-bold text-[#111b2d]">{isVi ? 'Tai lieu cua ban' : 'All Materials'}</h3>

						{loading && (
							<Card>
								<p className="text-sm text-on-surface-variant">{isVi ? 'Dang tai...' : 'Loading...'}</p>
							</Card>
						)}

						{!loading && visibleMaterials.length === 0 && (
							<Card className="border-dashed">
								<div className="flex flex-col items-center gap-3 py-8 text-center">
									<MaterialIcon icon="inbox" size="md" className="text-[#9aa5b5]" />
									<p className="text-sm text-[#60708a]">
										{activeFilter === 'ALL'
											? (isVi ? 'Chua co tai lieu nao. Bat dau bang cach tao Quiz, Bo The hoac tai len tai lieu.' : 'No materials yet. Start by creating a Quiz, Deck, or uploading a Document.')
											: (isVi ? 'Khong co muc nao trong bo loc nay.' : 'No items in this filter.')}
									</p>
									{activeFilter === 'ALL' && (
										<div className="flex flex-wrap justify-center gap-2 pt-2">
											<Link to="/user/quizzes/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white">
												<MaterialIcon icon="add" size="xs" />
												{isVi ? 'Tao Quiz' : 'Create Quiz'}
											</Link>
											<Link to="/user/decks/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white">
												<MaterialIcon icon="add" size="xs" />
												{isVi ? 'Tao Bo The' : 'Create Deck'}
											</Link>
											<Link to="/user/videos/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white">
												<MaterialIcon icon="play_circle" size="xs" />
												{isVi ? 'Xem YouTube' : 'Watch YouTube'}
											</Link>
											<button onClick={() => setIsUploadModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-[#1463ff] bg-white px-4 py-2 text-sm font-semibold text-[#1463ff]">
												<MaterialIcon icon="upload_file" size="xs" />
												{isVi ? 'Tai len' : 'Upload'}
											</button>
										</div>
									)}
								</div>
							</Card>
						)}

						{!loading && visibleMaterials.length > 0 && (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
								{visibleMaterials.map((item) => {
									const card = (
										<Card key={item.id} className="overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none transition hover:border-[#1463ff] hover:shadow-md">
											<div
												className="relative h-32"
												style={{
													background:
														item.type === 'QUIZ'
															? 'linear-gradient(140deg,#0f172a,#1e3a8a,#a78bfa)'
															: item.type === 'CARDS'
															? 'linear-gradient(140deg,#d4dbe3,#e5eaef,#f59e0b)'
															: item.type === 'VIDEO'
															? 'linear-gradient(140deg,#0f766e,#155e75,#111827)'
															: 'linear-gradient(140deg,#f1ede7,#ded1c8,#d7d2de)',
												}}
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
									return item.href ? (
										<Link key={item.id} to={item.href} className="block">{card}</Link>
									) : (
										<div key={item.id}>{card}</div>
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
