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
  type FieldSpec,
  type Stats,
} from './api'
import { DocViewer, type Highlight } from './DocViewer'
import { CANONICAL_FIELDS, normalize } from '../shared/fields'
import { ACCESS_KEY } from './api'
import {
  ArrowLeft, Flame, FolderPlus, Landmark, Pencil,
  Scale, Settings2, Timer, Trash2, User as UserIcon,
} from 'lucide-react'

function confidenceClass(c: number) {
  if (c >= 0.9) return 'conf high'
  if (c >= 0.7) return 'conf mid'
  return 'conf low'
}

// ============ Hồ sơ khách hàng tổng hợp ============
// Danh sách trường + chuẩn hóa: built-in từ shared/fields.ts, cộng thêm custom specs từ API
type ProfileSpec = { name: string; label: string; keys: RegExp; norm: (s: string) => string }

const BUILTIN_PROFILE_SPECS: ProfileSpec[] = CANONICAL_FIELDS.filter((f) => f.profile).map((f) => ({
  name: f.key,
  label: f.label,
  keys: new RegExp(`^${f.key}$|` + f.aliases.source, 'i'),
  norm: (s: string) => normalize(f.norm, s),
}))

function specsFromApi(list: FieldSpec[]): ProfileSpec[] {
  return list
    .filter((f) => f.profile)
    .map((f) => {
      let keys: RegExp
      try {
        keys = new RegExp(`^${f.key}$|` + (f.aliases ?? f.key), 'i')
      } catch {
        keys = new RegExp(`^${f.key}$`, 'i')
      }
      return { name: f.key, label: f.label, keys, norm: (s: string) => normalize(f.norm, s) }
    })
}

type Hit = { field: Field; doc: Doc }

type ProfileEntry = {
  label: string
  value: string
  sources: number
  consistent: boolean
  field: Field
  doc: Doc
  // khi lệch: cặp bằng chứng đầu tiên mâu thuẫn nhau để so sánh cạnh nhau
  conflict?: { a: Hit; b: Hit }
}

function buildProfile(docs: Doc[], specs: ProfileSpec[]): ProfileEntry[] {
  const out: ProfileEntry[] = []
  for (const spec of specs) {
    const hits: Hit[] = []
    for (const doc of docs) {
      const f = doc.fields.find((f) => spec.keys.test(f.key) && f.value.trim())
      if (f) hits.push({ field: f, doc })
    }
    if (!hits.length) continue
    const canon = spec.norm(hits[0].field.value)
    const differing = hits.find((h) => spec.norm(h.field.value) !== canon)
    const consistent = !differing
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
      conflict: differing ? { a: hits[0], b: differing } : undefined,
    })
  }
  return out
}

