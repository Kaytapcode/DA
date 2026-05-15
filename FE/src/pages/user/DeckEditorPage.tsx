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
			setError(t('Vui long nhap tieu de bo the.', 'Deck title is required.'))
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
			navigate(`/user/decks/${newId}/edit`, { replace: true })
			setSuccess(t('Tao bo the thanh cong! Bay gio them the.', 'Deck created! Now add cards.'))
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to create deck')
		} finally {
			setBusy(false)
		}
	}

	const addCard = async () => {
		if (!deckId) return
		if (!draft.front.trim() || !draft.back.trim()) {
			setError(t('Mat truoc va mat sau khong duoc trong.', 'Front and back text are required.'))
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
			setSuccess(t('Da them the.', 'Card added.'))
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
		<MainLayout navbar={<UserNavbar title="EduFutura" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[900px] space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-black text-[#111b2d]">
								{isCreate ? t('Tao Bo The Moi', 'Create New Deck') : t('Chinh Sua Bo The', 'Edit Deck')}
							</h1>
							<p className="mt-1 text-sm text-[#60708a]">
								{isCreate
									? t('Tao bo the ghi nho de hoc tu vung, khai niem.', 'Create a flashcard deck for vocabulary or concepts.')
									: t('Them, sua hoac xoa the trong bo nay.', 'Add, edit, or remove cards in this deck.')}
							</p>
						</div>
						<Button variant="ghost" onClick={() => navigate('/user/library')}>
							<MaterialIcon icon="arrow_back" size="xs" />
							<span className="ml-1">{t('Quay lai', 'Back')}</span>
						</Button>
					</div>

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
										{t('Tieu de bo the', 'Deck Title')} <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder={t('Vi du: Tu vung Tieng Anh - Du lich', 'e.g., English Vocab - Travel')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Chu de (tuy chon)', 'Theme (optional)')}
									</label>
									<input
										type="text"
										value={theme}
										onChange={(e) => setTheme(e.target.value)}
										placeholder={t('Vi du: Tieng Anh, Hoa hoc...', 'e.g., English, Chemistry...')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div className="flex justify-end">
									<Button onClick={() => void createDeck()} disabled={busy}>
										{busy ? t('Dang tao...', 'Creating...') : t('Tao bo the', 'Create Deck')}
									</Button>
								</div>
							</div>
						</Card>
					) : (
						<>
							<Card>
								<div className="space-y-3">
									<h3 className="text-lg font-bold text-[#111b2d]">{t('Them The Moi', 'Add New Card')}</h3>
									<div className="grid gap-3 md:grid-cols-2">
										<div>
											<label className="mb-1 block text-xs font-semibold text-[#60708a]">
												{t('Mat truoc (tu khoa)', 'Front (keyword)')}
											</label>
											<textarea
												value={draft.front}
												onChange={(e) => setDraft({ ...draft, front: e.target.value })}
												rows={3}
												placeholder={t('Tu hoac khai niem', 'Word or concept')}
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>
										<div>
											<label className="mb-1 block text-xs font-semibold text-[#60708a]">
												{t('Mat sau (dinh nghia)', 'Back (definition)')}
											</label>
											<textarea
												value={draft.back}
												onChange={(e) => setDraft({ ...draft, back: e.target.value })}
												rows={3}
												placeholder={t('Dinh nghia hoac mo ta', 'Definition or description')}
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>
									</div>
									<div className="flex justify-end">
										<Button onClick={() => void addCard()} disabled={busy}>
											<MaterialIcon icon="add" size="xs" />
											<span className="ml-1">{busy ? t('Dang them...', 'Adding...') : t('Them the', 'Add Card')}</span>
										</Button>
									</div>
								</div>
							</Card>

							<Card>
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="text-lg font-bold text-[#111b2d]">
											{t('The trong bo', 'Cards in Deck')} ({cards.length})
										</h3>
									</div>

									{loading && <p className="text-sm text-[#60708a]">{t('Dang tai...', 'Loading...')}</p>}

									{!loading && cards.length === 0 && (
										<p className="rounded-lg border border-dashed border-[#dce3ed] p-6 text-center text-sm text-[#60708a]">
											{t('Chua co the nao. Them the dau tien o tren.', 'No cards yet. Add the first one above.')}
										</p>
									)}

									{!loading && cards.length > 0 && (
										<div className="space-y-2">
											{cards.map((c, idx) => (
												<div key={c.id} className="grid grid-cols-[40px_1fr_1fr_auto] items-center gap-3 rounded-lg border border-[#dce3ed] p-3">
													<span className="text-xs font-bold text-[#9aa5b5]">#{idx + 1}</span>
													<div>
														<p className="text-xs text-[#9aa5b5]">{t('Truoc', 'Front')}</p>
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
														title={t('Xoa the', 'Delete card')}
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
									{t('Hoan tat', 'Done')}
								</Button>
							</div>
						</>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
