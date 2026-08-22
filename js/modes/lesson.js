/* modes/lesson.js — 課程執行：認鍵、跟彈、視奏、節奏、樂理卡，以及曲目課 */

import { audio } from '../audio.js';
import { progress } from '../progress.js';
import {
  $, $$, el, esc, app, setHandler, setDock, go, toast,
  showOverlay, hideOverlay, refreshHeader, checkStickers,
} from '../app.js';
import { getSong } from '../songs.js';
import { startSong, stopPlayer } from './player.js';
import { createEarDrill } from './ear.js';
import { Staff } from '../staff.js';
import { labelFor, noteName, SOLFEGE, SHARP_NAMES, pitchClass, colorOf } from '../theory.js';

let active = null;      // { destroy() }

export function startLesson(lesson) {
  stopPlayer();
  if (active?.destroy) active.destroy();
  active = null;

  $('#play-title').textContent = lesson.title;
  $('#play-sub').textContent = lesson.desc || '';
  $('#play-controls').innerHTML = '';
  $('#play-prompt').innerHTML = '';
  $('#play-staff').hidden = true;
  $('#play-staff').innerHTML = '';
  $('#play-progress-fill').style.width = '0%';
  $('#hud-acc').textContent = '—';
  $('#hud-combo').textContent = '0';
  $('#hud-score').textContent = '0';
  $('#dock-hint').textContent = '';

  switch (lesson.type) {
    case 'song':     return runSongLesson(lesson);
    case 'keys':     return (active = runKeysDrill(lesson));
    case 'sequence': return (active = runSequenceDrill(lesson));
    case 'read':     return (active = runReadDrill(lesson));
    case 'rhythm':   return (active = runRhythmDrill(lesson));
    case 'ear':      return (active = runEarLesson(lesson));
    case 'theory':   return (active = runTheoryLesson(lesson));
    default:         toast('這一課還在製作中'); go('lessons');
  }
}

/* ---------- 共用：結算 ---------- */

function finishLesson(lesson, correct, total, opts = {}) {
  const acc = total ? correct / total : 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.5 ? 1 : 0;
  if (stars > 0) progress.completeLesson(lesson.id, stars, lesson.xp ?? 20);
  else progress.addXp(Math.round((lesson.xp ?? 20) * 0.25));
  refreshHeader();
  checkStickers();
  audio.sfx(stars >= 2 ? 'win' : stars === 1 ? 'good' : 'bad');

  const kid = progress.data.mode === 'kid';
  const msg = stars === 3 ? (kid ? '全對！你好棒 🎉' : '完全正確')
    : stars === 2 ? (kid ? '做得很好！' : '表現不錯')
    : stars === 1 ? (kid ? '過關囉，再練一次會更熟' : '通過，建議再練一次')
    : (kid ? '沒關係，我們再來一次！' : '再試一次');

  const card = el('div', 'result-card', `
    <div class="result-stars">${[0,1,2].map((i) => `<i>${i < stars ? '⭐' : '☆'}</i>`).join('')}</div>
    <h3>${msg}</h3>
    <p class="muted" style="font-size:.84rem;margin:4px 0 0">${esc(lesson.title)}</p>
    <div class="result-metrics">
      <div><small>答對</small><b>${correct}/${total}</b></div>
      <div><small>正確率</small><b>${Math.round(acc * 100)}%</b></div>
    </div>
    <div class="result-actions">
      <button class="btn" id="ls-again">再練一次</button>
      <button class="btn btn-primary" id="ls-next">${stars > 0 ? '下一課' : '回課程'}</button>
    </div>`);
  showOverlay(card);
  $('#ls-again').onclick = () => { hideOverlay(); startLesson(lesson); };
  $('#ls-next').onclick = () => { hideOverlay(); go('lessons'); };
}

/** 進度小圓點 */
function progressDots(results, total) {
  return `<div class="quiz-progress">${Array.from({ length: total }, (_, i) =>
    `<i class="${results[i] === true ? 'ok' : results[i] === false ? 'no' : ''}"></i>`).join('')}</div>`;
}

/* ---------- 曲目課 ---------- */

function runSongLesson(lesson) {
  const song = getSong(lesson.config.songId);
  if (!song) { toast('找不到這首曲子'); return go('lessons'); }
  startSong(song, {
    hands: lesson.config.hands,
    tempoScale: lesson.config.tempoScale ?? 0.8,
    minAccuracy: lesson.config.minAccuracy ?? 0.6,
    lessonId: lesson.id,
    xp: lesson.xp,
    titleOverride: lesson.title,
    onFinish: () => go('lessons'),
  });
}

