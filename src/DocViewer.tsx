import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { api } from './api'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type Highlight = {
  docId: string
  mimeType: string
  page: number
  // [ymin,xmin,ymax,xmax] hoặc nhiều box nối tiếp (bội của 4) khi giá trị vắt nhiều dòng
  box: number[] | null
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

  // Tách mảng thành từng box 4 số — giá trị nhiều dòng = chùm box, mỗi box một dòng
  const boxes: number[][] = []
  if (hl.box && size) {
    for (let i = 0; i + 3 < hl.box.length; i += 4) boxes.push(hl.box.slice(i, i + 4))
  }
  const overlay =
    size &&
    boxes.map((b, i) => (
      <div
        key={i}
        className={`hl-box ${boxes.length > 1 ? 'multi' : ''}`}
        style={{
          top: (b[0] / 1000) * size.h - 3,
          left: (b[1] / 1000) * size.w - 3,
          height: ((b[2] - b[0]) / 1000) * size.h + 6,
          width: ((b[3] - b[1]) / 1000) * size.w + 6,
        }}
        title={hl.label}
      />
    ))

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
