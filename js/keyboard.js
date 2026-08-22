/* keyboard.js — 螢幕鋼琴鍵盤：滑鼠、觸控、電腦鍵盤輸入 + 教學提示高亮 */

import { isBlackKey, labelFor, colorOf, pitchClass, octaveOf } from './theory.js';

/* 唱名／簡譜在黑鍵上會塞不下，而且初學者也不需要，所以只在音名模式顯示 */
function keyLabel(midi, style) {
  if (isBlackKey(midi) && (style === 'solfege' || style === 'number')) return '';
  return labelFor(midi, style);
}

/* 電腦鍵盤對應（以 anchor 為 Do）：白鍵在中排、黑鍵在上排 */
const COMPUTER_KEYS = {
  KeyA: 0,  KeyW: 1,  KeyS: 2,  KeyE: 3,  KeyD: 4,  KeyF: 5,  KeyT: 6,
  KeyG: 7,  KeyY: 8,  KeyH: 9,  KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13,
  KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17,
};

export class PianoKeyboard {
  constructor(container, options = {}) {
    this.el = container;
    this.opts = Object.assign({
      low: 48,              // C3
      high: 84,             // C6
      labelStyle: 'none',   // none | letter | solfege | number | full
      colorful: false,      // 小朋友模式的彩虹鍵
      computerKeys: true,
      anchor: 60,           // 電腦鍵盤的起始音
      onNoteOn: () => {},
      onNoteOff: () => {},
    }, options);

    this.keys = new Map();        // midi -> element
    this.pressed = new Set();
    this.pointerNotes = new Map(); // pointerId -> midi
    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);

