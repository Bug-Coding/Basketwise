const KEY = 'basketwise.v1';
const PHOTOS = {
  milk: 'images/milk.jpg', eggs: 'images/eggs.jpg', bread: 'images/tomatoes.jpg', rice: 'images/rice.jpg',
  tomatoes: 'images/bread.jpg', potatoes: 'images/potatoes.jpg', bananas: 'images/bananas.jpg', 'cooking oil': 'images/oil.jpg'
};
const COMMON = [
  { name: 'Milk', image: PHOTOS.milk },
  { name: 'Eggs', image: PHOTOS.eggs },
  { name: 'Bread', image: PHOTOS.bread },
  { name: 'Rice', image: PHOTOS.rice },
  { name: 'Tomatoes', image: PHOTOS.tomatoes },
  { name: 'Potatoes', image: PHOTOS.potatoes },
  { name: 'Bananas', image: PHOTOS.bananas },
  { name: 'Cooking oil', image: PHOTOS['cooking oil'] }
];
const UNIT_CONFIG = {
  milk: { unit: 'L', options: ['L', 'ml'] }, eggs: { unit: 'pcs', options: ['pcs', 'dozen'] },
  bread: { unit: 'pack', options: ['pack', 'pcs'] }, rice: { unit: 'kg', options: ['kg', 'g'] },
  tomatoes: { unit: 'kg', options: ['kg', 'g'] }, potatoes: { unit: 'kg', options: ['kg', 'g'] },
  bananas: { unit: 'kg', options: ['kg', 'pcs'] }, 'cooking oil': { unit: 'L', options: ['L', 'ml'] }
};
const SOURCE_CATALOG = Array.isArray(window.INDIAN_GROCERY_CATALOG) ? window.INDIAN_GROCERY_CATALOG : [];
const freshState = () => ({ items: [], savings: [], theme: 'light', bucketPosition: null });
let state;
try { state = { ...freshState(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { state = freshState(); }
state.items = Array.isArray(state.items) ? state.items : [];
state.savings = Array.isArray(state.savings) ? state.savings : [];
state.items.forEach(item => { if (!item.unit) item.unit = (UNIT_CONFIG[item.name.toLowerCase()] || {}).unit || 'pcs'; });
const $ = id => document.getElementById(id);
const save = () => localStorage.setItem(KEY, JSON.stringify(state));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const quantities = new Map();
const selectedUnits = new Map();
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2300); }
function getQuantity(key) { return quantities.get(key) || 1; }
function unitConfig(item) {
  if (UNIT_CONFIG[item.name.toLowerCase()]) return UNIT_CONFIG[item.name.toLowerCase()];
  const pack = String(item.packSize || '').toLowerCase();
  if (/\b(kg|g)\b/.test(pack)) return { unit: /\bkg\b/.test(pack) ? 'kg' : 'g', options: ['kg', 'g'] };
  if (/\b(l|ml)\b/.test(pack)) return { unit: /\bml\b/.test(pack) ? 'ml' : 'L', options: ['L', 'ml'] };
  return { unit: item.unit || 'pack', options: ['pack', 'pcs'] };
}
function getUnit(item, key) { return selectedUnits.get(key) || unitConfig(item).unit; }
function unitPicker(item, key) {
  const config = unitConfig(item), selected = getUnit(item, key);
  return `<select class="quantity-unit" data-unit-for="${escapeHtml(key)}" aria-label="Unit for ${escapeHtml(item.name)}">${config.options.map(unit => `<option value="${escapeHtml(unit)}"${unit === selected ? ' selected' : ''}>${escapeHtml(unit)}</option>`).join('')}</select>`;
}
function renderCommon() {
  $('productGrid').className = 'product-grid common-grid';
  $('productGrid').innerHTML = COMMON.map((item, index) => {
    const qty = getQuantity(`common-${item.name}`);
    return `<article class="common-card"><div class="common-photo"><img src="${item.image}" alt="${escapeHtml(item.name)}"><button class="photo-add-button" data-common-add="${escapeHtml(item.name)}">Add to list</button></div><div class="common-card-bottom"><h3>${escapeHtml(item.name)}</h3><div class="common-quantity"><span>Quantity</span>${unitPicker(item, `common-${item.name}`)}<div class="stepper"><button data-step="common-${escapeHtml(item.name)}" data-delta="-1" aria-label="Decrease ${escapeHtml(item.name)} quantity">−</button><output>${qty}</output><button data-step="common-${escapeHtml(item.name)}" data-delta="1" aria-label="Increase ${escapeHtml(item.name)} quantity">＋</button></div></div></div></article>`;
  }).join('');
  $('catalogTitle').textContent = 'Common groceries';
  $('searchResults').textContent = '';
  $('noResults').hidden = true;
}
function getCombinedCatalog() {
  const all = [...SOURCE_CATALOG];
  for (const common of COMMON) {
    if (!all.some(item => item.name.toLowerCase() === common.name.toLowerCase())) {
      all.push({ name: common.name, category: 'Common groceries', hindi: '', local: '', packSize: '' });
    }
  }
  const photoByName = new Map(COMMON.map(item => [item.name.toLowerCase(), item.image]));
  return all.map(item => ({ ...item, image: photoByName.get(item.name.toLowerCase()) || '' }));
}
function renderSearch(query) {
  const text = query.trim();
  const needle = text.toLocaleLowerCase();
  if (!needle) { renderCommon(); return; }
  const found = getCombinedCatalog().filter(item => [item.name, item.hindi, item.local, item.category].some(value => String(value || '').toLocaleLowerCase().includes(needle)));
  $('catalogTitle').textContent = 'Search results';
  $('searchResults').textContent = found.length ? `${found.length} ${found.length === 1 ? 'item' : 'items'}` : 'No match in the grocery list';
  $('noResults').hidden = true;
  $('productGrid').className = 'product-grid search-grid';
  const exactMatch = found.some(item => [item.name, item.hindi, item.local].some(value => String(value || '').trim().toLocaleLowerCase() === needle));
  const resultCards = found.map((item, index) => {
    const key = `catalog-${item.name}`; const qty = getQuantity(key);
    return `<article class="search-item-card">${item.image ? `<img class="search-item-photo" src="${item.image}" alt="${escapeHtml(item.name)}">` : `<div class="search-item-mark" aria-hidden="true">${escapeHtml(item.name.slice(0,1).toUpperCase())}</div>`}<div class="search-item-info"><h3>${escapeHtml(item.name)}</h3><p class="search-item-local">${escapeHtml([item.hindi, item.local].filter(Boolean).join(' · '))}</p><p class="search-item-pack">${escapeHtml(item.packSize || item.category)}</p></div><div class="search-item-actions">${unitPicker(item, key)}<div class="stepper"><button data-step="${escapeHtml(key)}" data-delta="-1" aria-label="Decrease ${escapeHtml(item.name)} quantity">−</button><output>${qty}</output><button data-step="${escapeHtml(key)}" data-delta="1" aria-label="Increase ${escapeHtml(item.name)} quantity">＋</button></div><button class="search-add-button" data-result-add="${index}">Add to list</button></div></article>`;
  }).join('');
  const customKey = `custom-${needle}`;
  const customItem = { name: text };
  const customCard = exactMatch ? '' : `<article class="search-item-card custom-item-card"><div class="custom-item-plus" aria-hidden="true">＋</div><div class="search-item-info"><h3>Add “${escapeHtml(text)}”</h3><p class="search-item-local">Create a new grocery item</p></div><div class="search-item-actions">${unitPicker(customItem, customKey)}<div class="stepper"><button data-step="${escapeHtml(customKey)}" data-delta="-1" aria-label="Decrease quantity">−</button><output>${getQuantity(customKey)}</output><button data-step="${escapeHtml(customKey)}" data-delta="1" aria-label="Increase quantity">＋</button></div><button class="search-add-button" data-custom-add>Add to list</button></div></article>`;
  $('productGrid').innerHTML = resultCards + customCard;
  $('productGrid')._foundItems = found;
}
function addItem(item, quantity, unit = getUnit(item, `catalog-${item.name}`)) {
  const existing = state.items.find(row => row.name.toLowerCase() === item.name.toLowerCase() && (row.packSize || '') === (item.packSize || '') && (row.unit || '') === unit);
  if (existing) existing.quantity = Number(existing.quantity || 0) + quantity;
  else state.items.push({ id: crypto.randomUUID(), name: item.name, quantity, packSize: item.packSize || '', unit, local: item.local || '', hindi: item.hindi || '', image: item.image || '' });
  save(); renderBucket();
  $('itemSearch').value = '';
  renderSearch('');
  toast(`${item.name} added to your list`);
}
function renderBucket() {
  const count = state.items.reduce((n, item) => n + Math.max(0, Number(item.quantity) || 1), 0);
  $('bucketCount').textContent = count;
  $('bucketDialogCount').textContent = `(${count})`;
  $('bucketItems').innerHTML = state.items.map(item => `<div class="bucket-row">${item.image ? `<img class="bucket-item-photo" src="${item.image}" alt="">` : '<span class="bucket-row-icon" aria-hidden="true">🛒</span>'}<div class="bucket-row-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml([item.local || item.hindi, item.packSize].filter(Boolean).join(' · '))}</small></div><div class="bucket-row-quantity"><button data-change="${item.id}" data-delta="-1" aria-label="Decrease ${escapeHtml(item.name)} quantity">−</button><span>${escapeHtml(item.quantity)} ${escapeHtml(item.unit || 'pcs')}</span><button data-change="${item.id}" data-delta="1" aria-label="Increase ${escapeHtml(item.name)} quantity">＋</button></div><button class="bucket-remove" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">×</button></div>`).join('');
  $('bucketEmpty').style.display = state.items.length ? 'none' : 'block';
  $('bucketFoot').style.display = state.items.length ? 'flex' : 'none';
}
function renderSavings() {
  $('savingLogEmpty').style.display = state.savings.length ? 'none' : 'block';
  $('savingLogEntries').innerHTML = state.savings.map(item => `<div class="saving-log-row"><span>✳</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.date || '')}</small><b>Saved ${escapeHtml(item.amount)}</b></div>`).join('');
}
function applyTheme() {
  document.documentElement.dataset.theme = state.theme === 'dark' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#212121' : '#f7f7f8');
  $('themeToggle').setAttribute('aria-label', `Switch to ${state.theme === 'dark' ? 'light' : 'dark'} mode`);
  $('themeToggle').innerHTML = `<span class="theme-icon">${state.theme === 'dark' ? '☀' : '☾'}</span><span class="theme-text">${state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>`;
}
function render() { renderSearch($('itemSearch').value); renderBucket(); renderSavings(); applyTheme(); }
function openBucket() { $('bucketDialog').showModal(); }
$('itemSearch').addEventListener('input', event => renderSearch(event.target.value));
$('productGrid').addEventListener('click', event => {
  const step = event.target.closest('[data-step]');
  if (step) {
    const key = step.dataset.step; quantities.set(key, Math.max(1, getQuantity(key) + Number(step.dataset.delta)));
    renderSearch($('itemSearch').value); return;
  }
  const commonButton = event.target.closest('[data-common-add]');
  if (commonButton) {
    const item = COMMON.find(row => row.name === commonButton.dataset.commonAdd);
    addItem(item, getQuantity(`common-${item.name}`), getUnit(item, `common-${item.name}`)); return;
  }
  const resultButton = event.target.closest('[data-result-add]');
  if (resultButton) {
    const item = $('productGrid')._foundItems?.[Number(resultButton.dataset.resultAdd)];
    if (item) addItem(item, getQuantity(`catalog-${item.name}`), getUnit(item, `catalog-${item.name}`));
    return;
  }
  if (event.target.closest('[data-custom-add]')) {
    const name = $('itemSearch').value.trim();
    if (name) addItem({ name }, getQuantity(`custom-${name.toLocaleLowerCase()}`), getUnit({ name }, `custom-${name.toLocaleLowerCase()}`));
  }
});
$('productGrid').addEventListener('change', event => {
  const picker = event.target.closest('[data-unit-for]');
  if (picker) selectedUnits.set(picker.dataset.unitFor, picker.value);
});
const bucketButton = $('openBucket');
let suppressBucketClick = false;
let dragStart = null;
function clampBucketPosition(left, top) {
  const margin = 12;
  return {
    left: Math.max(margin, Math.min(left, window.innerWidth - bucketButton.offsetWidth - margin)),
    top: Math.max(margin, Math.min(top, window.innerHeight - bucketButton.offsetHeight - margin))
  };
}
function setBucketPosition(left, top, persist = true) {
  const point = clampBucketPosition(left, top);
  bucketButton.style.left = `${point.left}px`;
  bucketButton.style.top = `${point.top}px`;
  bucketButton.style.right = 'auto';
  bucketButton.style.bottom = 'auto';
  if (persist) { state.bucketPosition = point; save(); }
}
if (state.bucketPosition && Number.isFinite(state.bucketPosition.left) && Number.isFinite(state.bucketPosition.top)) {
  requestAnimationFrame(() => setBucketPosition(state.bucketPosition.left, state.bucketPosition.top, false));
}
bucketButton.addEventListener('pointerdown', event => {
  if (event.button !== undefined && event.button !== 0) return;
  const rect = bucketButton.getBoundingClientRect();
  dragStart = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
  bucketButton.setPointerCapture(event.pointerId);
});
bucketButton.addEventListener('pointermove', event => {
  if (!dragStart) return;
  const dx = event.clientX - dragStart.x, dy = event.clientY - dragStart.y;
  if (!dragStart.moved && Math.hypot(dx, dy) < 5) return;
  dragStart.moved = true;
  bucketButton.classList.add('dragging');
  setBucketPosition(dragStart.left + dx, dragStart.top + dy, false);
});
function finishBucketDrag() {
  if (!dragStart) return;
  if (dragStart.moved) {
    const rect = bucketButton.getBoundingClientRect();
    setBucketPosition(rect.left, rect.top);
    suppressBucketClick = true;
    setTimeout(() => { suppressBucketClick = false; }, 250);
  }
  dragStart = null;
  bucketButton.classList.remove('dragging');
}
bucketButton.addEventListener('pointerup', finishBucketDrag);
bucketButton.addEventListener('pointercancel', finishBucketDrag);
bucketButton.addEventListener('click', event => {
  if (suppressBucketClick) { event.preventDefault(); event.stopPropagation(); return; }
  openBucket();
});
window.addEventListener('resize', () => {
  if (state.bucketPosition) setBucketPosition(state.bucketPosition.left, state.bucketPosition.top, false);
});
$('closeBucket').onclick = () => $('bucketDialog').close();
$('browseGroceries').onclick = () => { $('bucketDialog').close(); $('itemSearch').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
$('bucketItems').addEventListener('click', event => {
  const button = event.target.closest('[data-change]');
  if (button) {
    const item = state.items.find(row => row.id === button.dataset.change);
    if (item) item.quantity = Math.max(0, Number(item.quantity) + Number(button.dataset.delta));
    state.items = state.items.filter(row => Number(row.quantity) > 0); save(); renderBucket(); return;
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) { state.items = state.items.filter(row => row.id !== remove.dataset.remove); save(); renderBucket(); }
});
$('clearBucket').onclick = () => { if (!state.items.length) return; state.items = []; save(); renderBucket(); toast('List cleared'); };
$('themeToggle').onclick = () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; save(); applyTheme(); };
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('itemSearch').focus(); } });
document.querySelectorAll('[data-close], .modal-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
function openSaving() { $('savingForm').reset(); $('savingDialog').showModal(); }
$('addDealTop').onclick = openSaving;
$('savingForm').addEventListener('submit', event => {
  event.preventDefault(); const form = event.currentTarget; const regular = Number(form.elements.regular.value), paid = Number(form.elements.paid.value);
  if (paid > regular) { toast('Price paid must not exceed the regular price'); return; }
  state.savings.unshift({ id: crypto.randomUUID(), name: form.elements.name.value.trim(), regular, paid, amount: (regular - paid).toFixed(2), date: new Date().toLocaleDateString() });
  save(); renderSavings(); $('savingDialog').close(); toast('Saving logged');
});
render();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}
