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
    const r = await fetch(SAATHI_FEED + '?t=' + Date.now(), { cache: 'no-store' });
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
  if ($('#khutbaTitle')) $('#khutbaTitle').value = d.title || '';
  if ($('#khutbaBody')) $('#khutbaBody').value = d.body || '';
  $('#khutbaTitle')?.dataset.edit = id;
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
    const editId = $('#khutbaTitle')?.dataset.edit;
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
