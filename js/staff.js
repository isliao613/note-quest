/* staff.js — SVG 五線譜渲染：譜號、調號、音符、加線、符桿與符尾 */

import { pitchClass, octaveOf, SHARP_ORDER, FLAT_ORDER } from './theory.js';

const SP = 12;               // 線距
const STAFF_H = SP * 4;      // 譜表高度（48）
const BASS_OFFSET = 108;     // 大譜表中低音譜表的垂直位移

/* pitch class -> 音級（C=0 D=1 ...）與臨時記號 */
const SHARP_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const SHARP_ACC  = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const FLAT_STEP  = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const FLAT_ACC   = [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0];

const STEP_E4 = 4 * 7 + 2;   // 高音譜表最下線 E4
const STEP_G2 = 2 * 7 + 4;   // 低音譜表最下線 G2

/* 調號記號的音高位置（音級） */
const SHARP_KEY_STEPS_TREBLE = [38, 35, 39, 36, 33, 37, 34];        // F5 C5 G5 D5 A4 E5 B4
const FLAT_KEY_STEPS_TREBLE  = [34, 37, 33, 36, 32, 35, 31];        // B4 E5 A4 D5 G4 C5 F4

const svgEl = (name, attrs = {}) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/** 音高 -> 音級與臨時記號 */
export function toStep(midi, useFlats = false) {
  const pc = pitchClass(midi);
  const oct = octaveOf(midi);
  const step = useFlats ? FLAT_STEP[pc] : SHARP_STEP[pc];
  const acc = useFlats ? FLAT_ACC[pc] : SHARP_ACC[pc];
  return { step: oct * 7 + step, acc };
}

/* ---------- 譜號（純 SVG 路徑，不依賴任何字型） ---------- */

/** 高音譜號：螺旋捲曲的圓心落在 G4 線上 */
function trebleClefPath(gy) {
  const cx = 20;
  const rOuter = 15, rInner = 1.5, turns = 2.15;
  const k = Math.log(rOuter / rInner) / (turns * 2 * Math.PI);
  const pts = [];
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const r = rOuter * Math.exp(-k * t);
    const a = Math.PI - t;                     // 從左側切入，順勢往圓心收攏
    pts.push([cx + r * Math.cos(a), gy + r * Math.sin(a)]);
  }
  const top = gy - 36;      // 譜號頂端
  const tail = gy + 35;     // 尾巴末端
  return [
    `M ${cx - 12},${tail + 1}`,                                                  // 尾巴尖端
    `C ${cx - 14},${tail - 7} ${cx - 5},${tail - 11} ${cx + 1},${tail - 13}`,    // 勾回琴桿底部
    `C ${cx + 3},${tail - 16} ${cx + 2},${tail - 22} ${cx + 2},${gy + 4}`,
    `C ${cx + 2},${gy - 20} ${cx - 2},${top + 10} ${cx - 2},${top}`,             // 琴桿往上
    `C ${cx - 2},${top - 7} ${cx - 11},${top - 6} ${cx - 12},${top + 3}`,        // 頂端的勾
    `C ${cx - 14},${top + 12} ${cx - 16},${gy - 18} ${cx - rOuter},${gy}`,       // 左側腹部下降
    ...pts.slice(1).map(([px, py]) => `L ${px.toFixed(2)},${py.toFixed(2)}`),    // 螺旋捲曲
  ].join(' ');
}

/** 低音譜號：圓點落在 F 線上 */
function bassClefPath(fy) {
  const x = 8;
  return [
    `M ${x + 2},${fy}`,
    `C ${x + 2},${fy - 8} ${x + 12},${fy - 10} ${x + 18},${fy - 4}`,
    `C ${x + 25},${fy + 3} ${x + 20},${fy + 18} ${x + 10},${fy + 26}`,
    `C ${x + 5},${fy + 30} ${x},${fy + 33} ${x - 4},${fy + 34}`,
  ].join(' ');
}

/* ---------- 臨時記號 ---------- */

function accidentalGroup(kind, x, y) {
  const g = svgEl('g', { class: 'accidental' });
  if (kind === 1) {          // 升記號
    g.appendChild(svgEl('path', {
      d: `M ${x - 3},${y - 9} L ${x - 3},${y + 7} M ${x + 3},${y - 11} L ${x + 3},${y + 5}
          M ${x - 6},${y - 2} L ${x + 6},${y - 4} M ${x - 6},${y + 4} L ${x + 6},${y + 2}`,
      class: 'acc-stroke',
    }));
  } else if (kind === -1) {  // 降記號
    g.appendChild(svgEl('path', {
      d: `M ${x - 3},${y - 12} L ${x - 3},${y + 6}
          C ${x - 3},${y + 1} ${x + 6},${y - 1} ${x + 4},${y + 3}
          C ${x + 3},${y + 6} ${x - 1},${y + 7} ${x - 3},${y + 6} Z`,
      class: 'acc-stroke',
    }));
  } else if (kind === 2) {   // 還原記號
    g.appendChild(svgEl('path', {
      d: `M ${x - 3},${y - 10} L ${x - 3},${y + 5} M ${x + 3},${y - 5} L ${x + 3},${y + 10}
          M ${x - 3},${y - 2} L ${x + 3},${y - 4} M ${x - 3},${y + 4} L ${x + 3},${y + 2}`,
      class: 'acc-stroke',
    }));
  }
  return g;
}