    this.el.classList.add('keyboard');
    this.render();
    this._attachPointer();
    if (this.opts.computerKeys) this.enableComputerKeys();
  }

  /* ---------- 繪製 ---------- */

  render() {
    let { low, high } = this.opts;
    while (isBlackKey(low) && low > 0) low--;          // 起訖都對齊白鍵
    while (isBlackKey(high) && high < 127) high++;
    this.low = low;
    this.high = high;

    const whites = [];
    for (let m = low; m <= high; m++) if (!isBlackKey(m)) whites.push(m);
    const whiteW = 100 / whites.length;
    const blackW = whiteW * 0.62;

    this.el.innerHTML = '';
    this.keys.clear();

    const whiteLayer = document.createElement('div');
    whiteLayer.className = 'kb-whites';
    const blackLayer = document.createElement('div');
    blackLayer.className = 'kb-blacks';

    whites.forEach((m, i) => {
      whiteLayer.appendChild(this._makeKey(m, false, { left: i * whiteW, width: whiteW }));
    });

    for (let m = low; m <= high; m++) {
      if (!isBlackKey(m)) continue;
      const whiteIdx = whites.findIndex((w) => w > m);      // 右邊那顆白鍵
      if (whiteIdx <= 0) continue;
      blackLayer.appendChild(
        this._makeKey(m, true, { left: whiteIdx * whiteW - blackW / 2, width: blackW })
      );
    }

    this.el.appendChild(whiteLayer);
    this.el.appendChild(blackLayer);
    this.setColorful(this.opts.colorful);
  }

  _makeKey(midi, black, pos) {
    const k = document.createElement('div');
    k.className = 'key ' + (black ? 'black' : 'white');
    k.dataset.midi = midi;
    k.style.left = pos.left + '%';
    k.style.width = pos.width + '%';

    const label = document.createElement('span');
    label.className = 'key-label';
    label.textContent = keyLabel(midi, this.opts.labelStyle);
    k.appendChild(label);

    // 中央 C 永遠標記出來，方便找位置
    if (midi === 60) {
      const dot = document.createElement('span');
      dot.className = 'middle-c-dot';
      dot.title = '中央 C';
      k.appendChild(dot);
    }
    this.keys.set(midi, k);
    return k;
  }

  setLabelStyle(style) {
    this.opts.labelStyle = style;
    for (const [midi, el] of this.keys) {
      el.querySelector('.key-label').textContent = keyLabel(midi, style);
    }
  }

  setColorful(on) {
    this.opts.colorful = on;
    this.el.classList.toggle('colorful', !!on);
    for (const [midi, el] of this.keys) {
      el.style.setProperty('--note-color', colorOf(midi));
    }
  }

  setRange(low, high) {
    this.opts.low = low;
    this.opts.high = high;
    this.render();
  }

  /* ---------- 輸入 ---------- */

  _midiFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const key = el && el.closest ? el.closest('.key') : null;
    if (!key || !this.el.contains(key)) return null;
    return parseInt(key.dataset.midi, 10);
  }

  _attachPointer() {
    const down = (e) => {
      const midi = this._midiFromEvent(e);
      if (midi == null) return;
      e.preventDefault();
      this.pointerNotes.set(e.pointerId, midi);
      this._fireOn(midi, this._velocityFrom(e, midi));
    };
    const move = (e) => {
      if (!this.pointerNotes.has(e.pointerId)) return;
      const midi = this._midiFromEvent(e);
      const prev = this.pointerNotes.get(e.pointerId);
      if (midi === prev) return;
      if (prev != null) this._fireOff(prev);
      if (midi != null) {                       // 滑音
        this.pointerNotes.set(e.pointerId, midi);
        this._fireOn(midi, 0.6);
      } else {
        this.pointerNotes.delete(e.pointerId);
      }
    };
    const up = (e) => {
      const midi = this.pointerNotes.get(e.pointerId);
      if (midi == null) return;
      this.pointerNotes.delete(e.pointerId);
      this._fireOff(midi);
    };

    this.el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** 觸控位置越靠近琴鍵下緣，力度越大（模擬真實觸鍵） */
  _velocityFrom(e, midi) {
    const key = this.keys.get(midi);
    if (!key) return 0.8;
    const r = key.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    return 0.45 + ratio * 0.5;
  }

  enableComputerKeys() {
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
  }

  disableComputerKeys() {
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
  }

  setAnchor(midi) { this.opts.anchor = midi; }

  _onKeyDown(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

    // 左右方向鍵移動電腦鍵盤的八度
    if (e.code === 'ArrowLeft')  { this.setAnchor(Math.max(24, this.opts.anchor - 12)); return; }
    if (e.code === 'ArrowRight') { this.setAnchor(Math.min(96, this.opts.anchor + 12)); return; }

    const offset = COMPUTER_KEYS[e.code];
    if (offset === undefined) return;
    e.preventDefault();
    const midi = this.opts.anchor + offset;
    if (this.pressed.has(midi)) return;
    this._fireOn(midi, 0.78);
  }

  _onKeyUp(e) {
    const offset = COMPUTER_KEYS[e.code];
    if (offset === undefined) return;
    this._fireOff(this.opts.anchor + offset);
  }

  /* ---------- 觸發 / 視覺 ---------- */

  _fireOn(midi, velocity) {
    if (this.pressed.has(midi)) return;
    this.pressed.add(midi);
    this.setPressed(midi, true);
    this.opts.onNoteOn(midi, velocity);
  }

  _fireOff(midi) {
    if (!this.pressed.has(midi)) return;
    this.pressed.delete(midi);
    this.setPressed(midi, false);
    this.opts.onNoteOff(midi);
  }

  /** 外部（MIDI 鍵盤、示範播放）觸發時同步視覺 */
  setPressed(midi, on) {
    const k = this.keys.get(midi);
    if (k) k.classList.toggle('pressed', on);
  }

  /** 提示高亮：kind = hint | target | good | bad | scale */
  mark(midi, kind, on = true) {
    const k = this.keys.get(midi);
    if (k) k.classList.toggle('mk-' + kind, on);
  }

  clearMarks(kind = null) {
    const kinds = kind ? [kind] : ['hint', 'target', 'good', 'bad', 'scale'];
    for (const el of this.keys.values()) {
      for (const kd of kinds) el.classList.remove('mk-' + kd);
    }
  }

  /** 在琴鍵上顯示一個浮動文字（例如指法或唱名） */
  badge(midi, text) {
    const k = this.keys.get(midi);
    if (!k) return;
    let b = k.querySelector('.key-badge');
    if (!b) {
      b = document.createElement('span');
      b.className = 'key-badge';
      k.appendChild(b);
    }
    b.textContent = text;
    b.style.display = text ? '' : 'none';
  }

  clearBadges() {
    this.el.querySelectorAll('.key-badge').forEach((b) => b.remove());
  }

  /** 供落下音符畫布使用：取得每個鍵在容器內的座標 */
  geometry() {
    const base = this.el.getBoundingClientRect();
    const out = new Map();
    for (const [midi, el] of this.keys) {
      const r = el.getBoundingClientRect();
      out.set(midi, {
        x: r.left - base.left,
        w: r.width,
        black: isBlackKey(midi),
      });
    }
    return { keys: out, width: base.width, height: base.height };
  }

  destroy() {
    this.disableComputerKeys();
    this.el.innerHTML = '';
  }
}
