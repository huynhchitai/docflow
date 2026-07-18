// Đối chiếu chéo các trường giữa các chứng từ trong cùng một bộ hồ sơ.
// Danh sách trường mặc định từ shared/fields.ts; nhận thêm spec tùy chỉnh từ DB.

import { CANONICAL_FIELDS, normalize, type NormKind } from '../shared/fields'

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

export type CheckSpec = {
  key: string
  label: string
  aliases: RegExp
  norm: NormKind
  crosscheck: boolean
}

export function crosscheck(
  fields: FieldRow[],
  docLabel: Map<string, string>,
  specs: CheckSpec[] = CANONICAL_FIELDS,
): Alert[] {
  const alerts: Alert[] = []
  for (const spec of specs.filter((f) => f.crosscheck)) {
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

/** Đối chiếu tên khách KHAI BÁO lúc tạo bộ hồ sơ với tên TRÍCH từ chứng từ */
export function checkDeclaredName(
  declared: string,
  fields: FieldRow[],
  docLabel: Map<string, string>,
): Alert[] {
  const spec = CANONICAL_FIELDS.find((f) => f.key === 'customer_name')!
  const canonDeclared = normalize('person_name', declared)
  if (!canonDeclared) return []
  const alerts: Alert[] = []
  for (const f of fields) {
    if (!(f.key === spec.key || spec.aliases.test(f.key)) || !f.value.trim()) continue
    if (normalize('person_name', f.value) !== canonDeclared) {
      alerts.push({
        rule: 'declared_name_mismatch',
        detail: `Tên trên chứng từ "${f.value}" (${docLabel.get(f.document_id) ?? '?'}) không khớp tên khách khai báo "${declared}"`,
        severity: 'critical',
      })
    }
  }
  return alerts
}
