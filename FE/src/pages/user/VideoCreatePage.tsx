import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { apiClient } from '@/utils/apiClient'
import { useUserLanguage } from './UserShell'

interface SavedVideo {
	id: string
	youTubeVideoId: string
	title?: string | null
	description?: string | null
	thumbnailUrl?: string | null
	embeddableUrl: string
}

const YT_PATTERNS = [
	/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
	/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
	/youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
]

function extractVideoId(url: string): string | null {
	for (const pattern of YT_PATTERNS) {
		const match = url.match(pattern)
		if (match) return match[1]
	}
	return null
}

export const VideoCreatePage: React.FC = () => {
	const isVi = useUserLanguage()
	const navigate = useNavigate()

	const [url, setUrl] = useState('')
	const [title, setTitle] = useState('')
	const [description, setDescription] = useState('')
	const [previewId, setPreviewId] = useState<string | null>(null)
	const [savedVideo, setSavedVideo] = useState<SavedVideo | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const t = (vi: string, en: string) => (isVi ? vi : en)

	const handlePreview = () => {
		setError(null)
		setSuccess(null)
		const videoId = extractVideoId(url.trim())
		if (!videoId) {
			setError(t('URL YouTube khong hop le.', 'Invalid YouTube URL.'))
			setPreviewId(null)
			return
		}
		setPreviewId(videoId)
	}

	const handleSave = async () => {
		setError(null)
		setSuccess(null)
		const videoId = extractVideoId(url.trim())
		if (!videoId) {
			setError(t('URL YouTube khong hop le.', 'Invalid YouTube URL.'))
			return
		}
		setBusy(true)
		try {
			const res = await apiClient.post<SavedVideo>('/videos/personal', {
				youtubeUrl: url.trim(),
				title: title.trim() || null,
				description: description.trim() || null,
			})
			if (!res.success || !res.data) throw new Error(res.message || 'Failed to save video')
			setSavedVideo(res.data)
			setSuccess(t('Da luu vao thu vien!', 'Saved to library!'))
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to save video')
		} finally {
			setBusy(false)
		}
	}

	const embedSrc = useMemo(() => {
		const id = savedVideo?.youTubeVideoId ?? previewId
		return id ? `https://www.youtube.com/embed/${id}` : null
	}, [previewId, savedVideo])

	return (
		<MainLayout navbar={<UserNavbar title="Lumina" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[900px] space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-black text-[#111b2d]">{t('Xem Video YouTube', 'Watch YouTube Video')}</h1>
							<p className="mt-1 text-sm text-[#60708a]">
								{t(
									'Dan link YouTube de xem ngay, hoac luu vao thu vien hoc tap.',
									'Paste a YouTube URL to watch instantly, or save it to your library.'
								)}
							</p>
						</div>
						<Button variant="ghost" onClick={() => navigate('/user/library')}>
							<MaterialIcon icon="arrow_back" size="xs" />
							<span className="ml-1">{t('Quay lai', 'Back')}</span>
						</Button>
					</div>

					<Card>
						<div className="space-y-4">
							<div>
								<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
									{t('Link YouTube', 'YouTube URL')} <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input
										type="url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
										data-testid="video-url-input"
										className="flex-1 rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
									<Button variant="secondary" onClick={handlePreview}>
										<MaterialIcon icon="play_arrow" size="xs" />
										<span className="ml-1">{t('Xem truoc', 'Preview')}</span>
									</Button>
								</div>
							</div>

							<div className="grid gap-3 md:grid-cols-2">
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Tieu de (tuy chon)', 'Title (optional)')}
									</label>
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder={t('Bai giang vat ly...', 'Physics lecture...')}
										data-testid="video-title-input"
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Mo ta (tuy chon)', 'Description (optional)')}
									</label>
									<input
										type="text"
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder={t('Ghi chu ngan...', 'Short notes...')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex justify-end gap-2">
								<Button onClick={() => void handleSave()} disabled={busy || !url.trim()} data-testid="video-save-btn">
									<MaterialIcon icon="bookmark_add" size="xs" />
									<span className="ml-1">{busy ? t('Dang luu...', 'Saving...') : t('Luu vao thu vien', 'Save to Library')}</span>
								</Button>
							</div>
						</div>
					</Card>

					{error && (
						<Card className="border border-red-200 bg-red-50">
							<p className="text-sm text-red-700">{error}</p>
						</Card>
					)}
					{success && (
						<Card className="border border-green-200 bg-green-50">
							<p className="text-sm text-green-700">{success}</p>
						</Card>
					)}

					{embedSrc && (
						<Card>
							<div className="space-y-3">
								<h3 className="text-lg font-bold text-[#111b2d]">
									{savedVideo ? (savedVideo.title || t('Video da luu', 'Saved Video')) : t('Xem truoc', 'Preview')}
								</h3>
								<div className="aspect-video w-full overflow-hidden rounded-xl border border-[#dce3ed] bg-slate-900">
									<iframe
										title={savedVideo?.title || 'YouTube video'}
										src={embedSrc}
										className="h-full w-full"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										referrerPolicy="strict-origin-when-cross-origin"
										allowFullScreen
									/>
								</div>
								{savedVideo?.description && (
									<p className="text-sm text-[#60708a]">{savedVideo.description}</p>
								)}
								{savedVideo && (
									<div className="flex justify-end">
										<Button onClick={() => navigate('/user/library')}>
											{t('Ve thu vien', 'Back to Library')}
										</Button>
									</div>
								)}
							</div>
						</Card>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
