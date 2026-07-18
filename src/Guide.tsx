import { useState } from 'react'
import {
  ArrowLeft, FileUp, ScanSearch, ShieldAlert, PencilLine, Landmark, Settings2, Flame,
} from 'lucide-react'

// ============ Hướng dẫn sử dụng tương tác ============
// Không gọi API — xem được TRƯỚC khi đăng nhập (giám khảo vào là hiểu ngay sản phẩm).

const STEPS = [
  {
    icon: FileUp,
    title: '1 · Thả cả bộ hồ sơ vào',
    body: 'Tạo bộ hồ sơ (khai tên khách hàng), rồi kéo-thả nhiều file PDF/ảnh một lúc — đơn vay, hợp đồng, BCTC, điện SWIFT. Scan điện thoại nghiêng mờ vẫn đọc được. Các file xử lý song song.',
    tip: 'Tên khách khai báo sẽ được đối chiếu với tên trích từ chứng từ — lệch là cảnh báo ngay.',
  },
  {
    icon: Flame,
    title: '2 · PyTorch phân loại → Gemini trích xuất',
    body: 'Bộ phân loại PyTorch (ResNet18 fine-tune) nhận diện loại chứng từ trong ~0,2 giây, định tuyến schema rồi Gemini trên Vertex AI trích từng trường kèm độ tin cậy và tọa độ nguồn. Trung bình 26 giây/chứng từ, dưới 500đ/bộ.',
    tip: 'Chip 🔥 PyTorch và đồng hồ ⏱ trên mỗi chứng từ là số đo thật, không phải trang trí.',
  },
  {
    icon: ScanSearch,
    title: '3 · Click một trường — soi đúng nguồn',
    body: 'Click bất kỳ trường nào, bản scan gốc mở đúng trang và khoanh cam đúng vị trí con số đó — giá trị vắt nhiều dòng thì khoanh từng dòng. AI không được phép nói mà không chỉ tay.',
    tip: 'Thử ở mini-demo bên dưới 👇',
  },
  {
    icon: ShieldAlert,
    title: '4 · Hệ thống tự bắt mâu thuẫn',
    body: 'CCCD, số tiền, kỳ hạn… lệch nhau giữa các chứng từ là banner đỏ CRITICAL. Click ô ⚠️ LỆCH trong thẻ khách hàng — hai bản gốc mở cạnh nhau để đối chất.',
    tip: 'Đối chiếu chạy bằng rule thuần theo từ điển trường chuẩn — deterministic, giải thích được từng cảnh báo.',
  },
  {
    icon: PencilLine,
    title: '5 · Người duyệt, máy ghi vết',
    body: 'Double-click để sửa giá trị sai — trường đã sửa hiện ✏️, mọi thay đổi vào audit log (ai, lúc nào, cũ → mới). Trường tin cậy thấp tự đánh vàng/đỏ chờ duyệt.',
    tip: 'Triết lý: AI đọc — code đối chiếu — người quyết định.',
  },
  {
    icon: Landmark,
    title: '6 · Export core-banking',
    body: 'Một nút — nhận payload JSON chuẩn CIF (Customer Information File) kèm cash-flow, nhắm core Intellect của SHB qua adapter. Không đụng core.',
    tip: 'Có cả nhóm trường tự cấu hình (⚙️) — nghiệp vụ thêm "Mã số thuế" trong 10 giây, không cần deploy.',
  },
]

// Mini-demo: mô phỏng click-to-highlight trên "bản scan" vẽ bằng HTML
const DEMO_FIELDS: { label: string; value: string; conf: number; box: [number, number, number, number] }[] = [
  { label: 'Họ và tên', value: 'NGUYỄN VĂN AN', conf: 98, box: [24, 34, 9, 40] },
  { label: 'Số CCCD', value: '079088012345', conf: 95, box: [37, 34, 8, 32] },
  { label: 'Số tiền vay', value: '1.500.000.000 đồng', conf: 100, box: [58, 34, 8, 44] },
  { label: 'Tài sản bảo đảm', value: 'Căn hộ B12-08 Sunrise Riverside', conf: 82, box: [71, 34, 16, 58] },
]