/* ---------- 認鍵：說出音名，在鍵盤上找到 ---------- */

function runKeysDrill(lesson) {
  const cfg = lesson.config;
  const rounds = cfg.rounds ?? 10;
  const style = cfg.labelStyle ?? (progress.data.mode === 'kid' ? 'solfege' : 'letter');
  let index = 0, correct = 0, last = null, answered = false;
  const results = [];

  setDock(true);
  $('#dock-hint').textContent = '在鍵盤上找到題目說的那個音';

  let target = null;

  function nextRound() {
    answered = false;
    app.keyboard.clearMarks();
    const pool = cfg.targets.filter((t) => t !== last || cfg.targets.length === 1);
    target = pool[Math.floor(Math.random() * pool.length)];
    last = target;

    const label = labelFor(target, style);
    const extra = style === 'solfege' ? `（${SHARP_NAMES[pitchClass(target)]}）` : '';
    $('#play-prompt').innerHTML = `
      ${progressDots(results, rounds)}
      <div class="big" style="color:${progress.data.mode === 'kid' ? colorOf(target) : 'inherit'}">
        ${esc(cfg.prompt ? cfg.prompt : `彈出 ${label}`)}
      </div>
      <div class="sub">${esc(extra || noteName(target))}${cfg.showHint ? ' · 提示已亮起' : ''}</div>`;
    $('#play-progress-fill').style.width = (index / rounds) * 100 + '%';

    if (cfg.showHint) app.keyboard.mark(target, 'hint');
    audio.noteOn(target, 0.55, 0, 0.7);
  }

  setHandler({
    onNoteOn: (midi) => {
      if (answered) return;
      const ok = midi === target;
      answered = true;
      results[index] = ok;
      if (ok) correct++;
      app.keyboard.mark(midi, ok ? 'good' : 'bad');
      audio.sfx(ok ? 'good' : 'bad');
      if (!ok) {
        app.keyboard.mark(target, 'target');
        $('#play-prompt').querySelector('.sub').textContent =
          `這顆是 ${labelFor(midi, style)}，${labelFor(target, style)} 在亮起來的地方`;
      }
      setTimeout(() => {
        app.keyboard.clearMarks();
        index++;
        if (index >= rounds) finishLesson(lesson, correct, rounds);
        else nextRound();
      }, ok ? 620 : 1500);
    },
  });

  nextRound();
  return { destroy: () => app.keyboard.clearMarks() };
}

/* ---------- 跟彈：依序彈出一串音或和弦 ---------- */

function runSequenceDrill(lesson) {
  const cfg = lesson.config;
  const seq = cfg.chords
    ? cfg.chords.map((c) => ({ midis: c }))
    : cfg.notes.map((m, i) => ({ midis: [m], finger: cfg.fingers?.[i] }));
  const loops = cfg.loops ?? 1;
  const total = seq.length * loops;

  let pos = 0, correct = 0, errors = 0;
  const pressed = new Set();
  const results = [];

  setDock(true);

  function show() {
    const step = seq[pos % seq.length];
    const loop = Math.floor(pos / seq.length) + 1;
    const names = step.midis.map((m) =>
      labelFor(m, progress.settings.labelStyle === 'none' ? 'solfege' : progress.settings.labelStyle)).join(' + ');

    $('#play-prompt').innerHTML = `
      ${progressDots(results, total)}
      <div class="big">${esc(names)}</div>
      <div class="sub">
        第 ${loop} / ${loops} 遍 · 第 ${(pos % seq.length) + 1} / ${seq.length} 個
        ${step.finger ? ` · 用 ${step.finger} 號手指` : ''}
      </div>`;
    $('#play-progress-fill').style.width = (pos / total) * 100 + '%';
    $('#dock-hint').textContent = cfg.tip || '照著亮起來的琴鍵彈';

    app.keyboard.clearMarks();
    app.keyboard.clearBadges();
    if (cfg.showHint !== false) {
      for (const m of step.midis) app.keyboard.mark(m, 'target');
      if (step.finger) app.keyboard.badge(step.midis[0], String(step.finger));
    }
  }

  function advance() {
    results[pos] = errors === 0;
    if (errors === 0) correct++;
    errors = 0;
    pressed.clear();
    pos++;
    if (pos >= total) {
      app.keyboard.clearMarks();
      app.keyboard.clearBadges();
      finishLesson(lesson, correct, total);
    } else show();
  }

  setHandler({
    onNoteOn: (midi) => {
      const step = seq[pos % seq.length];
      if (!step.midis.includes(midi)) {
        errors++;
        app.keyboard.mark(midi, 'bad');
        setTimeout(() => app.keyboard.mark(midi, 'bad', false), 320);
        return;
      }
      pressed.add(midi);
      app.keyboard.mark(midi, 'target', false);
      app.keyboard.mark(midi, 'good');
      setTimeout(() => app.keyboard.mark(midi, 'good', false), 380);
      if (step.midis.every((m) => pressed.has(m))) {
        audio.sfx('good');
        setTimeout(advance, 220);
      }
    },
    onDispose: () => { app.keyboard.clearMarks(); app.keyboard.clearBadges(); },
  });

  // 先示範一次
  const demo = el('button', 'btn', '👂 先聽一次');
  demo.onclick = () => {
    audio.playSequence(seq.map((s, i) => ({ midis: s.midis, time: i * 0.55, duration: 0.5 })));
  };
  $('#play-controls').appendChild(demo);

  if (cfg.tip) toast(cfg.tip, 4500);
  show();
  return { destroy: () => { app.keyboard.clearMarks(); app.keyboard.clearBadges(); } };
}

