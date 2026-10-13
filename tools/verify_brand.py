# -*- coding: utf-8 -*-
from pathlib import Path

root = Path(__file__).resolve().parents[1]
t = (root / "index.html").read_text(encoding="utf-8")
out = []
checks = {
    "title": "Islamic Saathi" in t,
    "ur_name": "اسلامی ساتھی" in t,
    "store": "islamic-saathi-v1" in t,
    "saathi_js": "saathi.js" in t,
    "disclaimer": "وابستہ نہیں" in t,
    "weekly": "اس ہفتے کا بیان" in t,
    "logo": "icons/logo.svg" in t,
    "manifest": "manifest.webmanifest" in t,
    "no_play_ref": "rahihijaziurducalender" not in t,
    "imam_fn": "renderWeeklyBayan()" in t,
    "old_title_gone": "<title>کشکولِ نور</title>" not in t,
}
for k, v in checks.items():
    out.append(f"{'OK' if v else 'FAIL'} {k}")
(root / "tools" / "verify_brand.out").write_text("\n".join(out), encoding="utf-8")