function MiniDemo() {
  const [active, setActive] = useState(1)
  const f = DEMO_FIELDS[active]
  return (
    <div className="minidemo">
      <div className="minidemo-fields">
        <p className="minidemo-hint">Click một trường — khung cam nhảy đúng chỗ trên "bản scan":</p>
        {DEMO_FIELDS.map((d, i) => (
          <button
            key={d.label}
            className={`minidemo-field ${i === active ? 'on' : ''}`}
            onClick={() => setActive(i)}
          >
            <span className="profile-label">{d.label}</span>
            <span className="profile-value">{d.value}</span>
            <span className={`conf ${d.conf >= 90 ? 'high' : d.conf >= 70 ? 'mid' : 'low'}`}>{d.conf}%</span>
          </button>
        ))}
      </div>
      <div className="minidemo-doc" aria-hidden="true">
        <div className="minidemo-paper">
          <div className="mp-title">GIẤY ĐỀ NGHỊ VAY VỐN</div>
          <div className="mp-line"><b>Họ và tên:</b> NGUYỄN VĂN AN</div>
          <div className="mp-line"><b>Số CCCD:</b> 079088012345</div>
          <div className="mp-line mp-dim">Địa chỉ: Số 12 Trần Phú, Hải Châu, Đà Nẵng</div>
          <div className="mp-line"><b>Số tiền vay:</b> 1.500.000.000 đồng</div>
          <div className="mp-line mp-dim">Thời hạn: 36 tháng · Lãi suất: 8,5%/năm</div>
          <div className="mp-line"><b>TSBĐ:</b> Căn hộ B12-08 Sunrise Riverside,<br />GCN QSDĐ số CS 123456</div>
          <div
            className="hl-box"
            style={{
              top: `${f.box[0]}%`,
              left: `${f.box[1]}%`,
              height: `${f.box[2]}%`,
              width: `${f.box[3]}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export function Guide({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(0)
  const S = STEPS[step]
  const Icon = S.icon
  return (
    <>
      <div className="detail-bar">
        <button className="ghost" onClick={onBack}><ArrowLeft size={15} /> Quay lại</button>
        <strong>Hướng dẫn sử dụng</strong>
      </div>

      <div className="guide-hero">
        <div className="guide-stat"><span className="stat-n">95%</span><span className="stat-l">field trích đúng</span></div>
        <div className="guide-stat"><span className="stat-n">26s</span><span className="stat-l">median / chứng từ</span></div>
        <div className="guide-stat"><span className="stat-n">&lt;500đ</span><span className="stat-l">chi phí AI / bộ hồ sơ</span></div>
        <div className="guide-stat"><span className="stat-n">0</span><span className="stat-l">số liệu bịa — mọi trường có nguồn</span></div>
      </div>

      <div className="guide-steps" role="tablist" aria-label="Các bước sử dụng">
        {STEPS.map((s, i) => {
          const I = s.icon
          return (
            <button
              key={s.title}
              role="tab"
              aria-selected={i === step}
              className={`guide-step ${i === step ? 'on' : ''}`}
              onClick={() => setStep(i)}
              title={s.title}
            >
              <I size={17} />
            </button>
          )
        })}
      </div>
      <div className="guide-detail">
        <h3><Icon size={18} /> {S.title}</h3>
        <p>{S.body}</p>
        <p className="guide-tip">💡 {S.tip}</p>
        <div className="guide-nav">
          <button className="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>← Trước</button>
          <span className="src">{step + 1} / {STEPS.length}</span>
          <button disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Tiếp →</button>
        </div>
      </div>

      <h3 className="guide-h3"><ScanSearch size={17} /> Thử ngay tại chỗ — mô phỏng soi nguồn</h3>
      <MiniDemo />

      <h3 className="guide-h3"><Settings2 size={17} /> Câu hỏi nhanh</h3>
      <div className="guide-faq">
        <details>
          <summary>Sản phẩm có bịa số liệu không?</summary>
          <p>Không — theo thiết kế. Trường AI không đọc được sẽ bỏ trống + cảnh báo, không đoán. Mọi giá trị đều kèm tọa độ nguồn trên bản gốc và độ tin cậy; tin cậy thấp phải qua người duyệt.</p>
        </details>
        <details>
          <summary>Cảnh báo lệch hoạt động thế nào?</summary>
          <p>Rule thuần TypeScript đối chiếu theo từ điển trường chuẩn (CCCD chỉ giữ chữ số, tên bỏ dấu + Đ→D…). Không dùng model để phán — bộ phận bắt sai lệch mà cũng dùng AI thì chính nó có thể sai lệch.</p>
        </details>
        <details>
          <summary>Thêm trường mới có cần dev không?</summary>
          <p>Không. Vào ⚙️ Trường dữ liệu → thêm nhãn, chọn kiểu chuẩn hóa, tick đối chiếu chéo. Có hiệu lực ngay với chứng từ upload sau đó — prompt AI tự cập nhật.</p>
        </details>
        <details>
          <summary>Tích hợp core banking kiểu gì?</summary>
          <p>Payload JSON chuẩn CIF, versioned, bắn qua adapter/ESB đứng trước core (SHB chạy Intellect từ 2010). Nguyên tắc tích hợp hệ thống cũ: không bao giờ đụng core.</p>
        </details>
        <details>
          <summary>Dữ liệu demo có thật không?</summary>
          <p>Toàn bộ hư cấu, có watermark "TÀI LIỆU MẪU", cài sẵn lỗi lệch CCCD/số tiền/kỳ hạn để trình diễn cảnh báo. Không có PII thật nào trong hệ thống.</p>
        </details>
      </div>

      <div className="guide-cta">
        <button onClick={onBack}>Vào dùng thật →</button>
      </div>
    </>
  )
}
