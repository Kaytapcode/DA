import React, { useMemo, useState } from 'react'
import axios from 'axios'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { tokenStore } from '@/utils/tokenStore'

interface UploadedDoc {
  id: string
  contentId?: string | null
  fileName?: string
}

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  // Receives the created document (incl. its contentId) so callers can e.g. link it to a course module.
  onUploaded: (doc?: UploadedDoc) => void
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

const supportedMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain',
]

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const supportsSelectedFile = useMemo(() => {
    if (!file) return false
    return supportedMimeTypes.includes(file.type) || /\.(pdf|png|jpe?g|txt)$/i.test(file.name)
  }, [file])

  if (!isOpen) return null

  const resetState = () => {
    setFile(null)
    setError(null)
    setProgress(0)
    setIsUploading(false)
    setSuccessMessage(null)
  }

  const validateAndSetFile = (nextFile: File | null) => {
    setError(null)
    setSuccessMessage(null)

    if (!nextFile) {
      setFile(null)
      return
    }

    if (nextFile.size > MAX_FILE_SIZE_BYTES) {
      setError('File is too large. Maximum allowed size is 20MB.')
      setFile(null)
      return
    }

    setFile(nextFile)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a file to upload.')
      return
    }

    if (!supportsSelectedFile) {
      setError('Unsupported file type. Use PDF, PNG, JPEG, or TXT.')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccessMessage(null)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    const token = tokenStore.getAccessToken()
    const orgId = localStorage.getItem('org_id')
    const orgSlug = localStorage.getItem('org_slug')

    try {
      const response = await axios.post(`${API_BASE_URL}/documents`, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(orgId ? { 'X-Org-Id': orgId } : {}),
          ...(orgSlug ? { 'X-Org-Slug': orgSlug } : {}),
        },
        onUploadProgress: (event) => {
          if (!event.total) return
          setProgress(Math.round((event.loaded / event.total) * 100))
        },
      })

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Upload failed')
      }

      setSuccessMessage('Upload completed successfully.')
      onUploaded(response.data?.data as UploadedDoc | undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="document-upload-modal">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-on-surface">Upload Document</h3>
          <button
            type="button"
            onClick={() => {
              resetState()
              onClose()
            }}
            className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close upload modal"
          >
            <MaterialIcon icon="close" size="sm" />
          </button>
        </div>

        <label
          htmlFor="document-upload-input"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            validateAndSetFile(event.dataTransfer.files?.[0] ?? null)
          }}
          className="grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center"
        >
          <MaterialIcon icon="upload_file" className="mb-3 text-primary" />
          <p className="font-semibold text-on-surface">Drag and drop your file here</p>
          <p className="mt-1 text-sm text-on-surface-variant">or click to browse (PDF, PNG, JPEG, TXT)</p>
          <input
            id="document-upload-input"
            type="file"
            className="hidden"
            data-testid="document-upload-input"
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
            onChange={(event) => validateAndSetFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {file && (
          <div className="mt-4 rounded-lg bg-surface-container-low p-3">
            <p className="text-sm font-semibold text-on-surface">{file.name}</p>
            <p className="text-xs text-on-surface-variant">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        {isUploading && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-on-surface-variant">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-low">
              <div className="h-2 rounded-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-error" data-testid="document-upload-error">{error}</p>}
        {successMessage && <p className="mt-4 text-sm text-green-600" data-testid="document-upload-success">{successMessage}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              resetState()
              onClose()
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleUpload()} disabled={isUploading} data-testid="document-upload-submit">
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </div>
  )
}

