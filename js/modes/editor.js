/* modes/editor.js — 自訂曲目編輯器：用簡譜或音名打進去，馬上就能練 */

import { audio } from '../audio.js';
import { $, el, esc, app, setHandler, setDock, go, toast, showOverlay, hideOverlay } from '../app.js';
import { Staff } from '../staff.js';
import { expandSong, toSteps } from '../songs.js';
import {
  KEY_ROOTS, EXAMPLES, buildCustomSong, saveCustomSong, deleteCustomSong,
  getCustomSong, exportCustomSongs, importCustomSongs,
} from '../customsongs.js';
import { startSong } from './player.js';

let draft = null;
let parsed = null;
let staff = null;
let debounce = null;

const blankDraft = () => ({
  id: null,
  title: '',
  keyRoot: 60,
  tempo: 100,
  beatsPerBar: 4,
  level: 2,
  rhText: '',
  lhText: '',
  hint: '',
});

/** songId 有值時是編輯既有曲目，沒有就是新增 */
export function mountEditor(songId = null) {
  setDock(false);
  setHandler(null);

  if (songId) {
    const s = getCustomSong(songId);
    draft = s ? {
      id: s.id,
      title: s.title,
      keyRoot: s.keyRoot ?? 60,
      tempo: s.tempo,
      beatsPerBar: s.timeSig?.[0] ?? 4,
      level: s.level,
      rhText: s.source?.rhText ?? '',
      lhText: s.source?.lhText ?? '',
      hint: s.hint ?? '',
    } : blankDraft();
  } else {
    draft = blankDraft();
  }

  render();
  reparse();
}

