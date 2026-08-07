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
    // Render PDFs in a plain <iframe> pointed straight at the blob URL. We deliberately
    // do NOT append a `#filename=` fragment: Chrome's built-in PDF viewer can fail to
    // load a blob: URL that carries a fragment (blank viewer / forced download), and the
    // useDocumentViewer hook already rewrites the PDF's internal Title via pdf-lib so the
    // toolbar shows the real name. <iframe> is more reliable than <object> for blob PDFs.
    return (
      <iframe
        title={fileName}
        src={blobUrl}
        data-testid="document-pdf-frame"
        className={`${wrapper} rounded-xl border border-outline-variant bg-white`}
      />
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

  // Formats browsers can't render inline (e.g. .doc/.docx/.ppt/.xls) — show a clear
  // "preview not available" state with a download action instead of a blank/broken frame.
  return (
    <div className={`${wrapper} flex items-center justify-center text-center`} data-testid="document-preview-unavailable">
      <div className="max-w-sm rounded-xl border border-outline-variant bg-white p-8">
        <MaterialIcon icon="description" className="mb-3 text-5xl text-on-surface-variant" />
        <p className="mb-1 font-semibold text-on-surface">Preview not available for this file type</p>
        <p className="mb-4 text-sm text-on-surface-variant">
          {fileName} can’t be shown in the browser. Download it to view.
        </p>
        <a
          href={blobUrl}
          download={fileName}
          data-testid="document-download-link"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
        >
          <MaterialIcon icon="download" size="xs" /> Download {fileName}
        </a>
      </div>
    </div>
  )
}
