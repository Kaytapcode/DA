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
import { useCourseContentLink } from '@/hooks/useCourseContentLink'

interface DeckSummary {
	deckId: string
	contentId: string
	title: string
	status: string
	cardCount: number
	masteredCount: number
	createdAt: string
}

interface FlashcardItem {
	id: string
	deckId: string
	frontText: string
	backText: string
	isMastered: boolean
	masteredAt?: string | null
	orderIndex: number
}

interface CardDraft {
	front: string
	back: string
}

export const DeckEditorPage: React.FC = () => {
	const isVi = useUserLanguage()
	const navigate = useNavigate()
	const courseLink = useCourseContentLink()
	const { deckId: routeDeckId } = useParams<{ deckId?: string }>()
	const isCreate = !routeDeckId

	const [title, setTitle] = useState('')
	const [theme, setTheme] = useState('')
	const [deckId, setDeckId] = useState<string | null>(routeDeckId ?? null)
	const [cards, setCards] = useState<FlashcardItem[]>([])
	const [draft, setDraft] = useState<CardDraft>({ front: '', back: '' })
	const [loading, setLoading] = useState<boolean>(!isCreate)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	const t = (vi: string, en: string) => (isVi ? vi : en)

	const fetchDeck = useCallback(async () => {
		if (!deckId) return
		setLoading(true)
		try {
			const cardsRes = await apiClient.get<FlashcardItem[]>(`/decks/${deckId}/flashcards`)
			if (cardsRes.success && cardsRes.data) setCards(cardsRes.data)
		} catch (err: any) {
			setError(err?.message || 'Failed to load deck')
		} finally {
			setLoading(false)
		}
	}, [deckId])

	useEffect(() => {
		if (!isCreate && deckId) {
			void fetchDeck()
		}
	}, [fetchDeck, deckId, isCreate])

	const createDeck = async () => {
		if (!title.trim()) {
			setError(t('Vui lòng nhập tiêu đề bộ thẻ.', 'Deck title is required.'))
			return
		}
		setError(null)
		setBusy(true)
		try {
			const res = await apiClient.post<DeckSummary>('/decks', {
				title: title.trim(),
				theme: theme.trim() || null,
			})
			if (!res.success || !res.data) throw new Error(res.message || 'Failed to create deck')
			const newId = res.data.deckId
			setDeckId(newId)
			// Course context: link the new deck into the module now (it's filled with cards next),
			// and carry the context to the edit URL so a "Back to course" button is shown.
			if (courseLink.active) {
				await courseLink.linkOnly(res.data.contentId)
				navigate(`/user/decks/${newId}/edit${courseLink.courseQuery}`, { replace: true })
			} else {
				navigate(`/user/decks/${newId}/edit`, { replace: true })
			}
			setSuccess(t('Tạo bộ thẻ thành công! Bây giờ thêm thẻ.', 'Deck created! Now add cards.'))
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to create deck')
		} finally {
			setBusy(false)
		}
	}

	const addCard = async () => {
		if (!deckId) return
		if (!draft.front.trim() || !draft.back.trim()) {
			setError(t('Mặt trước và mặt sau không được trống.', 'Front and back text are required.'))
			return
		}
		setError(null)
		setBusy(true)
		try {
			const res = await apiClient.post<FlashcardItem>(`/decks/${deckId}/flashcards`, {
				frontText: draft.front.trim(),
				backText: draft.back.trim(),
				orderIndex: 0,
			})
			if (!res.success || !res.data) throw new Error(res.message || 'Failed to add card')
			setCards((prev) => [...prev, res.data!])
			setDraft({ front: '', back: '' })
			setSuccess(t('Đã thêm thẻ.', 'Card added.'))
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to add card')
		} finally {
			setBusy(false)
		}
	}

	const deleteCard = async (cardId: string) => {
		if (!deckId) return
		setBusy(true)
		try {
			const res = await apiClient.delete(`/decks/${deckId}/flashcards/${cardId}`)
			if (!res.success) throw new Error(res.message || 'Failed to delete card')
			setCards((prev) => prev.filter((c) => c.id !== cardId))
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to delete card')
		} finally {
			setBusy(false)
		}
	}

	return (
		<MainLayout navbar={<UserNavbar title="Lumina" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[900px] space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-black text-[#111b2d]">
								{isCreate ? t('Tạo Bộ Thẻ Mới', 'Create New Deck') : t('Chỉnh Sửa Bộ Thẻ', 'Edit Deck')}
							</h1>
							<p className="mt-1 text-sm text-[#60708a]">
								{isCreate
									? t('Tạo bộ thẻ ghi nhớ để học từ vựng, khái niệm.', 'Create a flashcard deck for vocabulary or concepts.')
									: t('Thêm, sửa hoặc xóa thẻ trong bộ này.', 'Add, edit, or remove cards in this deck.')}
							</p>
						</div>
						{courseLink.active ? (
							<Button data-testid="deck-back-to-course" onClick={() => courseLink.goBack()}>
								<MaterialIcon icon="check" size="xs" />
								<span className="ml-1">{t('Xong - về khóa học', 'Done — back to course')}</span>
							</Button>
						) : (
							<Button variant="ghost" onClick={() => navigate('/user/library')}>
								<MaterialIcon icon="arrow_back" size="xs" />
								<span className="ml-1">{t('Quay lại', 'Back')}</span>
							</Button>
						)}
					</div>

					{courseLink.active && (
						<Card className="border border-primary/30 bg-primary/5">
							<p className="text-sm text-on-surface" data-testid="deck-course-context">
								{t('Bộ thẻ này sẽ được thêm vào khóa học. Thêm thẻ rồi bấm "Xong".',
								   'This deck is being added to a course. Add cards, then click "Done".')}
							</p>
						</Card>
					)}

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

					{isCreate ? (
						<Card>
							<div className="space-y-4">
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Tiêu đề bộ thẻ', 'Deck Title')} <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder={t('Ví dụ: Từ vựng Tiếng Anh - Du lịch', 'e.g., English Vocab - Travel')}
										data-testid="deck-title-input"
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Chủ đề (tùy chọn)', 'Theme (optional)')}
									</label>
									<input
										type="text"
										value={theme}
										onChange={(e) => setTheme(e.target.value)}
										placeholder={t('Ví dụ: Tiếng Anh, Hóa học...', 'e.g., English, Chemistry...')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div className="flex justify-end">
									<Button onClick={() => void createDeck()} disabled={busy} data-testid="deck-create-btn">
										{busy ? t('Đang tạo...', 'Creating...') : t('Tạo bộ thẻ', 'Create Deck')}
									</Button>
								</div>
							</div>
						</Card>
					) : (
						<>
							<Card>
								<div className="space-y-3">
									<h3 className="text-lg font-bold text-[#111b2d]">{t('Thêm Thẻ Mới', 'Add New Card')}</h3>
									<div className="grid gap-3 md:grid-cols-2">
										<div>
											<label className="mb-1 block text-xs font-semibold text-[#60708a]">
												{t('Mặt trước (từ khóa)', 'Front (keyword)')}
											</label>
											<textarea
												value={draft.front}
												onChange={(e) => setDraft({ ...draft, front: e.target.value })}
												rows={3}
												placeholder={t('Từ hoặc khái niệm', 'Word or concept')}
												data-testid="flashcard-front-input"
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>
										<div>
											<label className="mb-1 block text-xs font-semibold text-[#60708a]">
												{t('Mặt sau (định nghĩa)', 'Back (definition)')}
											</label>
											<textarea
												value={draft.back}
												onChange={(e) => setDraft({ ...draft, back: e.target.value })}
												rows={3}
												placeholder={t('Định nghĩa hoặc mô tả', 'Definition or description')}
												data-testid="flashcard-back-input"
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>
									</div>
									<div className="flex justify-end">
										<Button onClick={() => void addCard()} disabled={busy} data-testid="flashcard-add-btn">
											<MaterialIcon icon="add" size="xs" />
											<span className="ml-1">{busy ? t('Đang thêm...', 'Adding...') : t('Thêm thẻ', 'Add Card')}</span>
										</Button>
									</div>
								</div>
							</Card>

							<Card>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="text-lg font-bold text-[#111b2d]">
											{t('Thẻ trong bộ', 'Cards in Deck')} ({cards.length})
										</h3>
									</div>

									{loading && <p className="text-sm text-[#60708a]">{t('Đang tải...', 'Loading...')}</p>}

									{!loading && cards.length === 0 && (
										<p className="rounded-lg border border-dashed border-[#dce3ed] p-6 text-center text-sm text-[#60708a]">
											{t('Chưa có thẻ nào. Thêm thẻ đầu tiên ở trên.', 'No cards yet. Add the first one above.')}
										</p>
									)}

									{!loading && cards.length > 0 && (
										<div className="space-y-2">
											{cards.map((c, idx) => (
												<div key={c.id} className="grid grid-cols-[40px_1fr_1fr_auto] items-center gap-3 rounded-lg border border-[#dce3ed] p-3">
													<span className="text-xs font-bold text-[#9aa5b5]">#{idx + 1}</span>
													<div>
														<p className="text-xs text-[#9aa5b5]">{t('Trước', 'Front')}</p>
														<p className="text-sm text-[#111b2d]">{c.frontText}</p>
													</div>
													<div>
														<p className="text-xs text-[#9aa5b5]">{t('Sau', 'Back')}</p>
														<p className="text-sm text-[#111b2d]">{c.backText}</p>
													</div>
													<button
														type="button"
														onClick={() => void deleteCard(c.id)}
														disabled={busy}
														className="text-[#9aa5b5] hover:text-red-600"
														title={t('Xóa thẻ', 'Delete card')}
													>
														<MaterialIcon icon="delete" size="xs" />
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							</Card>

							<div className="flex justify-end">
								<Button onClick={() => navigate('/user/library')}>
									{t('Hoàn tất', 'Done')}
								</Button>
							</div>
						</>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
