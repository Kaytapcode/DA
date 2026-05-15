import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

export interface QuizOption {
  id: string
  text: string
}

export interface QuizQuestion {
  id: string
  questionText: string
  options: QuizOption[]
  correctIndex?: number
  explanation?: string | null
}

interface QuizAnswerPayload {
  questionId: string
  selectedOptionId: string
}

export interface QuizResultItem {
  questionId: string
  isCorrect: boolean
  selectedOptionId: string
  correctOptionId: string
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

interface QuizSummary {
  quizId?: string
  id?: string
}

const normalizeQuestion = (question: any): QuizQuestion => ({
  id: question.id,
  questionText: question.questionText ?? question.question_text ?? '',
  options: Array.isArray(question.options)
    ? question.options.map((option: any, index: number) => {
        if (typeof option === 'string') {
          return { id: `${question.id}-opt-${index}`, text: option }
        }
        return {
          id: option.id ?? `${question.id}-opt-${index}`,
          text: option.optionText ?? option.option_text ?? option.text ?? '',
        }
      })
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
  const [resolvedQuizId, setResolvedQuizId] = useState<string | null>(quizId)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<QuizSubmitResult | null>(null)
  const [startedAt, setStartedAt] = useState<number>(Date.now())

  useEffect(() => {
    setResolvedQuizId(quizId)
  }, [quizId])

  const loadQuestions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let activeQuizId = quizId ?? resolvedQuizId
      if (!activeQuizId) {
        const quizListResponse = await apiClient.get<QuizSummary[]>('/quizzes')
        if (!quizListResponse.success || !quizListResponse.data || quizListResponse.data.length === 0) {
          setQuestions([])
          setAnswers({})
          setResult(null)
          setTimeLimitSeconds(null)
          return
        }

        const firstQuiz = quizListResponse.data[0]
        activeQuizId = firstQuiz.quizId ?? firstQuiz.id ?? null
        if (!activeQuizId) {
          throw new Error('Unable to resolve quiz id')
        }
        setResolvedQuizId(activeQuizId)
      }

      const response = await apiClient.get<QuizQuestion[] | QuizQuestionsEnvelope>(`/quizzes/${activeQuizId}/questions`)
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
  }, [quizId, resolvedQuizId])

  useEffect(() => {
    void loadQuestions()
  }, [loadQuestions])

  const selectAnswer = useCallback((questionId: string, selectedOptionId: string) => {
    setAnswers((current) => ({ ...current, [questionId]: selectedOptionId }))
  }, [])

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  const submitQuiz = useCallback(async () => {
    const activeQuizId = quizId ?? resolvedQuizId
    if (!activeQuizId || questions.length === 0) return null

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: { answers: QuizAnswerPayload[]; timeTakenSeconds: number } = {
        answers: questions
          .filter((question) => typeof answers[question.id] === 'string')
          .map((question) => ({
            questionId: question.id,
            selectedOptionId: answers[question.id],
          })),
        timeTakenSeconds: Math.max(1, Math.floor((Date.now() - startedAt) / 1000)),
      }

      const response = await apiClient.post<QuizSubmitResult>(`/quizzes/${activeQuizId}/submit`, payload)
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
  }, [answers, quizId, questions, resolvedQuizId, startedAt])

  return {
    quizId: quizId ?? resolvedQuizId,
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

