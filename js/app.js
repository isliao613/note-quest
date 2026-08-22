/* app.js — 應用程式外殼：路由、鍵盤總線、MIDI、設定與各清單畫面 */

import { audio } from './audio.js';
import { midiInput } from './midi.js';
import { progress } from './progress.js';
import { PianoKeyboard } from './keyboard.js';
import { SONGS, allSongs, getSong } from './songs.js';
import { UNITS, unitsFor, getLesson, nextLesson, isUnlocked } from './curriculum.js';
import { noteName, labelFor } from './theory.js';

import { startSong } from './modes/player.js';
import { startLesson } from './modes/lesson.js';
import { mountFreePlay, unmountFreePlay } from './modes/free.js';
import { mountEarTraining } from './modes/ear.js';
import { mountTheoryLab } from './modes/theorylab.js';
import { mountEditor } from './modes/editor.js';

/* ---------- 小工具 ---------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let toastTimer = null;
export function toast(msg, ms = 1900) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

export function showOverlay(node) {
  const o = $('#overlay');
  o.innerHTML = '';
  o.appendChild(node);
  o.hidden = false;
}
export function hideOverlay() {
  const o = $('#overlay');
  o.hidden = true;
  o.innerHTML = '';
}

/* ---------- 應用程式狀態 ---------- */

export const app = {
  keyboard: null,
  handler: null,          // 目前畫面的輸入處理器 { onNoteOn, onNoteOff, onDispose }
  held: new Set(),        // 目前按住的音
  screen: 'home',
  lastListScreen: 'home',
};

/** 讓某個畫面接管鍵盤輸入 */
export function setHandler(h) {
  if (app.handler?.onDispose) app.handler.onDispose();
  app.handler = h;
}

/**
 * 顯示 / 隱藏鍵盤底座；fall = 是否顯示落下音符區。
 * 底座要疊在分頁列「上方」，否則會蓋住琴鍵下緣，
 * 因此每次切換都重新量一次高度並寫進 CSS 變數。
 */
export function setDock(visible, { fall = false } = {}) {
  const dock = $('#dock');
  const tabbar = $('#tabbar');
  const hideTabs = !!visible && !!fall;

  dock.hidden = !visible;
  dock.classList.toggle('with-fall', !!fall);
  tabbar.classList.toggle('hidden', hideTabs);

  requestAnimationFrame(() => {
    const tabH = hideTabs ? 0 : tabbar.offsetHeight;
    dock.style.bottom = tabH + 'px';
    const dockH = visible ? dock.offsetHeight : 0;
    const root = document.documentElement.style;
    root.setProperty('--dock-real', dockH + 'px');
    root.setProperty('--tab-real', tabH + 'px');
    $('#screens').style.paddingBottom = (dockH + tabH + 20) + 'px';
    window.dispatchEvent(new Event('dockresize'));
  });
}

/* ---------- 音符總線 ---------- */

export function noteOn(midi, velocity = 0.8, source = 'screen') {
  if (app.held.has(midi) && source !== 'demo') return;
  app.held.add(midi);
  audio.noteOn(midi, velocity);
  if (source !== 'screen') app.keyboard.setPressed(midi, true);
  app.handler?.onNoteOn?.(midi, velocity);
}

export function noteOff(midi, source = 'screen') {
  if (!app.held.has(midi)) return;
  app.held.delete(midi);
  audio.noteOff(midi);
  if (source !== 'screen') app.keyboard.setPressed(midi, false);
  app.handler?.onNoteOff?.(midi);
}

/* ---------- 路由 ---------- */

const SCREEN_IDS = ['home', 'lessons', 'songs', 'play', 'free', 'ear', 'theory', 'stats', 'settings', 'editor'];
const LIST_SCREENS = new Set(['home', 'lessons', 'songs', 'stats', 'settings']);

