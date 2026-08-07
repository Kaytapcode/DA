import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

export interface FlashcardItem {
  id: string
  frontText: string
  backText: string
  isMastered: boolean
}

const normalizeFlashcard = (card: any): FlashcardItem => ({
  id: card.id,
  frontText: card.frontText ?? card.front_text ?? '',
  backText: card.backText ?? card.back_text ?? '',
  isMastered: Boolean(card.isMastered ?? card.is_mastered),
})

const shuffled = <T,>(items: T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }
  return result
}

interface DeckSummary {
  deckId?: string
  id?: string
}

export const useFlashcard = (deckId: string | null) => {
  const [resolvedDeckId, setResolvedDeckId] = useState<string | null>(deckId)
  const [cards, setCards] = useState<FlashcardItem[]>([])
  const [order, setOrder] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [shuffleMode, setShuffleMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Separate from load error — mastery failures must not hide the card UI.
  const [masteryError, setMasteryError] = useState<string | null>(null)

  useEffect(() => {
    setResolvedDeckId(deckId)
  }, [deckId])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      let activeDeckId = deckId ?? resolvedDeckId

      if (!activeDeckId) {
        const deckResponse = await apiClient.get<DeckSummary[]>('/decks')
        if (!deckResponse.success || !deckResponse.data || deckResponse.data.length === 0) {
          setCards([])
          setOrder([])
          setCurrentIndex(0)
          setIsFlipped(false)
          setShuffleMode(false)
          return
        }

        const firstDeck = deckResponse.data[0]
        activeDeckId = firstDeck.deckId ?? firstDeck.id ?? null
        if (!activeDeckId) {
          throw new Error('Unable to resolve deck id')
        }
        setResolvedDeckId(activeDeckId)
      }

      const response = await apiClient.get<FlashcardItem[]>(`/decks/${activeDeckId}/flashcards`)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load flashcards')

      const normalizedCards = response.data.map(normalizeFlashcard)
      const unmastered = normalizedCards.filter((card) => !card.isMastered)

      setCards(unmastered)
      setOrder(unmastered.map((card) => card.id))
      setCurrentIndex(0)
      setIsFlipped(false)
      setShuffleMode(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load flashcards'
      setError(message)
      setCards([])
      setOrder([])
    } finally {
      setIsLoading(false)
    }
  }, [deckId, resolvedDeckId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const orderedCards = useMemo(() => {
    const byId = new Map(cards.map((card) => [card.id, card]))
    return order.map((id) => byId.get(id)).filter((card): card is FlashcardItem => Boolean(card))
  }, [cards, order])

  const currentCard = orderedCards[currentIndex] ?? null

  const toggleShuffle = useCallback(() => {
    setShuffleMode((current) => {
      const next = !current
      setOrder((existingOrder) => (next ? shuffled(existingOrder) : cards.map((card) => card.id)))
      setCurrentIndex(0)
      setIsFlipped(false)
      return next
    })
  }, [cards])

  const nextCard = useCallback(() => {
    setCurrentIndex((current) => (orderedCards.length === 0 ? 0 : (current + 1) % orderedCards.length))
    setIsFlipped(false)
  }, [orderedCards.length])

  const previousCard = useCallback(() => {
    setCurrentIndex((current) => {
      if (orderedCards.length === 0) return 0
      return current === 0 ? orderedCards.length - 1 : current - 1
    })
    setIsFlipped(false)
  }, [orderedCards.length])

  const toggleFlip = useCallback(() => {
    setIsFlipped((current) => !current)
  }, [])

  const markCurrentAsMastered = useCallback(async () => {
    const activeDeckId = deckId ?? resolvedDeckId
    if (!activeDeckId || !currentCard) return false

    setIsUpdating(true)
    setMasteryError(null)

    try {
      const response = await apiClient.put(`/decks/${activeDeckId}/flashcards/${currentCard.id}/master`)
      if (!response.success) throw new Error(response.message || 'Unable to update flashcard')

      setCards((existing) => existing.filter((card) => card.id !== currentCard.id))
      setOrder((existingOrder) => existingOrder.filter((id) => id !== currentCard.id))
      setCurrentIndex((current) => {
        const remaining = Math.max(0, orderedCards.length - 1)
        return remaining === 0 ? 0 : Math.min(current, remaining - 1)
      })
      setIsFlipped(false)

      return true
    } catch (err) {
      // Use masteryError so the main error state (which hides the cards) is not affected.
      const message = err instanceof Error ? err.message : 'Unable to update flashcard'
      setMasteryError(message)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [currentCard, deckId, orderedCards.length, resolvedDeckId])

  // Spec §2.3: "...unless the User resets them." Calls POST /decks/{id}/flashcards/reset-mastered
  // and reloads so previously hidden cards reappear.
  const resetMastered = useCallback(async () => {
    const activeDeckId = deckId ?? resolvedDeckId
    if (!activeDeckId) return false

    setIsUpdating(true)
    setMasteryError(null)
    try {
      const response = await apiClient.post(`/decks/${activeDeckId}/flashcards/reset-mastered`)
      if (!response.success) throw new Error(response.message || 'Unable to reset mastered cards')
      await refresh()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reset mastered cards'
      setMasteryError(message)
      return false
    } finally {
      setIsUpdating(false)
    }
  }, [deckId, resolvedDeckId, refresh])

  return {
    cards: orderedCards,
    currentCard,
    deckId: deckId ?? resolvedDeckId,
    currentIndex,
    totalCards: orderedCards.length,
    isFlipped,
    shuffleMode,
    isLoading,
    isUpdating,
    error,
    masteryError,
    refresh,
    toggleShuffle,
    toggleFlip,
    nextCard,
    previousCard,
    markCurrentAsMastered,
    resetMastered,
  }
}

