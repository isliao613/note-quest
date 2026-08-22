/* modes/player.js — 曲目演奏：落下音符、等待模式、即時評分與自動伴奏 */

import { audio } from '../audio.js';
import { progress } from '../progress.js';
import {
  $, $$, el, esc, app, setHandler, setDock, go, toast,
  showOverlay, hideOverlay, refreshHeader, checkStickers, starStr,
} from '../app.js';
import { expandSong, toSteps, songLength } from '../songs.js';
import { colorOf, labelFor, SOLFEGE, pitchClass, SHARP_NAMES } from '../theory.js';
import { Staff } from '../staff.js';

const LOOKAHEAD_BEATS = 3.6;      // 畫面上一次看得到幾拍
const HIT_WINDOW = 0.62;          // 自由模式的判定窗（拍）

let current = null;               // 目前的 Player 實例

export function startSong(song, opts = {}) {
  stopPlayer();
  current = new Player(song, opts);
  current.mount();
  return current;
}

export function stopPlayer() {
  if (current) { current.destroy(); current = null; }
}

class Player {
  constructor(song, opts) {
    this.song = song;
    this.opts = Object.assign({
      hands: 'right',
      tempoScale: progress.settings.tempoScale || 1,
      waitMode: progress.settings.waitMode,
      lessonId: null,
      minAccuracy: 0.6,
      onFinish: null,
      titleOverride: null,
      tip: null,
    }, opts);

    this.demo = false;
    this.playing = false;
    this.waiting = false;
    this.pos = 0;                  // 目前位置（拍）
    this.cur = 0;                  // 下一個要彈的 step
    this.pressed = new Set();      // 等待模式中已按對的音
    this.judged = [];              // 每個 step 的判定結果
    this.combo = 0; this.maxCombo = 0; this.score = 0;
    this.wrongCount = 0;
    this.firedAccomp = new Set();
    this.lastBeatClicked = -1;
    this.rebuild();
  }

  /* ---------- 資料 ---------- */

  rebuild() {
    const hands = this.opts.hands;
    const all = expandSong(this.song, { hands: 'both' });
    const targetHand = hands === 'both' ? null : (hands === 'left' ? 'l' : 'r');

    this.targets = all.filter((n) => !targetHand || n.hand === targetHand);
    this.accomp = all.filter((n) => targetHand && n.hand !== targetHand);
    this.steps = toSteps(this.targets);
    this.judged = new Array(this.steps.length).fill(null);
    this.totalBeats = songLength(all) || 1;

    // 沒有左手聲部時，「雙手」等同右手
    if (hands === 'both' && !this.song.lh) this.opts.hands = 'right';
  }

  get bps() { return (this.song.tempo * this.opts.tempoScale) / 60; }
  get beatsPerBar() { return this.song.timeSig?.[0] ?? 4; }

  /* ---------- 畫面 ---------- */

  mount() {
    $('#play-title').textContent = this.opts.titleOverride || this.song.title;
    $('#play-sub').textContent = this.song.subtitle || '';
    // 清掉上一課留下來的內容
    $('#play-prompt').innerHTML = '';
    $('#play-staff').innerHTML = '';
    $('#play-staff').hidden = true;
    setDock(true, { fall: true });

    this.canvas = $('#fall-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize = () => this.resizeCanvas();
    window.addEventListener('resize', this._resize);
    window.addEventListener('dockresize', this._resize);
    this.resizeCanvas();

    this.renderControls();
    this.renderStaff();
    this.reset();

    setHandler({
      onNoteOn: (midi) => this.onUserNote(midi),
      onNoteOff: () => {},
      onDispose: () => this.destroy(),
    });

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);

    // 提示直接留在畫面上，不用快閃的 toast 蓋住落下的音符
    const tip = this.opts.tip || this.song.hint;
    if (tip) $('#play-prompt').innerHTML = `<div class="sub">💡 ${esc(tip)}</div>`;
  }

