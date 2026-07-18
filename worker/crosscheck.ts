// Đối chiếu chéo các trường giữa các chứng từ trong cùng một bộ hồ sơ.
// Nhóm trường + quy tắc chuẩn hóa lấy từ shared/fields.ts (một nguồn sự thật).

import { CANONICAL_FIELDS, normalize } from '../shared/fields'

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

export function crosscheck(fields: FieldRow[], docLabel: Map<string, string>): Alert[] {
  const alerts: Alert[] = []
  for (const spec of CANONICAL_FIELDS.filter((f) => f.crosscheck)) {
    const hits = fields.filter(
      (f) => (f.key === spec.key || spec.aliases.test(f.key)) && f.value.trim(),
    )
    const byDoc = new Map<string, FieldRow>()
    for (const f of hits) if (!byDoc.has(f.document_id)) byDoc.set(f.document_id, f)
    const entries = [...byDoc.values()]
    if (entries.length < 2) continue
    const canon = normalize(spec.norm, entries[0].value)
    for (const f of entries.slice(1)) {
      const v = normalize(spec.norm, f.value)
      if (v !== canon && canon && v) {
        const d1 = docLabel.get(entries[0].document_id) ?? 'chứng từ 1'
        const d2 = docLabel.get(f.document_id) ?? 'chứng từ 2'
        alerts.push({
          rule: `${spec.key}_mismatch`,
          detail: `${spec.label} không khớp: "${entries[0].value}" (${d1}) ≠ "${f.value}" (${d2})`,
          severity: 'critical',
        })
      }
    }
  }
  return alerts
}
