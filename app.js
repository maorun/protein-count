/* ─── Protein Counter App ─────────────────────────────────────────────────── */
'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = { data: 'proteinData', foods: 'foods', settings: 'settings' };
const DEFAULT_GOAL = 160;
const DEFAULT_FOODS = [
  { id: 1, name: 'Egg',                    protein: 6,  favorite: true,  icon: '🥚' },
  { id: 2, name: 'Chicken breast (100g)',   protein: 31, favorite: true,  icon: '🍗' },
  { id: 3, name: 'Greek yogurt (150g)',     protein: 15, favorite: true,  icon: '🫙' },
  { id: 4, name: 'Whey protein shake',      protein: 25, favorite: false, icon: '🥤' },
  { id: 5, name: 'Cottage cheese (100g)',   protein: 11, favorite: false, icon: '🧀' },
  { id: 6, name: 'Tuna (100g)',             protein: 26, favorite: false, icon: '🐟' },
  { id: 7, name: 'Beef (100g)',             protein: 26, favorite: false, icon: '🥩' },
  { id: 8, name: 'Milk (200ml)',            protein: 7,  favorite: false, icon: '🥛' },
];
const EMOJI_OPTIONS = ['🥚','🍗','🥩','🐟','🧀','🥛','🫙','🥜','🍳','🫘','🦐','🥦','🥤','💊','🌮','🍱'];

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  data:     null,   // { date, entries, total }
  foods:    [],
  settings: { dailyGoal: DEFAULT_GOAL },
  showAllFoods: false,
  editingFoodId: null,
  confirmCallback: null,
};

// ── Storage helpers ────────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initData() {
  const stored = load(STORAGE_KEYS.data, null);
  const date = today();
  if (stored && stored.date === date) return stored;
  // New day — fresh slate
  return { date, entries: [], total: 0 };
}

// ── Initialise ─────────────────────────────────────────────────────────────
function init() {
  state.settings = load(STORAGE_KEYS.settings, { dailyGoal: DEFAULT_GOAL });
  state.foods     = load(STORAGE_KEYS.foods, DEFAULT_FOODS);
  state.data      = initData();
  save(STORAGE_KEYS.data, state.data);

  registerSW();
  bindEvents();
  render();
}

// ── Service worker ─────────────────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  renderProgress();
  renderFoods();
  renderLog();
}

function renderProgress() {
  const { total } = state.data;
  const goal = state.settings.dailyGoal;
  const pct = Math.min((total / goal) * 100, 100);

  qs('#progress-current').textContent = total;
  qs('#progress-goal').textContent    = goal;
  const remaining = Math.max(goal - total, 0);
  qs('#progress-remaining').textContent = total >= goal
    ? `🎉 Goal reached! +${total - goal}g extra`
    : `${remaining}g remaining`;

  const fill = qs('#progress-bar-fill');
  fill.style.width = `${pct}%`;
  fill.classList.toggle('over-goal', total >= goal);
  qs('#progress-pct').textContent = `${Math.round(pct)}%`;
}

function renderFoods() {
  const grid = qs('#foods-grid');
  const sorted = [...state.foods].sort((a, b) => {
    if (a.favorite !== b.favorite) return b.favorite - a.favorite;
    return a.name.localeCompare(b.name);
  });
  const hasFavs = sorted.some(f => f.favorite);
  const visible = state.showAllFoods
    ? sorted
    : (hasFavs ? sorted.filter(f => f.favorite) : sorted.slice(0, 6));

  grid.innerHTML = visible.map(f => `
    <button class="food-chip ${f.favorite ? 'is-favorite' : ''}"
            data-id="${f.id}"
            aria-label="Add ${f.name} (${f.protein}g protein)">
      ${f.favorite ? '<span class="food-chip-star">★</span>' : ''}
      <span class="food-chip-icon">${f.icon}</span>
      <span class="food-chip-name">${escHtml(f.name)}</span>
      <span class="food-chip-protein">${f.protein}g</span>
    </button>
  `).join('');

  // Toggle button
  const wrap = qs('#foods-toggle-wrap');
  if (state.foods.length > (hasFavs ? sorted.filter(f => f.favorite).length : 6)) {
    wrap.innerHTML = `<button id="foods-toggle">${state.showAllFoods ? '▲ Show less' : `▼ Show all (${state.foods.length})`}</button>`;
    qs('#foods-toggle').addEventListener('click', () => {
      state.showAllFoods = !state.showAllFoods;
      renderFoods();
    });
  } else {
    wrap.innerHTML = '';
  }
}