  renderControls() {
    const c = $('#play-controls');
    c.innerHTML = '';

    this.btnPlay = el('button', 'btn btn-primary', '▶ 開始');
    this.btnPlay.onclick = () => this.toggle();
    c.appendChild(this.btnPlay);

    const restart = el('button', 'btn', '↻ 重來');
    restart.onclick = () => this.reset();
    c.appendChild(restart);

    const demo = el('button', 'btn', '👂 示範');
    demo.onclick = () => this.startDemo();
    c.appendChild(demo);

    // 速度
    const speed = el('div', 'ctl-group');
    speed.innerHTML = '<span>速度</span>';
    const range = el('input');
    range.type = 'range'; range.min = '0.4'; range.max = '1.3'; range.step = '0.05';
    range.value = this.opts.tempoScale;
    const out = el('b', null, Math.round(this.opts.tempoScale * 100) + '%');
    range.oninput = () => {
      this.opts.tempoScale = parseFloat(range.value);
      out.textContent = Math.round(this.opts.tempoScale * 100) + '%';
      progress.setSetting('tempoScale', this.opts.tempoScale);
    };
    speed.append(range, out);
    c.appendChild(speed);

    // 手別
    if (this.song.lh) {
      const hands = el('div', 'ctl-group');
      hands.innerHTML = '<span>練習</span>';
      const sel = el('select');
      sel.innerHTML = `
        <option value="right">右手</option>
        <option value="left">左手</option>
        <option value="both">雙手</option>`;
      sel.value = this.opts.hands;
      sel.onchange = () => { this.opts.hands = sel.value; this.rebuild(); this.renderStaff(); this.reset(); };
      hands.appendChild(sel);
      c.appendChild(hands);
    }

    // 等待模式
    this.btnWait = el('button', 'btn' + (this.opts.waitMode ? ' on' : ''), '⏸ 等待模式');
    this.btnWait.onclick = () => {
      this.opts.waitMode = !this.opts.waitMode;
      progress.setSetting('waitMode', this.opts.waitMode);
      this.btnWait.classList.toggle('on', this.opts.waitMode);
      this.waiting = false;
      app.keyboard.clearMarks('target');
    };
    c.appendChild(this.btnWait);

    // 節拍器
    this.metro = progress.settings.metronome;
    this.btnMetro = el('button', 'btn' + (this.metro ? ' on' : ''), '🥁 節拍器');
    this.btnMetro.onclick = () => {
      this.metro = !this.metro;
      progress.setSetting('metronome', this.metro);
      this.btnMetro.classList.toggle('on', this.metro);
    };
    c.appendChild(this.btnMetro);

    // 樂譜
    this.btnStaff = el('button', 'btn' + (progress.settings.showStaff ? ' on' : ''), '🎼 樂譜');
    this.btnStaff.onclick = () => {
      progress.setSetting('showStaff', !progress.settings.showStaff);
      this.btnStaff.classList.toggle('on', progress.settings.showStaff);
      this.renderStaff();
    };
    c.appendChild(this.btnStaff);
  }

  renderStaff() {
    const panel = $('#play-staff');
    if (!progress.settings.showStaff) { panel.hidden = true; this.staff = null; return; }
    panel.hidden = false;
    const clef = this.opts.hands === 'both' ? 'grand'
      : this.opts.hands === 'left' ? 'bass' : 'treble';
    this.staff = new Staff(panel, { clef, keySig: this.song.keySig || 0, noteSpacing: 42 });
    this.staff.setNotes(this.steps.map((s) => ({
      midis: s.midis,
      duration: s.beats >= 4 ? 'w' : s.beats >= 2 ? 'h' : s.beats >= 1 ? 'q' : 'e',
      lyric: s.lyric,
    })));
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cw = rect.width;
    this.ch = rect.height;
    this.geom = app.keyboard.geometry();
  }

  /* ---------- 播放控制 ---------- */

  reset() {
    this.playing = false;
    this.waiting = false;
    this.demo = false;
    this.pos = -this.beatsPerBar;          // 預備一小節
    this.cur = 0;
    this.pressed.clear();
    this.judged.fill(null);
    this.combo = 0; this.maxCombo = 0; this.score = 0; this.wrongCount = 0;
    this.firedAccomp.clear();
    this.lastBeatClicked = -1;
    this.finished = false;
    audio.allNotesOff();
    app.keyboard.clearMarks();
    app.keyboard.clearBadges();
    this.staff?.clearMarks();
    if (this.btnPlay) this.btnPlay.textContent = '▶ 開始';
    this.updateHud();
    this.setHint('按「開始」，音符掉到鍵盤上時就彈下去');
  }

  toggle() {
    if (this.finished) { this.reset(); }
    this.playing = !this.playing;
    this.btnPlay.textContent = this.playing ? '⏸ 暫停' : '▶ 繼續';
    if (!this.playing) audio.allNotesOff();
    this.lastNow = performance.now();
  }

