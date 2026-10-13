# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "index.html"
t = p.read_text(encoding="utf-8")
stub = (
    "function renderWeeklyBayan(){"
    "if($('#moduleTitle'))$('#moduleTitle').textContent='اس ہفتے کا بیان';"
    "if($('#moduleSub'))$('#moduleSub').textContent='مسودہ اپنے فون پر، شائع سب کے لیے';"
    "if($('#moduleBody'))$('#moduleBody').innerHTML='<div class=\"empty\">لوڈ ہو رہا ہے…</div>'"
    "}"
)
old = "applyPersisted();updateDates();"
if old not in t:
    raise SystemExit("boot not found")
if "function renderWeeklyBayan()" not in t.split("applyPersisted")[0][-200:]:
    # only insert if the stub is not already just before boot
    if stub not in t:
        t = t.replace(old, stub + "\n" + old, 1)

meta = '<meta name="theme-color" content="#0b5c50">'
apple = (
    meta
    + '\n<meta name="apple-mobile-web-app-capable" content="yes">'
    + '\n<meta name="apple-mobile-web-app-title" content="Islamic Saathi">'
)
if "apple-mobile-web-app-capable" not in t:
    if meta not in t:
        raise SystemExit("theme-color not found")
    t = t.replace(meta, apple, 1)

p.write_text(t, encoding="utf-8")
checks = [
    "islamic-saathi-v1",
    "renderWeeklyBayan()",
    "اسلامی ساتھی",
    "saathi.js",
    "وابستہ نہیں",
    "اس ہفتے کا بیان",
    "apple-mobile-web-app-capable",
    "icons/logo.svg",
]
for s in checks:
    print(("OK" if s in t else "MISSING"), s)
