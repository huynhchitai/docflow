import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  api,
  DOC_TYPE_LABELS,
  STATE_LABELS,
  type Doc,
  type DossierDetail,
  type DossierSummary,
  type Field,
} from './api'
import { DocViewer, type Highlight } from './DocViewer'

function confidenceClass(c: number) {
  if (c >= 0.9) return 'conf high'
  if (c >= 0.7) return 'conf mid'
  return 'conf low'
}

// ============ Hồ sơ khách hàng tổng hợp ============
const PROFILE_SPECS: { name: string; label: string; keys: RegExp; norm: (s: string) => string }[] = [
  { name: 'customer_name', label: 'Họ và tên', keys: /customer_name|borrower|mortgagor_name|ten_khach/i, norm: (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim() },
  { name: 'national_id', label: 'Số CCCD', keys: /national_id|cccd|id_number/i, norm: (s) => s.replace(/\D/g, '') },
  { name: 'dob', label: 'Ngày sinh', keys: /dob|date_of_birth|ngay_sinh|birth/i, norm: (s) => s.replace(/\D/g, '') },
  { name: 'address', label: 'Địa chỉ', keys: /address|dia_chi/i, norm: (s) => s.toLowerCase().replace(/\s+/g, ' ').trim() },
  { name: 'phone', label: 'Điện thoại', keys: /phone|dien_thoai|mobile/i, norm: (s) => s.replace(/\D/g, '') },
  { name: 'occupation', label: 'Nghề nghiệp', keys: /occupation|nghe_nghiep|job/i, norm: (s) => s.toLowerCase().trim() },
  { name: 'income', label: 'Thu nhập', keys: /income|thu_nhap|salary/i, norm: (s) => s.replace(/\D/g, '') },
]

type ProfileEntry = {
  label: string
  value: string
  sources: number
  consistent: boolean
  field: Field
  doc: Doc
}

function buildProfile(docs: Doc[]): ProfileEntry[] {
  const out: ProfileEntry[] = []
  for (const spec of PROFILE_SPECS) {
    const hits: { field: Field; doc: Doc }[] = []
    for (const doc of docs) {
      const f = doc.fields.find((f) => spec.keys.test(f.key) && f.value.trim())
      if (f) hits.push({ field: f, doc })
    }
    if (!hits.length) continue
    const canon = spec.norm(hits[0].field.value)
    const consistent = hits.every((h) => spec.norm(h.field.value) === canon)
    // Ưu tiên bản đã human-review, sau đó confidence cao nhất
    const best = [...hits].sort(
      (a, b) =>
        Number(b.field.human_reviewed) - Number(a.field.human_reviewed) ||
        b.field.confidence - a.field.confidence,
    )[0]
    out.push({
      label: spec.label,
      value: best.field.value,
      sources: hits.length,
      consistent,
      field: best.field,
      doc: best.doc,
    })
  }
  return out
}

function CustomerProfile({ docs, onPick }: { docs: Doc[]; onPick: (h: Highlight) => void }) {
  const entries = buildProfile(docs)
  if (!entries.length) return null
  return (
    <div className="profile-card">
      <div className="profile-head">
        <span className="profile-avatar" aria-hidden="true">👤</span>
        <strong>Thông tin chung khách hàng</strong>
        <span className="profile-note">tổng hợp từ {docs.length} chứng từ — click để soi nguồn</span>
      </div>
      <div className="profile-grid">
        {entries.map((e) => (
          <button
            key={e.label}
            className={`profile-item ${e.consistent ? '' : 'mismatch'}`}
            onClick={() =>
              onPick({
                docId: e.doc.id,
                mimeType: e.doc.mime_type,
                page: e.field.page,
                box: e.field.box_2d,
                label: e.label,
              })
            }
            title={e.consistent ? `Khớp trên ${e.sources} chứng từ` : 'Giá trị LỆCH giữa các chứng từ!'}
          >
            <span className="profile-label">
              {e.label}
              {e.sources > 1 && (e.consistent ? ` ✓×${e.sources}` : ' ⚠️ LỆCH')}
            </span>
            <span className="profile-value">{e.value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Header() {
  return (
    <header>
      <div className="mark" aria-hidden="true" />
      <h1>
        Doc<span>Flow</span>
      </h1>
      <p className="tagline">
        Hồ sơ tín dụng: từ scan đến core-banking trong vài phút — trích xuất có truy vết nguồn,
        không bịa số liệu.
      </p>
    </header>
  )
}

// ============ Danh sách bộ hồ sơ ============
function DossierList({ onOpen }: { onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<DossierSummary[] | null>(null)
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    api.listDossiers().then(setRows).catch((e) => setError(String(e)))
  }, [])
  useEffect(refresh, [refresh])

  const create = async () => {
    if (creating) return
    // Không bao giờ no-op im lặng: trống tên thì tự đặt theo ngày giờ
    const finalName =
      name.trim() ||
      `Bộ hồ sơ ${new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
    setCreating(true)
    setError(null)
    try {
      const { id } = await api.createDossier(finalName)
      setName('')
      onOpen(id)
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <form
        className="new-dossier"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <input
          value={name}
          placeholder="Tên bộ hồ sơ mới — vd: Hồ sơ vay · Nguyễn Văn An (bỏ trống sẽ tự đặt tên)"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={creating}>
          {creating ? 'Đang tạo…' : '+ Tạo bộ hồ sơ'}
        </button>
      </form>
      {error && <div className="banner error">⚠️ {error}</div>}
      {rows === null ? (
        <p className="hint-center">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="hint-center">Chưa có bộ hồ sơ nào — tạo cái đầu tiên đi.</p>
      ) : (
        <div className="dossier-grid">
          {rows.map((d) => (
            <button key={d.id} className="dossier-card" onClick={() => onOpen(d.id)}>
              <strong>{d.name}</strong>
              <div className="card-meta">
                <span className={`chip state-${d.state}`}>{STATE_LABELS[d.state] ?? d.state}</span>
                <span>{d.documents[0]?.count ?? 0} chứng từ</span>
                {(d.crosscheck_alerts[0]?.count ?? 0) > 0 && (
                  <span className="chip alert-chip">🚨 {d.crosscheck_alerts[0].count} cảnh báo</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ============ Chi tiết bộ hồ sơ ============
function Dossier({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<DossierDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hl, setHl] = useState<Highlight | null>(null)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)
  const [exported, setExported] = useState<object | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const refresh = useCallback(() => {
    api.getDossier(id).then(setD).catch((e) => setError(String(e)))
  }, [id])
  useEffect(refresh, [refresh])

  const upload = async (files: File[]) => {
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      await api.uploadFiles(id, files)
      refresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    try {
      await api.editField(editing.id, editing.value)
      setEditing(null)
      refresh()
    } catch (e) {
      setError(String(e))
    }
  }

  const doExport = async () => {
    try {
      setExported(await api.exportDossier(id))
      refresh()
    } catch (e) {
      setError(String(e))
    }
  }

  if (!d) return <p className="hint-center">{error ?? 'Đang tải…'}</p>

  return (
    <>
      <div className="detail-bar">
        <button className="ghost" onClick={onBack}>← Danh sách</button>
        <strong>{d.name}</strong>
        <span className={`chip state-${d.state}`}>{STATE_LABELS[d.state] ?? d.state}</span>
        <span className="spacer" />
        <button onClick={doExport} disabled={!d.documents.length}>🏦 Export core-banking</button>
      </div>

      {error && <div className="banner error">⚠️ {error}</div>}

      {d.crosscheck_alerts.length > 0 && (
        <div className="banner critical">
          {d.crosscheck_alerts.map((a) => (
            <div key={a.id}>
              {a.severity === 'critical' ? '🚨' : '⚠️'} <b>{a.severity.toUpperCase()}</b> — {a.detail}
            </div>
          ))}
        </div>
      )}

      <section
        className={`dropzone slim ${busy ? 'busy' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          upload([...e.dataTransfer.files])
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          hidden
          onChange={(e) => upload([...(e.target.files ?? [])])}
        />
        {busy ? '⏳ Đang trích xuất — Gemini đang đọc từng trang…' : '📄 Thả thêm chứng từ vào đây (PDF/ảnh, chọn được nhiều file)'}
      </section>

      <CustomerProfile docs={d.documents} onPick={setHl} />

      <div className="detail-cols">
        <div className="docs-col">
          {d.documents.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-head">
                <strong>{DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</strong>
                <span className={confidenceClass(doc.doc_type_confidence)}>
                  {(doc.doc_type_confidence * 100).toFixed(0)}%
                </span>
                <span className="file">{doc.filename}</span>
                {doc.extract_ms != null && (
                  <span className="timing" title="Thời gian phân loại + trích xuất">
                    ⏱ {(doc.extract_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {doc.warnings.length > 0 && (
                <div className="banner warn small">
                  {doc.warnings.map((w) => (
                    <div key={w}>⚠️ {w}</div>
                  ))}
                </div>
              )}
              <table>
                <tbody>
                  {doc.fields.map((f: Field) => (
                    <tr
                      key={f.id}
                      className={hl?.label === f.label && hl.docId === doc.id ? 'row-active' : ''}
                      onClick={() =>
                        setHl({ docId: doc.id, mimeType: doc.mime_type, page: f.page, box: f.box_2d, label: f.label })
                      }
                    >
                      <td>{f.label}</td>
                      <td className="value">
                        {editing?.id === f.id ? (
                          <input
                            autoFocus
                            value={editing.value}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditing({ id: f.id, value: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit()
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            onBlur={saveEdit}
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditing({ id: f.id, value: f.value })
                            }}
                            title="Double-click để sửa (human review)"
                          >
                            {f.value} {f.human_reviewed && '✏️'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={confidenceClass(f.confidence)}>
                          {(f.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="src">tr.{f.page}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="viewer-col">
          {hl ? (
            <DocViewer hl={hl} />
          ) : (
            <div className="viewer-empty">👈 Click một trường bất kỳ để soi đúng vị trí của nó trên bản scan gốc</div>
          )}
        </div>
      </div>

      {exported && (
        <div className="modal" onClick={() => setExported(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-head">🏦 Payload gửi core-banking (schema shb.core-banking.loan-intake.v1)</div>
            <pre>{JSON.stringify(exported, null, 2)}</pre>
            <button onClick={() => setExported(null)}>Đóng</button>
          </div>
        </div>
      )}
    </>
  )
}

function App() {
  const [view, setView] = useState<{ page: 'list' } | { page: 'dossier'; id: string }>({ page: 'list' })
  return (
    <main className="shell wide">
      <Header />
      {view.page === 'list' ? (
        <DossierList onOpen={(id) => setView({ page: 'dossier', id })} />
      ) : (
        <Dossier id={view.id} onBack={() => setView({ page: 'list' })} />
      )}
      <footer>
        DocFlow — Vietnam AI Innovation Challenge 2026 · SHB Intelligent Document Processing · team megalondon
      </footer>
    </main>
  )
}

export default App