export function go(name, opts = {}) {
  if (app.screen === 'free' && name !== 'free') unmountFreePlay();
  if (app.screen !== name) setHandler(null);

  app.screen = name;
  if (LIST_SCREENS.has(name)) app.lastListScreen = name;

  SCREEN_IDS.forEach((id) => $('#screen-' + id)?.classList.toggle('active', id === name));
  $('#screens').scrollTop = 0;
  $('#btn-back').hidden = LIST_SCREENS.has(name) && name !== 'settings' && name !== 'stats';
  $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.go === name));

  audio.allNotesOff();
  app.held.clear();
  app.keyboard.clearMarks();
  app.keyboard.clearBadges();
  $$('.key.pressed').forEach((k) => k.classList.remove('pressed'));

  switch (name) {
    case 'home':     renderHome(); setDock(false); break;
    case 'lessons':  renderLessons(); setDock(false); break;
    case 'songs':    renderSongs(); setDock(false); break;
    case 'stats':    renderStats(); setDock(false); break;
    case 'settings': renderSettings(); setDock(false); break;
    case 'free':     mountFreePlay(); break;
    case 'ear':      mountEarTraining(opts); break;
    case 'theory':   mountTheoryLab(); break;
    case 'editor':   mountEditor(opts.songId ?? null); break;
    case 'play':     break;   // 由 player / lesson 自行處理
  }
}

/* ---------- 頂列統計 ---------- */

export function refreshHeader() {
  $('#stat-level').textContent = 'Lv.' + progress.level;
  const { current, needed } = progress.xpInLevel;
  $('#xp-fill').style.width = Math.min(100, (current / needed) * 100) + '%';
  $('#stat-streak').textContent = progress.data.streak;
}

/* ---------- 首頁 ---------- */

function renderHome() {
  const mode = progress.data.mode;
  $$('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));

  const next = nextLesson(mode, (id) => progress.isCompleted(id));
  const card = $('#continue-card');
  if (next) {
    card.innerHTML = `
      <div class="cc-eyebrow">${progress.data.completed.length ? '繼續學習' : '從這裡開始'}</div>
      <h3>${esc(next.lesson.title)}</h3>
      <p>${esc(next.unit.title)} · ${esc(next.lesson.desc || '')}</p>
      <button class="btn" id="cc-go">開始這一課 →</button>`;
    $('#cc-go').onclick = () => openLesson(next.lesson.id);
  } else {
    card.innerHTML = `
      <div class="cc-eyebrow">全部完成</div>
      <h3>${mode === 'kid' ? '你把所有課都學完了！🎉' : '課程全數完成'}</h3>
      <p>接下來可以挑戰練習曲，或到自由彈奏創作自己的旋律。</p>
      <button class="btn" id="cc-go">去看練習曲 →</button>`;
    $('#cc-go').onclick = () => go('songs');
  }
  refreshHeader();
}

/* ---------- 課程列表 ---------- */

function renderLessons() {
  const mode = progress.data.mode;
  const list = $('#unit-list');
  list.innerHTML = '';

  for (const unit of unitsFor(mode)) {
    const done = unit.lessons.filter((l) => progress.isCompleted(l.id)).length;
    const box = el('div', 'unit');
    box.appendChild(el('div', 'unit-head', `
      <div class="unit-icon">${unit.icon}</div>
      <div><h3>${esc(unit.title)}</h3><p>${esc(unit.desc)}</p></div>
      <div class="unit-prog">${done}/${unit.lessons.length}</div>`));

    for (const lesson of unit.lessons) {
      const unlocked = isUnlocked(unit, lesson, (id) => progress.isCompleted(id));
      const stars = progress.starsFor(lesson.id);
      const row = el('button', 'lesson-row'
        + (progress.isCompleted(lesson.id) ? ' done' : '')
        + (unlocked ? '' : ' locked'), `
        <span class="lesson-badge">${unlocked ? (progress.isCompleted(lesson.id) ? '✓' : TYPE_ICON[lesson.type]) : '🔒'}</span>
        <span><b>${esc(lesson.title)}</b><small>${esc(lesson.desc || '')}</small></span>
        <span class="stars">${starStr(stars)}</span>`);
      row.onclick = () => openLesson(lesson.id);
      box.appendChild(row);
    }
    list.appendChild(box);
  }
}

const TYPE_ICON = {
  keys: '🎯', sequence: '🪜', song: '🎵', read: '📖',
  ear: '👂', rhythm: '🥁', theory: '💡',
};

export const starStr = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

export function openLesson(id) {
  const lesson = getLesson(id);
  if (!lesson) return;
  progress.touchPractice();
  refreshHeader();
  go('play');
  startLesson(lesson);
}

/* ---------- 曲目列表 ---------- */

let songFilter = 'all';

function renderSongs() {
  const mode = progress.data.mode;
  const filters = [
    ['all', '全部'], ['1', '入門'], ['2', '初級'], ['3', '中級'], ['4', '進階'], ['custom', '我的曲子'],
  ];
  const fr = $('#song-filter');
  fr.innerHTML = '';
  for (const [key, label] of filters) {
    const b = el('button', 'btn' + (songFilter === key ? ' on' : ''), label);
    b.onclick = () => { songFilter = key; renderSongs(); };
    fr.appendChild(b);
  }
  const add = el('button', 'btn btn-primary', '＋ 新增自己的曲子');
  add.onclick = () => go('editor');
  fr.appendChild(add);

  const list = $('#song-list');
  list.innerHTML = '';
  const pool = allSongs()
    .filter((s) => s.custom || s.audience === 'both' || s.audience === mode)
    .filter((s) => songFilter === 'all'
      || (songFilter === 'custom' ? s.custom : String(s.level) === songFilter))
    .sort((a, b) => (a.custom === b.custom ? a.level - b.level : a.custom ? 1 : -1));

  if (!pool.length) {
    const empty = el('div', 'card', songFilter === 'custom'
      ? '<b>還沒有自訂曲目</b><p class="muted" style="font-size:.82rem;margin:6px 0 0">用簡譜把想彈的旋律打進去，馬上就能用落下音符練習。</p>'
      : '<b>這個難度還沒有曲子</b><p class="muted" style="font-size:.82rem;margin:6px 0 0">換一個難度看看吧。</p>');
    list.appendChild(empty);
    return;
  }

  for (const song of pool) {
    const best = progress.bestFor(song.id);
    const card = el('div', 'song-card', `
      <h3>${esc(song.title)}${song.custom ? ' <span class="pill">自訂</span>' : ''}</h3>
      <div class="sub">${esc(song.subtitle || '')}</div>
      <div class="level-dots">${[1,2,3,4,5].map((i) => `<i class="${i <= song.level ? 'on' : ''}"></i>`).join('')}</div>
      ${best ? `<span class="pill" style="margin-left:8px">${starStr(best.stars)} ${Math.round(best.accuracy * 100)}%</span>` : ''}
      <div class="song-tags">${(song.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>`);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const open = () => {
      progress.touchPractice();
      refreshHeader();
      go('play');
      startSong(song, { hands: 'right' });   // 先從單手開始，可在播放畫面切換成雙手
    };
    card.onclick = open;
    card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };

    if (song.custom) {
      const edit = el('button', 'card-edit', '✏️');
      edit.title = '編輯這首曲子';
      edit.onclick = (e) => { e.stopPropagation(); go('editor', { songId: song.id }); };
      card.appendChild(edit);
    }
    list.appendChild(card);
  }
}

