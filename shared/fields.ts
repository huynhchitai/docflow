// ============================================================
// TỪ ĐIỂN TRƯỜNG CHUẨN — một nguồn sự thật duy nhất.
// Prompt Gemini, cross-check engine (worker) và UI profile cùng đọc từ đây.
// Quy ước: mọi chứng từ dùng CHUNG một key cho cùng một thông tin
// (vd: số CCCD luôn là `national_id` dù xuất hiện trên đơn vay hay hợp đồng).
// ============================================================

export type NormKind = 'digits' | 'person_name' | 'text_loose'

export type CanonicalField = {
  key: string
  label: string
  /** các cách đặt tên khác mà model có thể lỡ dùng — map về key chuẩn */
  aliases: RegExp
  norm: NormKind
  /** true = sai lệch giữa các chứng từ trong cùng bộ hồ sơ là cảnh báo CRITICAL */
  crosscheck: boolean
  /** true = hiển thị trong thẻ "Thông tin chung khách hàng" */
  profile: boolean
}

export const CANONICAL_FIELDS: CanonicalField[] = [
  { key: 'customer_name', label: 'Họ và tên', aliases: /customer_name|borrower|mortgagor_name|ten_khach/i, norm: 'person_name', crosscheck: true, profile: true },
  { key: 'national_id', label: 'Số CCCD', aliases: /national_id|cccd|cmnd|id_number|so_giay_to/i, norm: 'digits', crosscheck: true, profile: true },
  { key: 'date_of_birth', label: 'Ngày sinh', aliases: /date_of_birth|dob|ngay_sinh|birth/i, norm: 'digits', crosscheck: true, profile: true },
  { key: 'address', label: 'Địa chỉ', aliases: /address|dia_chi/i, norm: 'text_loose', crosscheck: false, profile: true },
  { key: 'phone', label: 'Điện thoại', aliases: /phone|dien_thoai|mobile|sdt/i, norm: 'digits', crosscheck: false, profile: true },
  { key: 'occupation', label: 'Nghề nghiệp', aliases: /occupation|nghe_nghiep|job/i, norm: 'text_loose', crosscheck: false, profile: true },
  { key: 'income', label: 'Thu nhập', aliases: /income|thu_nhap|salary/i, norm: 'digits', crosscheck: false, profile: true },
  { key: 'loan_amount', label: 'Số tiền vay', aliases: /loan_amount|so_tien_vay|amount_secured/i, norm: 'digits', crosscheck: true, profile: false },
  { key: 'loan_term', label: 'Kỳ hạn', aliases: /loan_term|ky_han|term/i, norm: 'digits', crosscheck: true, profile: false },
  { key: 'interest_rate', label: 'Lãi suất', aliases: /interest_rate|lai_suat/i, norm: 'digits', crosscheck: true, profile: false },
  { key: 'collateral', label: 'Tài sản bảo đảm', aliases: /collateral|tai_san/i, norm: 'text_loose', crosscheck: false, profile: false },
]

export function normalize(kind: NormKind, s: string): string {
  switch (kind) {
    case 'digits':
      return s.replace(/\D/g, '')
    case 'person_name':
      return s
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/Đ/g, 'D') // Đ là chữ riêng, NFD không tách được — SWIFT viết "DAT" vs "ĐẠT"
        .replace(/\s+/g, ' ')
        .trim()
    case 'text_loose':
      return s.toLowerCase().replace(/\s+/g, ' ').trim()
  }
}

/** Danh sách key chuẩn nhét vào prompt để model dùng đúng quy ước ngay từ đầu */
export const CANONICAL_KEYS_FOR_PROMPT = CANONICAL_FIELDS.map(
  (f) => `${f.key} (${f.label})`,
).join(', ')
