import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { apiClient } from '@/utils/apiClient'
import { useUserLanguage } from './UserShell'

type CreateMode = 'manual' | 'ai'

interface OptionDraft {
	text: string
	isCorrect: boolean
}

interface QuestionDraft {
	questionText: string
	explanation: string
	options: OptionDraft[]
}

interface QuizSummaryResp {
	quizId: string
	contentId: string
	title: string
	status: string
	createdAt: string
}

interface GeneratedQuestion {
	id?: string
	questionText: string
	explanation?: string | null
	options: Array<{ id?: string; optionText: string; isCorrect: boolean; orderIndex: number }>
}

const blankOption = (): OptionDraft => ({ text: '', isCorrect: false })
const blankQuestion = (): QuestionDraft => ({
	questionText: '',
	explanation: '',
	options: [
		{ text: '', isCorrect: true },
		{ text: '', isCorrect: false },
		{ text: '', isCorrect: false },
		{ text: '', isCorrect: false },
	],
})

export const QuizCreatePage: React.FC = () => {
	const isVi = useUserLanguage()
	const navigate = useNavigate()

	const [mode, setMode] = useState<CreateMode>('manual')
	const [title, setTitle] = useState('')
	const [timeLimit, setTimeLimit] = useState<string>('')
	const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()])
	const [aiDocTitle, setAiDocTitle] = useState('')
	const [aiContent, setAiContent] = useState('')
	const [aiPreview, setAiPreview] = useState<GeneratedQuestion[] | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	const t = (vi: string, en: string) => (isVi ? vi : en)

	const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
		setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
	}

	const updateOption = (qIdx: number, oIdx: number, patch: Partial<OptionDraft>) => {
		setQuestions((prev) => prev.map((q, i) => {
			if (i !== qIdx) return q
			return { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) }
		}))
	}

	const setCorrect = (qIdx: number, oIdx: number) => {
		setQuestions((prev) => prev.map((q, i) => {
			if (i !== qIdx) return q
			return { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIdx })) }
		}))
	}

	const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()])
	const removeQuestion = (idx: number) => setQuestions((prev) => prev.filter((_, i) => i !== idx))
	const addOption = (qIdx: number) => updateQuestion(qIdx, { options: [...questions[qIdx].options, blankOption()] })
	const removeOption = (qIdx: number, oIdx: number) => {
		const remaining = questions[qIdx].options.filter((_, j) => j !== oIdx)
		updateQuestion(qIdx, { options: remaining })
	}

	const validateManual = (): string | null => {
		if (!title.trim()) return t('Vui long nhap tieu de quiz.', 'Quiz title is required.')
		if (questions.length === 0) return t('Can it nhat 1 cau hoi.', 'At least one question is required.')
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i]
			if (!q.questionText.trim()) return t(`Cau ${i + 1}: thieu noi dung.`, `Question ${i + 1}: text required.`)
			if (q.options.length < 2) return t(`Cau ${i + 1}: can it nhat 2 lua chon.`, `Question ${i + 1}: at least 2 options.`)
			if (q.options.some((o) => !o.text.trim())) return t(`Cau ${i + 1}: co lua chon bo trong.`, `Question ${i + 1}: empty option text.`)
			if (!q.options.some((o) => o.isCorrect)) return t(`Cau ${i + 1}: chua chon dap an dung.`, `Question ${i + 1}: pick a correct answer.`)
		}
		return null
	}

	const submitManual = async () => {
		const validationError = validateManual()
		if (validationError) {
			setError(validationError)
			return
		}
		setError(null)
		setSuccess(null)
		setIsSubmitting(true)

		try {
			const quizRes = await apiClient.post<QuizSummaryResp>('/quizzes', {
				title: title.trim(),
				timeLimit: timeLimit ? Number(timeLimit) : null,
				passingScore: null,
			})
			if (!quizRes.success || !quizRes.data) throw new Error(quizRes.message || 'Failed to create quiz')

			const quizId = quizRes.data.quizId
			for (let i = 0; i < questions.length; i++) {
				const q = questions[i]
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
				const qRes = await apiClient.post(`/quizzes/${quizId}/questions`, payload)
				if (!qRes.success) throw new Error(qRes.message || `Failed at question ${i + 1}`)
			}

			setSuccess(t('Tao quiz thanh cong! Dang chuyen huong...', 'Quiz created! Redirecting...'))
			setTimeout(() => navigate('/user/library'), 1200)
		} catch (err: any) {
			const msg = err?.message || (err?.data?.message) || 'Failed to create quiz'
			setError(msg)
		} finally {
			setIsSubmitting(false)
		}
	}

	const submitAi = async () => {
		if (!title.trim()) {
			setError(t('Vui long nhap tieu de quiz.', 'Quiz title is required.'))
			return
		}
		if (!aiContent.trim() || aiContent.trim().length < 50) {
			setError(t('Vui long nhap noi dung tai lieu (it nhat 50 ky tu).', 'Paste at least 50 characters of document content.'))
			return
		}
		setError(null)
		setSuccess(null)
		setIsSubmitting(true)
		setAiPreview(null)

		try {
			const quizRes = await apiClient.post<QuizSummaryResp>('/quizzes', {
				title: title.trim(),
				timeLimit: timeLimit ? Number(timeLimit) : null,
				passingScore: null,
			})
			if (!quizRes.success || !quizRes.data) throw new Error(quizRes.message || 'Failed to create quiz')
			const quizId = quizRes.data.quizId

			const genRes = await apiClient.post<GeneratedQuestion[]>(`/quiz/generate?quizId=${encodeURIComponent(quizId)}`, {
				documentContent: aiContent,
				documentTitle: aiDocTitle.trim() || title.trim(),
			})

			if (!genRes.success || !genRes.data) throw new Error(genRes.message || 'AI generation failed')

			setAiPreview(genRes.data)
			setSuccess(t(
				`Da tao ${genRes.data.length} cau hoi. Kiem tra ben duoi.`,
				`Generated ${genRes.data.length} questions. Review them below.`
			))
		} catch (err: any) {
			const msg = err?.message || (err?.data?.message) || 'AI generation failed'
			setError(msg)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<MainLayout navbar={<UserNavbar title="EduFutura" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[1100px] space-y-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-black text-[#111b2d]">{t('Tao Quiz Moi', 'Create New Quiz')}</h1>
							<p className="mt-1 text-sm text-[#60708a]">
								{t(
									'Tao quiz thu cong hoac de AI sinh tu noi dung tai lieu.',
									'Build a quiz manually or let AI generate one from document content.'
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
							<div className="grid gap-4 md:grid-cols-[1fr_180px]">
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Tieu de quiz', 'Quiz Title')} <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder={t('Vi du: He Mat Troi', 'e.g., Solar System Basics')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Gioi han thoi gian (phut)', 'Time Limit (min)')}
									</label>
									<input
										type="number"
										min={0}
										value={timeLimit}
										onChange={(e) => setTimeLimit(e.target.value)}
										placeholder={t('Khong gioi han', 'Unlimited')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setMode('manual')}
									className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
										mode === 'manual' ? 'bg-[#1463ff] text-white' : 'border border-[#d7dfeb] bg-white text-[#5e6f88]'
									}`}
								>
									<MaterialIcon icon="edit" size="xs" />
									<span className="ml-1">{t('Nhap thu cong', 'Manual')}</span>
								</button>
								<button
									type="button"
									onClick={() => setMode('ai')}
									className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
										mode === 'ai' ? 'bg-[#1463ff] text-white' : 'border border-[#d7dfeb] bg-white text-[#5e6f88]'
									}`}
								>
									<MaterialIcon icon="auto_awesome" size="xs" />
									<span className="ml-1">{t('AI sinh tu tai lieu', 'AI from Document')}</span>
								</button>
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

					{mode === 'manual' && (
						<>
							{questions.map((q, qIdx) => (
								<Card key={qIdx}>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<h3 className="text-lg font-bold text-[#111b2d]">
												{t('Cau hoi', 'Question')} {qIdx + 1}
											</h3>
											{questions.length > 1 && (
												<button
													type="button"
													onClick={() => removeQuestion(qIdx)}
													className="text-xs text-red-600 hover:underline"
												>
													<MaterialIcon icon="delete" size="xs" />
													<span className="ml-1">{t('Xoa', 'Remove')}</span>
												</button>
											)}
										</div>

										<textarea
											value={q.questionText}
											onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
											placeholder={t('Noi dung cau hoi...', 'Question text...')}
											rows={2}
											className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
										/>

										<div className="space-y-2">
											{q.options.map((opt, oIdx) => (
												<div key={oIdx} className="flex items-center gap-2">
													<input
														type="radio"
														name={`correct-${qIdx}`}
														checked={opt.isCorrect}
														onChange={() => setCorrect(qIdx, oIdx)}
														className="h-4 w-4 cursor-pointer"
														title={t('Danh dau dap an dung', 'Mark as correct answer')}
													/>
													<input
														type="text"
														value={opt.text}
														onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
														placeholder={t(`Lua chon ${oIdx + 1}`, `Option ${oIdx + 1}`)}
														className="flex-1 rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
													/>
													{q.options.length > 2 && (
														<button
															type="button"
															onClick={() => removeOption(qIdx, oIdx)}
															className="text-[#9aa5b5] hover:text-red-600"
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
													className="text-xs font-semibold text-[#1463ff] hover:underline"
												>
													+ {t('Them lua chon', 'Add option')}
												</button>
											)}
										</div>

										<div>
											<label className="mb-1 block text-xs font-semibold text-[#60708a]">
												{t('Giai thich (tuy chon)', 'Explanation (optional)')}
											</label>
											<input
												type="text"
												value={q.explanation}
												onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
												placeholder={t('Giai thich vi sao dap an dung...', 'Why this answer is correct...')}
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>
									</div>
								</Card>
							))}

							<div className="flex justify-between">
								<Button variant="secondary" onClick={addQuestion} disabled={isSubmitting}>
									<MaterialIcon icon="add" size="xs" />
									<span className="ml-1">{t('Them cau hoi', 'Add Question')}</span>
								</Button>
								<Button onClick={() => void submitManual()} disabled={isSubmitting}>
									{isSubmitting ? t('Dang luu...', 'Saving...') : t('Luu quiz', 'Save Quiz')}
								</Button>
							</div>
						</>
					)}

					{mode === 'ai' && (
						<>
							<Card>
								<div className="space-y-3">
									<div>
										<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
											{t('Tieu de tai lieu (tuy chon)', 'Document Title (optional)')}
										</label>
										<input
											type="text"
											value={aiDocTitle}
											onChange={(e) => setAiDocTitle(e.target.value)}
											placeholder={t('Vi du: Chuong 1 - Sinh hoc', 'e.g., Chapter 1 - Biology')}
											className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
										/>
									</div>
									<div>
										<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
											{t('Noi dung tai lieu', 'Document Content')} <span className="text-red-500">*</span>
										</label>
										<textarea
											value={aiContent}
											onChange={(e) => setAiContent(e.target.value)}
											rows={10}
											placeholder={t(
												'Dan noi dung PDF/text vao day. AI se tao cau hoi dua tren noi dung nay (it nhat 50 ky tu).',
												'Paste PDF/text content here. AI will generate questions based on it (min 50 chars).'
											)}
											className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
										/>
										<p className="mt-1 text-xs text-[#9aa5b5]">
											{aiContent.length} {t('ky tu', 'characters')}
										</p>
									</div>
									<div className="flex justify-end">
										<Button onClick={() => void submitAi()} disabled={isSubmitting}>
											<MaterialIcon icon="auto_awesome" size="xs" />
											<span className="ml-1">
												{isSubmitting ? t('AI dang xu ly...', 'Generating...') : t('Sinh quiz bang AI', 'Generate with AI')}
											</span>
										</Button>
									</div>
								</div>
							</Card>

							{aiPreview && aiPreview.length > 0 && (
								<Card>
									<div className="space-y-4">
										<h3 className="text-lg font-bold text-[#111b2d]">
											{t('Cau hoi AI sinh ra', 'AI-Generated Questions')}
										</h3>
										{aiPreview.map((q, idx) => (
											<div key={q.id ?? idx} className="rounded-lg border border-[#dce3ed] p-4">
												<p className="font-semibold text-[#111b2d]">
													{idx + 1}. {q.questionText}
												</p>
												<ul className="mt-2 space-y-1 text-sm">
													{q.options.map((o) => (
														<li
															key={o.id ?? `${idx}-${o.orderIndex}`}
															className={o.isCorrect ? 'font-semibold text-green-700' : 'text-[#60708a]'}
														>
															{o.isCorrect ? '✓ ' : '○ '}
															{o.optionText}
														</li>
													))}
												</ul>
												{q.explanation && (
													<p className="mt-2 text-xs italic text-[#60708a]">
														{t('Giai thich', 'Explanation')}: {q.explanation}
													</p>
												)}
											</div>
										))}
										<div className="flex justify-end">
											<Button onClick={() => navigate('/user/library')}>
												{t('Hoan tat, ve thu vien', 'Done, Back to Library')}
											</Button>
										</div>
									</div>
								</Card>
							)}
						</>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
