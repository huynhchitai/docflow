import json, time, unicodedata, urllib.request, statistics, os

BASE = "https://docflow.prismtechemails.workers.dev"
CODE = "megalondon-shb-2026"
DD = "/Users/huynhtai/Developer/docflow/demo-data"
UA = "Mozilla/5.0 (Macintosh) docflow-bench/1.0"

def norm_digits(s): return "".join(ch for ch in str(s) if ch.isdigit())
def norm_name(s):
    s = unicodedata.normalize("NFD", str(s).upper())
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).replace("Đ", "D")
    return " ".join(s.split())

CASES = [
    (f"{DD}/01-don-de-nghi-vay-von.pdf", {
        "customer_name": ("NGUYỄN VĂN AN", norm_name),
        "national_id": ("079088012345", norm_digits),
        "loan_amount": ("1500000000", norm_digits),
        "loan_term": ("36", norm_digits),
        "interest_rate": ("85", norm_digits),
    }),
    (f"{DD}/bo-02-tran-thi-bao-ngoc/don-de-nghi-vay-von.pdf", {
        "customer_name": ("TRẦN THỊ BẢO NGỌC", norm_name),
        "national_id": ("048199003456", norm_digits),
        "loan_amount": ("800000000", norm_digits),
        "loan_term": ("24", norm_digits),
    }),
    (f"{DD}/bo-03-le-hoang-phuc/hop-dong-the-chap.pdf", {
        "customer_name": ("LÊ HOÀNG PHÚC", norm_name),
        "national_id": ("049095007788", norm_digits),
        "loan_amount": ("2500000000", norm_digits),
        "loan_term": ("48", norm_digits),
    }),
    (f"{DD}/bo-05-vo-quoc-dat/dien-swift-mt103.pdf", {
        "customer_name": ("VO QUOC DAT", norm_name),
        "loan_amount": ("3500000000", norm_digits),
    }),
]
ALIASES = {
    "customer_name": ["customer_name","borrower","mortgagor_name","ordering_customer","ten_khach"],
    "national_id": ["national_id","cccd","id_number"],
    "loan_amount": ["loan_amount","amount","so_tien","amount_secured","settled_amount"],
    "loan_term": ["loan_term","term","ky_han"],
    "interest_rate": ["interest_rate","lai_suat"],
}

RUNS = 3
results, times = {}, []
for path, gt in CASES:
    fname = os.path.basename(path)
    for run in range(RUNS):
        data = open(path, "rb").read()
        boundary = "----df%d" % run
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{fname}\"\r\n"
                f"Content-Type: application/pdf\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(f"{BASE}/api/extract", data=body, headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "x-access-code": CODE, "User-Agent": UA})
        t0 = time.time()
        try:
            resp = json.load(urllib.request.urlopen(req, timeout=180))
        except Exception as e:
            print("ERR", fname, e); continue
        dt = time.time() - t0
        times.append(dt)
        fields = {f["key"]: str(f["value"]) for f in resp.get("fields", [])}
        for key, (expected, fn) in gt.items():
            hit = 0
            for alias in ALIASES.get(key, [key]):
                if alias in fields:
                    got, exp = fn(fields[alias]), fn(expected)
                    if got == exp or (exp and exp in got):
                        hit = 1; break
            h, t = results.get(key, (0, 0))
            results[key] = (h + hit, t + 1)
        print(f"  {fname} run{run+1}: {dt:.1f}s, {len(fields)} fields")

print("\n=== KẾT QUẢ ===")
tot_h = tot_t = 0
for k, (h, t) in results.items():
    print(f"{k:<16} {h}/{t}  ({100*h/t:.0f}%)")
    tot_h += h; tot_t += t
print(f"{'TỔNG':<16} {tot_h}/{tot_t}  ({100*tot_h/tot_t:.1f}%)")
print(f"thời gian: mean {statistics.mean(times):.1f}s · p50 {statistics.median(times):.1f}s · max {max(times):.1f}s · n={len(times)}")
json.dump({"results": {k: list(v) for k, v in results.items()}, "times": times}, open("accuracy-raw.json", "w"))