function renderLog() {
  const { entries } = state.data;
  const container = qs('#log-list');
  if (!entries.length) {
    container.innerHTML = '<p class="empty-log">No entries yet today. Start logging your protein! 💪</p>';
    return;
  }
  container.innerHTML = [...entries].reverse().map((e, ri) => {
    const realIndex = entries.length - 1 - ri;
    return `
      <div class="log-item" data-index="${realIndex}">
        <span class="log-item-protein">+${e.amount}g</span>
        <span class="log-item-label">${escHtml(e.label || 'Custom')}</span>
        <span class="log-item-time">${e.time}</span>
        <button class="log-item-del" data-index="${realIndex}" aria-label="Remove entry" title="Remove">✕</button>
      </div>`;
  }).join('');
}

// ── Add entry ──────────────────────────────────────────────────────────────
function addEntry(amount, label) {
  amount = Number(amount);
  if (!amount || amount <= 0 || amount > 9999) { showToast('Enter a valid amount (1–9999g)'); return; }

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.data.entries.push({ amount, label: label || 'Custom', time });
  state.data.total += amount;
  save(STORAGE_KEYS.data, state.data);
  render();
  showToast(`+${amount}g added ✓`);
}

function removeEntry(index) {
  const entry = state.data.entries[index];
  if (!entry) return;
  state.data.total = Math.max(0, state.data.total - entry.amount);
  state.data.entries.splice(index, 1);
  save(STORAGE_KEYS.data, state.data);
  render();
  showToast(`Removed ${entry.amount}g`);
}

// ── Food management ────────────────────────────────────────────────────────
function saveFood(food) {
  const existing = state.foods.findIndex(f => f.id === food.id);
  if (existing >= 0) {
    state.foods[existing] = food;
  } else {
    state.foods.push(food);
  }
  save(STORAGE_KEYS.foods, state.foods);
  renderFoods();
  renderManageList();
}

function deleteFood(id) {
  state.foods = state.foods.filter(f => f.id !== id);
  save(STORAGE_KEYS.foods, state.foods);
  renderFoods();
  renderManageList();
}

function toggleFavorite(id) {
  const food = state.foods.find(f => f.id === id);
  if (!food) return;
  food.favorite = !food.favorite;
  save(STORAGE_KEYS.foods, state.foods);
  renderFoods();
  renderManageList();
}

// ── Manage modal ───────────────────────────────────────────────────────────
function renderManageList() {
  const list = qs('#manage-list');
  if (!list) return;
  const sorted = [...state.foods].sort((a, b) => {
    if (a.favorite !== b.favorite) return b.favorite - a.favorite;
    return a.name.localeCompare(b.name);
  });
  list.innerHTML = sorted.map(f => `
    <div class="manage-item" data-id="${f.id}">
      <span class="manage-item-icon">${f.icon}</span>
      <div class="manage-item-info">
        <div class="manage-item-name">${escHtml(f.name)}</div>
        <div class="manage-item-protein">${f.protein}g protein</div>
      </div>
      <div class="manage-item-actions">
        <button class="star-btn ${f.favorite ? 'starred' : ''}" data-action="star" data-id="${f.id}"
                title="${f.favorite ? 'Unfavorite' : 'Favorite'}" aria-label="Toggle favorite">
          ${f.favorite ? '⭐' : '☆'}
        </button>
        <button class="edit-btn" data-action="edit" data-id="${f.id}" title="Edit" aria-label="Edit food">✏️</button>
        <button class="del-btn"  data-action="del"  data-id="${f.id}" title="Delete" aria-label="Delete food">🗑️</button>
      </div>
    </div>`).join('');
}

function openFoodForm(food = null) {
  state.editingFoodId = food ? food.id : null;
  qs('#food-form-title').textContent = food ? 'Edit Food' : 'New Food';
  qs('#food-name').value    = food ? food.name    : '';
  qs('#food-protein').value = food ? food.protein : '';
  setSelectedEmoji(food ? food.icon : EMOJI_OPTIONS[0]);
  openModal('food-form-modal');
}

function setSelectedEmoji(emoji) {
  qs('#selected-emoji').textContent = emoji;
  document.querySelectorAll('.emoji-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.emoji === emoji);
  });
}

