import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { api } from './api'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type Highlight = {
  docId: string
  mimeType: string
  page: number
  box: [number, number, number, number] | null // ymin,xmin,ymax,xmax /1000
  label: string
}

const blobCache = new Map<string, Promise<ArrayBuffer>>()

function loadFile(docId: string): Promise<ArrayBuffer> {
  if (!blobCache.has(docId)) {
    blobCache.set(
      docId,
      fetch(api.fileUrl(docId)).then((r) => {
        if (!r.ok) throw new Error(`Không tải được file (${r.status})`)
        return r.arrayBuffer()
      }),
    )
  }
  return blobCache.get(docId)!
}

export function DocViewer({ hl }: { hl: Highlight }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setSize(null)
    setImgUrl(null)

    const isPdf = hl.mimeType.includes('pdf')
    if (!isPdf) {
      loadFile(hl.docId)
        .then((buf) => {
          if (cancelled) return
          const url = URL.createObjectURL(new Blob([buf], { type: hl.mimeType }))
          setImgUrl(url)
        })
        .catch((e) => !cancelled && setError(String(e)))
      return () => {
        cancelled = true
      }
    }

    loadFile(hl.docId)
      .then(async (buf) => {
        // pdfjs transfer lấy mất buffer — copy để cache còn dùng lại được
        const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise
        const page = await doc.getPage(Math.min(hl.page, doc.numPages))
        if (cancelled) return
        const containerW = wrapRef.current?.clientWidth ?? 560
        const base = page.getViewport({ scale: 1 })
        const scale = containerW / base.width
        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current!
        canvas.width = viewport.width * devicePixelRatio
        canvas.height = viewport.height * devicePixelRatio
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const ctx = canvas.getContext('2d')!
        ctx.scale(devicePixelRatio, devicePixelRatio)
        await page.render({ canvasContext: ctx, viewport, canvas }).promise
        if (!cancelled) setSize({ w: viewport.width, h: viewport.height })
      })
      .catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [hl.docId, hl.page, hl.mimeType])

  const box = hl.box
  const overlay =
    box && size ? (
      <div
        className="hl-box"
        style={{
          top: (box[0] / 1000) * size.h - 4,
          left: (box[1] / 1000) * size.w - 4,
          height: ((box[2] - box[0]) / 1000) * size.h + 8,
          width: ((box[3] - box[1]) / 1000) * size.w + 8,
        }}
        title={hl.label}
      />
    ) : null

  return (
    <div className="viewer" ref={wrapRef}>
      <div className="viewer-head">
        🔍 {hl.label} · trang {hl.page}
      </div>
      {error && <div className="banner error">⚠️ {error}</div>}
      <div className="viewer-stage">
        {imgUrl ? <img src={imgUrl} alt="" onLoad={(e) => setSize({ w: e.currentTarget.clientWidth, h: e.currentTarget.clientHeight })} /> : <canvas ref={canvasRef} />}
        {overlay}
      </div>
    </div>
  )
}
