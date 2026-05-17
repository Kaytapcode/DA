import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MaterialIcon } from './MaterialIcon'

export type DocumentKind = 'pdf' | 'image' | 'markdown' | 'text' | 'unknown'

export interface DocumentViewerProps {
  fileUrl: string | null | undefined
  fileName: string
  fileType?: string
  className?: string
  emptyLabel?: string
}

const isMarkdownName = (name: string) => /\.(md|markdown)$/i.test(name)
const isImageName = (name: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(name)
const isTextName = (name: string) => /\.(txt|log)$/i.test(name)

const detectKind = (fileName: string, fileType?: string): DocumentKind => {
  const type = (fileType ?? '').toLowerCase()
  if (type.includes('pdf')) return 'pdf'
  if (type.includes('markdown') || isMarkdownName(fileName)) return 'markdown'
  if (type.includes('image') || isImageName(fileName)) return 'image'
  if (type.includes('text') || isTextName(fileName)) return 'text'
  return 'unknown'
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  fileUrl,
  fileName,
  fileType,
  className = '',
  emptyLabel = 'Select a document to preview',
}) => {
  const kind = detectKind(fileName, fileType)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [textError, setTextError] = useState<string | null>(null)
  const [isLoadingText, setIsLoadingText] = useState(false)

  useEffect(() => {
    if (!fileUrl || (kind !== 'markdown' && kind !== 'text')) {
      setTextContent(null)
      setTextError(null)
      return
    }
    let cancelled = false
    setIsLoadingText(true)
    setTextError(null)
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load file (${res.status})`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) setTextContent(text)
      })
      .catch((err) => {
        if (!cancelled) setTextError(err instanceof Error ? err.message : 'Unable to read file')
      })
      .finally(() => {
        if (!cancelled) setIsLoadingText(false)
      })
    return () => {
      cancelled = true
    }
  }, [fileUrl, kind])

  const wrapper = `relative w-full h-full ${className}`.trim()

  if (!fileUrl) {
    return (
      <div className={`${wrapper} flex items-center justify-center text-center text-on-surface-variant`}>
        <div>
          <MaterialIcon icon="menu_book" className="mb-3 text-5xl" />
          <p>{emptyLabel}</p>
        </div>
      </div>
    )
  }

  if (kind === 'pdf') {
    return (
      <iframe
        title={fileName}
        src={fileUrl}
        className={`${wrapper} rounded-xl border border-outline-variant bg-white`}
      />
    )
  }

  if (kind === 'image') {
    return (
      <div className={`${wrapper} overflow-auto flex items-start justify-center bg-white rounded-xl`}>
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-full h-auto"
        />
      </div>
    )
  }

  if (kind === 'markdown') {
    if (isLoadingText) {
      return (
        <div className={`${wrapper} flex items-center justify-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )
    }
    if (textError) {
      return <p className={`${wrapper} text-error`}>{textError}</p>
    }
    return (
      <div className={`${wrapper} overflow-auto rounded-xl bg-white p-6`}>
        <article className="prose prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent ?? ''}</ReactMarkdown>
        </article>
      </div>
    )
  }

  if (kind === 'text') {
    if (isLoadingText) {
      return (
        <div className={`${wrapper} flex items-center justify-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      )
    }
    if (textError) {
      return <p className={`${wrapper} text-error`}>{textError}</p>
    }
    return (
      <pre className={`${wrapper} overflow-auto rounded-xl bg-white p-4 text-left text-sm text-on-surface whitespace-pre-wrap`}>
        {textContent ?? ''}
      </pre>
    )
  }

  return (
    <div className={`${wrapper} flex items-center justify-center text-center`}>
      <a href={fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">
        Open document in a new tab
      </a>
    </div>
  )
}
