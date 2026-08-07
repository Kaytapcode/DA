import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { apiClient } from '@/utils/apiClient'
import { tokenStore } from '@/utils/tokenStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface DocumentItem {
  id: string
  contentId?: string
  fileName: string
  fileType: string
  filePath?: string
  fileUrl?: string
  pageCount?: number
  contentText?: string
}

const normalizeDocument = (document: any): DocumentItem => ({
  id: document.id,
  contentId: document.contentId ?? document.content_id,
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
  const blobUrlRef = useRef<string | null>(null)

  const clearBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }, [])

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
      clearBlobUrl()
      setSelectedDocument(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const listEntry = documents.find((document) => document.id === documentId) ?? null

      const token = tokenStore.getAccessToken()
      const orgId = localStorage.getItem('org_id')
      const orgSlug = localStorage.getItem('org_slug')

      const response = await axios.get(`${API_BASE_URL}/documents/${documentId}`, {
        responseType: 'blob',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(orgId ? { 'X-Org-Id': orgId } : {}),
          ...(orgSlug ? { 'X-Org-Slug': orgSlug } : {}),
        },
      })

      const contentType = String(response.headers['content-type'] || '').split(';')[0].trim()
      // Re-wrap with explicit MIME so iframe/img render inline. Without an explicit
      // type some browsers treat the blob URL as application/octet-stream and force a download.
      const rawBlob = response.data as Blob
      const typedBlob = contentType ? new Blob([rawBlob], { type: contentType }) : rawBlob
      clearBlobUrl()
      const blobUrl = URL.createObjectURL(typedBlob)
      blobUrlRef.current = blobUrl

      const fileType = (contentType || listEntry?.fileType || '').toLowerCase()
      const contentText = fileType.includes('text') ? await typedBlob.text() : undefined

      setSelectedDocument({
        ...(listEntry ?? { id: documentId, fileName: 'Document', fileType }),
        fileType,
        fileUrl: blobUrl,
        contentText,
      })
      setCurrentPage(1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load document'
      setError(message)
      clearBlobUrl()
      setSelectedDocument(null)
    } finally {
      setIsLoading(false)
    }
  }, [clearBlobUrl, documents])

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
    if (!selectedDocument || !courseId || !selectedDocument.contentId) return

    try {
      await apiClient.post(`/courses/${courseId}/progress`, {
        contentId: selectedDocument.contentId,
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

  useEffect(() => {
    return () => {
      clearBlobUrl()
    }
  }, [clearBlobUrl])

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

