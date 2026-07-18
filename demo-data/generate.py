# -*- coding: utf-8 -*-
"""Sinh 5 bộ hồ sơ tín dụng mẫu (dữ liệu hư cấu) cho demo DocFlow.
Chạy: python3 -m venv venv && venv/bin/pip install fpdf2 && venv/bin/python generate.py
Mỗi bộ một kịch bản: sạch / lệch CCCD / lệch số tiền / lệch kỳ hạn / có SWIFT.
"""
import os
from fpdf import FPDF

OUT = os.path.dirname(os.path.abspath(__file__))
FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"

CUSTOMERS = [
    # (folder, tên, cccd_đơn, cccd_hđ, tiền_đơn, tiền_hđ, kỳ_hạn_đơn, kỳ_hạn_hđ, địa chỉ, mục đích, tsbd, kèm_swift)
    ("bo-02-tran-thi-bao-ngoc", "TRẦN THỊ BẢO NGỌC", "048199003456", "048199003456",
     "800.000.000", "800.000.000", "24 tháng", "24 tháng",
     "25 Lê Duẩn, P. Thạch Thang, Q. Hải Châu, TP. Đà Nẵng",
     "Sửa chữa nhà ở", "Nhà ở riêng lẻ 68m² — GCN CT 445566", False),
    ("bo-03-le-hoang-phuc", "LÊ HOÀNG PHÚC", "049095007788", "049095007788",
     "2.000.000.000", "2.500.000.000", "48 tháng", "48 tháng",
     "102 Nguyễn Hữu Thọ, P. Hòa Thuận Tây, Q. Hải Châu, TP. Đà Nẵng",
     "Mở rộng xưởng sản xuất", "Nhà xưởng 350m² — GCN CX 778899", False),
    ("bo-04-pham-minh-chau", "PHẠM MINH CHÂU", "044087005566", "044087005566",
     "1.200.000.000", "1.200.000.000", "24 tháng", "36 tháng",
     "88 Hàm Nghi, P. Vĩnh Trung, Q. Thanh Khê, TP. Đà Nẵng",
     "Mua ô tô kinh doanh vận tải", "Xe ô tô 16 chỗ — đăng ký 43A-567.89", False),
    ("bo-05-vo-quoc-dat", "VÕ QUỐC ĐẠT", "049091002233", "049091002233",
     "3.500.000.000", "3.500.000.000", "60 tháng", "60 tháng",
     "12 Bạch Đằng, P. Thạch Thang, Q. Hải Châu, TP. Đà Nẵng",
     "Thanh toán hợp đồng nhập khẩu", "Quyền sử dụng đất 200m² — GCN DD 112233", True),
]


