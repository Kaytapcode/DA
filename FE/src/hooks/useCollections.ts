import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

// Mirrors Content.Api/Controllers/CollectionsController.CollectionResponseDto.
export interface Collection {
  id: string
  title: string
  description: string | null
  parentId: string | null
  createdAt: string
  ownedByCaller: boolean
}

// Mirrors CollectionsController.CollectionItemDto.
export interface CollectionItem {
  contentId: string
  title: string
  contentType: string
  videoId: string | null
  quizId: string | null
  deckId: string | null
  documentId: string | null
  orderIndex: number
}

export const useCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ type: 'COLLECTION', limit: '500' })
      const res = await apiClient.get<Array<{
        contentId: string
        title: string
        ownedByCaller: boolean
        createdAt: string
      }>>(`/search?${params.toString()}`)
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to load collections')
      setCollections(res.data.map((row) => ({
        id: row.contentId,
        title: row.title,
        description: null,
        parentId: null,
        createdAt: row.createdAt,
        ownedByCaller: row.ownedByCaller,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const create = useCallback(
    async (title: string, description?: string, parentId?: string) => {
      try {
        const res = await apiClient.post<Collection>('/collections', { title, description: description ?? null, parentId: parentId ?? null })
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to create collection')
        await refresh()
        return { ...res.data, ownedByCaller: true }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create collection')
        return null
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        const res = await apiClient.delete(`/collections/${id}`)
        if (!res.success) throw new Error(res.message || 'Failed to delete collection')
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete collection')
        return false
      }
    },
    [refresh]
  )

  const getItems = useCallback(async (collectionId: string): Promise<CollectionItem[]> => {
    try {
      const res = await apiClient.get<CollectionItem[]>(`/collections/${collectionId}/items`)
      return res.success && res.data ? res.data : []
    } catch {
      return []
    }
  }, [])

  const addItem = useCallback(async (collectionId: string, contentId: string) => {
    try {
      const res = await apiClient.post(`/collections/${collectionId}/items`, { contentId })
      if (!res.success) throw new Error(res.message || 'Failed to add item')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
      return false
    }
  }, [])

  const removeItem = useCallback(async (collectionId: string, contentId: string) => {
    try {
      const res = await apiClient.delete(`/collections/${collectionId}/items/${contentId}`)
      if (!res.success) throw new Error(res.message || 'Failed to remove item')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
      return false
    }
  }, [])

  return { collections, isLoading, error, refresh, create, remove, getItems, addItem, removeItem }
}
