/* Islamic Saathi — brand helpers, weekly bayan, PWA */
const SAATHI_DRAFTS = 'islamic-saathi-drafts';
const SAATHI_PIN = 'islamic-saathi-pin';
const SAATHI_LOCAL_PUB = 'islamic-saathi-published';
const SAATHI_UNLOCK = 'islamic-saathi-unlocked';
const SAATHI_FEED = 'data/khutbas.json';

function saathiRead(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function saathiWrite(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

async function shaPin(pin) {
  const data = new TextEncoder().encode('islamic-saathi:' + pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadKhutbaFeed() {
  let remote = [];
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, 2500);
    const r = await fetch(SAATHI_FEED + '?t=' + Date.now(), { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const j = await r.json();
      remote = Array.isArray(j.items) ? j.items : Array.isArray(j) ? j : [];
    }
  } catch (e) {}
  const local = saathiRead(SAATHI_LOCAL_PUB, []);
  const map = new Map();
  [...remote, ...local].forEach((x) => {
    if (x && x.id) map.set(x.id, x);
  });
  return [...map.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
}

function isPublisherUnlocked() {
  return sessionStorage.getItem(SAATHI_UNLOCK) === '1';
}

async function renderWeeklyBayan() {
  const title = $('#moduleTitle');
  const sub = $('#moduleSub');
  const body = $('#moduleBody');
  title.textContent = 'اس ہفتے کا بیان';
  sub.textContent = 'مسودہ اپنے فون پر، شائع سب کے لیے';
  const items = await loadKhutbaFeed();
  const drafts = saathiRead(SAATHI_DRAFTS, []);
  const hasPin = !!localStorage.getItem(SAATHI_PIN);
  const unlocked = isPublisherUnlocked();
  const latest = items[0];
  let html = '';
  if (latest) {
    html += `<article class="imam"><span class="badge">تازہ ترین بیان</span><h2>${esc(latest.title)}</h2><p>${esc(latest.body)}</p><small>${esc(latest.when || '')}</small></article>`;
  } else {
    html += `<article class="imam"><span class="badge">Islamic Saathi</span><h2>ابھی کوئی بیان شائع نہیں</h2><p>امام صاحب نیا بیان لکھ کر شائع کر سکتے ہیں۔</p></article>`;
  }
  if (items.length > 1) {
    html += `<div class="section-head"><h2>پچھلے بیانات</h2></div><div class="collection-list">${items.slice(1).map((x) => `<details class="content-card"><summary>${esc(x.title)}</summary><div class="urdu khutba-block">${esc(x.body)}</div><small>${esc(x.when || '')}</small></details>`).join('')}</div>`;
  }
  html += `<div class="panel" style="margin-top:16px"><h3>نیا بیان لکھیں</h3>`;
  if (!unlocked) {
    html += hasPin
      ? `<p class="notice">شائع یا مسودہ کے لیے اپنا PIN درج کریں۔</p><input class="field" id="saathiPinInput" type="password" inputmode="numeric" placeholder="PIN" style="width:100%"><div class="toolbar"><button class="primary" onclick="unlockSaathiPublisher()">کھولیں</button></div>`
      : `<p class="notice">پہلی بار ایک خفیہ PIN بنائیں — صرف آپ شائع کر سکیں گے۔</p><input class="field" id="saathiPinInput" type="password" inputmode="numeric" placeholder="نیا PIN (۴ سے ۶ ہندسے)" style="width:100%"><div class="toolbar"><button class="primary" onclick="setSaathiPin()">PIN محفوظ کریں</button></div>`;
  } else {
    html += `<input class="field" id="khutbaTitle" placeholder="عنوان" style="width:100%;margin-bottom:8px"><textarea class="field" id="khutbaBody" placeholder="اردو بیان یہاں لکھیں" style="width:100%;min-height:180px"></textarea><div class="toolbar"><button class="soft-btn" onclick="saveKhutbaDraft()">مسودہ محفوظ</button><button class="primary" onclick="publishKhutba()">شائع کریں</button></div>`;
    if (drafts.length) {
      html += `<div class="section-head"><h2>مسودے (صرف اس فون پر)</h2></div>` + drafts.map((d) => `<div class="content-card"><b>${esc(d.title || 'بدون عنوان')}</b><p class="urdu">${esc((d.body || '').slice(0, 160))}</p><div class="toolbar"><button class="soft-btn" onclick="editKhutbaDraft('${d.id}')">ترمیم</button><button class="text-btn" onclick="deleteKhutbaDraft('${d.id}')">حذف</button><button class="primary" onclick="publishKhutba('${d.id}')">شائع</button></div></div>`).join('');
    }
  }
  html += `</div>`;
  body.innerHTML = html;
}

async function setSaathiPin() {
  const pin = ($('#saathiPinInput')?.value || '').trim();
  if (!/^\d{4,6}$/.test(pin)) { toast('PIN چار سے چھ ہندسوں کا ہو'); return; }
  localStorage.setItem(SAATHI_PIN, await shaPin(pin));
  sessionStorage.setItem(SAATHI_UNLOCK, '1');
  toast('PIN محفوظ ہو گیا');
  renderWeeklyBayan();
}

async function unlockSaathiPublisher() {
  const pin = ($('#saathiPinInput')?.value || '').trim();
  const stored = localStorage.getItem(SAATHI_PIN);
  if (!stored || (await shaPin(pin)) !== stored) { toast('PIN غلط ہے'); return; }
  sessionStorage.setItem(SAATHI_UNLOCK, '1');
  renderWeeklyBayan();
}

function saveKhutbaDraft(id) {
  const title = ($('#khutbaTitle')?.value || '').trim();
  const body = ($('#khutbaBody')?.value || '').trim();
  if (!title && !body) { toast('عنوان یا متن لکھیں'); return; }
  const drafts = saathiRead(SAATHI_DRAFTS, []);
  if (id) {
    const i = drafts.findIndex((d) => d.id === id);
    if (i >= 0) drafts[i] = { ...drafts[i], title, body, at: Date.now() };
  } else {
    drafts.unshift({ id: newId(), title, body, at: Date.now() });
  }
  saathiWrite(SAATHI_DRAFTS, drafts);
  toast('مسودہ اس فون پر محفوظ ہو گیا');
  renderWeeklyBayan();
}

function editKhutbaDraft(id) {
  const d = saathiRead(SAATHI_DRAFTS, []).find((x) => x.id === id);
  if (!d) return;
  const titleEl = $('#khutbaTitle');
  const bodyEl = $('#khutbaBody');
  if (titleEl) titleEl.value = d.title || '';
  if (bodyEl) bodyEl.value = d.body || '';
  if (titleEl) titleEl.dataset.edit = id;
  toast('مسودہ ترمیم کے لیے کھل گیا');
}

function deleteKhutbaDraft(id) {
  saathiWrite(SAATHI_DRAFTS, saathiRead(SAATHI_DRAFTS, []).filter((d) => d.id !== id));
  if (state.page === 'module' && state.moduleKind === 'imam') renderWeeklyBayan();
}

async function publishKhutba(draftId) {
  let title, body;
  if (draftId) {
    const d = saathiRead(SAATHI_DRAFTS, []).find((x) => x.id === draftId);
    if (!d) return;
    title = d.title; body = d.body;
  } else {
    title = ($('#khutbaTitle')?.value || '').trim();
    body = ($('#khutbaBody')?.value || '').trim();
    const editId = $('#khutbaTitle') && $('#khutbaTitle').dataset.edit;
    if (editId) saveKhutbaDraft(editId);
  }
  if (!title || !body) { toast('عنوان اور بیان دونوں لکھیں'); return; }
  const item = {
    id: newId(),
    title,
    body,
    at: Date.now(),
    when: new Intl.DateTimeFormat('ur-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  };
  const published = saathiRead(SAATHI_LOCAL_PUB, []);
  published.unshift(item);
  saathiWrite(SAATHI_LOCAL_PUB, published);
  if (draftId) deleteKhutbaDraft(draftId);
  toast('اس فون پر شائع ہو گیا');
  await renderWeeklyBayan();
}

function registerSaathiPwa() {
  if (!('serviceWorker' in navigator)) return;
  const path = location.pathname.endsWith('/') ? location.pathname : location.pathname.replace(/[^/]+$/, '');
  navigator.serviceWorker.register(path + 'sw.js').catch(() => {});
}
registerSaathiPwa();
if (typeof state !== 'undefined' && state.page === 'module' && state.moduleKind === 'imam') {
  renderWeeklyBayan();
}

const CITY_TZ = {
  'کراچی': 5, 'لاہور': 5, 'اسلام آباد': 5, 'راولپنڈی': 5,
  'فیصل آباد': 5, 'ملتان': 5, 'پشاور': 5, 'کوئٹہ': 5
};

function ensureSaathiCss() {
  if (document.getElementById('saathi-css')) return;
  const s = document.createElement('style');
  s.id = 'saathi-css';
  s.textContent = '.jantri-wrap{overflow:auto;margin-top:8px}.jantri{width:100%;border-collapse:collapse;font-size:12px;direction:ltr;text-align:center}.jantri th,.jantri td{padding:7px 6px;border-bottom:1px solid var(--line);white-space:nowrap}.jantri tr.today{background:var(--surface-2);font-weight:700}.azkaar-tap{margin-top:12px;width:100%}.resume-read{width:100%;margin-bottom:12px}';
  document.head.appendChild(s);
}

(function restoreExtras() {
  if (typeof loadStore !== 'function') return;
  const s = loadStore();
  if (s.lastRead && typeof s.lastRead.n === 'number') state.lastRead = s.lastRead;
  state.azkaarCounts = s.azkaarCounts && typeof s.azkaarCounts === 'object' ? s.azkaarCounts : {};
})();

const _saveStore = saveStore;
saveStore = function () {
  _saveStore();
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    s.lastRead = state.lastRead || null;
    s.azkaarCounts = state.azkaarCounts || {};
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) {}
};

const _changeCity = changeCity;
changeCity = function (name) {
  _changeCity(name);
  state.tz = CITY_TZ[name] != null ? CITY_TZ[name] : Math.round(state.lon / 15);
  saveStore();
  renderPrayers();
};

const _openSurah = openSurah;
openSurah = function (n, verse, opts) {
  _openSurah(n, verse, opts);
  state.lastRead = { n: n, v: verse || 1 };
  saveStore();
  watchAyahs(n);
};

const _closeReader = closeReader;
closeReader = function (opts) {
  _closeReader(opts);
  if (!state.surah) renderSurahs();
};

function watchAyahs(n) {
  if (!window.IntersectionObserver) return;
  const arts = $$('#ayahList .ayah');
  if (!arts.length) return;
  let t = 0;
  const io = new IntersectionObserver(function (entries) {
    const vis = entries.filter(function (e) { return e.isIntersecting; })
      .map(function (e) { return Number((e.target.id || '').split('-')[2]); })
      .filter(Boolean);
    if (!vis.length) return;
    clearTimeout(t);
    t = setTimeout(function () {
      state.lastRead = { n: n, v: Math.min.apply(null, vis) };
      saveStore();
    }, 400);
  }, { threshold: 0.35 });
  arts.forEach(function (a) { io.observe(a); });
}

const _renderSurahs = renderSurahs;
renderSurahs = function () {
  _renderSurahs();
  const old = document.getElementById('resumeReadBar');
  if (old) old.remove();
  const lr = state.lastRead;
  if (!lr || !lr.n || !$('#surahList')) return;
  const s = QURAN.surahs[lr.n - 1];
  if (!s) return;
  const bar = document.createElement('button');
  bar.id = 'resumeReadBar';
  bar.className = 'soft-btn resume-read';
  bar.textContent = 'آخری تلاوت جاری رکھیں — سورۃ ' + s.name + ' • آیت ' + (lr.v || 1);
  bar.onclick = function () { openSurah(lr.n, lr.v || 1); };
  $('#surahList').parentNode.insertBefore(bar, $('#surahList'));
};

const _openCollection = openCollection;
openCollection = function (key, title, opts) {
  _openCollection(key, title, opts);
  if (key !== 'azkaar') return;
  state.azkaarCounts = state.azkaarCounts || {};
  $$('#moduleBody details.content-card').forEach(function (el, i) {
    const item = CONTENT.azkaar[i];
    if (!item) return;
    const need = item.n || 1;
    const k = 'azkaar-' + i;
    const btn = document.createElement('button');
    btn.className = 'primary azkaar-tap';
    btn.setAttribute('dir', 'ltr');
    btn.textContent = (state.azkaarCounts[k] || 0) + ' / ' + need;
    btn.onclick = function (ev) {
      ev.preventDefault();
      let n = (state.azkaarCounts[k] || 0) + 1;
      if (n > need) n = 0;
      state.azkaarCounts[k] = n;
      saveStore();
      btn.textContent = n + ' / ' + need;
      if (n === need) toast('اس ذکر کی گنتی پوری ہو گئی');
    };
    el.appendChild(btn);
  });
};

function foldAr(s) {
  return String(s || '').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u08F0-\u08FF]/g, '');
}

const _runSearch = runSearch;
runSearch = function () {
  const q = ($('#globalSearch') && $('#globalSearch').value || '').trim();
  if (q.length < 2) {
    $('#searchResults').innerHTML = '<div class="empty">کم از کم دو حروف لکھیں</div>';
    return;
  }
  const qFold = foldAr(q);
  const out = [];
  QURAN.surahs.filter(function (s) { return String(s.n) === q || s.name.indexOf(q) !== -1 || foldAr(s.name).indexOf(qFold) !== -1; }).slice(0, 8).forEach(function (s) {
    out.push({ t: 'سورۃ ' + s.name, m: s.verses + ' آیات', fn: 'closeSearch();openSurah(' + s.n + ')' });
  });
  const labels = { duas: 'دعائیں', azkaar: 'اذکار', durood: 'درود', hadith: 'احادیث', rabbana: 'چہل ربّنا', allahumma: 'اللّٰہم دعائیں' };
  ['duas', 'azkaar', 'durood', 'hadith', 'rabbana', 'allahumma'].forEach(function (k) {
    CONTENT[k].forEach(function (x, i) {
      if ((x.t || '').indexOf(q) !== -1 || (x.ur || '').indexOf(q) !== -1 || (x.ar || '').indexOf(q) !== -1) {
        out.push({ t: x.t || (labels[k] + ' ' + (i + 1)), m: (x.ur || '').slice(0, 90), fn: "closeSearch();openCollection('" + k + "','" + labels[k] + "')" });
      }
    });
  });
  let ayahHits = 0;
  const text = QURAN.text || {};
  for (const id in text) {
    if (ayahHits >= 12) break;
    const x = text[id];
    if (!x) continue;
    if ((x.a && (x.a.indexOf(q) !== -1 || foldAr(x.a).indexOf(qFold) !== -1)) || (x.u && x.u.indexOf(q) !== -1)) {
      const parts = id.split(':');
      const n = Number(parts[0]);
      const v = Number(parts[1]);
      const s = QURAN.surahs[n - 1];
      out.push({ t: 'آیت ' + n + ':' + v + (s ? ' — ' + s.name : ''), m: (x.u || x.a || '').slice(0, 90), fn: 'closeSearch();openSurah(' + n + ',' + v + ')' });
      ayahHits++;
    }
  }
  $('#searchResults').innerHTML = out.slice(0, 36).map(function (x) {
    return '<button class="result" onclick="' + x.fn + '"><b>' + esc(x.t) + '</b><small>' + esc(x.m) + '</small></button>';
  }).join('') || '<div class="empty">کوئی نتیجہ نہیں ملا</div>';
};

function buildJantriHtml() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('ur-PK', { month: 'long', year: 'numeric' }).format(now);
  const keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  let rows = '';
  for (let d = 1; d <= last; d++) {
    const dt = new Date(y, m, d);
    const t = prayerTimes(dt);
    const today = d === now.getDate();
    rows += '<tr class="' + (today ? 'today' : '') + '"><td>' + d + '</td>' + keys.map(function (k) {
      return '<td>' + hm(t[k]) + '</td>';
    }).join('') + '</tr>';
  }
  return '<div class="panel" style="margin-top:16px"><h3>اس مہینے کی جنتری</h3><p class="notice" style="margin-top:0">' + esc(monthName) + ' — ' + esc(state.city) + '</p><div class="jantri-wrap"><table class="jantri"><thead><tr><th>تاریخ</th><th>فجر</th><th>ظہر</th><th>عصر</th><th>مغرب</th><th>عشاء</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

const _renderPrayers = renderPrayers;
renderPrayers = function () {
  _renderPrayers();
  const layout = $('#prayerList') && $('#prayerList').closest('.prayer-layout');
  if (!layout) return;
  let box = document.getElementById('jantriBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'jantriBox';
    box.style.gridColumn = '1 / -1';
    layout.appendChild(box);
  }
  box.innerHTML = buildJantriHtml();
};

ensureSaathiCss();
if (state.page === 'quran' && !state.surah) renderSurahs();
if (state.page === 'prayers') renderPrayers();

