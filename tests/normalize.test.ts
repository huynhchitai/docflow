import { describe, it, expect } from 'vitest'
import { normalize, CANONICAL_FIELDS } from '../shared/fields'

describe('normalize — digits', () => {
  it('chỉ giữ chữ số, bỏ mọi ký tự khác', () => {
    expect(normalize('digits', '049 091-002.233')).toBe('049091002233')
    expect(normalize('digits', '3.500.000.000 đồng')).toBe('3500000000')
  })
  it('chuỗi không có số → rỗng', () => {
    expect(normalize('digits', 'không rõ')).toBe('')
  })
})

describe('normalize — person_name', () => {
  it('bỏ dấu, viết hoa, gộp khoảng trắng', () => {
    expect(normalize('person_name', '  nguyễn   văn an ')).toBe('NGUYEN VAN AN')
  })
  it('Đ phải thành D — SWIFT viết không dấu (bug thật đã gặp với VÕ QUỐC ĐẠT)', () => {
    expect(normalize('person_name', 'VÕ QUỐC ĐẠT')).toBe('VO QUOC DAT')
    expect(normalize('person_name', 'VO QUOC DAT')).toBe('VO QUOC DAT')
  })
})

describe('normalize — text_loose', () => {
  it('lowercase, giữ dấu tiếng Việt, gộp khoảng trắng', () => {
    expect(normalize('text_loose', 'Đà Nẵng,   Việt Nam')).toBe('đà nẵng, việt nam')
  })
})

describe('từ điển trường chuẩn', () => {
  it('key không trùng nhau', () => {
    const keys = CANONICAL_FIELDS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('alias của chính key phải match key đó', () => {
    for (const f of CANONICAL_FIELDS) expect(f.aliases.test(f.key)).toBe(true)
  })
})
