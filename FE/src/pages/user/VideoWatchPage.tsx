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
	youTubeVideoId: string
	title?: string | null
	description?: string | null
	thumbnailUrl?: string | null
	embeddableUrl: string
}

export const VideoWatchPage: React.FC = () => {
	const isVi = useUserLanguage()
	const navigate = useNavigate()
	const { videoId } = useParams<{ videoId: string }>()

	const [video, setVideo] = useState<VideoDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const t = (vi: string, en: string) => (isVi ? vi : en)

	const fetchVideo = useCallback(async () => {
		if (!videoId) return
		setLoading(true)
		setError(null)
		try {
			const res = await apiClient.get<VideoDetail>(`/videos/${videoId}`)
			if (!res.success || !res.data) throw new Error(res.message || 'Video not found')
			setVideo(res.data)
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
		<MainLayout navbar={<UserNavbar title="EduFutura" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[1000px] space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-black text-[#111b2d]">{video?.title || t('Xem video', 'Watch video')}</h1>
							{video?.description && <p className="mt-1 text-sm text-[#60708a]">{video.description}</p>}
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