function render() {
  const body = $('#editor-body');
  body.innerHTML = `
    <div class="card editor-form">
      <label class="field">
        <span>曲名</span>
        <input type="text" id="ed-title" placeholder="例如：天空之城" value="${esc(draft.title)}">
      </label>

      <div class="field-row">
        <label class="field">
          <span>調（簡譜的 1 是哪個音）</span>
          <select id="ed-key">
            ${KEY_ROOTS.map(([n, m]) => `<option value="${m}" ${m === draft.keyRoot ? 'selected' : ''}>${n} 調</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>每小節幾拍</span>
          <select id="ed-bar">
            ${[2, 3, 4, 6].map((n) => `<option value="${n}" ${n === draft.beatsPerBar ? 'selected' : ''}>${n} / 4</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>速度 BPM</span>
          <input type="number" id="ed-tempo" min="30" max="240" step="2" value="${draft.tempo}">
        </label>
        <label class="field">
          <span>難度</span>
          <select id="ed-level">
            ${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === draft.level ? 'selected' : ''}>★ ${n}</option>`).join('')}
          </select>
        </label>
      </div>

      <label class="field">
        <span>右手（旋律）</span>
        <textarea id="ed-rh" rows="4" spellcheck="false"
          placeholder="5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 -">${esc(draft.rhText)}</textarea>
      </label>

      <label class="field">
        <span>左手（伴奏，可以留空）</span>
        <textarea id="ed-lh" rows="3" spellcheck="false"
          placeholder="1, - - - | 5, - - - ">${esc(draft.lhText)}</textarea>
      </label>

      <label class="field">
        <span>練習提示（可以留空）</span>
        <input type="text" id="ed-hint" placeholder="例如：注意第三小節的附點節奏" value="${esc(draft.hint)}">
      </label>

      <div id="ed-status" class="ed-status"></div>
    </div>

    <div class="staff-panel" id="ed-staff"></div>

    <div class="control-row" style="margin-top:4px">
      <button class="btn" id="ed-play">🔊 試聽</button>
      <button class="btn btn-primary" id="ed-save">💾 儲存並練習</button>
      ${draft.id ? '<button class="btn" id="ed-delete">🗑 刪除</button>' : ''}
      <button class="btn btn-ghost" id="ed-cancel">取消</button>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 style="font-size:.98rem;margin-bottom:10px">怎麼寫？</h3>
      <table class="syntax-table">
        <tr><td><code>1 2 3 4 5 6 7</code></td><td>Do Re Mi Fa Sol La Si（依上面選的調）</td></tr>
        <tr><td><code>0</code></td><td>休止符</td></tr>
        <tr><td><code>-</code></td><td>延長一拍，<code>1 - - -</code> 就是四拍</td></tr>
        <tr><td><code>1_</code></td><td>半拍（八分音符），<code>1__</code> 是四分之一拍</td></tr>
        <tr><td><code>1.</code></td><td>附點，時值變 1.5 倍</td></tr>
        <tr><td><code>1'</code> / <code>1,</code></td><td>高八度 / 低八度，可以疊加</td></tr>
        <tr><td><code>#4</code> / <code>b7</code></td><td>升記號 / 降記號</td></tr>
        <tr><td><code>|</code></td><td>小節線，只是方便閱讀</td></tr>
        <tr><td><code>C4 F#3 Bb5</code></td><td>也可以直接寫音名，和簡譜混用沒問題</td></tr>
      </table>
      <div class="control-row" style="margin-top:12px">
        <span class="muted" style="font-size:.78rem;align-self:center">載入範例：</span>
        ${EXAMPLES.map((ex, i) => `<button class="btn btn-ghost" data-example="${i}">${esc(ex.name)}</button>`).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 style="font-size:.98rem;margin-bottom:4px">備份與分享</h3>
      <p class="muted" style="font-size:.78rem;margin:0 0 12px">
        自訂曲目存在這台裝置的瀏覽器裡。換裝置或清除瀏覽器資料前記得匯出。</p>
      <div class="control-row">
        <button class="btn" id="ed-export">⬇ 匯出全部</button>
        <button class="btn" id="ed-import">⬆ 匯入</button>
        <input type="file" id="ed-file" accept=".json,application/json" hidden>
      </div>
    </div>`;

  staff = new Staff($('#ed-staff'), { clef: 'treble', minWidth: 300, noteSpacing: 40 });

  const bind = (id, key, cast = (v) => v) => {
    $(id).addEventListener('input', (e) => {
      draft[key] = cast(e.target.value);
      scheduleReparse();
    });
  };
  bind('#ed-title', 'title');
  bind('#ed-rh', 'rhText');
  bind('#ed-lh', 'lhText');
  bind('#ed-hint', 'hint');
  bind('#ed-tempo', 'tempo', Number);
  $('#ed-key').onchange = (e) => { draft.keyRoot = Number(e.target.value); reparse(); };
  $('#ed-bar').onchange = (e) => { draft.beatsPerBar = Number(e.target.value); reparse(); };
  $('#ed-level').onchange = (e) => { draft.level = Number(e.target.value); reparse(); };

  $('#ed-play').onclick = playPreview;
  $('#ed-save').onclick = saveAndPlay;
  $('#ed-cancel').onclick = () => go('songs');
  if ($('#ed-delete')) $('#ed-delete').onclick = confirmDelete;

  body.querySelectorAll('[data-example]').forEach((b) => {
    b.onclick = () => {
      const ex = EXAMPLES[Number(b.dataset.example)];
      draft.title = draft.title || ex.name;
      draft.tempo = ex.tempo;
      draft.beatsPerBar = ex.beatsPerBar;
      draft.rhText = ex.rhText;
      draft.lhText = ex.lhText;
      render();
      reparse();
    };
  });

  $('#ed-export').onclick = doExport;
  $('#ed-import').onclick = () => $('#ed-file').click();
  $('#ed-file').onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const n = importCustomSongs(String(reader.result));
        toast(`匯入了 ${n} 首曲子`);
        go('songs');
      } catch (err) {
        toast('匯入失敗：' + err.message, 3200);
      }
    };
    reader.readAsText(file);
  };
}

/* ---------- 即時解析與預覽 ---------- */

function scheduleReparse() {
  clearTimeout(debounce);
  debounce = setTimeout(reparse, 260);
}

function reparse() {
  const status = $('#ed-status');
  if (!status) return;

  if (!draft.rhText.trim()) {
    parsed = null;
    status.className = 'ed-status';
    status.textContent = '在「右手」欄位打上簡譜就會馬上看到樂譜，例如：1 2 3 4 5 - -';
    staff?.setNotes([]);
    setActionsEnabled(false);
    return;
  }

  try {
    parsed = buildCustomSong({ ...draft });
    const { stats, warning } = parsed;
    status.className = 'ed-status ok';
    status.innerHTML = `✅ ${stats.notes} 個音 · ${stats.beats} 拍 · 約 ${Math.ceil(stats.bars)} 小節`
      + (warning ? `<br><span class="warn">⚠️ ${esc(warning)}</span>` : '');
    renderPreview(parsed.song);
    setActionsEnabled(true);
  } catch (err) {
    parsed = null;
    status.className = 'ed-status bad';
    status.textContent = '❌ ' + err.message;
    staff?.setNotes([]);
    setActionsEnabled(false);
  }
}

function setActionsEnabled(on) {
  if ($('#ed-play')) $('#ed-play').disabled = !on;
  if ($('#ed-save')) $('#ed-save').disabled = !on;
}

function renderPreview(song) {
  const hasLh = !!song.lh;
  staff.setOptions({ clef: hasLh ? 'grand' : 'treble' });
  const steps = toSteps(expandSong(song, { hands: hasLh ? 'both' : 'right' }));
  staff.setNotes(steps.slice(0, 64).map((s) => ({
    midis: s.midis,
    duration: s.beats >= 4 ? 'w' : s.beats >= 2 ? 'h' : s.beats >= 1 ? 'q' : 'e',
  })));
}

function playPreview() {
  if (!parsed) return;
  const song = parsed.song;
  const bps = song.tempo / 60;
  const notes = expandSong(song, { hands: song.lh ? 'both' : 'right' });
  audio.allNotesOff();
  audio.playSequence(notes.slice(0, 96).map((n) => ({
    midis: n.midis,
    time: n.start / bps,
    duration: Math.max(0.12, (n.beats / bps) * 0.92),
    velocity: n.hand === 'l' ? 0.55 : 0.8,
  })));
  toast('播放前 96 個音');
}

/* ---------- 儲存 / 刪除 ---------- */

function saveAndPlay() {
  if (!parsed) return;
  const song = saveCustomSong(parsed.song);
  draft.id = song.id;
  toast(`已儲存「${song.title}」`);
  go('play');
  startSong(song, { hands: song.lh ? 'right' : 'right' });
}

function confirmDelete() {
  const card = el('div', 'result-card', `
    <h3>要刪掉這首曲子嗎？</h3>
    <p class="muted" style="font-size:.85rem;margin:8px 0 18px">
      「${esc(draft.title || '未命名')}」刪掉之後沒辦法復原。</p>
    <div class="result-actions">
      <button class="btn" id="del-no">取消</button>
      <button class="btn btn-primary" id="del-yes">確定刪除</button>
    </div>`);
  showOverlay(card);
  $('#del-no').onclick = hideOverlay;
  $('#del-yes').onclick = () => {
    deleteCustomSong(draft.id);
    hideOverlay();
    toast('已刪除');
    go('songs');
  };
}

function doExport() {
  const json = exportCustomSongs();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'notequest-songs.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('已匯出 notequest-songs.json');
}
