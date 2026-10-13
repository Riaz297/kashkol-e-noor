# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "index.html"
text = p.read_text(encoding="utf-8")

repls = [
    ("<title>کشکولِ نور</title>", "<title>Islamic Saathi • اسلامی ساتھی</title>"),
    ('<link rel="icon" href="data:,">',
     '<link rel="icon" href="icons/logo.svg" type="image/svg+xml">\n'
     '<link rel="apple-touch-icon" href="icons/icon-192.png">\n'
     '<link rel="manifest" href="manifest.webmanifest">'),
    ('/* Kashkol-e-Noor — Islamic content data (Urdu + Arabic) */',
     '/* Islamic Saathi — Islamic content data (Urdu + Arabic) */'),
    ("const STORE_KEY='kashkol-e-noor-v1';",
     "const STORE_KEY='islamic-saathi-v1';const STORE_KEY_OLD='kashkol-e-noor-v1';"),
    ("function loadStore(){try{const raw=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return raw&&typeof raw==='object'?raw:{}}catch(e){return{}}}",
     "function loadStore(){try{let raw=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(!raw)raw=JSON.parse(localStorage.getItem(STORE_KEY_OLD)||'{}');return raw&&typeof raw==='object'?raw:{}}catch(e){return{}}}"),
    ("<h1>قرآنِ کریم</h1><p>انڈوپاک رسم الخط • ترجمہ فتح محمد جالندھری</p>",
     "<h1>قرآنِ کریم</h1><p>عربی متن • ترجمہ فتح محمد جالندھری</p>"),
    ('<b>امام کارنر</b><small>بیان کا منتخب موضوع</small>',
     '<b>اس ہفتے کا بیان</b><small>لکھیں، مسودہ، پھر شائع</small>'),
    ("else if(kind==='imam'){title.textContent='امام کارنر';sub.textContent='جمعہ بیان کے لیے موضوع';const x=CONTENT.imamTopic;body.innerHTML=`<article class=\"imam\"><span class=\"badge\">منتخب موضوع</span><h2>${esc(x.title||x.t||'ہفتہ وار بیان')}</h2><p>${esc(x.summary||x.ur||x.content||'')}</p></article>`}",
     "else if(kind==='imam'){renderWeeklyBayan()}"),
    ('<p class="source-note">بنیادی فیچر دائرہ: <a href="https://play.google.com/store/apps/details?id=com.arshad.rahihijaziurducalender&hl=en" target="_blank" rel="noopener">Google Play پر حوالہ ایپ</a>۔ قرآن: انڈوپاک متن اور فتح محمد جالندھری اردو ترجمہ، تعمیر میں فراہم کردہ مجموعے سے۔</p>',
     '<p class="source-note">Islamic Saathi (اسلامی ساتھی) ایک آزاد منصوبہ ہے۔ Kashkol-e-Urdu یا Rahi Hijazi سے وابستہ نہیں۔ قرآن کا ترجمہ: فتح محمد جالندھری۔ نماز کے اوقات حسابی ہیں؛ مقامی مسجد کے اعلان کو ترجیح دیں۔ فون پر ایپ کی طرح استعمال: براؤزر مینو سے «Add to Home Screen» / «ہوم اسکرین پر شامل کریں»۔</p>'),
]

brand = (
    '<article class="hero"><div class="hero-copy">'
    '<div class="brand-row"><img class="brand-logo" src="icons/logo.svg" alt="">'
    '<div><div class="brand-name">اسلامی ساتھی</div>'
    '<div class="brand-en">Islamic Saathi</div></div></div>'
)
old_hero = '<article class="hero"><div class="hero-copy">'
if old_hero not in text:
    raise SystemExit('hero start not found')
text = text.replace(old_hero, brand, 1)

css_extra = (
    ".brand-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}"
    ".brand-logo{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.08)}"
    ".brand-name{font-size:22px;font-weight:700;line-height:1.3}"
    ".brand-en{font-size:12px;color:#dfece8;font-family:system-ui,sans-serif;letter-spacing:.04em}"
)
marker = "body[data-reading-mode=\"2\"] .ayah-ur{margin-top:8px;font-size:13px}"
if marker not in text:
    raise SystemExit('css marker not found')
text = text.replace(marker, marker + css_extra, 1)

if "</body></html>" not in text:
    raise SystemExit('body end not found')
text = text.replace("</body></html>", '<script src="saathi.js"></script>\n</body></html>', 1)

for a, b in repls:
    if a not in text:
        raise SystemExit('missing snippet: ' + a[:80])
    text = text.replace(a, b, 1)

p.write_text(text, encoding="utf-8")
print("patched", p, "chars", len(text))
