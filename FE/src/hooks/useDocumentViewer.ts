import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/utils/apiClient'

export interface DocumentListItem {
  id: string
  contentId?: string | null
  createdByUserId?: string | null
  fileName: string
  fileType?: string
  fileSize?: number
  createdAt?: string
}

export interface LoadedDocument {
  id: string
  fileName: string
  mimeType: string
  blobUrl: string
}

const extToMime = (fileName: string): string | null => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'pdf': return 'application/pdf'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'txt':
    case 'log': return 'text/plain'
    case 'md':
    case 'markdown': return 'text/markdown'
    default: return null
  }
}

const codeToMime = (code?: string): string | null => {
  switch ((code ?? '').toUpperCase()) {
    case 'PDF': return 'application/pdf'
    case 'PNG': return 'image/png'
    case 'JPEG':
    case 'JPG': return 'image/jpeg'
    case 'TXT': return 'text/plain'
    case 'MD': return 'text/markdown'
    default: return null
  }
}

export const useDocumentViewer = () => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([])
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null)
  const [isListLoading, setIsListLoading] = useState(false)
  const [isDocLoading, setIsDocLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentBlobRef = useRef<string | null>(null)

  const revokeCurrent = useCallback(() => {
    if (currentBlobRef.current) {
      URL.revokeObjectURL(currentBlobRef.current)
      currentBlobRef.current = null
    }
  }, [])

  const fetchList = useCallback(async () => {
    setIsListLoading(true)
    try {
      const res = await apiClient.get<DocumentListItem[]>('/documents')
      if (res.success && res.data) setDocuments(res.data)
      else setDocuments([])
    } catch {
      setDocuments([])
    } finally {
      setIsListLoading(false)
    }
  }, [])

  const openDocument = useCallback(async (id: string, hintFileName?: string, hintFileType?: string) => {
    setIsDocLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<Blob>(`/documents/${id}`, {
        responseType: 'blob',
        // The response interceptor expects { success, data, ... } envelopes; for blobs we
        // need the raw axios response. Use transformResponse to bypass it harmlessly.
        transformResponse: [(d: any) => d],
      }) as any

      // With responseType:'blob', the interceptor still unwraps `response.data`; that means
      // the Blob itself is what comes back here.
      const blob: Blob = res instanceof Blob ? res : (res?.data instanceof Blob ? res.data : res)

      if (!(blob instanceof Blob)) {
        throw new Error('Unexpected response shape; could not read document data.')
      }

      const headerType = (blob.type || '').split(';')[0].trim()
      const guess = headerType
        || extToMime(hintFileName ?? '')
        || codeToMime(hintFileType)
        || 'application/octet-stream'

      // Serve the raw bytes exactly as the server sent them. We deliberately do NOT re-save
      // PDFs through pdf-lib: that round-trip (just to rewrite the toolbar title) could emit a
      // structurally-different PDF that Chrome's viewer rejected with "Failed to load PDF
      // document." The page already shows the real filename via [data-testid=document-title].
      const finalBlob: Blob = new Blob([blob], { type: guess })

      revokeCurrent()
      const url = URL.createObjectURL(finalBlob)
      currentBlobRef.current = url

      setLoaded({
        id,
        fileName: hintFileName || 'document',
        mimeType: guess,
        blobUrl: url,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load document'
      setError(message)
      setLoaded(null)
    } finally {
      setIsDocLoading(false)
    }
  }, [revokeCurrent])

  useEffect(() => {
    return () => { revokeCurrent() }
  }, [revokeCurrent])

  return {
    documents,
    loaded,
    isListLoading,
    isDocLoading,
    error,
    fetchList,
    openDocument,
  }
}
