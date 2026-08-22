/* modes/free.js — 自由彈奏：和弦辨識、即時樂譜、錄音與回放 */

import { audio } from '../audio.js';
import { progress } from '../progress.js';
import { $, el, esc, app, setHandler, setDock, toast } from '../app.js';
import { Staff } from '../staff.js';
import {
  CHORDS, SHARP_NAMES, SOLFEGE, pitchClass, noteName, labelFor,
} from '../theory.js';

let staff = null;
let recording = null;      // { startedAt, events: [] }
let playbackTimer = [];

/** 從按住的音判斷是什麼和弦 */
export function detectChord(midis) {
  if (!midis.length) return null;
  const sorted = [...midis].sort((a, b) => a - b);
  const pcs = [...new Set(sorted.map(pitchClass))].sort((a, b) => a - b);
  if (pcs.length === 1) {
    return { name: SHARP_NAMES[pcs[0]], detail: '單音', bass: sorted[0] };
  }
  if (pcs.length === 2) {
    const gap = (pcs[1] - pcs[0] + 12) % 12;
    return { name: `${SHARP_NAMES[pcs[0]]} + ${SHARP_NAMES[pcs[1]]}`, detail: `${gap} 個半音的音程`, bass: sorted[0] };
  }

  // 逐一嘗試每個音當根音，看看能不能對上已知的和弦
  for (const rootPc of pcs) {
    const rel = pcs.map((p) => (p - rootPc + 12) % 12).sort((a, b) => a - b);
    for (const [key, def] of Object.entries(CHORDS)) {
      const want = def.intervals.map((i) => i % 12).sort((a, b) => a - b);
      if (want.length !== rel.length) continue;
      if (want.every((v, i) => v === rel[i])) {
        const bassPc = pitchClass(sorted[0]);
        const inversion = bassPc === rootPc ? '' : `／${SHARP_NAMES[bassPc]}`;
        return {
          name: SHARP_NAMES[rootPc] + def.suffix + inversion,
          detail: def.label + (inversion ? '（轉位）' : ''),
          bass: sorted[0],
        };
      }
    }
  }
  return {
    name: sorted.map((m) => SHARP_NAMES[pitchClass(m)]).join(' '),
    detail: `${pcs.length} 個音`,
    bass: sorted[0],
  };
}

export function mountFreePlay() {
  setDock(true);
  $('#dock-hint').textContent = '用滑鼠、觸控、電腦鍵盤或 MIDI 鍵盤都可以 · 空白鍵是延音踏板';

  renderControls();
  staff = new Staff($('#free-staff'), { clef: 'grand', minWidth: 300, noteSpacing: 46 });
  staff.setNotes([]);
  updateReadout();

  setHandler({
    onNoteOn: (midi, vel) => {
      if (recording) recording.events.push({ midi, vel, t: performance.now() - recording.startedAt, on: true });
      updateReadout();
    },
    onNoteOff: (midi) => {
      if (recording) recording.events.push({ midi, t: performance.now() - recording.startedAt, on: false });
      updateReadout();
    },
    onDispose: () => { stopPlayback(); },
  });
}

export function unmountFreePlay() {
  stopPlayback();
  if (recording) { recording = null; }
  staff = null;
}

function updateReadout() {
  const held = [...app.held].sort((a, b) => a - b);
  const box = $('#chord-readout');
  if (!box) return;
  const chord = detectChord(held);
  box.querySelector('b').textContent = chord ? chord.name : '—';
  box.querySelector('small').textContent = chord
    ? `${chord.detail} · ${held.map((m) => noteName(m)).join(' ')}`
    : '彈幾個音看看，我會告訴你這是什麼和弦';

  if (staff) {
    staff.setNotes(held.length ? [{ midis: held, duration: 'q' }] : []);
  }
}

function renderControls() {
  const row = $('#free-controls');
  row.innerHTML = '';

  // 標示方式
  const labelSel = el('div', 'ctl-group');
  labelSel.innerHTML = '<span>標示</span>';
  const sel = el('select');
  sel.innerHTML = `
    <option value="none">不顯示</option>
    <option value="solfege">Do Re Mi</option>
    <option value="number">1 2 3</option>
    <option value="letter">C D E</option>`;
  sel.value = progress.settings.labelStyle;
  sel.onchange = () => {
    progress.setSetting('labelStyle', sel.value);
    app.keyboard.setLabelStyle(sel.value);
  };
  labelSel.appendChild(sel);
  row.appendChild(labelSel);

  // 彩虹鍵
  const color = el('button', 'btn' + (progress.settings.colorfulKeys ? ' on' : ''), '🌈 彩虹鍵');
  color.onclick = () => {
    const on = !progress.settings.colorfulKeys;
    progress.setSetting('colorfulKeys', on);
    color.classList.toggle('on', on);
    app.keyboard.setColorful(on);
  };
  row.appendChild(color);

  // 八度移動
  const octave = el('div', 'ctl-group');
  octave.innerHTML = '<span>電腦鍵盤八度</span>';
  const down = el('button', 'btn btn-ghost', '−');
  const up = el('button', 'btn btn-ghost', '＋');
  const show = el('b', null, 'C4');
  const refresh = () => { show.textContent = noteName(app.keyboard.opts.anchor); };
  down.onclick = () => { app.keyboard.setAnchor(Math.max(24, app.keyboard.opts.anchor - 12)); refresh(); };
  up.onclick = () => { app.keyboard.setAnchor(Math.min(96, app.keyboard.opts.anchor + 12)); refresh(); };
  octave.append(down, show, up);
  refresh();
  row.appendChild(octave);

  // 錄音
  const rec = el('button', 'btn', '⏺ 錄音');
  const play = el('button', 'btn', '▶ 播放');
  play.disabled = true;

  rec.onclick = () => {
    if (recording) {
      const events = recording.events;
      recording = null;
      rec.textContent = '⏺ 錄音';
      rec.classList.remove('on');
      lastTake = events;
      play.disabled = !events.length;
      toast(events.length ? `錄好了，共 ${events.filter((e) => e.on).length} 個音` : '沒有錄到聲音');
    } else {
      stopPlayback();
      recording = { startedAt: performance.now(), events: [] };
      rec.textContent = '⏹ 停止';
      rec.classList.add('on');
      toast('開始錄音，隨便彈吧！');
    }
  };
  play.onclick = () => playbackTake();
  row.append(rec, play);
}

let lastTake = null;

function playbackTake() {
  if (!lastTake?.length) return;
  stopPlayback();
  toast('播放你剛剛彈的');
  for (const e of lastTake) {
    playbackTimer.push(setTimeout(() => {
      if (e.on) {
        audio.noteOn(e.midi, e.vel ?? 0.8);
        app.keyboard.setPressed(e.midi, true);
      } else {
        audio.noteOff(e.midi);
        app.keyboard.setPressed(e.midi, false);
      }
    }, e.t));
  }
}

function stopPlayback() {
  playbackTimer.forEach(clearTimeout);
  playbackTimer = [];
  audio.allNotesOff();
}
