import { Hono } from 'hono'
import { generateContent, type GeminiEnv } from './gemini'
import { insert, select, update, storageUpload, storageDownload, type DbEnv } from './db'
import { crosscheck, type FieldRow } from './crosscheck'

type Env = GeminiEnv & DbEnv

type ExtractedField = {
  key: string
  label: string
  value: string
  confidence: number
  page: number
  // [ymin,xmin,ymax,xmax] hoặc nhiều box nối tiếp (bội của 4) khi giá trị vắt nhiều dòng
  box_2d?: number[]
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

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'docflow', now: new Date().toISOString() }),
)

const EXTRACTION_PROMPT = `Bạn là hệ thống IDP (Intelligent Document Processing) cho ngân hàng Việt Nam.
Phân tích tài liệu đính kèm và trả về JSON đúng schema sau, không thêm chữ nào khác:
{
  "doc_type": "loan_application | financial_statement | credit_contract | swift_mt103 | national_id | other",
  "doc_type_confidence": 0.0-1.0,
  "fields": [
    {
      "key": "snake_case tên trường (dùng: customer_name, national_id, loan_amount, loan_term, interest_rate, collateral, ... khi phù hợp)",
      "label": "nhãn tiếng Việt",
      "value": "giá trị trích xuất, giữ nguyên định dạng gốc",
      "confidence": 0.0-1.0,
      "page": số trang bắt đầu từ 1,
      "box_2d": [ymin, xmin, ymax, xmax] // tọa độ chuẩn hóa 0-1000, ôm KHÍT phần giá trị.
      // Nếu giá trị nằm vắt qua NHIỀU DÒNG: nối tiếp nhiều box trong cùng mảng,
      // mỗi box ôm khít một dòng: [y1,x1,y2,x2, y1,x1,y2,x2, ...] — đừng vẽ một box to trùm cả đoạn.
    }
  ],
  "warnings": ["cảnh báo nếu thiếu chữ ký/mộc, trang mờ, số liệu bất thường..."]
}
Trích các trường nghiệp vụ quan trọng nhất theo loại chứng từ (tên khách hàng, số CCCD/MST,
số tiền, kỳ hạn, lãi suất, tài sản bảo đảm, các trường MT103 :20:/:32A:/:50K:/:59:...).
Tuyệt đối không bịa: trường không đọc được thì bỏ qua hoặc đưa vào warnings.`

async function fileToB64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

async function extractFile(env: Env, file: File): Promise<ExtractResult> {
  const hasCreds = Boolean(
    (env.GEMINI_PROXY_URL && env.GEMINI_PROXY_KEY) || env.GCP_SERVICE_ACCOUNT_KEY || env.GEMINI_API_KEY,
  )
  if (!hasCreds) {
    return {
      mode: 'mock',
      doc_type: 'loan_application',
      doc_type_confidence: 0.99,
      filename: file.name,
      size_bytes: file.size,
      fields: [
        { key: 'customer_name', label: 'Tên khách hàng', value: 'NGUYỄN VĂN A', confidence: 0.98, page: 1, box_2d: [112, 80, 148, 420] },
        { key: 'national_id', label: 'Số CCCD', value: '079203001234', confidence: 0.95, page: 1, box_2d: [160, 80, 196, 360] },
      ],
      warnings: ['MOCK MODE — chưa cấu hình credentials.'],
    }
  }
  const dataB64 = await fileToB64(file)
  let parsed: Partial<ExtractResult> = {}
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await generateContent(env, {
      model: 'gemini-3-flash-preview',
      mimeType: file.type || 'application/pdf',
      dataB64,
      prompt: EXTRACTION_PROMPT,
    })
    try {
      parsed = JSON.parse(text) as Partial<ExtractResult>
    } catch {
      parsed = {}
    }
    if (parsed.fields?.length) break // Gemini thỉnh thoảng trả rỗng — thử lại 1 lần
  }
  return {
    mode: 'gemini',
    doc_type: parsed.doc_type ?? 'other',
    doc_type_confidence: parsed.doc_type_confidence ?? 0,
    filename: file.name,
    size_bytes: file.size,
    fields: parsed.fields ?? [],
    warnings: parsed.warnings ?? [],
  }
}