// ── Settings ───────────────────────────────────────────────────────────────
function saveSettings() {
  const val = parseInt(qs('#goal-input').value, 10);
  if (!val || val < 1 || val > 9999) { showToast('Enter a valid goal (1–9999)'); return; }
  state.settings.dailyGoal = val;
  save(STORAGE_KEYS.settings, state.settings);
  renderProgress();
  closeModal('settings-modal');
  showToast('Goal updated ✓');
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function openModal(id) {
  const el = qs(`#${id}`);
  el.classList.add('open');
  el.querySelector('.modal')?.scrollTo(0, 0);
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  qs(`#${id}`)?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Confirm helper ─────────────────────────────────────────────────────────
function confirm(message, onConfirm) {
  qs('#confirm-message').textContent = message;
  state.confirmCallback = onConfirm;
  qs('#confirm-backdrop').classList.add('open');
}

// ── Event bindings ─────────────────────────────────────────────────────────
function bindEvents() {
  // Quick-add save button
  qs('#save-btn').addEventListener('click', () => {
    const amount = qs('#protein-amount').value;
    const label  = qs('#protein-label').value.trim();
    addEntry(amount, label || 'Custom');
    qs('#protein-amount').value = '';
    qs('#protein-label').value  = '';
  });

  // Enter key in amount input
  qs('#protein-amount').addEventListener('keydown', e => {
    if (e.key === 'Enter') qs('#save-btn').click();
  });

  // Food chips (delegated)
  qs('#foods-grid').addEventListener('click', e => {
    const chip = e.target.closest('.food-chip');
    if (!chip) return;
    const food = state.foods.find(f => f.id === Number(chip.dataset.id));
    if (food) addEntry(food.protein, food.name);
  });

  // Log delete (delegated)
  qs('#log-list').addEventListener('click', e => {
    const btn = e.target.closest('.log-item-del');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const entry = state.data.entries[index];
    if (!entry) return;
    confirm(`Remove "${entry.label}" (${entry.amount}g)?`, () => removeEntry(index));
  });

  // Settings open
  qs('#settings-btn').addEventListener('click', () => {
    qs('#goal-input').value = state.settings.dailyGoal;
    openModal('settings-modal');
  });

  // Settings save
  qs('#settings-save').addEventListener('click', saveSettings);

  // Reset today
  qs('#reset-btn').addEventListener('click', () => {
    confirm('Reset today\'s protein count to 0?', () => {
      state.data = { date: today(), entries: [], total: 0 };
      save(STORAGE_KEYS.data, state.data);
      render();
      showToast('Counter reset');
    });
  });

  // Manage foods open
  qs('#manage-btn').addEventListener('click', () => {
    renderManageList();
    buildEmojiPicker();
    openModal('manage-modal');
  });

  // Add new food button inside manage modal
  qs('#add-food-btn').addEventListener('click', () => openFoodForm());

  // Manage list delegated events
  qs('#manage-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if (action === 'star') toggleFavorite(id);
    else if (action === 'edit') {
      const food = state.foods.find(f => f.id === id);
      if (food) openFoodForm(food);
    } else if (action === 'del') {
      const food = state.foods.find(f => f.id === id);
      confirm(`Delete "${food?.name}"?`, () => deleteFood(id));
    }
  });

  // Food form save
  qs('#food-form-save').addEventListener('click', () => {
    const name    = qs('#food-name').value.trim();
    const protein = parseInt(qs('#food-protein').value, 10);
    const icon    = qs('#selected-emoji').textContent;
    if (!name)                          { showToast('Enter a food name'); return; }
    if (!protein || protein < 1 || protein > 9999) { showToast('Enter valid protein (1–9999)'); return; }

    const food = {
      id:       state.editingFoodId ?? Date.now(),
      name,
      protein,
      favorite: state.editingFoodId
        ? (state.foods.find(f => f.id === state.editingFoodId)?.favorite ?? false)
        : false,
      icon,
    };
    saveFood(food);
    closeModal('food-form-modal');
    showToast(state.editingFoodId ? 'Food updated ✓' : 'Food added ✓');
  });

  // Emoji picker (delegated, built dynamically)
  qs('#emoji-picker').addEventListener('click', e => {
    const opt = e.target.closest('.emoji-opt');
    if (opt) setSelectedEmoji(opt.dataset.emoji);
  });

  // Confirm modal buttons
  qs('#confirm-ok').addEventListener('click', () => {
    qs('#confirm-backdrop').classList.remove('open');
    if (state.confirmCallback) { state.confirmCallback(); state.confirmCallback = null; }
  });
  qs('#confirm-cancel').addEventListener('click', () => {
    qs('#confirm-backdrop').classList.remove('open');
    state.confirmCallback = null;
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', e => {
      if (e.target === bd) closeModal(bd.id);
    });
  });

  // Close buttons (×)
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal-backdrop').id));
  });

  // Escape key closes top-most modal
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('.modal-backdrop.open');
    if (open) closeModal(open.id);
  });
}

// ── Emoji picker builder ───────────────────────────────────────────────────
function buildEmojiPicker() {
  const picker = qs('#emoji-picker');
  if (picker.children.length) return; // already built
  picker.innerHTML = EMOJI_OPTIONS.map(em =>
    `<button class="emoji-opt" data-emoji="${em}" aria-label="${em}" type="button">${em}</button>`
  ).join('');
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const t = qs('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Util ───────────────────────────────────────────────────────────────────
function qs(sel) { return document.querySelector(sel); }

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
