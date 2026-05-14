import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
	titleEn: string
	titleVi: string
	categoryEn: string
	categoryVi: string
	levelEn: string
	levelVi: string
	duration: string
	trailing: string
	statusEn: string
	statusVi: string
	progress: number
	progressColor: string
	image: string
}

interface UploadedDocument {
	id: string
	fileName: string
	fileType?: string
	fileSizeBytes?: number
}

const filters: Array<{ key: FilterKey; icon: string; labelEn: string; labelVi: string }> = [
	{ key: 'ALL', icon: 'apps', labelEn: 'All Content', labelVi: 'Tat ca' },
	{ key: 'VIDEO', icon: 'movie', labelEn: 'Videos', labelVi: 'Video' },
	{ key: 'QUIZ', icon: 'quiz', labelEn: 'Quizzes', labelVi: 'Quiz' },
	{ key: 'DOC', icon: 'description', labelEn: 'Documents', labelVi: 'Tai lieu' },
	{ key: 'CARDS', icon: 'style', labelEn: 'Flashcards', labelVi: 'The ghi nho' },
]

const materials: MaterialItem[] = [
	{
		id: 'quiz-cellular',
		type: 'QUIZ',
		titleEn: 'Cellular Respiration Test',
		titleVi: 'Kiem tra ho hap te bao',
		categoryEn: 'Biology',
		categoryVi: 'Sinh hoc',
		levelEn: 'Intermediate',
		levelVi: 'Trung cap',
		duration: '20 mins',
		trailing: '15 Qs',
		statusEn: 'Not started',
		statusVi: 'Chua bat dau',
		progress: 0,
		progressColor: '#9aa5b5',
		image: 'linear-gradient(140deg,#95d8d6,#7ab8db,#f3d6ad)',
	},
	{
		id: 'doc-industrial',
		type: 'DOC',
		titleEn: 'The Industrial Revolution PDF',
		titleVi: 'Tai lieu Cach mang Cong nghiep',
		categoryEn: 'History',
		categoryVi: 'Lich su',
		levelEn: 'Basic',
		levelVi: 'Co ban',
		duration: '12 Pages',
		trailing: '15 mins',
		statusEn: 'Completed',
		statusVi: 'Hoan thanh',
		progress: 100,
		progressColor: '#2fc37a',
		image: 'linear-gradient(140deg,#f1ede7,#ded1c8,#d7d2de)',
	},
	{
		id: 'video-algo',
		type: 'VIDEO',
		titleEn: 'Algorithms & Data Structures',
		titleVi: 'Thuat toan va cau truc du lieu',
		categoryEn: 'Computer Science',
		categoryVi: 'Khoa hoc may tinh',
		levelEn: 'Advanced',
		levelVi: 'Nang cao',
		duration: '45 mins',
		trailing: '',
		statusEn: '30% Complete',
		statusVi: 'Hoan thanh 30%',
		progress: 30,
		progressColor: '#ef4444',
		image: 'linear-gradient(140deg,#111827,#0f172a,#164e63)',
	},
	{
		id: 'cards-spanish',
		type: 'CARDS',
		titleEn: 'Spanish Vocabulary: Travel',
		titleVi: 'Tu vung Tieng Tay Ban Nha: Du lich',
		categoryEn: 'Language',
		categoryVi: 'Ngon ngu',
		levelEn: 'Beginner',
		levelVi: 'Nhap mon',
		duration: '10 mins',
		trailing: 'Daily',
		statusEn: '80% Mastered',
		statusVi: 'Da nam 80%',
		progress: 80,
		progressColor: '#f59e0b',
		image: 'linear-gradient(140deg,#d4dbe3,#e5eaef,#cfd7de)',
	},
	{
		id: 'video-dna',
		type: 'VIDEO',
		titleEn: 'Understanding DNA Replication',
		titleVi: 'Tim hieu sao chep ADN',
		categoryEn: 'Genetics',
		categoryVi: 'Di truyen hoc',
		levelEn: 'Intermediate',
		levelVi: 'Trung cap',
		duration: '32 mins',
		trailing: '',
		statusEn: 'Not started',
		statusVi: 'Chua bat dau',
		progress: 0,
		progressColor: '#9aa5b5',
		image: 'linear-gradient(140deg,#0f766e,#155e75,#111827)',
	},
	{
		id: 'quiz-solar',
		type: 'QUIZ',
		titleEn: 'Our Solar System',
		titleVi: 'He Mat Troi cua chung ta',
		categoryEn: 'Astronomy',
		categoryVi: 'Thien van hoc',
		levelEn: 'Basic',
		levelVi: 'Co ban',
		duration: '15 mins',
		trailing: '10 Qs',
		statusEn: 'Score: 90%',
		statusVi: 'Diem: 90%',
		progress: 90,
		progressColor: '#a855f7',
		image: 'linear-gradient(140deg,#0f172a,#1e3a8a,#a78bfa)',
	},
	{
		id: 'doc-linear',
		type: 'DOC',
		titleEn: 'Linear Algebra Cheatsheet',
		titleVi: 'Cheatsheet Dai so tuyen tinh',
		categoryEn: 'Mathematics',
		categoryVi: 'Toan hoc',
		levelEn: 'Advanced',
		levelVi: 'Nang cao',
		duration: '4 Pages',
		trailing: '5 mins',
		statusEn: 'Just started',
		statusVi: 'Vua bat dau',
		progress: 10,
		progressColor: '#3b82f6',
		image: 'linear-gradient(140deg,#f0f4f8,#e8edf2,#dce6f1)',
	},
	{
		id: 'cards-periodic',
		type: 'CARDS',
		titleEn: 'Periodic Table Elements',
		titleVi: 'Cac nguyen to bang tuan hoan',
		categoryEn: 'Chemistry',
		categoryVi: 'Hoa hoc',
		levelEn: 'Intermediate',
		levelVi: 'Trung cap',
		duration: '25 mins',
		trailing: 'Review',
		statusEn: '55% Mastered',
		statusVi: 'Da nam 55%',
		progress: 55,
		progressColor: '#f59e0b',
		image: 'linear-gradient(140deg,#e3eef2,#d7e5ec,#f2f8fb)',
	},
]