  startDemo() {
    this.reset();
    this.demo = true;
    this.playing = true;
    this.btnPlay.textContent = '⏸ 暫停';
    this.lastNow = performance.now();
    this.setHint('示範播放中 — 看清楚每個音落在哪顆琴鍵上');
  }

  /* ---------- 主迴圈 ---------- */

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - (this.lastNow ?? now)) / 1000);
    this.lastNow = now;

    if (this.playing && !this.waiting) {
      this.pos += dt * this.bps;
      this.fireAccompaniment();
      this.tickMetronome();
      if (!this.demo) this.checkMisses();
      if (this.demo) this.autoPlaySteps();
      this.checkWait();
      if (this.pos > this.totalBeats + 1.5) this.finish();
    }

    this.draw();
    this.updateProgress();
  }

  /** 自動播放非練習手的聲部 */
  fireAccompaniment() {
    for (const n of this.accomp) {
      if (n.start > this.pos) break;
      if (this.firedAccomp.has(n)) continue;
      this.firedAccomp.add(n);
      // 時間軸剛往前跳過的音就不要補彈，否則會一次全部擠在一起
      if (this.pos - n.start > 0.3) continue;
      const dur = (n.beats / this.bps) * 0.95;
      for (const m of n.midis) {
        audio.noteOn(m, 0.5, 0, dur);
        app.keyboard.setPressed(m, true);
        setTimeout(() => app.keyboard.setPressed(m, false), dur * 1000);
      }
    }
  }

  /** 示範模式：自動彈出練習手的音 */
  autoPlaySteps() {
    while (this.cur < this.steps.length && this.steps[this.cur].start <= this.pos) {
      const step = this.steps[this.cur];
      const dur = (step.beats / this.bps) * 0.92;
      for (const m of step.midis) {
        audio.noteOn(m, 0.8, 0, dur);
        app.keyboard.setPressed(m, true);
        setTimeout(() => app.keyboard.setPressed(m, false), dur * 1000);
      }
      this.staff?.highlight(this.cur);
      this.cur++;
    }
  }

  tickMetronome() {
    if (!this.metro) return;
    const beat = Math.floor(this.pos);
    if (beat !== this.lastBeatClicked && this.pos >= -this.beatsPerBar) {
      this.lastBeatClicked = beat;
      audio.click(((beat % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar === 0);
    }
  }

  /** 等待模式：音符到了就停下來等使用者 */
  checkWait() {
    if (!this.opts.waitMode || this.demo) return;
    const step = this.steps[this.cur];
    if (!step) return;
    if (this.pos >= step.start) {
      this.pos = step.start;
      this.waiting = true;
      this.highlightTargets(step);
    }
  }

  highlightTargets(step) {
    app.keyboard.clearMarks('target');
    app.keyboard.clearBadges();
    for (const m of step.midis) {
      if (!this.pressed.has(m)) app.keyboard.mark(m, 'target');
    }
    if (step.finger) app.keyboard.badge(step.midis[0], String(step.finger));
    this.staff?.highlight(this.cur);
    this.setHint(this.describeStep(step));
  }

  describeStep(step) {
    const names = step.midis.map((m) => {
      const style = progress.settings.labelStyle === 'none' ? 'solfege' : progress.settings.labelStyle;
      return labelFor(m, style === 'full' ? 'letter' : style);
    }).join(' + ');
    const finger = step.finger ? ` · ${step.finger} 號手指` : '';
    const lyric = step.lyric ? ` · 「${step.lyric}」` : '';
    return `下一個音：${names}${finger}${lyric}`;
  }

  /** 自由模式：過了判定窗還沒彈就算漏掉 */
  checkMisses() {
    if (this.opts.waitMode) return;
    while (this.cur < this.steps.length && this.pos > this.steps[this.cur].start + HIT_WINDOW) {
      this.judge(this.cur, 'miss');
      this.cur++;
    }
  }

  /* ---------- 使用者輸入 ---------- */

  onUserNote(midi) {
    if (this.demo) return;
    if (!this.playing && !this.finished) { this.toggle(); }

    if (this.opts.waitMode) return this.handleWaitInput(midi);
    return this.handleFreeInput(midi);
  }

  handleWaitInput(midi) {
    const step = this.steps[this.cur];
    if (!step) return;
    if (!step.midis.includes(midi)) {
      this.wrongCount++;
      this.combo = 0;
      app.keyboard.mark(midi, 'bad');
      setTimeout(() => app.keyboard.mark(midi, 'bad', false), 320);
      this.updateHud();
      return;
    }
    this.pressed.add(midi);
    app.keyboard.mark(midi, 'target', false);
    app.keyboard.mark(midi, 'good');
    setTimeout(() => app.keyboard.mark(midi, 'good', false), 400);

    if (step.midis.every((m) => this.pressed.has(m))) {
      this.judge(this.cur, 'good');
      this.pressed.clear();
      app.keyboard.clearMarks('target');
      app.keyboard.clearBadges();
      // 玩家搶拍彈對時，把時間軸推進到這個音符，畫面才不會跟進度脫節
      this.pos = Math.max(this.pos, step.start);
      this.cur++;
      this.waiting = false;
      if (this.cur >= this.steps.length) this.finish();
      else this.highlightTargets(this.steps[this.cur]);
    }
  }

  handleFreeInput(midi) {
    // 找出判定窗內、還沒判定過、且包含這個音的 step
    let best = -1, bestDelta = Infinity;
    for (let i = Math.max(0, this.cur - 2); i < this.steps.length; i++) {
      const s = this.steps[i];
      if (s.start > this.pos + HIT_WINDOW) break;
      if (this.judged[i]) continue;
      if (!s.midis.includes(midi)) continue;
      const d = Math.abs(s.start - this.pos);
      if (d < bestDelta) { bestDelta = d; best = i; }
    }
    if (best < 0) {
      this.wrongCount++;
      this.combo = 0;
      app.keyboard.mark(midi, 'bad');
      setTimeout(() => app.keyboard.mark(midi, 'bad', false), 300);
      this.updateHud();
      return;
    }
    const grade = bestDelta <= 0.14 ? 'perfect' : bestDelta <= 0.32 ? 'good' : 'ok';
    this.judge(best, grade);
    app.keyboard.mark(midi, 'good');
    setTimeout(() => app.keyboard.mark(midi, 'good', false), 260);
    if (best >= this.cur) this.cur = best + 1;
    if (this.cur >= this.steps.length) setTimeout(() => this.finish(), 400);
  }

  judge(index, grade) {
    if (this.judged[index]) return;
    this.judged[index] = grade;
    const pts = { perfect: 100, good: 80, ok: 50, miss: 0 }[grade];
    if (grade === 'miss') {
      this.combo = 0;
      this.staff?.markNote(index, 'bad');
    } else {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += pts + Math.min(50, this.combo * 2);
      this.staff?.markNote(index, 'good');
    }
    this.updateHud();
  }

  /* ---------- HUD 與繪圖 ---------- */

  updateHud() {
    const done = this.judged.filter(Boolean).length;
    const hit = this.judged.filter((g) => g && g !== 'miss').length;
    const acc = done ? hit / done : 0;
    $('#hud-acc').textContent = done ? Math.round(acc * 100) + '%' : '—';
    $('#hud-combo').textContent = this.combo;
    $('#hud-score').textContent = this.score;
  }

  updateProgress() {
    const p = Math.max(0, Math.min(1, this.pos / this.totalBeats));
    $('#play-progress-fill').style.width = p * 100 + '%';
  }

  setHint(text) { $('#dock-hint').textContent = text; }

  draw() {
    const ctx = this.ctx;
    if (!ctx || !this.cw) return;
    const W = this.cw, H = this.ch;
    ctx.clearRect(0, 0, W, H);
    if (!this.geom || this.geom.width !== W) this.geom = app.keyboard.geometry();

    const pxPerBeat = H / LOOKAHEAD_BEATS;
    const kid = progress.data.mode === 'kid';

    // 節拍格線
    ctx.strokeStyle = 'rgba(128,140,160,.16)';
    ctx.lineWidth = 1;
    const firstBeat = Math.ceil(this.pos);
    for (let b = firstBeat; b < this.pos + LOOKAHEAD_BEATS; b++) {
      const y = H - (b - this.pos) * pxPerBeat;
      const bar = ((b % this.beatsPerBar) + this.beatsPerBar) % this.beatsPerBar === 0;
      ctx.globalAlpha = bar ? 1 : 0.45;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 音符
    const drawList = [
      ...this.accomp.map((n) => ({ n, target: false })),
      ...this.targets.map((n) => ({ n, target: true })),
    ];
    for (const { n, target } of drawList) {
      const rel = n.start - this.pos;
      if (rel > LOOKAHEAD_BEATS || rel + n.beats < -0.6) continue;
      for (const midi of n.midis) {
        const g = this.geom.keys.get(midi);
        if (!g) continue;
        const h = Math.max(9, n.beats * pxPerBeat - 3);
        const yBottom = H - rel * pxPerBeat;
        const y = yBottom - h;
        const pad = g.black ? 1 : 2.5;
        const x = g.x + pad, w = g.w - pad * 2;

        let color = kid ? colorOf(midi) : (n.hand === 'l' ? '#a78bfa' : '#38bdf8');
        if (!target) { ctx.globalAlpha = 0.3; } else { ctx.globalAlpha = rel < -0.05 ? 0.4 : 1; }

        roundRect(ctx, x, y, w, h, Math.min(6, w / 2));
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;

        // 音符上的字（唱名或指法）
        if (target && h > 17 && w > 15) {
          ctx.fillStyle = 'rgba(255,255,255,.95)';
          ctx.font = `700 ${Math.min(11, w * 0.55)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          const style = progress.settings.labelStyle;
          const txt = style === 'none' || style === 'full'
            ? SOLFEGE[pitchClass(midi)] : labelFor(midi, style);
          ctx.fillText(txt, x + w / 2, y + h - 6);
        }
      }
    }

    // 判定線
    ctx.fillStyle = kid ? 'rgba(249,115,22,.85)' : 'rgba(56,189,248,.85)';
    ctx.fillRect(0, H - 3, W, 3);

    if (this.waiting) {
      ctx.fillStyle = kid ? 'rgba(249,115,22,.1)' : 'rgba(56,189,248,.09)';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------- 結算 ---------- */

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.playing = false;
    this.waiting = false;
    audio.allNotesOff();
    app.keyboard.clearMarks();
    app.keyboard.clearBadges();
    if (this.btnPlay) this.btnPlay.textContent = '▶ 開始';

    if (this.demo) { this.setHint('示範結束，換你試試看！'); this.demo = false; return; }

    const total = this.steps.length || 1;
    const hit = this.judged.filter((g) => g && g !== 'miss').length;
    const perfect = this.judged.filter((g) => g === 'perfect').length;
    const penalty = Math.min(0.25, this.wrongCount / (total * 4));
    const accuracy = Math.max(0, hit / total - penalty);

    const stars = accuracy >= 0.95 ? 3 : accuracy >= 0.8 ? 2
      : accuracy >= this.opts.minAccuracy ? 1 : 0;

    progress.recordSong(this.song.id, { accuracy, score: this.score, stars });
    if (this.opts.lessonId && stars > 0) {
      progress.completeLesson(this.opts.lessonId, stars, this.opts.xp ?? 40);
    }
    refreshHeader();
    checkStickers();
    audio.sfx(stars >= 2 ? 'win' : stars === 1 ? 'good' : 'bad');

    this.showResult({ stars, accuracy, perfect, total });
  }

  showResult({ stars, accuracy, total }) {
    const kid = progress.data.mode === 'kid';
    const messages = stars === 3
      ? (kid ? '太厲害了！完美演出 🎉' : '完美演奏')
      : stars === 2 ? (kid ? '彈得很棒喔！' : '表現很好')
      : stars === 1 ? (kid ? '過關了，再練一次會更好' : '通過，再多練幾次')
      : (kid ? '差一點點，我們再試一次！' : '再試一次');

    const card = el('div', 'result-card', `
      <div class="result-stars">${[0, 1, 2].map((i) => `<i>${i < stars ? '⭐' : '☆'}</i>`).join('')}</div>
      <h3>${messages}</h3>
      <p class="muted" style="font-size:.84rem;margin:4px 0 0">${esc(this.song.title)}</p>
      <div class="result-metrics">
        <div><small>準確度</small><b>${Math.round(accuracy * 100)}%</b></div>
        <div><small>最高連擊</small><b>${this.maxCombo}</b></div>
        <div><small>分數</small><b>${this.score}</b></div>
      </div>
      <div class="result-actions">
        <button class="btn" id="res-again">再彈一次</button>
        <button class="btn btn-primary" id="res-done">完成</button>
      </div>`);
    showOverlay(card);
    $('#res-again').onclick = () => { hideOverlay(); this.reset(); };
    $('#res-done').onclick = () => {
      hideOverlay();
      if (this.opts.onFinish) this.opts.onFinish({ stars, accuracy });
      else go(app.lastListScreen);
    };
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('dockresize', this._resize);
    audio.allNotesOff();
    if (current === this) current = null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
