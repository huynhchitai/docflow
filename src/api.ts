export type Field = {
  id: string
  document_id: string
  key: string
  label: string
  value: string
  confidence: number
  page: number
  box_2d: number[] | null // 4 số hoặc bội của 4 (nhiều dòng)
  verified: boolean
  human_reviewed: boolean
}

export type Doc = {
  id: string
  filename: string
  mime_type: string
  doc_type: string
  doc_type_confidence: number
  state: string
  extract_ms?: number | null
  warnings: string[]
  fields: Field[]
}

export type Alert = {
  id: string
  rule: string
  detail: string
  severity: 'info' | 'warning' | 'critical'
}

export type DossierSummary = {
  id: string
  name: string
  state: string
  created_at: string
  documents: { count: number }[]
  crosscheck_alerts: { count: number }[]
}

export type DossierDetail = {
  id: string
  name: string
  state: string
  documents: Doc[]
  crosscheck_alerts: Alert[]
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  loan_application: 'Đơn đề nghị vay vốn',
  financial_statement: 'Báo cáo tài chính',
  credit_contract: 'Hợp đồng tín dụng',
  swift_mt103: 'Điện SWIFT MT103',
  national_id: 'CCCD / Giấy tờ tùy thân',
  other: 'Chứng từ khác',
}

export const STATE_LABELS: Record<string, string> = {
  uploading: 'Chờ hồ sơ',
  extracting: 'Đang trích xuất',
  needs_review: 'Cần kiểm tra',
  done: 'Hoàn tất',
  exported: 'Đã xuất core',
}

async function j<T>(resp: Response): Promise<T> {
  const data = await resp.json()
  if (!resp.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${resp.status}`)
  return data as T
}

export const api = {
  listDossiers: () => fetch('/api/dossiers').then((r) => j<DossierSummary[]>(r)),
  getDossier: (id: string) => fetch(`/api/dossiers/${id}`).then((r) => j<DossierDetail>(r)),
  createDossier: (name: string) =>
    fetch('/api/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then((r) => j<{ id: string }>(r)),
  uploadFiles: (id: string, files: File[]) => {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    return fetch(`/api/dossiers/${id}/files`, { method: 'POST', body: form }).then((r) =>
      j<{ processed: object[]; alerts: Alert[] }>(r),
    )
  },
  editField: (id: string, value: string) =>
    fetch(`/api/fields/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }).then((r) => j<Field>(r)),
  exportDossier: (id: string) =>
    fetch(`/api/dossiers/${id}/export`, { method: 'POST' }).then((r) => j<object>(r)),
  fileUrl: (docId: string) => `/api/documents/${docId}/file`,
}
