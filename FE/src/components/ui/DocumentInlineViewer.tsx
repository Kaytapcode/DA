import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MaterialIcon } from './MaterialIcon'

export interface DocumentInlineViewerProps {
  blobUrl: string | null
  mimeType: string | null
  fileName: string
  emptyLabel?: string
  className?: string
}

type Kind = 'pdf' | 'image' | 'markdown' | 'text' | 'unknown'

const kindOf = (mime: string | null, name: string): Kind => {
  const m = (mime ?? '').toLowerCase()
  const n = name.toLowerCase()
  if (m.includes('pdf') || n.endsWith('.pdf')) return 'pdf'
  if (m.includes('markdown') || n.endsWith('.md') || n.endsWith('.markdown')) return 'markdown'
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(n)) return 'image'
  if (m.startsWith('text/') || /\.(txt|log)$/i.test(n)) return 'text'
  return 'unknown'
}

export const DocumentInlineViewer: React.FC<DocumentInlineViewerProps> = ({
  blobUrl,
  mimeType,
  fileName,
  emptyLabel = 'Select a document to preview',
  className = '',
}) => {
  const wrapper = `relative w-full h-full ${className}`.trim()
  const kind = kindOf(mimeType, fileName)
  const [text, setText] = useState<string | null>(null)
  const [textError, setTextError] = useState<string | null>(null)

  useEffect(() => {
    if (!blobUrl || (kind !== 'text' && kind !== 'markdown')) {
      setText(null)
      setTextError(null)
      return
    }
    let cancelled = false
    fetch(blobUrl)
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setText(t) })
      .catch((e) => { if (!cancelled) setTextError(e instanceof Error ? e.message : 'Unable to read file') })
    return () => { cancelled = true }
  }, [blobUrl, kind])

  if (!blobUrl) {
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
    // Append the filename as a fragment so Chrome's built-in PDF viewer shows
    // it in the toolbar instead of the blob URL's UUID.
    const pdfSrc = `${blobUrl}#filename=${encodeURIComponent(fileName)}`
    return (
      <object
        data={pdfSrc}
        type="application/pdf"
        className={`${wrapper} rounded-xl border border-outline-variant bg-white`}
      >
        <iframe
          title={fileName}
          src={pdfSrc}
          className="w-full h-full rounded-xl border-0 bg-white"
        />
      </object>
    )
  }

  if (kind === 'image') {
    return (
      <div className={`${wrapper} overflow-auto flex items-start justify-center bg-white rounded-xl`}>
        <img src={blobUrl} alt={fileName} className="max-w-full h-auto" />
      </div>
    )
  }

  if (kind === 'markdown') {
    if (textError) return <p className={`${wrapper} text-error`}>{textError}</p>
    return (
      <div className={`${wrapper} overflow-auto rounded-xl bg-white p-6`}>
        <article className="prose prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text ?? ''}</ReactMarkdown>
        </article>
      </div>
    )
  }

  if (kind === 'text') {
    if (textError) return <p className={`${wrapper} text-error`}>{textError}</p>
    return (
      <pre className={`${wrapper} overflow-auto rounded-xl bg-white p-4 text-left text-sm text-on-surface whitespace-pre-wrap`}>
        {text ?? ''}
      </pre>
    )
  }

  return (
    <div className={`${wrapper} flex items-center justify-center text-center`}>
      <a href={blobUrl} download={fileName} className="text-primary underline">
        Download {fileName}
      </a>
    </div>
  )
}
