import { Hono } from 'hono'

type Env = {
  GEMINI_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_SECRET_KEY?: string
}

type ExtractedField = {
  key: string
  label: string
  value: string
  confidence: number
  page: number
  box_2d?: [number, number, number, number] // ymin, xmin, ymax, xmax — chuẩn hóa 0–1000
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
      "key": "snake_case tên trường",
      "label": "nhãn tiếng Việt",
      "value": "giá trị trích xuất, giữ nguyên định dạng gốc",
      "confidence": 0.0-1.0,
      "page": số trang bắt đầu từ 1,
      "box_2d": [ymin, xmin, ymax, xmax] // tọa độ chuẩn hóa 0-1000 trên trang đó
    }
  ],
  "warnings": ["cảnh báo nếu thiếu chữ ký/mộc, trang mờ, số liệu bất thường..."]
}
Trích các trường nghiệp vụ quan trọng nhất theo loại chứng từ (tên khách hàng, số CCCD/MST,
số tiền, kỳ hạn, lãi suất, tài sản bảo đảm, các trường MT103 :20:/:32A:/:50K:/:59:...).
Tuyệt đối không bịa: trường không đọc được thì bỏ qua hoặc đưa vào warnings.`

app.post('/api/extract', async (c) => {
  const form = await c.req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return c.json({ error: 'Thiếu file — gửi multipart/form-data với field "file".' }, 400)
  }

  const { GEMINI_API_KEY } = c.env
  if (!GEMINI_API_KEY) {
    // Chưa cấu hình key → trả kết quả mẫu để UI/pipeline test được end-to-end
    const mock: ExtractResult = {
      mode: 'mock',
      doc_type: 'loan_application',
      doc_type_confidence: 0.99,
      filename: file.name,
      size_bytes: file.size,
      fields: [
        { key: 'customer_name', label: 'Tên khách hàng', value: 'NGUYỄN VĂN A', confidence: 0.98, page: 1, box_2d: [112, 80, 148, 420] },
        { key: 'national_id', label: 'Số CCCD', value: '079203001234', confidence: 0.95, page: 1, box_2d: [160, 80, 196, 360] },
        { key: 'loan_amount', label: 'Số tiền đề nghị vay', value: '1.500.000.000 VND', confidence: 0.93, page: 1, box_2d: [340, 80, 376, 500] },
        { key: 'loan_term', label: 'Kỳ hạn', value: '36 tháng', confidence: 0.9, page: 1, box_2d: [388, 80, 424, 300] },
        { key: 'collateral', label: 'Tài sản bảo đảm', value: 'Căn hộ chung cư — GCN số CS123456', confidence: 0.82, page: 2, box_2d: [220, 80, 290, 700] },
      ],
      warnings: ['MOCK MODE — chưa cấu hình GEMINI_API_KEY, dữ liệu chỉ để demo giao diện.'],
    }
    return c.json(mock)
  }

  // Gemini nhận PDF/ảnh inline (base64)
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  const b64 = btoa(binary)

  const model = 'gemini-2.5-flash'
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: file.type || 'application/pdf', data: b64 } },
              { text: EXTRACTION_PROMPT },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    },
  )

  if (!resp.ok) {
    const detail = await resp.text()
    return c.json({ error: 'Gemini API error', status: resp.status, detail }, 502)
  }

  const data = (await resp.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

  let parsed: Partial<ExtractResult>
  try {
    parsed = JSON.parse(text)
  } catch {
    return c.json({ error: 'Gemini trả về JSON không hợp lệ', raw: text }, 502)
  }

  const result: ExtractResult = {
    mode: 'gemini',
    doc_type: parsed.doc_type ?? 'other',
    doc_type_confidence: parsed.doc_type_confidence ?? 0,
    filename: file.name,
    size_bytes: file.size,
    fields: parsed.fields ?? [],
    warnings: parsed.warnings ?? [],
  }
  return c.json(result)
})

export default app
