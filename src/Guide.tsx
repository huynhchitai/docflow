import { useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Check, Copy, FileUp, ScanSearch, ShieldAlert, PencilLine, Landmark, Settings2, Flame, TerminalSquare,
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

// Mini-demo: mô phỏng click-to-highlight — khung highlight ĐO vị trí thật của chữ trong DOM
const DEMO_FIELDS = [
  { key: 'name', label: 'Họ và tên', value: 'NGUYỄN VĂN AN', conf: 98 },
  { key: 'cccd', label: 'Số CCCD', value: '079088012345', conf: 95 },
  { key: 'amount', label: 'Số tiền vay', value: '1.500.000.000 đồng', conf: 100 },
  { key: 'collateral', label: 'Tài sản bảo đảm', value: 'Căn hộ B12-08 Sunrise Riverside', conf: 82 },
]

function MiniDemo() {
  const [active, setActive] = useState(1)
  const paperRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ top: number; left: number; w: number; h: number } | null>(null)

  const measure = (key: string) => {
    const paper = paperRef.current
    const el = paper?.querySelector<HTMLElement>(`[data-demo="${key}"]`)
    if (!paper || !el) return
    const p = paper.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setBox({ top: r.top - p.top - 3, left: r.left - p.left - 5, w: r.width + 10, h: r.height + 6 })
  }

  useLayoutEffect(() => {
    measure(DEMO_FIELDS[active].key)
    const onResize = () => measure(DEMO_FIELDS[active].key)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [active])

  return (
    <div className="minidemo">
      <div className="minidemo-fields">
        <p className="minidemo-hint">Click một trường — khung cam nhảy đúng chỗ trên "bản scan":</p>
        {DEMO_FIELDS.map((d, i) => (
          <button
            key={d.key}
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
        <div className="minidemo-paper" ref={paperRef}>
          <div className="mp-title">GIẤY ĐỀ NGHỊ VAY VỐN</div>
          <div className="mp-line"><b>Họ và tên:</b> <span data-demo="name">NGUYỄN VĂN AN</span></div>
          <div className="mp-line"><b>Số CCCD:</b> <span data-demo="cccd">079088012345</span></div>
          <div className="mp-line mp-dim">Địa chỉ: Số 12 Trần Phú, Hải Châu, Đà Nẵng</div>
          <div className="mp-line"><b>Số tiền vay:</b> <span data-demo="amount">1.500.000.000 đồng</span></div>
          <div className="mp-line mp-dim">Thời hạn: 36 tháng · Lãi suất: 8,5%/năm</div>
          <div className="mp-line"><b>TSBĐ:</b> <span data-demo="collateral">Căn hộ B12-08 Sunrise Riverside</span>,<br />GCN QSDĐ số CS 123456</div>
          {box && (
            <div
              className="hl-box"
              style={{ top: box.top, left: box.left, height: box.h, width: box.w }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Setup full: từng khối lệnh copy được ----
const SETUP_STEPS: { title: string; desc: string; code: string }[] = [
  {
    title: 'Clone & cài đặt',
    desc: 'Cần Node 22+ và pnpm.',
    code: 'git clone https://github.com/huynhchitai/docflow\ncd docflow\npnpm install',
  },
  {
    title: 'Cấu hình Supabase',
    desc: 'Tạo project Supabase → dán lần lượt các file supabase/migrations/*.sql vào SQL Editor → tạo bucket "scans" (private). Rồi điền secrets:',
    code: 'cp .env.example .dev.vars\n# điền SUPABASE_URL + SUPABASE_SECRET_KEY (service_role)',
  },
  {
    title: 'Deploy Cloud Run proxy (Vertex AI + PyTorch router)',
    desc: 'Chạy bằng service account ADC — không cần key file. Model đã có sẵn tại gcp-proxy/model.pt (muốn train lại: training/make_dataset.py + train.py).',
    code: 'gcloud services enable aiplatform.googleapis.com run.googleapis.com artifactregistry.googleapis.com\ngcloud iam service-accounts create docflow-vertex\ngcloud projects add-iam-policy-binding $PROJECT --member serviceAccount:docflow-vertex@$PROJECT.iam.gserviceaccount.com --role roles/aiplatform.user\ncd gcp-proxy\ndocker build --platform linux/amd64 -t $REGION-docker.pkg.dev/$PROJECT/docflow/gemini-proxy:v1 . && docker push $REGION-docker.pkg.dev/$PROJECT/docflow/gemini-proxy:v1\ngcloud run deploy docflow-gemini-proxy --image $REGION-docker.pkg.dev/$PROJECT/docflow/gemini-proxy:v1 --service-account docflow-vertex@$PROJECT.iam.gserviceaccount.com --allow-unauthenticated --memory 1Gi --set-env-vars PROXY_KEY=$RANDOM_SECRET,GCP_LOCATION=global',
  },
  {
    title: 'Deploy Cloudflare Worker + web',
    desc: 'GEMINI_PROXY_URL đặt trong wrangler.jsonc (vars); các secret đẩy bằng wrangler.',
    code: 'npx wrangler secret put SUPABASE_URL\nnpx wrangler secret put SUPABASE_SECRET_KEY\nnpx wrangler secret put GEMINI_PROXY_KEY\nnpx wrangler secret put ACCESS_CODE\npnpm build && npx wrangler deploy',
  },
  {
    title: '(Tùy chọn) Gắn domain riêng',
    desc: 'Zone phải nằm trong cùng tài khoản Cloudflare. Thêm vào wrangler.jsonc rồi deploy lại:',
    code: '"routes": [{ "pattern": "docflow.example.com", "custom_domain": true }]',
  },
]

function SetupSection() {
  const [copied, setCopied] = useState<number | null>(null)
  return (
    <div className="setup-steps">
      {SETUP_STEPS.map((s, i) => (
        <div key={s.title} className="setup-step">
          <h4>{i + 1}. {s.title}</h4>
          <p>{s.desc}</p>
          <div className="setup-code">
            <pre>{s.code.split('\\n').join('\n')}</pre>
            <button
              className="ghost small"
              onClick={async () => {
                await navigator.clipboard.writeText(s.code.split('\\n').join('\n'))
                setCopied(i)
                setTimeout(() => setCopied(null), 1500)
              }}
            >
              {copied === i ? <><Check size={13} /> Đã copy</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
        </div>
      ))}
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

      <h3 className="guide-h3"><TerminalSquare size={17} /> Tự triển khai từ đầu (setup full)</h3>
      <SetupSection />

      <div className="guide-cta">
        <button onClick={onBack}>Vào dùng thật →</button>
      </div>
    </>
  )
}