function CustomerProfile({
  docs,
  onPick,
  onCompare,
}: {
  docs: Doc[]
  onPick: (h: Highlight) => void
  onCompare: (label: string, a: Hit, b: Hit) => void
}) {
  const [specs, setSpecs] = useState<ProfileSpec[]>(BUILTIN_PROFILE_SPECS)
  useEffect(() => {
    api.fieldSpecs().then((list) => setSpecs(specsFromApi(list))).catch(() => {})
  }, [])
  const entries = buildProfile(docs, specs)
  if (!entries.length) return null
  return (
    <div className="profile-card">
      <div className="profile-head">
        <span className="profile-avatar" aria-hidden="true"><UserIcon size={16} /></span>
        <strong>Thông tin chung khách hàng</strong>
        <span className="profile-note">tổng hợp từ {docs.length} chứng từ — click để soi nguồn</span>
      </div>
      <div className="profile-grid">
        {entries.map((e) => (
          <button
            key={e.label}
            className={`profile-item ${e.consistent ? '' : 'mismatch'}`}
            onClick={() =>
              e.conflict
                ? onCompare(e.label, e.conflict.a, e.conflict.b)
                : onPick({
                    docId: e.doc.id,
                    mimeType: e.doc.mime_type,
                    page: e.field.page,
                    box: e.field.box_2d,
                    label: e.label,
                  })
            }
            title={e.consistent ? `Khớp trên ${e.sources} chứng từ` : 'LỆCH — click để so sánh 2 bản gốc cạnh nhau'}
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

// ============ Form tạo / sửa bộ hồ sơ ============
type DossierFormValues = { name: string; customer_name: string; note: string }

function DossierFormModal({
  title,
  initial,
  saving,
  onClose,
  onSave,
}: {
  title: string
  initial: DossierFormValues
  saving: boolean
  onClose: () => void
  onSave: (v: DossierFormValues) => void
}) {
  const [v, setV] = useState(initial)
  const set = (k: keyof DossierFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.value })
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body form-body" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-head">{title}</div>
        <form
          className="dossier-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSave(v)
          }}
        >
          <label>
            Tên khách hàng
            <input value={v.customer_name} onChange={set('customer_name')} placeholder="vd: Nguyễn Văn An" autoFocus />
            <span className="field-hint">Hệ thống sẽ đối chiếu tên này với tên trích từ chứng từ — lệch là cảnh báo.</span>
          </label>
          <label>
            Tên bộ hồ sơ
            <input value={v.name} onChange={set('name')} placeholder="Bỏ trống sẽ tự đặt: Hồ sơ vay · [tên khách]" />
          </label>
          <label>
            Ghi chú
            <input value={v.note} onChange={set('note')} placeholder="vd: vay mua nhà, chi nhánh Đà Nẵng" />
          </label>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={onClose}>Hủy</button>
            <button type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ Danh sách bộ hồ sơ ============
function DossierList({ onOpen, onFields }: { onOpen: (id: string) => void; onFields: () => void }) {
  const [rows, setRows] = useState<DossierSummary[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    api.listDossiers().then(setRows).catch((e) => setError(String(e)))
    api.stats().then(setStats).catch(() => {})
  }, [])
  useEffect(refresh, [refresh])

  const create = async (v: DossierFormValues) => {
    if (creating) return
    const name =
      v.name.trim() ||
      (v.customer_name.trim()
        ? `Hồ sơ vay · ${v.customer_name.trim()}`
        : `Bộ hồ sơ ${new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`)
    setCreating(true)
    setError(null)
    try {
      const { id } = await api.createDossier({ name, customer_name: v.customer_name, note: v.note })
      setShowCreate(false)
      onOpen(id)
    } catch (e) {
      setError(String(e))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {stats && (
        <div className="stats-row">
          <div className="stat"><span className="stat-n">{stats.dossiers_total}</span><span className="stat-l">bộ hồ sơ</span></div>
          <div className="stat"><span className="stat-n">{stats.documents_done}</span><span className="stat-l">chứng từ đã xử lý</span></div>
          <div className="stat"><span className="stat-n">{stats.fields_total}</span><span className="stat-l">trường trích xuất</span></div>
          <div className="stat"><span className="stat-n">{stats.fields_auto_pct}%</span><span className="stat-l">tự động, không sửa tay</span></div>
          <div className="stat"><span className="stat-n">{stats.avg_extract_ms != null ? (stats.avg_extract_ms / 1000).toFixed(1) + 's' : '—'}</span><span className="stat-l">TB / chứng từ</span></div>
          <div className={`stat ${stats.critical_alerts ? 'stat-bad' : ''}`}><span className="stat-n">{stats.critical_alerts ? '🚨 ' : ''}{stats.critical_alerts}</span><span className="stat-l">cảnh báo nghiêm trọng</span></div>
        </div>
      )}

      <div className="list-bar">
        <button onClick={() => setShowCreate(true)}><FolderPlus size={15} /> Tạo bộ hồ sơ</button>
        <span className="spacer" />
        <button className="ghost" onClick={onFields}><Settings2 size={15} /> Trường dữ liệu</button>
      </div>

      {error && <div className="banner error">⚠️ {error}</div>}
      {rows === null ? (
        <p className="hint-center">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="hint-center">Chưa có bộ hồ sơ nào — bấm "+ Tạo bộ hồ sơ" để bắt đầu.</p>
      ) : (
        <div className="dossier-grid">
          {rows.map((d) => (
            <button key={d.id} className="dossier-card" onClick={() => onOpen(d.id)}>
              <strong>{d.name}</strong>
              {d.customer_name && <div className="card-customer">👤 {d.customer_name}</div>}
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

      {showCreate && (
        <DossierFormModal
          title="📁 Tạo bộ hồ sơ mới"
          initial={{ name: '', customer_name: '', note: '' }}
          saving={creating}
          onClose={() => setShowCreate(false)}
          onSave={create}
        />
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
  const [compare, setCompare] = useState<{ label: string; a: Hit; b: Hit } | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
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
        <button className="ghost" onClick={onBack}><ArrowLeft size={15} /> Danh sách</button>
        <strong>{d.name}</strong>
        <span className={`chip state-${d.state}`}>{STATE_LABELS[d.state] ?? d.state}</span>
        <span className="spacer" />
        <button className="ghost" onClick={() => setShowEdit(true)}><Pencil size={15} /> Sửa</button>
        <button
          className="ghost danger"
          onClick={async () => {
            if (!confirm(`Xóa cả bộ hồ sơ "${d.name}" (kèm ${d.documents.length} chứng từ)?`)) return
            await api.deleteDossier(id)
            onBack()
          }}
        >
          <Trash2 size={15} /> Xóa
        </button>
        <button onClick={doExport} disabled={!d.documents.length}><Landmark size={15} /> Export core-banking</button>
      </div>

      {(d.customer_name || d.note) && (
        <p className="dossier-sub">
          {d.customer_name && <>👤 <b>{d.customer_name}</b></>}
          {d.note && <span className="note"> · {d.note}</span>}
        </p>
      )}

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

      <CustomerProfile docs={d.documents} onPick={setHl} onCompare={(label, x, y) => setCompare({ label, a: x, b: y })} />

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
                {doc.classifier_type && (
                  <span className="pytorch-chip" title={`PyTorch router (ResNet18 fine-tune): ${doc.classifier_type}`}>
                    <Flame size={12} /> PyTorch {((doc.classifier_confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                )}
                {doc.extract_ms != null && (
                  <span className="timing" title="Thời gian phân loại + trích xuất">
                    <Timer size={12} /> {(doc.extract_ms / 1000).toFixed(1)}s
                  </span>
                )}
                <button
                  className="ghost small icon-only"
                  title="Xóa chứng từ này"
                  onClick={async () => {
                    if (!confirm(`Xóa chứng từ "${doc.filename}"?`)) return
                    await api.deleteDocument(doc.id)
                    refresh()
                  }}
                >
                  <Trash2 size={14} />
                </button>
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

      {showEdit && (
        <DossierFormModal
          title="✎ Sửa thông tin bộ hồ sơ"
          initial={{ name: d.name, customer_name: d.customer_name ?? '', note: d.note ?? '' }}
          saving={savingEdit}
          onClose={() => setShowEdit(false)}
          onSave={async (v) => {
            setSavingEdit(true)
            try {
              await api.updateDossier(id, { name: v.name || d.name, customer_name: v.customer_name, note: v.note })
              setShowEdit(false)
              refresh()
            } catch (e) {
              setError(String(e))
            } finally {
              setSavingEdit(false)
            }
          }}
        />
      )}

      {compare && (
        <div className="modal" onClick={() => setCompare(null)}>
          <div className="modal-body compare-body" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-head">
              <Scale size={15} /> So sánh nguồn — {compare.label}: "{compare.a.field.value}" ≠ "{compare.b.field.value}"
            </div>
            <div className="compare-grid">
              {[compare.a, compare.b].map((h, i) => (
                <div key={i} className="compare-pane">
                  <div className="compare-label">
                    <span className="file">{h.doc.filename}</span>
                    <span className="compare-value">{h.field.value}</span>
                  </div>
                  <DocViewer
                    hl={{
                      docId: h.doc.id,
                      mimeType: h.doc.mime_type,
                      page: h.field.page,
                      box: h.field.box_2d,
                      label: compare.label,
                    }}
                  />
                </div>
              ))}
            </div>
            <button onClick={() => setCompare(null)}>Đóng</button>
          </div>
        </div>
      )}

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

function AccessGate({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('')
  const [checking, setChecking] = useState(false)
  const [bad, setBad] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || checking) return
    setChecking(true)
    setBad(false)
    const resp = await fetch('/api/dossiers', { headers: { 'x-access-code': code.trim() } })
    setChecking(false)
    if (resp.ok) {
      localStorage.setItem(ACCESS_KEY, code.trim())
      onDone()
    } else {
      setBad(true)
    }
  }
  return (
    <div className="gate">
      <div className="mark big-mark" aria-hidden="true" />
      <h1>
        Doc<span>Flow</span>
      </h1>
      <p className="tagline">Khu vực nghiệp vụ — nhập mã truy cập được cấp để tiếp tục.</p>
      <form className="gate-form" onSubmit={submit}>
        <input
          type="password"
          value={code}
          autoFocus
          placeholder="Mã truy cập"
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" disabled={checking}>
          {checking ? 'Đang kiểm tra…' : 'Vào hệ thống'}
        </button>
      </form>
      {bad && <div className="banner error">⚠️ Mã không đúng — thử lại hoặc liên hệ team OCanbubu.</div>}
    </div>
  )
}

// ============ Cấu hình trường dữ liệu ============
function FieldSpecsPage({ onBack }: { onBack: () => void }) {
  const [list, setList] = useState<FieldSpec[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ label: '', key: '', aliases: '', norm: 'text_loose' as FieldSpec['norm'], crosscheck: false, profile: true })
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    api.fieldSpecs().then(setList).catch((e) => setError(String(e)))
  }, [])
  useEffect(refresh, [refresh])

  const slugify = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await api.addFieldSpec({ ...form, key: form.key.trim() || slugify(form.label) })
      setForm({ label: '', key: '', aliases: '', norm: 'text_loose', crosscheck: false, profile: true })
      refresh()
    } catch (e2) {
      setError(String(e2))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="detail-bar">
        <button className="ghost" onClick={onBack}><ArrowLeft size={15} /> Danh sách</button>
        <strong>Trường dữ liệu</strong>
      </div>
      <p className="tagline">
        AI được phép trích thêm trường ngoài danh sách (tự đặt key snake_case) — chúng hiển thị trong bảng chứng từ.
        Nhưng chỉ trường khai báo ở đây mới được <b>tổng hợp lên thẻ khách hàng</b> và <b>đối chiếu chéo</b>.
        Thêm trường mới có hiệu lực ngay với chứng từ upload sau đó — không cần deploy.
      </p>
      {error && <div className="banner error">⚠️ {error}</div>}

      <form className="spec-form" onSubmit={add}>
        <input value={form.label} placeholder="Nhãn — vd: Mã số thuế" onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <input value={form.key} placeholder={`key: ${form.label ? slugify(form.label) : 'tu_dat_hoac_de_trong'}`} onChange={(e) => setForm({ ...form, key: e.target.value })} />
        <select value={form.norm} onChange={(e) => setForm({ ...form, norm: e.target.value as FieldSpec['norm'] })}>
          <option value="digits">Chỉ giữ chữ số (CCCD, tiền…)</option>
          <option value="person_name">Tên người (bỏ dấu, hoa)</option>
          <option value="text_loose">Chữ tự do</option>
        </select>
        <label className="check"><input type="checkbox" checked={form.crosscheck} onChange={(e) => setForm({ ...form, crosscheck: e.target.checked })} /> Đối chiếu chéo</label>
        <label className="check"><input type="checkbox" checked={form.profile} onChange={(e) => setForm({ ...form, profile: e.target.checked })} /> Lên thẻ khách</label>
        <button type="submit" disabled={saving}>{saving ? '…' : '+ Thêm'}</button>
      </form>

      {list === null ? (
        <p className="hint-center">Đang tải…</p>
      ) : (
        <table className="spec-table">
          <thead>
            <tr><th>Key</th><th>Nhãn</th><th>Chuẩn hóa</th><th>Đối chiếu</th><th>Thẻ khách</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.key} className={f.built_in ? 'builtin' : ''}>
                <td className="value">{f.key}</td>
                <td>{f.label}</td>
                <td className="src">{f.norm}</td>
                <td>{f.crosscheck ? '✅' : '—'}</td>
                <td>{f.profile ? '✅' : '—'}</td>
                <td>
                  {f.built_in ? (
                    <span className="src">built-in</span>
                  ) : (
                    <button className="ghost small" onClick={() => f.id && api.deleteFieldSpec(f.id).then(refresh)}>Xóa</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem(ACCESS_KEY)))
  const [view, setView] = useState<{ page: 'list' } | { page: 'dossier'; id: string } | { page: 'fields' }>({ page: 'list' })
  if (!authed) return <AccessGate onDone={() => setAuthed(true)} />
  return (
    <main className="shell wide">
      <Header />
      {view.page === 'list' ? (
        <DossierList onOpen={(id) => setView({ page: 'dossier', id })} onFields={() => setView({ page: 'fields' })} />
      ) : view.page === 'fields' ? (
        <FieldSpecsPage onBack={() => setView({ page: 'list' })} />
      ) : (
        <Dossier id={view.id} onBack={() => setView({ page: 'list' })} />
      )}
      <footer>
        DocFlow — Vietnam AI Innovation Challenge 2026 · SHB Intelligent Document Processing · team OCanbubu
      </footer>
    </main>
  )
}

export default App
