import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

export interface QuizQuestion {
  id: string
  questionText: string
  options: string[]
  correctIndex?: number
  explanation?: string | null
}

interface QuizAnswerPayload {
  questionId: string
  selectedIndex: number
}

export interface QuizResultItem {
  questionId: string
  isCorrect: boolean
  selectedIndex: number
  correctIndex: number
  explanation?: string | null
}

export interface QuizSubmitResult {
  quizId: string
  scorePercentage: number
  correctCount: number
  totalCount: number
  results: QuizResultItem[]
}

interface QuizQuestionsEnvelope {
  questions?: QuizQuestion[]
  timeLimitSeconds?: number
}

const normalizeQuestion = (question: any): QuizQuestion => ({
  id: question.id,
  questionText: question.questionText ?? question.question_text ?? '',
  options: Array.isArray(question.options)
    ? question.options.map((option: any) =>
        typeof option === 'string' ? option : option.optionText ?? option.option_text ?? option.text ?? ''
      )
    : [],
  correctIndex:
    typeof question.correctIndex === 'number'
      ? question.correctIndex
      : typeof question.correct_index === 'number'
        ? question.correct_index
        : undefined,
  explanation: question.explanation ?? null,
})

export const useQuiz = (quizId: string | null) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuizSubmitResult | null>(null)
  const [startedAt, setStartedAt] = useState<number>(Date.now())

  const loadQuestions = useCallback(async () => {
    if (!quizId) {
      setQuestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<QuizQuestion[] | QuizQuestionsEnvelope>(`/quizzes/${quizId}/questions`)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load quiz')

      if (Array.isArray(response.data)) {
        setQuestions(response.data.map(normalizeQuestion))
      } else {
        setQuestions((response.data.questions || []).map(normalizeQuestion))
        setTimeLimitSeconds(
          response.data.timeLimitSeconds ??
            (typeof (response.data as any).timeLimit === 'number' ? (response.data as any).timeLimit * 60 : null)
        )
      }

      setAnswers({})
      setResult(null)
      setStartedAt(Date.now())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load quiz questions'
      setError(message)
      setQuestions([])
    } finally {
      setIsLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  const selectAnswer = useCallback((questionId: string, selectedIndex: number) => {
    setAnswers((current) => ({ ...current, [questionId]: selectedIndex }))
  }, [])

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  const submitQuiz = useCallback(async () => {
    if (!quizId || questions.length === 0) return null

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: { answers: QuizAnswerPayload[]; timeTakenSeconds: number } = {
        answers: questions
          .filter((question) => typeof answers[question.id] === 'number')
          .map((question) => ({
            questionId: question.id,
            selectedIndex: answers[question.id],
          })),
        timeTakenSeconds: Math.max(1, Math.floor((Date.now() - startedAt) / 1000)),
      }

      const response = await apiClient.post<QuizSubmitResult>(`/quizzes/${quizId}/submit`, payload)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to submit quiz')

      setResult(response.data)
      return response.data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit quiz'
      setError(message)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [answers, quizId, questions, startedAt])

  return {
    questions,
    answers,
    answeredCount,
    timeLimitSeconds,
    isLoading,
    isSubmitting,
    error,
    result,
    selectAnswer,
    submitQuiz,
    reloadQuestions: loadQuestions,
  }
}