/* ---------- 主體 ---------- */

export class Staff {
  /**
   * @param {HTMLElement} container
   * @param {object} opts clef: 'treble'|'bass'|'grand', keySig: -7~7, noteNames: 顯示音名
   */
  constructor(container, opts = {}) {
    this.el = container;
    this.opts = Object.assign({
      clef: 'treble',
      keySig: 0,
      noteNames: false,
      minWidth: 320,
      noteSpacing: 44,
    }, opts);
    this.notes = [];
    this.noteEls = [];
    this.el.classList.add('staff-wrap');
    this.draw();
  }

  setOptions(patch) {
    Object.assign(this.opts, patch);
    this.draw();
  }

  /** notes: [{ midi | midis, duration:'w'|'h'|'q'|'e', hand:'r'|'l' , lyric }] */
  setNotes(notes) {
    this.notes = notes || [];
    this.draw();
  }

  get useFlats() { return this.opts.keySig < 0; }

  /** 只有大譜表才需要把低音譜表往下推 */
  get _bassOff() { return this.opts.clef === 'grand' ? BASS_OFFSET : 0; }

  _yFor(step, staffKind) {
    return staffKind === 'bass'
      ? STAFF_H - (step - STEP_G2) * (SP / 2) + this._bassOff
      : STAFF_H - (step - STEP_E4) * (SP / 2);
  }

  /** 判斷音符要畫在哪個譜表上 */
  _staffFor(note) {
    if (this.opts.clef !== 'grand') return this.opts.clef;
    if (note.hand === 'l') return 'bass';
    if (note.hand === 'r') return 'treble';
    const m = note.midis ? Math.min(...note.midis) : note.midi;
    return m < 60 ? 'bass' : 'treble';
  }

