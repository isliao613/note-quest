/* modes/theorylab.js — 音階與和弦實驗室：選一個就在鍵盤與五線譜上亮出來 */

import { audio } from '../audio.js';
import { progress } from '../progress.js';
import { $, el, esc, app, setHandler, setDock, toast } from '../app.js';
import { Staff } from '../staff.js';
import {
  SCALES, CHORDS, SHARP_NAMES, DEGREE_LABELS, buildScale, buildChord,
  diatonicChord, chordName, noteName, pitchClass, KEY_SIGNATURES,
} from '../theory.js';

const ROOTS = [
  ['C', 60], ['C#', 61], ['D', 62], ['D#', 63], ['E', 64], ['F', 65],
  ['F#', 66], ['G', 55], ['G#', 56], ['A', 57], ['A#', 58], ['B', 59],
];

let staff = null;
const state = { tab: 'scale', root: 60, scale: 'major', chord: 'maj', inversion: 0 };

export function mountTheoryLab() {
  setDock(true);
  $('#dock-hint').textContent = '亮起來的就是這個音階／和弦的組成音，可以自己彈彈看';
  render();
  setHandler({ onNoteOn: () => {}, onDispose: () => app.keyboard.clearMarks() });
}

function render() {
  const body = $('#theory-body');
  body.innerHTML = `
    <div class="mode-switch">
      <button class="mode-btn ${state.tab === 'scale' ? 'active' : ''}" data-tab="scale">音階</button>
      <button class="mode-btn ${state.tab === 'chord' ? 'active' : ''}" data-tab="chord">和弦</button>
      <button class="mode-btn ${state.tab === 'degree' ? 'active' : ''}" data-tab="degree">級數和弦</button>
    </div>
    <div class="card" id="lab-controls"></div>
    <div class="staff-panel" id="lab-staff"></div>
    <div class="card" id="lab-info"></div>`;

  body.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => { state.tab = b.dataset.tab; render(); };
  });

  staff = new Staff($('#lab-staff'), { clef: 'treble', minWidth: 300, noteSpacing: 40 });

  const ctl = $('#lab-controls');
  const rootRow = el('div', 'select-row');
  rootRow.innerHTML = '<b style="font-size:.85rem">根音</b>';
  const rootSel = el('select');
  rootSel.innerHTML = ROOTS.map(([n, m]) => `<option value="${m}" ${m === state.root ? 'selected' : ''}>${n}</option>`).join('');
  rootSel.onchange = () => { state.root = parseInt(rootSel.value, 10); update(); };
  rootRow.appendChild(rootSel);

  if (state.tab === 'scale') {
    const s = el('select');
    s.innerHTML = Object.entries(SCALES)
      .map(([k, v]) => `<option value="${k}" ${k === state.scale ? 'selected' : ''}>${v.label}</option>`).join('');
    s.onchange = () => { state.scale = s.value; update(); };
    rootRow.appendChild(s);
  } else if (state.tab === 'chord') {
    const s = el('select');
    s.innerHTML = Object.entries(CHORDS)
      .map(([k, v]) => `<option value="${k}" ${k === state.chord ? 'selected' : ''}>${v.label}</option>`).join('');
    s.onchange = () => { state.chord = s.value; update(); };
    const inv = el('select');
    inv.innerHTML = ['原位', '第一轉位', '第二轉位']
      .map((t, i) => `<option value="${i}" ${i === state.inversion ? 'selected' : ''}>${t}</option>`).join('');
    inv.onchange = () => { state.inversion = parseInt(inv.value, 10); update(); };
    rootRow.append(s, inv);
  }

  const playBtn = el('button', 'btn btn-primary', '🔊 聽聽看');
  playBtn.onclick = playCurrent;
  rootRow.appendChild(playBtn);
  ctl.appendChild(rootRow);

  if (state.tab === 'degree') {
    const grid = el('div', 'degree-grid');
    grid.style.marginTop = '12px';
    for (let d = 0; d < 7; d++) {
      const { root, type, label } = diatonicChord(state.root, d);
      const b = el('button', null, `${label}<small>${chordName(root, type)}</small>`);
      b.onclick = () => {
        state.degree = d;
        update();
        playCurrent();
      };
      grid.appendChild(b);
    }
    ctl.appendChild(grid);
  }

  update();
}

function currentNotes() {
  if (state.tab === 'scale') return buildScale(state.root, state.scale, 1);
  if (state.tab === 'chord') return buildChord(state.root, state.chord, state.inversion);
  const d = state.degree ?? 0;
  const { root, type } = diatonicChord(state.root, d);
  return buildChord(root, type, 0);
}

function update() {
  const notes = currentNotes();
  app.keyboard.clearMarks();
  for (const m of notes) app.keyboard.mark(m, 'scale');
  app.keyboard.mark(notes[0], 'target');

  if (staff) {
    staff.setNotes(state.tab === 'scale'
      ? notes.map((m) => ({ midi: m, duration: 'q' }))
      : [{ midis: notes, duration: 'w' }]);
  }

  const info = $('#lab-info');
  if (!info) return;

  if (state.tab === 'scale') {
    const def = SCALES[state.scale];
    const steps = def.steps.map((s, i) => (i === 0 ? 0 : s - def.steps[i - 1]));
    info.innerHTML = `
      <h3 style="font-size:1.05rem;margin-bottom:6px">${SHARP_NAMES[pitchClass(state.root)]} ${esc(def.label)}</h3>
      <p class="muted" style="font-size:.84rem;margin:0 0 10px">組成音：${notes.map((m) => noteName(m)).join(' — ')}</p>
      <p class="muted" style="font-size:.84rem;margin:0">
        音程結構：${steps.slice(1).map((s) => (s === 2 ? '全' : s === 1 ? '半' : `${s}`)).join(' ')}
        ${state.scale === 'major' ? '（大調公式：全全半全全全半）' : ''}</p>`;
  } else {
    const notesForName = state.tab === 'chord'
      ? { root: state.root, type: state.chord }
      : diatonicChord(state.root, state.degree ?? 0);
    const def = CHORDS[notesForName.type];
    info.innerHTML = `
      <h3 style="font-size:1.05rem;margin-bottom:6px">${chordName(notesForName.root, notesForName.type)}</h3>
      <p class="muted" style="font-size:.84rem;margin:0 0 10px">組成音：${notes.map((m) => noteName(m)).join(' — ')}</p>
      <p class="muted" style="font-size:.84rem;margin:0">
        ${esc(def.label)}：從根音往上疊 ${def.intervals.slice(1).join(' 與 ')} 個半音。
        ${state.tab === 'degree' ? `這是 ${SHARP_NAMES[pitchClass(state.root)]} 大調的第 ${DEGREE_LABELS[state.degree ?? 0]} 級和弦。` : ''}</p>`;
  }
}

function playCurrent() {
  const notes = currentNotes();
  if (state.tab === 'scale') {
    audio.playSequence(notes.map((m, i) => ({ midi: m, time: i * 0.32, duration: 0.3 })));
  } else {
    // 先分解再一起彈
    audio.playSequence([
      ...notes.map((m, i) => ({ midi: m, time: i * 0.22, duration: 0.2 })),
      { midis: notes, time: notes.length * 0.22 + 0.15, duration: 1.6 },
    ]);
  }
}
