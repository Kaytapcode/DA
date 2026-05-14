import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

export interface DocumentItem {
  id: string
  fileName: string
  fileType: string
  filePath?: string
  fileUrl?: string
  pageCount?: number
  contentText?: string
}

const normalizeDocument = (document: any): DocumentItem => ({
  id: document.id,
  fileName: document.fileName ?? document.file_name ?? 'Document',
  fileType: (document.fileType ?? document.file_type ?? 'text').toLowerCase(),
  filePath: document.filePath ?? document.file_path,
  fileUrl: document.fileUrl ?? document.file_url,
  pageCount: typeof document.pageCount === 'number' ? document.pageCount : undefined,
  contentText: document.contentText ?? document.content_text,
})

export const useDocument = (selectedDocumentId: string | null, courseId?: string | null) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDocumentList = useCallback(async () => {
    try {
      const response = await apiClient.get<DocumentItem[]>('/documents')
      if (!response.success || !response.data) return
      setDocuments(response.data.map(normalizeDocument))
    } catch (err) {
      console.error('Failed to load document list', err)
      setDocuments([])
    }
  }, [])

  const loadDocument = useCallback(async (documentId: string | null) => {
    if (!documentId) {
      setSelectedDocument(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<DocumentItem>(`/documents/${documentId}`)
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load document')
      setSelectedDocument(normalizeDocument(response.data))
      setCurrentPage(1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load document'
      setError(message)
      setSelectedDocument(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDocumentList()
  }, [loadDocumentList])

  useEffect(() => {
    void loadDocument(selectedDocumentId)
  }, [loadDocument, selectedDocumentId])

  const totalPages = selectedDocument?.pageCount ?? 1

  const nextPage = useCallback(() => {
    setCurrentPage((current) => Math.min(current + 1, totalPages))
  }, [totalPages])

  const previousPage = useCallback(() => {
    setCurrentPage((current) => Math.max(current - 1, 1))
  }, [])

  const trackProgress = useCallback(async () => {
    if (!selectedDocument || !courseId) return

    try {
      await apiClient.post(`/courses/${courseId}/progress`, {
        contentId: selectedDocument.id,
        isCompleted: currentPage >= totalPages,
        timeSpentSeconds: 30,
      })
    } catch (err) {
      console.error('Failed to track document progress', err)
    }
  }, [courseId, currentPage, selectedDocument, totalPages])

  useEffect(() => {
    void trackProgress()
  }, [trackProgress])

  return {
    documents,
    selectedDocument,
    currentPage,
    totalPages,
    isLoading,
    error,
    selectDocument: loadDocument,
    nextPage,
    previousPage,
    refreshList: loadDocumentList,
  }
}