  draw() {
    const grand = this.opts.clef === 'grand';
    const bassOff = this._bassOff;
    const staves = grand ? ['treble', 'bass'] : [this.opts.clef];
    const staffBottom = (staves.includes('bass') ? bassOff : 0) + STAFF_H;

    const keyCount = Math.abs(this.opts.keySig);
    const leftPad = 46 + keyCount * 10;
    const width = Math.max(
      this.opts.minWidth,
      leftPad + this.notes.length * this.opts.noteSpacing + 30
    );

    // 先算出所有音符的縱座標，讓畫布高度剛好包住加線與符桿
    const layout = this.notes.map((note, idx) => {
      const kind = this._staffFor(note);
      const midis = (note.midis ?? [note.midi]).slice().sort((a, b) => a - b);
      const ys = midis.map((m) => this._yFor(toStep(m, this.useFlats).step, kind));
      return { note, idx, kind, midis, ys };
    });

    // 只在符桿實際伸出去的那一側預留空間，畫布才不會上下都空一大塊
    let minY = 0, maxY = staffBottom;
    for (const l of layout) {
      const off = l.kind === 'bass' ? bassOff : 0;
      const middle = off + STAFF_H / 2;
      const highY = Math.min(...l.ys);
      const lowY = Math.max(...l.ys);
      const stemUp = (lowY + highY) / 2 >= middle;
      minY = Math.min(minY, stemUp ? highY - 46 : highY - 10);
      maxY = Math.max(maxY, stemUp ? lowY + 10 : lowY + 46);
    }
    if (this.notes.some((n) => n.lyric)) maxY += 26;
    const yShift = -minY + 8;
    const height = (maxY - minY) + 16;

    // 用實際像素尺寸輸出，長曲子就用容器橫向捲動，而不是把整張譜壓扁
    const PX = 1.15;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: Math.round(width * PX),
      height: Math.round(height * PX),
      class: 'staff',
      preserveAspectRatio: 'xMinYMid meet',
    });
    const root = svgEl('g', { transform: `translate(0, ${yShift})` });
    svg.appendChild(root);

    // 五線
    for (const kind of staves) {
      const off = kind === 'bass' ? bassOff : 0;
      for (let i = 0; i < 5; i++) {
        root.appendChild(svgEl('line', {
          x1: 4, y1: off + i * SP, x2: width - 8, y2: off + i * SP, class: 'staff-line',
        }));
      }
    }

    // 大譜表左側的連接線
    if (grand) {
      root.appendChild(svgEl('line', {
        x1: 4, y1: 0, x2: 4, y2: bassOff + STAFF_H, class: 'staff-line brace',
      }));
    }

    // 譜號
    if (staves.includes('treble')) {
      root.appendChild(svgEl('path', { d: trebleClefPath(SP * 3), class: 'clef' }));
    }
    if (staves.includes('bass')) {
      const fy = bassOff + SP;
      root.appendChild(svgEl('path', { d: bassClefPath(fy), class: 'clef' }));
      root.appendChild(svgEl('circle', { cx: 10, cy: fy, r: 3.2, class: 'clef-dot' }));
      root.appendChild(svgEl('circle', { cx: 34, cy: fy - SP / 2, r: 2.2, class: 'clef-dot' }));
      root.appendChild(svgEl('circle', { cx: 34, cy: fy + SP / 2, r: 2.2, class: 'clef-dot' }));
    }

    this._drawKeySignature(root, staves);

    // 音符
    this.noteEls = [];
    let x = leftPad + 18;
    for (const l of layout) {
      const g = svgEl('g', { class: 'note-group', 'data-index': l.idx });
      this._drawChord(g, l, x);
      if (l.note.lyric) {
        const off = l.kind === 'bass' ? bassOff : 0;
        const t = svgEl('text', {
          x, y: off + STAFF_H + 26, class: 'note-lyric', 'text-anchor': 'middle',
        });
        t.textContent = l.note.lyric;
        g.appendChild(t);
      }
      root.appendChild(g);
      this.noteEls.push(g);
      x += this.opts.noteSpacing;
    }

    this.el.innerHTML = '';
    this.el.appendChild(svg);
    this.svg = svg;
  }

  _drawKeySignature(root, staves) {
    const n = this.opts.keySig;
    if (!n) return;
    const steps = n > 0 ? SHARP_KEY_STEPS_TREBLE : FLAT_KEY_STEPS_TREBLE;
    const count = Math.abs(n);
    for (const kind of staves) {
      for (let i = 0; i < count; i++) {
        // 低音譜表的調號寫在比高音譜表低兩個八度的位置
        const step = steps[i] - (kind === 'bass' ? 14 : 0);
        const y = this._yFor(step, kind);
        root.appendChild(accidentalGroup(n > 0 ? 1 : -1, 46 + i * 10, y));
      }
    }
  }

  _drawChord(g, layout, x) {
    const { midis, ys, kind, note } = layout;
    const duration = note.duration || 'q';
    const off = kind === 'bass' ? this._bassOff : 0;
    const topLine = off;
    const bottomLine = off + STAFF_H;
    const hollow = duration === 'w' || duration === 'h';

    midis.forEach((midi, i) => {
      const y = ys[i];
      const { acc } = toStep(midi, this.useFlats);

      // 加線
      if (y < topLine - 1) {
        for (let ly = topLine - SP; ly >= y - 1; ly -= SP) {
          g.appendChild(svgEl('line', { x1: x - 11, y1: ly, x2: x + 11, y2: ly, class: 'ledger' }));
        }
      } else if (y > bottomLine + 1) {
        for (let ly = bottomLine + SP; ly <= y + 1; ly += SP) {
          g.appendChild(svgEl('line', { x1: x - 11, y1: ly, x2: x + 11, y2: ly, class: 'ledger' }));
        }
      }

      if (acc !== 0) g.appendChild(accidentalGroup(acc, x - 17 - i * 2, y));

      g.appendChild(svgEl('ellipse', {
        cx: x, cy: y, rx: 7.2, ry: 5.2,
        transform: `rotate(-20 ${x} ${y})`,
        class: 'notehead' + (hollow ? ' hollow' : ''),
      }));
    });

    if (duration === 'w') return;

    // 整組和弦共用一根符桿：以最外側的音為基準
    const middle = off + STAFF_H / 2;
    const lowY = Math.max(...ys);      // 最低音（y 最大）
    const highY = Math.min(...ys);
    const stemUp = (lowY + highY) / 2 >= middle;
    const sx = stemUp ? x + 6.6 : x - 6.6;
    const from = stemUp ? lowY : highY;
    const to = stemUp ? highY - 38 : lowY + 38;
    g.appendChild(svgEl('line', { x1: sx, y1: from, x2: sx, y2: to, class: 'stem' }));

    if (duration === 'e' || duration === 's') {
      const dir = stemUp ? 1 : -1;
      g.appendChild(svgEl('path', {
        d: `M ${sx},${to} C ${sx + 10},${to + 6 * dir} ${sx + 11},${to + 14 * dir} ${sx + 4},${to + 20 * dir}`,
        class: 'flag',
      }));
    }
  }

  /** 標記第 index 個音符：kind = current | good | bad */
  highlight(index, kind = 'current') {
    this.noteEls.forEach((g, i) => {
      g.classList.toggle('nt-current', kind === 'current' && i === index);
      if (i === index && kind !== 'current') g.classList.add('nt-' + kind);
    });
    this._scrollTo(index);
  }

  markNote(index, kind) {
    const g = this.noteEls[index];
    if (g) g.classList.add('nt-' + kind);
  }

  clearMarks() {
    this.noteEls.forEach((g) => g.classList.remove('nt-current', 'nt-good', 'nt-bad'));
  }

  _scrollTo(index) {
    const g = this.noteEls[index];
    if (!g || !this.el.scrollWidth) return;
    const box = g.getBoundingClientRect();
    const wrap = this.el.getBoundingClientRect();
    if (box.left < wrap.left + 40 || box.right > wrap.right - 40) {
      this.el.scrollLeft += box.left - wrap.left - wrap.width / 3;
    }
  }
}
