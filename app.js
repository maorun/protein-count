/* ─── Protein Counter App ─────────────────────────────────────────────────── */
'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEYS = { data: 'proteinData', foods: 'foods', settings: 'settings', history: 'proteinHistory' };
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
  settings: { dailyGoal: DEFAULT_GOAL, theme: 'dark', bodyWeight: null },
  history:  [],     // [{ date, total, goal }, …] up to 90 entries
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
  // New day — archive previous day to history before resetting
  if (stored) pushToHistory(stored);
  return { date, entries: [], total: 0 };
}

// ── History helpers ────────────────────────────────────────────────────────
function pushToHistory(dayData) {
  if (!dayData || !dayData.date) return;
  const entry = { date: dayData.date, total: dayData.total || 0, goal: state.settings.dailyGoal };
  const idx = state.history.findIndex(h => h.date === dayData.date);
  if (idx >= 0) {
    state.history[idx] = entry;
  } else {
    state.history.push(entry);
  }
  state.history.sort((a, b) => a.date.localeCompare(b.date));
  while (state.history.length > 90) state.history.shift();
  save(STORAGE_KEYS.history, state.history);
}

function calculateStreak() {
  // Build a fast lookup including today's live data
  const histMap = {};
  state.history.forEach(h => { histMap[h.date] = h; });
  histMap[state.data.date] = { date: state.data.date, total: state.data.total, goal: state.settings.dailyGoal };

  let streak = 0;
  const d = new Date();
  while (true) {
    const dateStr = d.toISOString().slice(0, 10);
    const entry = histMap[dateStr];
    if (!entry || entry.total < entry.goal) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ── Initialise ─────────────────────────────────────────────────────────────
function init() {
  state.settings = load(STORAGE_KEYS.settings, { dailyGoal: DEFAULT_GOAL, theme: 'dark', bodyWeight: null });
  // Fill in any settings keys added after initial install
  state.settings.theme      = state.settings.theme      ?? 'dark';
  state.settings.bodyWeight = state.settings.bodyWeight ?? null;
  state.history  = load(STORAGE_KEYS.history, []);
  state.foods    = load(STORAGE_KEYS.foods, DEFAULT_FOODS);
  state.data     = initData();
  save(STORAGE_KEYS.data, state.data);

  applyTheme(state.settings.theme);
  registerSW();
  bindEvents();
  render();
}

// ── Theme ──────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
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
  const pct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;

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
  qs('#progress-bar-track').setAttribute('aria-valuenow', Math.round(pct));

  const streak = calculateStreak();
  const streakEl = qs('#streak-badge');
  if (streakEl) {
    if (streak > 0) {
      streakEl.textContent = streak === 1 ? `🔥 1 day streak` : `🔥 ${streak} day streak`;
      streakEl.style.display = '';
    } else {
      streakEl.textContent = '';
      streakEl.style.display = 'none';
    }
  }
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

  const theme = qs('#theme-select').value;
  state.settings.theme = theme;
  applyTheme(theme);

  const weightVal = parseInt(qs('#weight-input').value, 10);
  state.settings.bodyWeight = (weightVal >= 30 && weightVal <= 300) ? weightVal : null;

  save(STORAGE_KEYS.settings, state.settings);
  renderProgress();
  closeModal('settings-modal');
  showToast('Settings saved ✓');
}

// ── Export ─────────────────────────────────────────────────────────────────
function exportData(format) {
  // Merge history with today's live data
  const allHistory = state.history.filter(h => h.date !== state.data.date);
  if (state.data.total > 0 || state.data.entries.length > 0) {
    allHistory.push({ date: state.data.date, total: state.data.total, goal: state.settings.dailyGoal });
  }
  allHistory.sort((a, b) => a.date.localeCompare(b.date));

  if (format === 'json') {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      history: allHistory,
      foods: state.foods,
    };
    downloadFile(JSON.stringify(payload, null, 2), 'protein-data.json', 'application/json');
  } else {
    const header = 'Date,Total (g),Goal (g),Met Goal\n';
    const rows = allHistory.map(r =>
      `${r.date},${r.total},${r.goal},${r.total >= r.goal ? 'Yes' : 'No'}`
    ).join('\n');
    downloadFile(header + rows, 'protein-data.csv', 'text/csv');
  }
  showToast('Data exported ✓');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── History modal ──────────────────────────────────────────────────────────
function renderHistoryModal() {
  const streak = calculateStreak();
  qs('#history-streak').textContent = streak > 0
    ? (streak === 1 ? `🔥 1 day streak` : `🔥 ${streak} day streak`)
    : 'No streak yet — hit your goal today!';
  drawHistoryChart();
}

function drawHistoryChart() {
  const canvas = qs('#history-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.parentElement.clientWidth || 320;
  const H   = 180;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  // Build last 7 days data
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const isToday = dateStr === state.data.date;
    let total = 0;
    let goal  = state.settings.dailyGoal;
    if (isToday) {
      total = state.data.total;
    } else {
      const hist = state.history.find(h => h.date === dateStr);
      if (hist) { total = hist.total; goal = hist.goal; }
    }
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    days.push({ dayName, total, goal, isToday });
  }

  const maxVal = Math.max(...days.map(d => Math.max(d.total, d.goal)), 1);
  const pad    = { top: 24, right: 12, bottom: 36, left: 38 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barGap = chartW / days.length;
  const barW   = barGap * 0.6;

  ctx.clearRect(0, 0, W, H);

  // Read CSS variables for colours
  const cs     = getComputedStyle(document.documentElement);
  const green  = cs.getPropertyValue('--green-400').trim()  || '#34d399';
  const orange = cs.getPropertyValue('--warning').trim()    || '#fbbf24';
  const muted  = cs.getPropertyValue('--text-muted').trim() || '#94a3b8';
  const text   = cs.getPropertyValue('--text').trim()       || '#f1f5f9';
  const border = cs.getPropertyValue('--border').trim()     || '#475569';

  // Grid lines + Y-axis labels
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const val  = Math.round((maxVal / ySteps) * i);
    const y    = pad.top + chartH - (val / maxVal) * chartH;
    ctx.save();
    ctx.strokeStyle = border;
    ctx.lineWidth   = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle   = muted;
    ctx.font        = '10px system-ui, sans-serif';
    ctx.textAlign   = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(val + 'g', pad.left - 4, y);
  }

  // Goal dashed line
  const goalY = pad.top + chartH - (state.settings.dailyGoal / maxVal) * chartH;
  ctx.save();
  ctx.strokeStyle = orange;
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(pad.left, goalY);
  ctx.lineTo(pad.left + chartW, goalY);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle   = orange;
  ctx.font        = '9px system-ui, sans-serif';
  ctx.textAlign   = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Goal', pad.left + 2, goalY - 3);

  // Bars
  days.forEach((day, i) => {
    const x    = pad.left + i * barGap + (barGap - barW) / 2;
    const barH = day.total > 0 ? Math.max((day.total / maxVal) * chartH, 2) : 0;
    const y    = pad.top + chartH - barH;
    const r    = Math.min(4, barW / 2);
    const barColor = day.total >= day.goal ? green : (day.isToday ? '#60a5fa' : muted);

    if (barH > 0) {
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, pad.top + chartH);
      ctx.lineTo(x, pad.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
    }

    // Value label
    if (day.total > 0) {
      ctx.fillStyle    = text;
      ctx.font         = '9px system-ui, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(day.total + 'g', x + barW / 2, y - 3);
    }

    // Day label
    ctx.fillStyle    = day.isToday ? text : muted;
    ctx.font         = day.isToday ? 'bold 10px system-ui, sans-serif' : '10px system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(day.dayName, x + barW / 2, H - pad.bottom + 14);
  });
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

  // Quick +5g / +10g buttons
  qs('#quick-add-5').addEventListener('click', () => addEntry(5, 'Quick +5g'));
  qs('#quick-add-10').addEventListener('click', () => addEntry(10, 'Quick +10g'));

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
    qs('#goal-input').value   = state.settings.dailyGoal;
    qs('#theme-select').value = state.settings.theme || 'dark';
    qs('#weight-input').value = state.settings.bodyWeight || '';
    openModal('settings-modal');
  });

  // Settings save
  qs('#settings-save').addEventListener('click', saveSettings);

  // Body-weight goal calculator
  qs('#calc-goal-btn').addEventListener('click', () => {
    const w = parseInt(qs('#weight-input').value, 10);
    if (!w || w < 30 || w > 300) { showToast('Enter a valid weight (30–300 kg)'); return; }
    qs('#goal-input').value = Math.round(w * 2);
    showToast(`Goal set to ${Math.round(w * 2)}g (2 g/kg)`);
  });

  // History modal open
  qs('#history-btn').addEventListener('click', () => {
    openModal('history-modal');
    // Two rAF frames ensure modal is visible before canvas is sized
    requestAnimationFrame(() => requestAnimationFrame(renderHistoryModal));
  });

  // Export buttons
  qs('#export-csv-btn').addEventListener('click', () => exportData('csv'));
  qs('#export-json-btn').addEventListener('click', () => exportData('json'));

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
      id:       state.editingFoodId ?? (Math.max(0, ...state.foods.map(f => f.id || 0)) + 1),
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