/* ---------- 視奏：看譜彈鍵 ---------- */

function runReadDrill(lesson) {
  const cfg = lesson.config;
  const rounds = cfg.rounds ?? 10;
  let index = 0, correct = 0, last = null, answered = false;
  const results = [];

  setDock(true);
  const panel = $('#play-staff');
  panel.hidden = false;
  const staff = new Staff(panel, { clef: cfg.clef ?? 'treble', keySig: 0, minWidth: 260, noteSpacing: 80 });

  let target = null;

  function nextRound() {
    answered = false;
    app.keyboard.clearMarks();
    const pool = cfg.pool.filter((t) => t !== last || cfg.pool.length === 1);
    target = pool[Math.floor(Math.random() * pool.length)];
    last = target;
    staff.setNotes([{ midi: target, duration: 'q', hand: target < 60 ? 'l' : 'r' }]);

    $('#play-prompt').innerHTML = `
      ${progressDots(results, rounds)}
      <div class="sub">看譜上的音符，在鍵盤上彈出來</div>`;
    $('#play-progress-fill').style.width = (index / rounds) * 100 + '%';
    $('#dock-hint').textContent = '不確定的話，先找中央 C 再往上下數';
  }

  setHandler({
    onNoteOn: (midi) => {
      if (answered) return;
      const ok = midi === target;
      answered = true;
      results[index] = ok;
      if (ok) correct++;
      app.keyboard.mark(midi, ok ? 'good' : 'bad');
      staff.markNote(0, ok ? 'good' : 'bad');
      audio.sfx(ok ? 'good' : 'bad');
      if (!ok) {
        app.keyboard.mark(target, 'target');
        $('#play-prompt').querySelector('.sub').textContent =
          `這是 ${noteName(target)}，你彈的是 ${noteName(midi)}`;
      }
      setTimeout(() => {
        app.keyboard.clearMarks();
        index++;
        if (index >= rounds) finishLesson(lesson, correct, rounds);
        else nextRound();
      }, ok ? 620 : 1600);
    },
  });

  nextRound();
  return { destroy: () => app.keyboard.clearMarks() };
}

/* ---------- 節奏：跟著節拍器打拍子 ---------- */