/* ---------- 成果 ---------- */

const STICKERS = [
  ['first-note', '🎵', '彈出第一個音'],
  ['first-lesson', '🌟', '完成第一課'],
  ['five-lessons', '🖐️', '完成五課'],
  ['perfect', '💯', '拿到三顆星'],
  ['streak3', '🔥', '連續練習三天'],
  ['scale', '🪜', '彈完整條音階'],
  ['chord', '🎹', '學會三和弦'],
  ['song5', '🎼', '練完五首曲子'],
  ['level5', '🏆', '達到 Lv.5'],
];

function renderStats() {
  const d = progress.data;
  const totalStars = Object.values(d.stars).reduce((a, b) => a + b, 0);
  const body = $('#stats-body');
  body.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card"><b>${progress.level}</b><small>等級</small></div>
      <div class="stat-card"><b>${d.xp}</b><small>經驗值</small></div>
      <div class="stat-card"><b>${totalStars}</b><small>星星</small></div>
      <div class="stat-card"><b>${d.streak}</b><small>連續天數</small></div>
      <div class="stat-card"><b>${d.completed.length}</b><small>完成課程</small></div>
      <div class="stat-card"><b>${Object.keys(d.songBest).length}</b><small>練過的曲子</small></div>
    </div>
    <h3 style="margin:6px 0 10px;font-size:1rem">收集貼紙</h3>
    <div class="sticker-grid">
      ${STICKERS.map(([id, icon, name]) => `
        <div class="sticker ${d.stickers.includes(id) ? '' : 'locked'}" title="${esc(name)}">${icon}</div>`).join('')}
    </div>
    <p class="muted" style="margin-top:12px;font-size:.78rem">把貼紙全部收集起來吧！把滑鼠移到貼紙上可以看到取得條件。</p>`;
}

/** 依照當下狀態自動發放貼紙 */
export function checkStickers() {
  const d = progress.data;
  const got = [];
  const give = (id) => { if (progress.awardSticker(id)) got.push(id); };
  give('first-note');
  if (d.completed.length >= 1) give('first-lesson');
  if (d.completed.length >= 5) give('five-lessons');
  if (Object.values(d.stars).some((s) => s >= 3)) give('perfect');
  if (d.streak >= 3) give('streak3');
  if (d.completed.some((id) => id.startsWith('a4-') || id === 'k2-4')) give('scale');
  if (d.completed.some((id) => id.startsWith('a5-'))) give('chord');
  if (Object.keys(d.songBest).length >= 5) give('song5');
  if (progress.level >= 5) give('level5');
  if (got.length) {
    const info = STICKERS.find((s) => s[0] === got[0]);
    toast(`獲得新貼紙 ${info[1]} ${info[2]}`, 2600);
    audio.sfx('star');
  }
}

/* ---------- 設定 ---------- */

const LABEL_STYLES = [
  ['none', '不顯示'], ['solfege', '唱名 Do Re Mi'], ['number', '簡譜 1 2 3'],
  ['letter', '音名 C D E'], ['full', '音名 + 八度'],
];

function renderSettings() {
  const s = progress.settings;
  const body = $('#settings-body');
  body.innerHTML = `
    <div class="card">
      <div class="setting-row">
        <div class="label"><b>音量</b><small>目前 ${Math.round(s.volume * 100)}%</small></div>
        <input type="range" id="set-vol" min="0" max="1" step="0.05" value="${s.volume}">
      </div>
      <div class="setting-row">
        <div class="label"><b>琴鍵標示</b><small>要在琴鍵上寫什麼</small></div>
        <select id="set-label">
          ${LABEL_STYLES.map(([v, t]) => `<option value="${v}" ${s.labelStyle === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="setting-row">
        <div class="label"><b>彩虹琴鍵</b><small>每個音一種顏色，適合小朋友</small></div>
        <button class="switch ${s.colorfulKeys ? 'on' : ''}" id="set-color"></button>
      </div>
      <div class="setting-row">
        <div class="label"><b>顯示五線譜</b><small>練習曲上方顯示樂譜</small></div>
        <button class="switch ${s.showStaff ? 'on' : ''}" id="set-staff"></button>
      </div>
      <div class="setting-row">
        <div class="label"><b>等待模式</b><small>彈對了才往下走，適合初學</small></div>
        <button class="switch ${s.waitMode ? 'on' : ''}" id="set-wait"></button>
      </div>
      <div class="setting-row">
        <div class="label"><b>專注模式</b><small>收起返回、設定與底部分頁，避免小朋友誤觸跳走</small></div>
        <button class="switch ${s.focusLock ? 'on' : ''}" id="set-lock"></button>
      </div>
      <div class="setting-row">
        <div class="label"><b>鍵盤範圍</b><small>螢幕鋼琴要顯示幾個八度</small></div>
        <select id="set-range">
          <option value="55,79" ${s.range[0] === 55 ? 'selected' : ''}>2 個八度（小螢幕）</option>
          <option value="48,84" ${s.range[0] === 48 ? 'selected' : ''}>3 個八度（推薦）</option>
          <option value="36,96" ${s.range[0] === 36 ? 'selected' : ''}>5 個八度</option>
        </select>
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 style="font-size:.98rem;margin-bottom:4px">MIDI 電鋼琴</h3>
      <p class="muted" style="font-size:.78rem;margin:0 0 12px">
        有實體 MIDI 鍵盤的話，接上 USB 就能直接用真的琴來上課。（需要 Chrome 或 Edge）</p>
      <div class="select-row">
        <button class="btn" id="set-midi">搜尋 MIDI 裝置</button>
        <select id="set-midi-dev" hidden></select>
      </div>
      <p class="muted" id="midi-status" style="font-size:.78rem;margin:10px 0 0"></p>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 style="font-size:.98rem;margin-bottom:4px">讓小朋友不會亂跳出去</h3>
      <p class="muted" style="font-size:.78rem;line-height:1.8;margin:0">
        <b>專注模式</b>會把 App 裡會跳走的入口收起來。<br>
        想連整台 iPad 都鎖住（連home鍵、通知、其他 App 都碰不到），可以用 iOS 內建的
        <b>引導式取用</b>：設定 → 輔助使用 → 引導式取用打開後，
        在 App 裡連按三下側邊鍵即可鎖定，再連按三下並輸入密碼解除。
      </p>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 style="font-size:.98rem;margin-bottom:10px">電腦鍵盤對照</h3>
      <p class="muted" style="font-size:.78rem;line-height:1.8;margin:0">
        白鍵：<b>A S D F G H J K L ;</b><br>
        黑鍵：<b>W E &nbsp; T Y U &nbsp; O P</b><br>
        左右方向鍵可以移動八度。
      </p>
    </div>

    <div class="card" style="margin-top:14px">
      <div class="setting-row">
        <div class="label"><b>清除學習紀錄</b><small>星星、經驗值與貼紙都會歸零</small></div>
        <button class="btn" id="set-reset">重設</button>
      </div>
    </div>`;

  $('#set-vol').oninput = (e) => {
    const v = parseFloat(e.target.value);
    audio.setVolume(v);
    progress.setSetting('volume', v);
    e.target.previousElementSibling.querySelector('small').textContent = `目前 ${Math.round(v * 100)}%`;
  };
  $('#set-label').onchange = (e) => {
    progress.setSetting('labelStyle', e.target.value);
    app.keyboard.setLabelStyle(e.target.value);
  };
  $('#set-color').onclick = (e) => {
    const on = !progress.settings.colorfulKeys;
    progress.setSetting('colorfulKeys', on);
    e.target.classList.toggle('on', on);
    app.keyboard.setColorful(on);
  };
  $('#set-staff').onclick = (e) => {
    const on = !progress.settings.showStaff;
    progress.setSetting('showStaff', on);
    e.target.classList.toggle('on', on);
  };
  $('#set-wait').onclick = (e) => {
    const on = !progress.settings.waitMode;
    progress.setSetting('waitMode', on);
    e.target.classList.toggle('on', on);
  };
  $('#set-lock').onclick = (e) => {
    const on = !progress.settings.focusLock;
    progress.setSetting('focusLock', on);
    e.target.classList.toggle('on', on);
    applyFocusLock();
    if (on) toast('專注模式開啟：長按右上角的 🔒 一秒半可解鎖', 3600);
  };
  $('#set-range').onchange = (e) => {
    const [lo, hi] = e.target.value.split(',').map(Number);
    progress.setSetting('range', [lo, hi]);
    app.keyboard.setRange(lo, hi);
    applyKeyboardSettings();
  };
  $('#set-midi').onclick = connectMidi;
  $('#set-reset').onclick = () => {
    if (confirm('確定要清除所有學習紀錄嗎？這個動作沒辦法復原。')) {
      progress.reset();
      applyTheme();
      refreshHeader();
      renderSettings();
      toast('已清除學習紀錄');
    }
  };
  updateMidiStatus();
}

async function connectMidi() {
  try {
    const inputs = await midiInput.connect();
    if (!inputs.length) { toast('沒有找到 MIDI 裝置，請確認琴已接上'); return; }
    toast(`已連接：${inputs[0].name}`);
    updateMidiStatus();
  } catch (err) {
    toast(err.message || '無法連接 MIDI');
  }
}

function updateMidiStatus() {
  const status = $('#midi-status');
  if (!status) return;
  if (!midiInput.supported) {
    status.textContent = '這個瀏覽器不支援 Web MIDI，建議改用 Chrome 或 Edge。';
    return;
  }
  const sel = $('#set-midi-dev');
  if (!midiInput.inputs.length) {
    status.textContent = '尚未連接。沒有 MIDI 鍵盤也沒關係，用螢幕鍵盤一樣可以上完所有課程。';
    if (sel) sel.hidden = true;
    return;
  }
  status.textContent = `已連接 ${midiInput.inputs.length} 台裝置`;
  if (sel) {
    sel.hidden = false;
    sel.innerHTML = midiInput.inputs
      .map((i) => `<option value="${i.id}" ${i.id === midiInput.currentId ? 'selected' : ''}>${esc(i.name)}</option>`)
      .join('');
    sel.onchange = (e) => midiInput.select(e.target.value);
  }
}

/* ---------- 專注模式 ---------- */

const UNLOCK_HOLD_MS = 1400;

export function applyFocusLock() {
  const on = !!progress.settings.focusLock;
  document.body.classList.toggle('locked', on);
  const btn = $('#btn-lock');
  if (!btn) return;
  btn.querySelector('.lock-ico').textContent = on ? '🔒' : '🔓';
  btn.title = on ? '專注模式開啟中 — 長按這顆按鈕解鎖' : '開啟專注模式，把導覽收起來避免誤觸';
  btn.setAttribute('aria-pressed', String(on));
}

function setupLockButton() {
  const btn = $('#btn-lock');
  let holdTimer = null;
  let justUnlocked = false;

  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    btn.classList.remove('holding');
  };

  btn.addEventListener('pointerdown', (e) => {
    if (!progress.settings.focusLock) return;   // 沒鎖的時候用單擊就好
    e.preventDefault();
    btn.classList.add('holding');
    holdTimer = setTimeout(() => {
      cancelHold();
      justUnlocked = true;                       // 擋掉隨後才觸發的 click，免得又鎖回去
      progress.setSetting('focusLock', false);
      applyFocusLock();
      audio.sfx('good');
      toast('已解鎖');
    }, UNLOCK_HOLD_MS);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) {
    btn.addEventListener(type, cancelHold);
  }

  btn.addEventListener('click', () => {
    if (justUnlocked) { justUnlocked = false; return; }
    if (progress.settings.focusLock) return;     // 鎖定中只能長按解鎖
    progress.setSetting('focusLock', true);
    applyFocusLock();
    toast('專注模式開啟：導覽已收起，長按 🔒 一秒半可解鎖', 3600);
  });
}

/* ---------- 主題與鍵盤設定 ---------- */

const THEME_COLORS = { kid: '#fff7ed', adult: '#0f172a' };

export function applyTheme() {
  const mode = progress.data.mode;
  document.body.dataset.theme = mode;
  // 加到主畫面全螢幕啟動時，狀態列底色要跟著主題換，字才看得清楚
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[mode] ?? THEME_COLORS.kid);
}

export function applyKeyboardSettings() {
  const s = progress.settings;
  app.keyboard.setLabelStyle(s.labelStyle);
  app.keyboard.setColorful(s.colorfulKeys);
}

/* ---------- 啟動 ---------- */

function boot() {
  applyTheme();

  const s = progress.settings;
  app.keyboard = new PianoKeyboard($('#keyboard'), {
    low: s.range[0], high: s.range[1],
    labelStyle: s.labelStyle,
    colorful: s.colorfulKeys,
    onNoteOn: (midi, vel) => noteOn(midi, vel, 'screen'),
    onNoteOff: (midi) => noteOff(midi, 'screen'),
  });

  midiInput.onNoteOn = (midi, vel) => noteOn(midi, vel, 'midi');
  midiInput.onNoteOff = (midi) => noteOff(midi, 'midi');
  midiInput.onPedal = (down) => audio.setPedal(down);
  midiInput.onDevicesChanged = () => updateMidiStatus();

  // 導覽
  $$('#tabbar button').forEach((b) => { b.onclick = () => go(b.dataset.go); });
  $$('[data-go]', $('#screen-home')).forEach((b) => { b.onclick = () => go(b.dataset.go); });
  $('#btn-settings').onclick = () => go('settings');
  $('#btn-back').onclick = () => go(app.lastListScreen === 'settings' ? 'home' : app.lastListScreen);

  $$('.mode-btn').forEach((b) => {
    b.onclick = () => {
      progress.setMode(b.dataset.mode);
      applyTheme();
      applyKeyboardSettings();
      renderHome();
      toast(b.dataset.mode === 'kid' ? '切換到小朋友模式 🧒' : '切換到大人模式 🎓');
    };
  });

  // 空白鍵當延音踏板
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.repeat && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) {
      e.preventDefault();
      audio.setPedal(true);
    }
    if (e.code === 'Escape' && !$('#overlay').hidden) hideOverlay();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') audio.setPedal(false);
  });
  window.addEventListener('blur', () => { audio.allNotesOff(); app.held.clear(); });

  setupLockButton();
  applyFocusLock();

  // 擋掉 Safari 的雙指縮放，不然一不小心就把畫面放大卡住
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  refreshHeader();
  renderHome();

  // 首次互動時啟動音訊
  const start = async () => {
    await audio.init();
    audio.setVolume(progress.settings.volume);
    $('#boot').classList.add('hide');
    setTimeout(() => { $('#boot').hidden = true; }, 500);
    progress.touchPractice();
    refreshHeader();
  };
  $('#boot-start').onclick = start;
  $('#boot').addEventListener('click', (e) => { if (e.target.id === 'boot') start(); });
}

boot();

/* 讓其他模組取用共用元件 */
export { audio, progress, getSong, noteName, labelFor, UNITS, SONGS };
