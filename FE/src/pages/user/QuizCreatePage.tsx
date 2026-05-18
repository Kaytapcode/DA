import React, { useRef, useState } from 'react'
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
type AiStep = 'input' | 'review'

// ---- Manual mode types ----
interface OptionDraft {
	text: string
	isCorrect: boolean
}
interface QuestionDraft {
	questionText: string
	explanation: string
	options: OptionDraft[]
}

// ---- AI mode types ----
// Shape returned by AI.Api /quiz/generate (inside ApiResponse.data)
interface AiQuestion {
	question: string
	options: string[]
	correct_index: number
	explanation: string
}
interface QuizGenerationResponse {
	success: boolean
	questions_count: number
	questions: AiQuestion[]
	message: string
}

// Editable question for the review step
interface EditableQ {
	questionText: string
	options: string[]
	correctIndex: number
	explanation: string
}

// Response from POST /quizzes
interface QuizSummaryResp {
	quizId: string
	contentId: string
	title: string
	status: string
	createdAt: string
}

// ---- Helpers ----
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

const aiToEditable = (q: AiQuestion): EditableQ => ({
	questionText: q.question,
	options: q.options,
	correctIndex: q.correct_index,
	explanation: q.explanation,
})

export const QuizCreatePage: React.FC = () => {
	const isVi = useUserLanguage()
	const navigate = useNavigate()
	const fileInputRef = useRef<HTMLInputElement>(null)

	const t = (vi: string, en: string) => (isVi ? vi : en)

	// Shared
	const [mode, setMode] = useState<CreateMode>('manual')
	const [title, setTitle] = useState('')
	const [timeLimit, setTimeLimit] = useState<string>('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	// Manual mode
	const [questions, setQuestions] = useState<QuestionDraft[]>([blankQuestion()])

	// AI mode
	const [aiStep, setAiStep] = useState<AiStep>('input')
	const [aiFile, setAiFile] = useState<File | null>(null)
	const [aiDocTitle, setAiDocTitle] = useState('')
	const [isGenerating, setIsGenerating] = useState(false)
	const [editableQuestions, setEditableQuestions] = useState<EditableQ[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [questionCount, setQuestionCount] = useState<'normal' | 'many' | 'more'>('normal')
	const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')

	// ---- Manual mode helpers ----
	const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) =>
		setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))

	const updateOption = (qIdx: number, oIdx: number, patch: Partial<OptionDraft>) =>
		setQuestions((prev) =>
			prev.map((q, i) => {
				if (i !== qIdx) return q
				return { ...q, options: q.options.map((o, j) => (j === oIdx ? { ...o, ...patch } : o)) }
			})
		)

	const setCorrect = (qIdx: number, oIdx: number) =>
		setQuestions((prev) =>
			prev.map((q, i) => {
				if (i !== qIdx) return q
				return { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIdx })) }
			})
		)

	const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()])
	const removeQuestion = (idx: number) => setQuestions((prev) => prev.filter((_, i) => i !== idx))
	const addOption = (qIdx: number) =>
		updateQuestion(qIdx, { options: [...questions[qIdx].options, blankOption()] })
	const removeOption = (qIdx: number, oIdx: number) => {
		const remaining = questions[qIdx].options.filter((_, j) => j !== oIdx)
		updateQuestion(qIdx, { options: remaining })
	}

	const validateManual = (): string | null => {
		if (!title.trim()) return t('Vui lòng nhập tiêu đề quiz.', 'Quiz title is required.')
		if (questions.length === 0) return t('Cần ít nhất 1 câu hỏi.', 'At least one question is required.')
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i]
			if (!q.questionText.trim()) return t(`Câu ${i + 1}: thiếu nội dung.`, `Question ${i + 1}: text required.`)
			if (q.options.length < 2) return t(`Câu ${i + 1}: cần ít nhất 2 lựa chọn.`, `Question ${i + 1}: at least 2 options.`)
			if (q.options.some((o) => !o.text.trim())) return t(`Câu ${i + 1}: có lựa chọn bỏ trống.`, `Question ${i + 1}: empty option text.`)
			if (!q.options.some((o) => o.isCorrect)) return t(`Câu ${i + 1}: chưa chọn đáp án đúng.`, `Question ${i + 1}: pick a correct answer.`)
		}
		return null
	}

	const submitManual = async () => {
		const validationError = validateManual()
		if (validationError) { setError(validationError); return }
		setError(null); setSuccess(null); setIsSubmitting(true)

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
				const qRes = await apiClient.post(`/quizzes/${quizId}/questions`, {
					questionText: q.questionText.trim(),
					explanation: q.explanation.trim() || null,
					orderIndex: i,
					options: q.options.map((o, j) => ({
						optionText: o.text.trim(),
						isCorrect: o.isCorrect,
						orderIndex: j,
					})),
				})
				if (!qRes.success) throw new Error(qRes.message || `Failed at question ${i + 1}`)
			}

			setSuccess(t('Tạo quiz thành công! Đang chuyển hướng...', 'Quiz created! Redirecting...'))
			setTimeout(() => navigate('/user/library'), 1200)
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to create quiz')
		} finally {
			setIsSubmitting(false)
		}
	}

	// ---- AI mode helpers ----
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0] ?? null
		setAiFile(f)
		setError(null)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const f = e.dataTransfer.files?.[0]
		if (!f) return
		const allowed = ['application/pdf', 'text/plain']
		const ext = f.name.toLowerCase()
		if (!allowed.includes(f.type) && !ext.endsWith('.pdf') && !ext.endsWith('.txt')) {
			setError(t('Chỉ hỗ trợ file PDF hoặc TXT.', 'Only PDF and TXT files are supported.'))
			return
		}
		setAiFile(f)
		setError(null)
	}

	const generateWithAi = async () => {
		if (!title.trim()) { setError(t('Vui lòng nhập tiêu đề quiz.', 'Quiz title is required.')); return }
		if (!aiFile) { setError(t('Vui lòng chọn file PDF hoặc TXT.', 'Please select a PDF or TXT file.')); return }

		setError(null); setSuccess(null); setIsGenerating(true)

		try {
			const formData = new FormData()
			formData.append('file', aiFile)
			if (aiDocTitle.trim()) formData.append('documentTitle', aiDocTitle.trim())
			formData.append('questionCount', questionCount)
			formData.append('difficulty', difficulty)

			// Pass FormData — axios auto-sets multipart/form-data with boundary
			// Large/hard sets can take 3-4 minutes; use a 5-minute timeout
			const genRes = await apiClient.post<QuizGenerationResponse>('/quiz/generate', formData, { timeout: 480000 })

			if (!genRes.success || !genRes.data) throw new Error(genRes.message || 'AI generation failed')

			const questions = genRes.data.questions
			if (!questions || questions.length === 0) throw new Error('AI returned no questions')

			setEditableQuestions(questions.map(aiToEditable))
			setAiStep('review')
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'AI generation failed')
		} finally {
			setIsGenerating(false)
		}
	}

	const saveAsDraft = async () => {
		if (editableQuestions.length === 0) { setError('No questions to save.'); return }
		setError(null); setSuccess(null); setIsSubmitting(true)

		try {
			const quizRes = await apiClient.post<QuizSummaryResp>('/quizzes', {
				title: title.trim(),
				timeLimit: timeLimit ? Number(timeLimit) : null,
				passingScore: null,
			})
			if (!quizRes.success || !quizRes.data) throw new Error(quizRes.message || 'Failed to create quiz')

			const quizId = quizRes.data.quizId
			const saveRes = await apiClient.post(`/quizzes/${quizId}/generate`, {
				questions: editableQuestions.map((q) => ({
					question: q.questionText,
					options: q.options,
					correctIndex: q.correctIndex,
					explanation: q.explanation,
				})),
			})
			if (!saveRes.success) throw new Error(saveRes.message || 'Failed to save questions')

			setSuccess(t('Đã lưu quiz nháp! Đang chuyển về thư viện...', 'Draft quiz saved! Redirecting to library...'))
			setTimeout(() => navigate('/user/library'), 1400)
		} catch (err: any) {
			setError(err?.message || err?.data?.message || 'Failed to save quiz')
		} finally {
			setIsSubmitting(false)
		}
	}

	// ---- Editable question helpers ----
	const updateEQ = (idx: number, patch: Partial<EditableQ>) =>
		setEditableQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))

	const updateEQOption = (qIdx: number, oIdx: number, text: string) =>
		setEditableQuestions((prev) =>
			prev.map((q, i) => {
				if (i !== qIdx) return q
				const opts = [...q.options]
				opts[oIdx] = text
				return { ...q, options: opts }
			})
		)

	const removeEQ = (idx: number) =>
		setEditableQuestions((prev) => prev.filter((_, i) => i !== idx))

	const addBlankEQ = () =>
		setEditableQuestions((prev) => [
			...prev,
			{ questionText: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' },
		])

	// ---- Render ----
	return (
		<MainLayout navbar={<UserNavbar title="Lumina" />} sidebar={<UserSidebar />}>
			<div className="bg-[#f6f8fb] p-8">
				<div className="mx-auto max-w-[1100px] space-y-6">

					{/* Header */}
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-black text-[#111b2d]">{t('Tạo Quiz Mới', 'Create New Quiz')}</h1>
							<p className="mt-1 text-sm text-[#60708a]">
								{t(
									'Tạo quiz thủ công hoặc để AI sinh từ file tài liệu.',
									'Build a quiz manually or let AI generate one from a document file.'
								)}
							</p>
						</div>
						<Button variant="ghost" onClick={() => navigate('/user/library')}>
							<MaterialIcon icon="arrow_back" size="xs" />
							<span className="ml-1">{t('Quay lại', 'Back')}</span>
						</Button>
					</div>

					{/* Shared config card */}
					<Card>
						<div className="space-y-4">
							<div className="grid gap-4 md:grid-cols-[1fr_180px]">
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Tiêu đề quiz', 'Quiz Title')} <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder={t('Ví dụ: Hệ Mặt Trời', 'e.g., Solar System Basics')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
								<div>
									<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
										{t('Giới hạn thời gian (phút)', 'Time Limit (min)')}
									</label>
									<input
										type="number"
										min={0}
										value={timeLimit}
										onChange={(e) => setTimeLimit(e.target.value)}
										placeholder={t('Không giới hạn', 'Unlimited')}
										className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
									/>
								</div>
							</div>

							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => { setMode('manual'); setError(null) }}
									className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
										mode === 'manual' ? 'bg-[#1463ff] text-white' : 'border border-[#d7dfeb] bg-white text-[#5e6f88]'
									}`}
								>
									<MaterialIcon icon="edit" size="xs" />
									<span className="ml-1">{t('Nhập thủ công', 'Manual')}</span>
								</button>
								<button
									type="button"
									onClick={() => { setMode('ai'); setError(null) }}
									className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
										mode === 'ai' ? 'bg-[#1463ff] text-white' : 'border border-[#d7dfeb] bg-white text-[#5e6f88]'
									}`}
								>
									<MaterialIcon icon="auto_awesome" size="xs" />
									<span className="ml-1">{t('AI từ tài liệu', 'AI from Document')}</span>
								</button>
							</div>
						</div>
					</Card>

					{/* Error / success banners */}
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

					{/* ===================== MANUAL MODE ===================== */}
					{mode === 'manual' && (
						<>
							{questions.map((q, qIdx) => (
								<Card key={qIdx}>
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<h3 className="text-lg font-bold text-[#111b2d]">
												{t('Câu hỏi', 'Question')} {qIdx + 1}
											</h3>
											{questions.length > 1 && (
												<button
													type="button"
													onClick={() => removeQuestion(qIdx)}
													className="text-xs text-red-600 hover:underline"
												>
													<MaterialIcon icon="delete" size="xs" />
													<span className="ml-1">{t('Xoá', 'Remove')}</span>
												</button>
											)}
										</div>

										<textarea
											value={q.questionText}
											onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
											placeholder={t('Nội dung câu hỏi...', 'Question text...')}
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
														title={t('Đánh dấu đáp án đúng', 'Mark as correct answer')}
													/>
													<input
														type="text"
														value={opt.text}
														onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
														placeholder={t(`Lựa chọn ${oIdx + 1}`, `Option ${oIdx + 1}`)}
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
													+ {t('Thêm lựa chọn', 'Add option')}
												</button>
											)}
										</div>

										<div>
											<label className="mb-1 block text-xs font-semibold text-[#60708a]">
												{t('Giải thích (tuỳ chọn)', 'Explanation (optional)')}
											</label>
											<input
												type="text"
												value={q.explanation}
												onChange={(e) => updateQuestion(qIdx, { explanation: e.target.value })}
												placeholder={t('Giải thích vì sao đáp án đúng...', 'Why this answer is correct...')}
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>
									</div>
								</Card>
							))}

							<div className="flex justify-between">
								<Button variant="secondary" onClick={addQuestion} disabled={isSubmitting}>
									<MaterialIcon icon="add" size="xs" />
									<span className="ml-1">{t('Thêm câu hỏi', 'Add Question')}</span>
								</Button>
								<Button onClick={() => void submitManual()} disabled={isSubmitting}>
									{isSubmitting ? t('Đang lưu...', 'Saving...') : t('Lưu quiz', 'Save Quiz')}
								</Button>
							</div>
						</>
					)}

					{/* ===================== AI MODE ===================== */}
					{mode === 'ai' && (
						<>
							{/* Step 1: Upload file */}
							{aiStep === 'input' && (
								<Card>
									<div className="space-y-4">
										<h3 className="text-base font-bold text-[#111b2d]">
											{t('Tải lên tài liệu để AI sinh câu hỏi', 'Upload a document for AI to generate questions')}
										</h3>

										<div>
											<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
												{t('Tiêu đề tài liệu (tuỳ chọn)', 'Document Title (optional)')}
											</label>
											<input
												type="text"
												value={aiDocTitle}
												onChange={(e) => setAiDocTitle(e.target.value)}
												placeholder={t('Ví dụ: Chương 1 - Sinh học', 'e.g., Chapter 1 - Biology')}
												className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
											/>
										</div>

										{/* Question count */}
									<div>
										<label className="mb-2 block text-sm font-semibold text-[#111b2d]">
											{t('Số lượng câu hỏi', 'Number of Questions')}
										</label>
										<div className="flex gap-2">
											{(
												[
													{ value: 'normal', label: t('Thường', 'Normal'), desc: '10–12' },
													{ value: 'many',   label: t('Nhiều',  'Many'),   desc: '15–18' },
													{ value: 'more',   label: t('Nhiều hơn', 'More'), desc: '20–25' },
												] as const
											).map(({ value, label, desc }) => (
												<button
													key={value}
													type="button"
													onClick={() => setQuestionCount(value)}
													className={`flex flex-1 flex-col items-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${
														questionCount === value
															? 'border-[#1463ff] bg-[#1463ff] text-white'
															: 'border-[#d7dfeb] bg-white text-[#5e6f88] hover:border-[#1463ff]'
													}`}
												>
													<span>{label}</span>
													<span className={`text-xs font-normal ${questionCount === value ? 'text-blue-100' : 'text-[#9aa5b5]'}`}>{desc} {t('câu', 'Qs')}</span>
												</button>
											))}
										</div>
									</div>

									{/* Difficulty */}
									<div>
										<label className="mb-2 block text-sm font-semibold text-[#111b2d]">
											{t('Độ khó', 'Difficulty')}
										</label>
										<div className="flex gap-2">
											{(
												[
													{ value: 'easy',   label: t('Dễ',    'Easy'),   icon: '🟢' },
													{ value: 'normal', label: t('Thường','Normal'), icon: '🟡' },
													{ value: 'hard',   label: t('Khó',   'Hard'),   icon: '🔴' },
												] as const
											).map(({ value, label, icon }) => (
												<button
													key={value}
													type="button"
													onClick={() => setDifficulty(value)}
													className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
														difficulty === value
															? 'border-[#1463ff] bg-[#1463ff] text-white'
															: 'border-[#d7dfeb] bg-white text-[#5e6f88] hover:border-[#1463ff]'
													}`}
												>
													<span>{icon}</span>
													<span>{label}</span>
												</button>
											))}
										</div>
									</div>

									{/* File upload */}
									<div>
										<label className="mb-1 block text-sm font-semibold text-[#111b2d]">
											{t('File tài liệu', 'Document File')} <span className="text-red-500">*</span>
										</label>
										<div
											className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition ${
												isDragging
													? 'border-[#1463ff] bg-blue-100'
													: 'border-[#d7dfeb] bg-[#f6f8fb] hover:border-[#1463ff] hover:bg-blue-50'
											}`}
											onClick={() => fileInputRef.current?.click()}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={handleDrop}
										>
											<MaterialIcon icon="upload_file" size="lg" className="text-[#1463ff]" />
											{aiFile ? (
												<>
													<p className="text-sm font-semibold text-[#111b2d]">{aiFile.name}</p>
													<p className="text-xs text-[#60708a]">
														{(aiFile.size / 1024).toFixed(1)} KB — {t('Nhấn để thay đổi', 'Click to change')}
													</p>
												</>
											) : (
												<>
													<p className="text-sm font-semibold text-[#111b2d]">
														{t('Nhấn hoặc kéo thả file vào đây', 'Click or drag & drop a file here')}
													</p>
													<p className="text-xs text-[#60708a]">
														{t('Hỗ trợ PDF và TXT, tối đa 10 MB', 'Supports PDF and TXT, max 10 MB')}
													</p>
												</>
											)}
										</div>
										<input
											ref={fileInputRef}
											type="file"
											accept=".pdf,.txt,application/pdf,text/plain"
											className="hidden"
											onChange={handleFileChange}
										/>
									</div>

										<div className="flex justify-end">
											<Button onClick={() => void generateWithAi()} disabled={isGenerating || !aiFile}>
												<MaterialIcon icon="auto_awesome" size="xs" />
												<span className="ml-1">
													{isGenerating
														? t('AI đang xử lý...', 'Generating...')
														: t('Sinh câu hỏi bằng AI', 'Generate with AI')}
												</span>
											</Button>
										</div>
									</div>
								</Card>
							)}

							{/* Step 2: Review & edit generated questions */}
							{aiStep === 'review' && (
								<>
									<div className="flex items-center justify-between">
										<div>
											<h3 className="text-lg font-bold text-[#111b2d]">
												{t('Kiểm tra & chỉnh sửa câu hỏi', 'Review & Edit Questions')}
											</h3>
											<p className="text-xs text-[#60708a]">
												{t(
													`AI đã sinh ${editableQuestions.length} câu hỏi. Kiểm tra và chỉnh sửa trước khi lưu.`,
													`AI generated ${editableQuestions.length} questions. Review and edit before saving.`
												)}
											</p>
										</div>
										<button
											type="button"
											onClick={() => { setAiStep('input'); setError(null) }}
											className="text-xs text-[#1463ff] hover:underline"
										>
											← {t('Thay file khác', 'Change file')}
										</button>
									</div>

									{editableQuestions.map((q, qIdx) => (
										<Card key={qIdx}>
											<div className="space-y-3">
												<div className="flex items-center justify-between">
													<h4 className="font-bold text-[#111b2d]">
														{t('Câu', 'Q')} {qIdx + 1}
													</h4>
													{editableQuestions.length > 1 && (
														<button
															type="button"
															onClick={() => removeEQ(qIdx)}
															className="text-xs text-red-600 hover:underline"
														>
															<MaterialIcon icon="delete" size="xs" />
															<span className="ml-1">{t('Xoá', 'Remove')}</span>
														</button>
													)}
												</div>

												<textarea
													value={q.questionText}
													onChange={(e) => updateEQ(qIdx, { questionText: e.target.value })}
													rows={2}
													className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
												/>

												<div className="space-y-2">
													<p className="text-xs font-semibold text-[#60708a]">
														{t('Lựa chọn (chọn đáp án đúng)', 'Options (select the correct answer)')}
													</p>
													{q.options.map((opt, oIdx) => (
														<div key={oIdx} className="flex items-center gap-2">
															<input
																type="radio"
																name={`ai-correct-${qIdx}`}
																checked={q.correctIndex === oIdx}
																onChange={() => updateEQ(qIdx, { correctIndex: oIdx })}
																className="h-4 w-4 cursor-pointer"
																title={t('Đáp án đúng', 'Correct answer')}
															/>
															<input
																type="text"
																value={opt}
																onChange={(e) => updateEQOption(qIdx, oIdx, e.target.value)}
																placeholder={t(`Lựa chọn ${oIdx + 1}`, `Option ${oIdx + 1}`)}
																className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none ${
																	q.correctIndex === oIdx
																		? 'border-green-400 bg-green-50 focus:border-green-500'
																		: 'border-[#d7dfeb] focus:border-[#1463ff]'
																}`}
															/>
														</div>
													))}
												</div>

												<div>
													<label className="mb-1 block text-xs font-semibold text-[#60708a]">
														{t('Giải thích (bắt buộc với câu hỏi AI)', 'Explanation (required for AI questions)')}
													</label>
													<textarea
														value={q.explanation}
														onChange={(e) => updateEQ(qIdx, { explanation: e.target.value })}
														rows={2}
														placeholder={t('Giải thích dựa trên tài liệu...', 'Explanation based on the document...')}
														className="w-full rounded-lg border border-[#d7dfeb] px-3 py-2 text-sm focus:border-[#1463ff] focus:outline-none"
													/>
												</div>
											</div>
										</Card>
									))}

									<div className="flex justify-between">
										<Button
											variant="secondary"
											onClick={addBlankEQ}
											disabled={isSubmitting}
										>
											<MaterialIcon icon="add" size="xs" />
											<span className="ml-1">{t('Thêm câu hỏi', 'Add Question')}</span>
										</Button>
										<Button onClick={() => void saveAsDraft()} disabled={isSubmitting}>
											<MaterialIcon icon="save" size="xs" />
											<span className="ml-1">
												{isSubmitting ? t('Đang lưu...', 'Saving...') : t('Lưu', 'Save')}
											</span>
										</Button>
									</div>
								</>
							)}
						</>
					)}
				</div>
			</div>
		</MainLayout>
	)
}
