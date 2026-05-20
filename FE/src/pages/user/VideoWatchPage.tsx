import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { apiClient } from '@/utils/apiClient'
import { useUserLanguage } from './UserShell'

interface VideoDetail {
	id: string
	contentId: string
	youTubeVideoId: string
	title?: string | null
	description?: string | null
	thumbnailUrl?: string | null
	embeddableUrl: string
	createdByUserId?: string | null
}

const getCurrentUserId = (): string | null => {
	try {
		const raw = localStorage.getItem('auth_user')
		if (!raw) return null
		const parsed = JSON.parse(raw) as { id?: string }
		return parsed.id ?? null
	} catch { return null }
}

export const VideoWatchPage: React.FC = () => {
	const isVi = useUserLanguage()
	const navigate = useNavigate()
	const { videoId } = useParams<{ videoId: string }>()

	const [video, setVideo] = useState<VideoDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Owner-only rename state.
	const currentUserId = getCurrentUserId()
	const [isEditingTitle, setIsEditingTitle] = useState(false)
	const [titleDraft, setTitleDraft] = useState('')
	const [isSavingTitle, setIsSavingTitle] = useState(false)
	const [renameError, setRenameError] = useState<string | null>(null)

	const t = (vi: string, en: string) => (isVi ? vi : en)

	const isOwner = !!video?.createdByUserId && !!currentUserId
		&& video.createdByUserId.toLowerCase() === currentUserId.toLowerCase()

	const saveRename = async () => {
		if (!videoId || !titleDraft.trim()) return
		setIsSavingTitle(true); setRenameError(null)
		try {
			const res = await apiClient.patch<VideoDetail>(`/videos/${videoId}`, { title: titleDraft.trim() })
			if (!res.success) throw new Error(res.message || 'Rename failed')
			if (res.data) setVideo(res.data)
			setIsEditingTitle(false)
		} catch (err: any) {
			setRenameError(err?.message || err?.data?.message || (isVi ? 'Khong the doi ten' : 'Rename failed'))
		} finally { setIsSavingTitle(false) }
	}

	const fetchVideo = useCallback(async () => {
		if (!videoId) return
		setLoading(true)
		setError(null)
		try {
			const res = await apiClient.get<VideoDetail>(`/videos/${videoId}`)
			if (!res.success || !res.data) throw new Error(res.message || 'Video not found')
			setVideo(res.data)
			void apiClient.post('/student-progress/activity', {
				contentId: res.data.contentId,
				isCompleted: false,
				progressPercentage: 0,
				timeSpentSeconds: 0,
			})
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to load video')
		} finally {
			setLoading(false)
		}
	}, [videoId])

	useEffect(() => {
		void fetchVideo()
	}, [fetchVideo])

	return (
		<MainLayout navbar={<UserNavbar title="Lumina" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[1000px] space-y-6">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex-1 min-w-[280px]">
							{isEditingTitle ? (
								<div className="flex flex-wrap items-center gap-2">
									<input
										type="text"
										value={titleDraft}
										autoFocus
										onChange={(e) => setTitleDraft(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') void saveRename()
											if (e.key === 'Escape') { setIsEditingTitle(false); setTitleDraft(video?.title || '') }
										}}
										className="flex-1 min-w-[260px] rounded-lg border border-[#d7dfeb] bg-white px-3 py-2 text-2xl font-black text-[#111b2d] focus:border-[#1463ff] focus:outline-none"
									/>
									<Button size="sm" onClick={() => void saveRename()} disabled={isSavingTitle || !titleDraft.trim()}>
										{isSavingTitle ? t('Dang luu...', 'Saving...') : t('Luu', 'Save')}
									</Button>
									<Button size="sm" variant="ghost" onClick={() => { setIsEditingTitle(false); setTitleDraft(video?.title || ''); setRenameError(null) }} disabled={isSavingTitle}>
										{t('Huy', 'Cancel')}
									</Button>
								</div>
							) : (
								<div className="flex flex-wrap items-center gap-2">
									<h1 className="text-3xl font-black text-[#111b2d]">{video?.title || t('Xem video', 'Watch video')}</h1>
									{isOwner && video && (
										<button
											type="button"
											onClick={() => { setTitleDraft(video.title || ''); setIsEditingTitle(true) }}
											className="inline-flex items-center gap-1 rounded-full border border-[#d7dfeb] px-2.5 py-1 text-xs text-[#60708a] hover:bg-white"
											title={t('Doi ten video', 'Rename video')}
										>
											<MaterialIcon icon="edit" size="xs" />
											<span>{t('Doi ten', 'Rename')}</span>
										</button>
									)}
								</div>
							)}
							{video?.description && !isEditingTitle && <p className="mt-1 text-sm text-[#60708a]">{video.description}</p>}
							{renameError && <p className="mt-1 text-sm text-red-600">{renameError}</p>}
						</div>
						<Button variant="ghost" onClick={() => navigate('/user/library')}>
							<MaterialIcon icon="arrow_back" size="xs" />
							<span className="ml-1">{t('Quay lai', 'Back')}</span>
						</Button>
					</div>

					{loading && <Card><p className="text-sm text-[#60708a]">{t('Dang tai...', 'Loading...')}</p></Card>}
					{error && <Card className="border border-red-200 bg-red-50"><p className="text-sm text-red-700">{error}</p></Card>}

					{!loading && video && (
						<Card>
							<div className="aspect-video w-full overflow-hidden rounded-xl border border-[#dce3ed] bg-slate-900">
								<iframe
									title={video.title || 'YouTube video'}
									src={video.embeddableUrl}
									className="h-full w-full"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
									referrerPolicy="strict-origin-when-cross-origin"
									allowFullScreen
								/>
							</div>
						</Card>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