export const UserContentLibraryLightPage: React.FC = () => {
	const isVi = useUserLanguage()
	const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL')
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
	const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([])
	const [documentsError, setDocumentsError] = useState<string | null>(null)

	const visibleMaterials = useMemo(
		() => (activeFilter === 'ALL' ? materials : materials.filter((item) => item.type === activeFilter)),
		[activeFilter]
	)

	const fetchUploadedDocuments = useCallback(async () => {
		setDocumentsError(null)

		try {
			const response = await apiClient.get<UploadedDocument[]>('/documents')
			if (!response.success || !response.data) throw new Error(response.message || 'Unable to load documents')
			setUploadedDocuments(response.data)
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unable to load documents'
			setDocumentsError(message)
			setUploadedDocuments([])
		}
	}, [])

	useEffect(() => {
		void fetchUploadedDocuments()
	}, [fetchUploadedDocuments])

	return (
		<MainLayout navbar={<UserNavbar title="EduFutura" />} sidebar={<UserSidebar />}>
			<DocumentUploadModal
				isOpen={isUploadModalOpen}
				onClose={() => setIsUploadModalOpen(false)}
				onUploaded={() => {
					void fetchUploadedDocuments()
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

						<div className="grid grid-cols-3 overflow-hidden rounded-3xl border border-[#dfe5ef] bg-white">
							{[
								{ value: '12', labelEn: 'In Progress', labelVi: 'Dang hoc' },
								{ value: '85%', labelEn: 'Avg. Score', labelVi: 'Diem TB' },
								{ value: '24', labelEn: 'Completed', labelVi: 'Hoan thanh' },
							].map((stat, index) => (
								<div key={stat.labelEn} className={`px-8 py-4 text-center ${index < 2 ? 'border-r border-[#e6ecf4]' : ''}`}>
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
							<button
								type="button"
								onClick={() => setIsUploadModalOpen(true)}
								className="inline-flex items-center gap-2 rounded-lg bg-[#1463ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]"
							>
								<MaterialIcon icon="upload_file" size="xs" />
								<span>{isVi ? 'Tai len' : 'Upload'}</span>
							</button>

							<button className="inline-flex items-center gap-2 rounded-lg border border-[#d6dfea] bg-white px-4 py-2 text-sm text-[#5d6d85]">
								<span>{isVi ? 'Sap xep theo:' : 'Sort by:'}</span>
								<span className="font-semibold text-[#223048]">{isVi ? 'Hoat dong gan day' : 'Recent Activity'}</span>
								<MaterialIcon icon="expand_more" size="xs" />
							</button>
						</div>
					</section>

					<section className="space-y-4">
						<div className="flex items-center gap-2 text-[#111b2d]">
							<MaterialIcon icon="description" size="sm" className="text-[#1463ff]" fill />
							<h3 className="text-2xl font-bold">{isVi ? 'Tai lieu da tai len' : 'Uploaded Documents'}</h3>
						</div>

						{documentsError && (
							<Card className="border border-red-200 bg-red-50">
								<p className="text-sm text-red-700">{documentsError}</p>
							</Card>
						)}

						{!documentsError && uploadedDocuments.length === 0 && (
							<Card>
								<p className="text-sm text-on-surface-variant">{isVi ? 'Chua co tai lieu nao duoc tai len.' : 'No uploaded documents yet.'}</p>
							</Card>
						)}

						{uploadedDocuments.length > 0 && (
							<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
								{uploadedDocuments.map((document) => (
									<Card key={document.id} className="border border-[#dce3ed] bg-white">
										<div className="mb-2 flex items-center gap-2">
											<MaterialIcon icon="description" className="text-[#1463ff]" size="sm" />
											<h4 className="truncate text-base font-bold text-[#111b2d]">{document.fileName}</h4>
										</div>
										<div className="text-xs text-[#6d7f98]">
											{document.fileType ? document.fileType.toUpperCase() : 'FILE'}
											{typeof document.fileSizeBytes === 'number' && (
												<> • {(document.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</>
											)}
										</div>
									</Card>
								))}
							</div>
						)}
					</section>

					<section className="space-y-3">
						<div className="flex items-center gap-2 text-[#111b2d]">
							<MaterialIcon icon="play_circle" size="sm" className="text-[#1463ff]" fill />
							<h3 className="text-2xl font-bold">{isVi ? 'Tiep tuc hoc' : 'Continue Learning'}</h3>
						</div>

						<Card className="overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none">
							<div className="grid lg:grid-cols-[320px_1fr]">
								<div className="h-[240px] bg-[radial-gradient(circle_at_50%_45%,#22d3ee_0%,#0b3a5a_38%,#051726_100%)]" />
								<div className="space-y-4 p-6">
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1463ff]">{isVi ? 'Vat ly • Nang cao' : 'Physics • Advanced'}</p>
											<h4 className="mt-1 text-4xl font-black leading-tight text-[#111b2d]">{isVi ? 'Nhap mon Co hoc luong tu' : 'Introduction to Quantum Mechanics'}</h4>
											<p className="mt-2 text-sm text-[#66778f]">
												{isVi
													? 'Tim hieu cac nguyen ly nen tang cua vat ly luong tu, song-hat va nguyen ly bat dinh.'
													: 'Dive deep into the fundamental principles of quantum physics, exploring wave-particle duality and the uncertainty principle.'}
											</p>
										</div>
										<span className="text-xs text-[#8ea0b7]">{isVi ? 'Truy cap 2 gio truoc' : 'Last accessed 2h ago'}</span>
									</div>

									<div className="space-y-2 pt-3">
										<div className="flex items-center justify-between text-xs text-[#5f6f86]">
											<span>{isVi ? 'Hoan thanh 65%' : '65% Complete'}</span>
											<span>{isVi ? 'Con 45 phut' : '45m remaining'}</span>
										</div>
										<div className="h-2 rounded-full bg-[#e6ebf4]">
											<div className="h-2 w-[65%] rounded-full bg-[#2f7cff]" />
										</div>
									</div>

									<div className="flex justify-end">
										<button className="rounded-lg bg-[#1463ff] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0f56df]">
											{isVi ? 'Tiep tuc' : 'Resume'}
										</button>
									</div>
								</div>
							</div>
						</Card>
					</section>

					<section className="space-y-4">
						<h3 className="text-2xl font-bold text-[#111b2d]">{isVi ? 'Tat ca tai lieu' : 'All Materials'}</h3>

						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
							{visibleMaterials.map((item) => (
								<Card key={item.id} className="overflow-hidden rounded-2xl border border-[#dce3ed] p-0 shadow-none">
									<div className="relative h-40" style={{ background: item.image }}>
										<span className="absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white bg-[#111b2d]/70">
											{item.type}
										</span>
										{item.type === 'VIDEO' && (
											<div className="absolute inset-0 grid place-items-center">
												<div className="rounded-full bg-white/85 p-2 text-[#111b2d]">
													<MaterialIcon icon="play_arrow" size="sm" fill />
												</div>
											</div>
										)}
									</div>

									<div className="space-y-3 p-6 gap-6">
										<p className="text-xs text-[#7a8ba3]">
											{isVi ? item.categoryVi : item.categoryEn} • {isVi ? item.levelVi : item.levelEn}
										</p>
										<h4 className="min-h-[48px] text-xl font-semibold text-slate-800 tracking-tight leading-tight text-[#111b2d]">{isVi ? item.titleVi : item.titleEn}</h4>

										<div className="h-1 rounded-full bg-[#e8edf6]">
											<div className="h-1 rounded-full" style={{ width: `${item.progress}%`, backgroundColor: item.progressColor }} />
										</div>

										<div className="flex items-center justify-between text-xs text-[#6d7f98]">
											<span className="inline-flex items-center gap-1"><MaterialIcon icon="schedule" size="xs" />{item.duration}</span>
											<span>{item.trailing}</span>
										</div>
										<div className="text-right text-xs font-semibold" style={{ color: item.progressColor }}>
											{isVi ? item.statusVi : item.statusEn}
										</div>
									</div>
								</Card>
							))}
						</div>
					</section>

					<section className="flex items-center justify-center gap-2 pt-2">
						<button className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7dfeb] bg-white text-[#60708a]">
							<MaterialIcon icon="chevron_left" size="xs" />
						</button>
						{[1, 2, 3].map((page) => (
							<button
								key={page}
								className={[
									'h-9 min-w-[36px] rounded-lg border px-2 text-sm font-semibold',
									page === 1
										? 'border-[#1463ff] bg-[#1463ff] text-white'
										: 'border-[#d7dfeb] bg-white text-[#5f6f88]',
								].join(' ')}
							>
								{page}
							</button>
						))}
						<span className="px-1 text-sm text-[#8ea0b7]">...</span>
						<button className="h-9 min-w-[36px] rounded-lg border border-[#d7dfeb] bg-white px-2 text-sm font-semibold text-[#5f6f88]">12</button>
						<button className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7dfeb] bg-white text-[#60708a]">
							<MaterialIcon icon="chevron_right" size="xs" />
						</button>
					</section>
				</div>
			</div>
		</MainLayout>
	)
}