// ---- Extract nhanh không lưu (demo đơn lẻ, giữ tương thích UI cũ) ----
app.post('/api/extract', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return c.json({ error: 'Thiếu file' }, 400)
  try {
    return c.json(await extractFile(c.env, file))
  } catch (e) {
    return c.json({ error: 'Extract failed', detail: e instanceof Error ? e.message : String(e) }, 502)
  }
})

// ---- Vòng đời bộ hồ sơ ----
app.post('/api/dossiers', async (c) => {
  const { name } = await c.req.json<{ name?: string }>()
  if (!name?.trim()) return c.json({ error: 'Thiếu tên bộ hồ sơ' }, 400)
  const [dossier] = await insert<{ id: string }>(c.env, 'dossiers', { name: name.trim() })
  return c.json(dossier, 201)
})

app.get('/api/dossiers', async (c) => {
  const rows = await select(
    c.env,
    'dossiers',
    'select=*,documents(count),crosscheck_alerts(count)&order=created_at.desc',
  )
  return c.json(rows)
})

app.get('/api/dossiers/:id', async (c) => {
  const id = c.req.param('id')
  const rows = await select(
    c.env,
    'dossiers',
    `select=*,documents(*,fields(*)),crosscheck_alerts(*)&id=eq.${id}`,
  )
  if (!rows.length) return c.json({ error: 'Không tìm thấy' }, 404)
  return c.json(rows[0])
})

// Upload nhiều file vào dossier → storage → extract → persist → crosscheck
app.post('/api/dossiers/:id/files', async (c) => {
  const dossierId = c.req.param('id')
  const form = await c.req.formData()
  const files = form.getAll('files').filter((f): f is File => f instanceof File)
  if (!files.length) return c.json({ error: 'Thiếu files' }, 400)

  await update(c.env, 'dossiers', `id=eq.${dossierId}`, { state: 'extracting' })
  const results: object[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${dossierId}/${crypto.randomUUID()}.${ext}`
    await storageUpload(c.env, path, await file.arrayBuffer(), file.type || 'application/pdf')
    const [doc] = await insert<{ id: string }>(c.env, 'documents', {
      dossier_id: dossierId,
      filename: file.name,
      storage_path: path,
      mime_type: file.type || 'application/pdf',
      state: 'extracting',
    })
    try {
      const t0 = Date.now()
      const ex = await extractFile(c.env, file)
      const extractMs = Date.now() - t0
      if (ex.fields.length) {
        await insert(
          c.env,
          'fields',
          ex.fields.map((f) => ({
            document_id: doc.id,
            key: f.key,
            label: f.label,
            value: String(f.value ?? ''),
            confidence: f.confidence ?? 0,
            page: f.page ?? 1,
            box_2d: f.box_2d ?? null,
          })),
        )
      }
      const patch = {
        doc_type: ex.doc_type,
        doc_type_confidence: ex.doc_type_confidence,
        state: 'extracted',
        warnings: ex.warnings,
      }
      try {
        await update(c.env, 'documents', `id=eq.${doc.id}`, { ...patch, extract_ms: extractMs })
      } catch {
        // DB chưa chạy migration 0002 (cột extract_ms) — vẫn lưu phần còn lại
        await update(c.env, 'documents', `id=eq.${doc.id}`, patch)
      }
      results.push({ file: file.name, doc_id: doc.id, doc_type: ex.doc_type, fields: ex.fields.length, extract_ms: extractMs, warnings: ex.warnings })
    } catch (e) {
      await update(c.env, 'documents', `id=eq.${doc.id}`, { state: 'failed' })
      results.push({ file: file.name, doc_id: doc.id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  // Cross-check toàn bộ dossier (xóa alert cũ, tính lại)
  const docs = await select<{ id: string; filename: string; doc_type: string }>(
    c.env,
    'documents',
    `select=id,filename,doc_type&dossier_id=eq.${dossierId}`,
  )
  const docIds = docs.map((d) => d.id).join(',')
  const fields = docIds
    ? await select<FieldRow>(c.env, 'fields', `select=id,document_id,key,label,value&document_id=in.(${docIds})`)
    : []
  const labelMap = new Map(docs.map((d) => [d.id, d.filename]))
  const alerts = crosscheck(fields, labelMap)
  await fetch(`${c.env.SUPABASE_URL}/rest/v1/crosscheck_alerts?dossier_id=eq.${dossierId}`, {
    method: 'DELETE',
    headers: { apikey: c.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${c.env.SUPABASE_SECRET_KEY}` },
  })
  if (alerts.length) {
    await insert(c.env, 'crosscheck_alerts', alerts.map((a) => ({ ...a, dossier_id: dossierId })))
  }
  await update(c.env, 'dossiers', `id=eq.${dossierId}`, {
    state: alerts.some((a) => a.severity === 'critical') ? 'needs_review' : 'done',
  })

  return c.json({ processed: results, alerts })
})