function runRhythmDrill(lesson) {
  const cfg = lesson.config;
  const tempo = cfg.tempo ?? 80;
  const beatsPerBar = cfg.beatsPerBar ?? 4;
  const bars = cfg.bars ?? 4;
  const patternBeats = cfg.pattern.reduce((a, b) => a + b, 0);

  // 展開成期待的敲擊時間點（拍）
  const expected = [];
  for (let r = 0; r < bars; r++) {
    let t = r * patternBeats;
    for (const d of cfg.pattern) { expected.push(t); t += d; }
  }
  const total = expected.length;
  const hits = new Array(total).fill(null);

  let pos = -beatsPerBar;      // 預備一小節
  let running = false;
  let lastBeat = -999;
  let raf = null, lastNow = 0;
  const bps = tempo / 60;

  setDock(true);
  $('#dock-hint').textContent = '任何一顆琴鍵都可以，重點是「時間」對不對';

  function render() {
    const done = hits.filter((h) => h !== null).length;
    $('#play-prompt').innerHTML = `
      ${progressDots(hits.map((h) => h === null ? undefined : h !== 'miss'), total)}
      <div class="big">${running ? formatCount() : '準備好了嗎？'}</div>
      <div class="sub">${esc(patternText())} · ${tempo} BPM · 共 ${bars} 遍</div>`;
    $('#play-progress-fill').style.width = Math.max(0, (pos / (bars * patternBeats)) * 100) + '%';
    $('#hud-combo').textContent = done;
  }

  function formatCount() {
    if (pos < 0) return String(Math.ceil(-pos));
    return String(Math.floor(pos % beatsPerBar) + 1);
  }

  const patternText = () => cfg.pattern.map((d) =>
    d === 2 ? '𝅗𝅥' : d === 1.5 ? '♩.' : d === 1 ? '♩' : d === 0.5 ? '♪' : `${d}`).join(' ');

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - (lastNow || now)) / 1000);
    lastNow = now;
    if (!running) return;

    pos += dt * bps;

    const beat = Math.floor(pos);
    if (beat !== lastBeat) {
      lastBeat = beat;
      audio.click(((beat % beatsPerBar) + beatsPerBar) % beatsPerBar === 0);
      render();
    }

    // 漏掉的敲擊
    for (let i = 0; i < total; i++) {
      if (hits[i] === null && pos > expected[i] + 0.4) hits[i] = 'miss';
    }

    if (pos > bars * patternBeats + 0.5) {
      running = false;
      cancelAnimationFrame(raf);
      const good = hits.filter((h) => h && h !== 'miss').length;
      finishLesson(lesson, good, total);
    }
  }

  setHandler({
    onNoteOn: () => {
      if (!running) { start(); return; }
      let best = -1, bestD = Infinity;
      for (let i = 0; i < total; i++) {
        if (hits[i] !== null) continue;
        const d = Math.abs(expected[i] - pos);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best < 0 || bestD > 0.45) return;
      hits[best] = bestD <= 0.12 ? 'perfect' : 'good';
      audio.sfx('good');
      render();
    },
    onDispose: () => { running = false; cancelAnimationFrame(raf); },
  });

  function start() {
    running = true;
    lastNow = performance.now();
    pos = -beatsPerBar;
    lastBeat = -999;
    hits.fill(null);
    render();
  }

  const btn = el('button', 'btn btn-primary', '▶ 開始（或直接彈任一鍵）');
  btn.onclick = start;
  $('#play-controls').appendChild(btn);

  raf = requestAnimationFrame(loop);
  render();
  return { destroy: () => { running = false; cancelAnimationFrame(raf); } };
}

/* ---------- 聽力課 ---------- */

function runEarLesson(lesson) {
  setDock(lesson.config.mode === 'match-note');
  const holder = $('#play-prompt');
  const drill = createEarDrill(holder, lesson.config, ({ correct, total }) => {
    finishLesson(lesson, correct, total);
  });
  return drill;
}

/* ---------- 樂理概念卡 ---------- */

function runTheoryLesson(lesson) {
  const cards = lesson.config.cards;
  let index = 0, correct = 0, answered = false;
  const results = [];

  setDock(false);

  function render() {
    const card = cards[index];
    $('#play-prompt').innerHTML = `
      <div class="quiz-card" style="text-align:left">
        ${progressDots(results, cards.length)}
        <div class="quiz-q">${esc(card.q)}</div>
        <div class="quiz-options" id="th-opts"></div>
        <div id="th-explain"></div>
      </div>`;
    $('#play-progress-fill').style.width = (index / cards.length) * 100 + '%';

    const opts = $('#th-opts');
    card.options.forEach((text, i) => {
      const b = el('button', null, esc(text));
      b.onclick = () => choose(i);
      opts.appendChild(b);
    });
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    const card = cards[index];
    const ok = i === card.answer;
    results[index] = ok;
    if (ok) correct++;
    audio.sfx(ok ? 'good' : 'bad');

    const buttons = [...$('#th-opts').children];
    buttons[card.answer]?.classList.add('correct');
    if (!ok) buttons[i]?.classList.add('wrong');
    $('#th-explain').innerHTML = `<div class="quiz-explain">💡 ${esc(card.explain)}</div>`;

    const next = el('button', 'btn btn-primary', index + 1 >= cards.length ? '看結果' : '下一題 →');
    next.style.marginTop = '14px';
    next.onclick = () => {
      index++;
      answered = false;
      if (index >= cards.length) finishLesson(lesson, correct, cards.length);
      else render();
    };
    $('#th-explain').appendChild(next);
  }

  render();
  return { destroy: () => {} };
}
