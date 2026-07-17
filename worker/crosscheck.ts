// Đối chiếu chéo các trường giữa các chứng từ trong cùng một bộ hồ sơ.
// Đây là khác biệt cạnh tranh chính của DocFlow — xem .claude/ARCHITECTURE.md mục 3.

export type FieldRow = {
  id: string
  document_id: string
  key: string
  label: string
  value: string
}

export type Alert = {
  rule: string
  detail: string
  severity: 'info' | 'warning' | 'critical'
}

const digits = (s: string) => s.replace(/\D/g, '')
const norm = (s: string) =>
  s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Các nhóm key coi là "cùng một thông tin" giữa các loại chứng từ
const GROUPS: { name: string; keys: RegExp; compare: (s: string) => string; label: string }[] = [
  { name: 'national_id', keys: /cccd|national_id|id_number/i, compare: digits, label: 'Số CCCD' },
  { name: 'loan_amount', keys: /loan_amount|amount|so_tien/i, compare: digits, label: 'Số tiền vay' },
  { name: 'customer_name', keys: /customer_name|borrower|ten_khach|mortgagor_name/i, compare: norm, label: 'Tên khách hàng' },
  { name: 'loan_term', keys: /term|ky_han/i, compare: digits, label: 'Kỳ hạn' },
]

export function crosscheck(fields: FieldRow[], docLabel: Map<string, string>): Alert[] {
  const alerts: Alert[] = []
  for (const g of GROUPS) {
    const hits = fields.filter((f) => g.keys.test(f.key) && f.value.trim())
    const byDoc = new Map<string, FieldRow>()
    for (const f of hits) if (!byDoc.has(f.document_id)) byDoc.set(f.document_id, f)
    const entries = [...byDoc.values()]
    if (entries.length < 2) continue
    const canon = g.compare(entries[0].value)
    for (const f of entries.slice(1)) {
      if (g.compare(f.value) !== canon && canon && g.compare(f.value)) {
        const d1 = docLabel.get(entries[0].document_id) ?? 'chứng từ 1'
        const d2 = docLabel.get(f.document_id) ?? 'chứng từ 2'
        alerts.push({
          rule: `${g.name}_mismatch`,
          detail: `${g.label} không khớp: "${entries[0].value}" (${d1}) ≠ "${f.value}" (${d2})`,
          severity: 'critical',
        })
      }
    }
  }
  return alerts
}
