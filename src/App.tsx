import { useCallback, useRef, useState } from 'react'
import './App.css'

type ExtractedField = {
  key: string
  label: string
  value: string
  confidence: number
  page: number
  box_2d?: [number, number, number, number]
}

type ExtractResult = {
  mode: 'gemini' | 'mock'
  doc_type: string
  doc_type_confidence: number
  filename: string
  size_bytes: number
  fields: ExtractedField[]
  warnings: string[]
}

const DOC_TYPE_LABELS: Record<string, string> = {
  loan_application: 'Đơn đề nghị vay vốn',
  financial_statement: 'Báo cáo tài chính',
  credit_contract: 'Hợp đồng tín dụng',
  swift_mt103: 'Điện thanh toán SWIFT MT103',
  national_id: 'CCCD / Giấy tờ tùy thân',
  other: 'Chứng từ khác',
}

function confidenceClass(c: number) {
  if (c >= 0.9) return 'conf high'
  if (c >= 0.7) return 'conf mid'
  return 'conf low'
}

function App() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const resp = await fetch('/api/extract', { method: 'POST', body: form })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error ?? `HTTP ${resp.status}`)
      setResult(data as ExtractResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void processFile(file)
    },
    [processFile],
  )

  return (
    <main className="shell">
      <header>
        <h1>
          Doc<span>Flow</span>
        </h1>
        <p className="tagline">
          Hồ sơ tín dụng: từ scan đến core-banking trong vài phút — trích xuất có truy vết nguồn,
          không bịa số liệu.
        </p>
      </header>

      <section
        className={`dropzone ${dragOver ? 'over' : ''} ${busy ? 'busy' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void processFile(f)
          }}
        />
        {busy ? (
          <p>⏳ Đang phân loại &amp; trích xuất…</p>
        ) : (
          <>
            <p className="big">📄 Kéo-thả hồ sơ vào đây</p>
            <p className="hint">PDF hoặc ảnh scan — đơn vay, BCTC, hợp đồng, điện SWIFT/TT</p>
          </>
        )}
      </section>

      {error && <div className="banner error">⚠️ {error}</div>}

      {result && (
        <section className="result">
          <div className="meta">
            <span className={`badge ${result.mode}`}>
              {result.mode === 'mock' ? 'MOCK' : 'GEMINI'}
            </span>
            <strong>{DOC_TYPE_LABELS[result.doc_type] ?? result.doc_type}</strong>
            <span className={confidenceClass(result.doc_type_confidence)}>
              {(result.doc_type_confidence * 100).toFixed(0)}%
            </span>
            <span className="file">
              {result.filename} · {(result.size_bytes / 1024).toFixed(0)} KB
            </span>
          </div>

          {result.warnings.length > 0 && (
            <div className="banner warn">
              {result.warnings.map((w) => (
                <div key={w}>⚠️ {w}</div>
              ))}
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>Trường</th>
                <th>Giá trị</th>
                <th>Tin cậy</th>
                <th>Nguồn</th>
              </tr>
            </thead>
            <tbody>
              {result.fields.map((f) => (
                <tr key={f.key}>
                  <td>{f.label}</td>
                  <td className="value">{f.value}</td>
                  <td>
                    <span className={confidenceClass(f.confidence)}>
                      {(f.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="src">
                    trang {f.page}
                    {f.box_2d && ` · [${f.box_2d.join(', ')}]`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer>
        DocFlow — Vietnam AI Innovation Challenge 2026 · SHB Intelligent Document Processing ·
        team megalondon
      </footer>
    </main>
  )
}

export default App
