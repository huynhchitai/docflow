import { describe, it, expect } from 'vitest'
import { crosscheck, checkDeclaredName, type FieldRow } from '../worker/crosscheck'

const row = (document_id: string, key: string, value: string): FieldRow => ({
  id: `${document_id}-${key}`,
  document_id,
  key,
  label: key,
  value,
})

const labels = new Map([
  ['d1', 'đơn vay'],
  ['d2', 'hợp đồng'],
])

describe('crosscheck — đối chiếu chéo giữa chứng từ', () => {
  it('CCCD lệch giữa hai chứng từ → cảnh báo critical (kịch bản demo chính)', () => {
    const alerts = crosscheck(
      [row('d1', 'national_id', '049091002345'), row('d2', 'national_id', '049091002346')],
      labels,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0].rule).toBe('national_id_mismatch')
    expect(alerts[0].severity).toBe('critical')
  })

  it('cùng giá trị nhưng khác định dạng → KHÔNG cảnh báo (so sánh sau chuẩn hóa)', () => {
    const alerts = crosscheck(
      [row('d1', 'national_id', '049 091 002 345'), row('d2', 'national_id', '049091002345')],
      labels,
    )
    expect(alerts).toHaveLength(0)
  })

  it('tên có dấu và không dấu (SWIFT) → KHÔNG cảnh báo', () => {
    const alerts = crosscheck(
      [row('d1', 'customer_name', 'VÕ QUỐC ĐẠT'), row('d2', 'customer_name', 'VO QUOC DAT')],
      labels,
    )
    expect(alerts).toHaveLength(0)
  })

  it('trường chỉ xuất hiện trên một chứng từ → không có gì để đối chiếu', () => {
    expect(crosscheck([row('d1', 'loan_amount', '3500000000')], labels)).toHaveLength(0)
  })

  it('alias của model (cccd) vẫn được gom về national_id để đối chiếu', () => {
    const alerts = crosscheck(
      [row('d1', 'cccd', '111'), row('d2', 'national_id', '222')],
      labels,
    )
    expect(alerts.some((a) => a.rule === 'national_id_mismatch')).toBe(true)
  })
})

describe('checkDeclaredName — tên khai báo vs tên trên giấy', () => {
  it('tên khai báo khớp (chỉ khác dấu/hoa thường) → không cảnh báo', () => {
    const alerts = checkDeclaredName(
      'võ quốc đạt',
      [row('d1', 'customer_name', 'VÕ QUỐC ĐẠT')],
      labels,
    )
    expect(alerts).toHaveLength(0)
  })

  it('tên khai báo lệch tên trên chứng từ → declared_name_mismatch', () => {
    const alerts = checkDeclaredName(
      'Nguyễn Văn An',
      [row('d1', 'customer_name', 'VÕ QUỐC ĐẠT')],
      labels,
    )
    expect(alerts).toHaveLength(1)
    expect(alerts[0].rule).toBe('declared_name_mismatch')
    expect(alerts[0].severity).toBe('critical')
  })

  it('không khai báo tên → bỏ qua, không cảnh báo oan', () => {
    expect(checkDeclaredName('', [row('d1', 'customer_name', 'X')], labels)).toHaveLength(0)
  })
})