// Human review: sửa giá trị field + audit log
app.patch('/api/fields/:id', async (c) => {
  const id = c.req.param('id')
  const { value, actor } = await c.req.json<{ value?: string; actor?: string }>()
  if (value == null) return c.json({ error: 'Thiếu value' }, 400)
  const [old] = await select<{ value: string }>(c.env, 'fields', `select=value&id=eq.${id}`)
  if (!old) return c.json({ error: 'Không tìm thấy field' }, 404)
  const [updated] = await update(c.env, 'fields', `id=eq.${id}`, { value, human_reviewed: true })
  await insert(c.env, 'audit_log', {
    field_id: id,
    actor: actor ?? 'reviewer',
    action: 'field_edit',
    old_value: old.value,
    new_value: value,
  })
  return c.json(updated)
})

// File gốc cho viewer
app.get('/api/documents/:id/file', async (c) => {
  const [doc] = await select<{ storage_path: string; mime_type: string }>(
    c.env,
    'documents',
    `select=storage_path,mime_type&id=eq.${c.req.param('id')}`,
  )
  if (!doc) return c.json({ error: 'Không tìm thấy' }, 404)
  const resp = await storageDownload(c.env, doc.storage_path)
  return new Response(resp.body, {
    headers: { 'Content-Type': doc.mime_type, 'Cache-Control': 'private, max-age=3600' },
  })
})

// Export payload chuẩn core-banking (deliverable SHB)
app.post('/api/dossiers/:id/export', async (c) => {
  const id = c.req.param('id')
  const rows = await select<Record<string, unknown>>(
    c.env,
    'dossiers',
    `select=*,documents(*,fields(*)),crosscheck_alerts(*)&id=eq.${id}`,
  )
  if (!rows.length) return c.json({ error: 'Không tìm thấy' }, 404)
  const d = rows[0] as {
    id: string; name: string
    documents: { doc_type: string; filename: string; fields: { key: string; value: string; confidence: number; human_reviewed: boolean }[] }[]
    crosscheck_alerts: { severity: string; detail: string }[]
  }
  const pick = (key: string) => {
    for (const doc of d.documents) {
      const f = doc.fields.find((f) => f.key === key)
      if (f) return f.value
    }
    return null
  }
  const payload = {
    schema: 'shb.core-banking.loan-intake.v1',
    dossier_id: d.id,
    dossier_name: d.name,
    exported_at: new Date().toISOString(),
    customer: { full_name: pick('customer_name'), national_id: pick('national_id') },
    loan: { amount: pick('loan_amount'), term: pick('loan_term'), interest_rate: pick('interest_rate'), collateral: pick('collateral') },
    documents: d.documents.map((doc) => ({ type: doc.doc_type, filename: doc.filename, field_count: doc.fields.length })),
    review: {
      unresolved_critical_alerts: d.crosscheck_alerts.filter((a) => a.severity === 'critical').length,
      human_reviewed_fields: d.documents.flatMap((x) => x.fields).filter((f) => f.human_reviewed).length,
    },
  }
  await update(c.env, 'dossiers', `id=eq.${id}`, { state: 'exported' })
  return c.json(payload)
})

app.onError((err, c) => c.json({ error: 'Internal error', detail: err.message }, 500))

export default app