class Doc(FPDF):
    def __init__(self):
        super().__init__(format="A4")
        self.add_font("VN", "", FONT)
        self.add_font("VN", "B", FONT)
        self.set_auto_page_break(True, 18)

    def header(self):
        self.set_font("VN", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 5, "NGÂN HÀNG TMCP DEMO — TÀI LIỆU MẪU / DỮ LIỆU HƯ CẤU — CHỈ DÙNG DEMO HACKATHON", align="C")
        self.ln(8)
        self.set_text_color(0, 0, 0)

    def footer(self):
        self.set_y(-14)
        self.set_font("VN", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 5, f"Trang {self.page_no()}", align="C")

    def h1(self, s):
        self.set_font("VN", "B", 14)
        self.multi_cell(0, 8, s, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def h2(self, s):
        self.set_font("VN", "B", 11)
        self.multi_cell(0, 7, s, align="L", new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def p(self, s, h=6.5):
        self.set_font("VN", "", 10.5)
        self.multi_cell(0, h, s, align="L", new_x="LMARGIN", new_y="NEXT")

    def field(self, label, value):
        self.set_font("VN", "", 10.5)
        self.cell(62, 7, label + ":")
        self.set_font("VN", "B", 10.5)
        self.multi_cell(0, 7, value, align="L", new_x="LMARGIN", new_y="NEXT")

    def sign_row(self, left, right):
        self.ln(10)
        self.set_font("VN", "B", 10.5)
        y = self.get_y()
        self.multi_cell(85, 6, left + "\n(Ký, ghi rõ họ tên)", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_xy(115, y)
        self.multi_cell(85, 6, right + "\n(Ký, đóng dấu)", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(14)


def don_vay(c, path):
    (_, ten, cccd, _, tien, _, kyhan, _, diachi, mucdich, tsbd, _) = c
    d = Doc()
    d.add_page()
    d.set_font("VN", "", 10)
    d.cell(0, 6, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", align="C"); d.ln(6)
    d.cell(0, 6, "Độc lập - Tự do - Hạnh phúc", align="C"); d.ln(10)
    d.h1("GIẤY ĐỀ NGHỊ VAY VỐN KIÊM PHƯƠNG ÁN TRẢ NỢ")
    d.h2("I. THÔNG TIN KHÁCH HÀNG")
    d.field("Họ và tên", ten)
    d.field("Số CCCD", cccd)
    d.field("Địa chỉ thường trú", diachi)
    d.field("Điện thoại", "0905 000 000")
    d.h2("II. NỘI DUNG ĐỀ NGHỊ VAY")
    d.field("Số tiền đề nghị vay", f"{tien} đồng")
    d.field("Thời hạn vay", kyhan)
    d.field("Lãi suất đề nghị", "8,5%/năm")
    d.field("Mục đích vay", mucdich)
    d.h2("III. TÀI SẢN BẢO ĐẢM")
    d.field("Mô tả", tsbd)
    d.p("Tôi cam kết các thông tin kê khai trên là đúng sự thật.")
    d.p("Đà Nẵng, ngày 15 tháng 07 năm 2026")
    d.sign_row("NGƯỜI ĐỀ NGHỊ VAY", "XÁC NHẬN CỦA NGÂN HÀNG")
    d.output(path)


def hop_dong(c, path):
    (_, ten, _, cccd_hd, _, tien_hd, _, kyhan_hd, diachi, _, tsbd, _) = c
    d = Doc()
    d.add_page()
    d.h1("HỢP ĐỒNG THẾ CHẤP TÀI SẢN\n(Trích lược)")
    d.h2("BÊN THẾ CHẤP (Bên A):")
    d.field("Ông/Bà", ten)
    d.field("Số CCCD", cccd_hd)
    d.field("Địa chỉ", diachi)
    d.h2("BÊN NHẬN THẾ CHẤP (Bên B):")
    d.field("Ngân hàng", "Ngân hàng TMCP Demo — Chi nhánh Đà Nẵng")
    d.h2("ĐIỀU 1. TÀI SẢN THẾ CHẤP")
    d.p("Bên A đồng ý thế chấp cho Bên B tài sản: " + tsbd + ".")
    d.h2("ĐIỀU 2. NGHĨA VỤ ĐƯỢC BẢO ĐẢM")
    d.p(f"Tài sản bảo đảm cho khoản vay {tien_hd} đồng, thời hạn {kyhan_hd}, lãi suất 8,5%/năm.")
    d.p("Đà Nẵng, ngày 16 tháng 07 năm 2026")
    d.sign_row("BÊN THẾ CHẤP", "BÊN NHẬN THẾ CHẤP")
    d.output(path)


def swift(c, path):
    (_, ten, _, _, _, _, _, _, _, _, _, _) = c
    d = Doc()
    d.add_page()
    d.h1("SWIFT MESSAGE — MT103")
    mt = f""":20:  DMO260716009876
:23B: CRED
:32A: 260716VND3500000000,
:50K: /0987654321098
      {ten.replace('Đ','D')}
      DA NANG, VIETNAM
:52A: DEMOVNVXXXX
:57A: SCBLSGSGXXX
:59:  /SG5898765432109876
      DAI PHAT IMPORT EXPORT PTE LTD
      SINGAPORE
:70:  PAYMENT FOR IMPORT CONTRACT DP-2026-071
:71A: SHA"""
    for line in mt.split("\n"):
        d.set_font("VN", "", 9.5)
        d.multi_cell(0, 5.5, line if line.strip() else " ", align="L", new_x="LMARGIN", new_y="NEXT")
    d.output(path)


for c in CUSTOMERS:
    folder = os.path.join(OUT, c[0])
    os.makedirs(folder, exist_ok=True)
    don_vay(c, os.path.join(folder, "don-de-nghi-vay-von.pdf"))
    hop_dong(c, os.path.join(folder, "hop-dong-the-chap.pdf"))
    if c[11]:
        swift(c, os.path.join(folder, "dien-swift-mt103.pdf"))
    print("✓", c[0])
print("DONE")
