# -*- coding: utf-8 -*-
"""Sinh dataset ảnh trang chứng từ từ demo-data cho classifier PyTorch.
4 lớp: loan_application, credit_contract, financial_statement, swift_mt103.
Augmentation: xoay, mờ, nhiễu, sáng/tối, ám vàng, bóng góc — mô phỏng scan/chụp thực tế.
"""
import os, random, glob
import pypdfium2 as pdfium
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw

random.seed(42)
DD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "demo-data")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")

SOURCES = {
    "loan_application": glob.glob(f"{DD}/01-don-de-nghi-vay-von.pdf") + glob.glob(f"{DD}/bo-*/don-de-nghi-vay-von.pdf"),
    "credit_contract": glob.glob(f"{DD}/03-hop-dong-the-chap.pdf") + glob.glob(f"{DD}/bo-*/hop-dong-the-chap.pdf"),
    "financial_statement": glob.glob(f"{DD}/02-bao-cao-tai-chinh.pdf"),
    "swift_mt103": glob.glob(f"{DD}/04-swift-mt103.pdf") + glob.glob(f"{DD}/bo-*/dien-swift-mt103.pdf"),
}
# lớp ít trang gốc thì augment nhiều hơn cho cân bằng
AUG_PER_PAGE = {"loan_application": 30, "credit_contract": 36, "financial_statement": 180, "swift_mt103": 90}


def augment(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    if random.random() < 0.6:
        tint = Image.new("RGB", img.size, (252, 248, 236))
        img = Image.blend(img, tint, random.uniform(0.05, 0.2))
    img = ImageEnhance.Contrast(img).enhance(random.uniform(0.75, 1.15))
    img = ImageEnhance.Brightness(img).enhance(random.uniform(0.8, 1.15))
    img = img.rotate(random.uniform(-4, 4), expand=True, fillcolor=(220, 218, 210))
    if random.random() < 0.7:
        img = img.filter(ImageFilter.GaussianBlur(random.uniform(0.2, 1.4)))
    if random.random() < 0.6:
        d = ImageDraw.Draw(img)
        w, h = img.size
        for _ in range(random.randrange(300, 2500)):
            x, y = random.randrange(w), random.randrange(h)
            g = random.randrange(90, 210)
            d.point((x, y), fill=(g, g, g))
    if random.random() < 0.4:  # crop lệch như chụp thiếu góc
        w, h = img.size
        dx, dy = int(w * random.uniform(0, 0.06)), int(h * random.uniform(0, 0.06))
        img = img.crop((dx, dy, w - int(w * random.uniform(0, 0.06)), h - int(h * random.uniform(0, 0.06))))
    return img


total = 0
for label, files in SOURCES.items():
    outdir = os.path.join(OUT, label)
    os.makedirs(outdir, exist_ok=True)
    n = 0
    for path in files:
        pdf = pdfium.PdfDocument(path)
        for pi, page in enumerate(pdf):
            base = page.render(scale=1.6).to_pil()
            for k in range(AUG_PER_PAGE[label]):
                img = augment(base)
                img.thumbnail((640, 640))
                img.save(os.path.join(outdir, f"{os.path.basename(path)[:-4]}-p{pi}-{k}.jpg"), quality=80)
                n += 1
    print(f"{label}: {n} ảnh")
    total += n
print("TỔNG:", total)
