/* theory.js — 音樂理論核心：音名、唱名、顏色、音階、和弦、音程 */

export const A4 = 69;          // MIDI 69 = A4 = 440Hz
export const MIDDLE_C = 60;    // 中央 C

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/* 唱名（首調以外一律固定調 Do Re Mi） */
export const SOLFEGE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
/* 小朋友用的簡譜數字 */
export const NUMBERS = ['1', '#1', '2', '#2', '3', '4', '#4', '5', '#5', '6', '#6', '7'];

/* 黑鍵的 pitch class */
const BLACK_SET = new Set([1, 3, 6, 8, 10]);

/* 彩虹配色：白鍵走七彩，黑鍵取相鄰的深色調（小朋友模式用） */
export const PITCH_COLORS = [
  '#ef4444', // C  紅
  '#c2410c', // C#
  '#f97316', // D  橙
  '#a16207', // D#
  '#eab308', // E  黃
  '#22c55e', // F  綠
  '#047857', // F#
  '#06b6d4', // G  青
  '#0369a1', // G#
  '#3b82f6', // A  藍
  '#4f46e5', // A#
  '#a855f7', // B  紫
];

export const pitchClass = (midi) => ((midi % 12) + 12) % 12;
export const octaveOf = (midi) => Math.floor(midi / 12) - 1;
export const isBlackKey = (midi) => BLACK_SET.has(pitchClass(midi));
export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - A4) / 12);
export const colorOf = (midi) => PITCH_COLORS[pitchClass(midi)];

/** 完整音名，例如 60 -> "C4"、61 -> "C#4" */
export function noteName(midi, useFlats = false) {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[pitchClass(midi)] + octaveOf(midi);
}

/** 依照設定回傳鍵盤上要顯示的標籤 */
export function labelFor(midi, style) {
  const pc = pitchClass(midi);
  switch (style) {
    case 'letter':  return SHARP_NAMES[pc];
    case 'solfege': return SOLFEGE[pc];
    case 'number':  return NUMBERS[pc];
    case 'full':    return noteName(midi);
    default:        return '';
  }
}

/** 把 "C4" / "Bb3" / "F#5" 這種字串轉成 MIDI 編號 */
export function parseNote(str) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(str.trim());
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1].toUpperCase()];
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (parseInt(m[3], 10) + 1) * 12 + base + accidental;
}

/* ---------- 音階 ---------- */

export const SCALES = {
  major:            { label: '大調（自然大音階）', steps: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor:     { label: '自然小調',           steps: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor:    { label: '和聲小調',           steps: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor:     { label: '旋律小調（上行）',    steps: [0, 2, 3, 5, 7, 9, 11] },
  pentatonicMajor:  { label: '大調五聲音階',        steps: [0, 2, 4, 7, 9] },
  pentatonicMinor:  { label: '小調五聲音階',        steps: [0, 3, 5, 7, 10] },
  blues:            { label: '藍調音階',           steps: [0, 3, 5, 6, 7, 10] },
  chromatic:        { label: '半音階',             steps: [0,1,2,3,4,5,6,7,8,9,10,11] },
  dorian:           { label: 'Dorian 調式',        steps: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian:       { label: 'Mixolydian 調式',    steps: [0, 2, 4, 5, 7, 9, 10] },
};

/** 產生音階的 MIDI 音符（含高八度主音） */
export function buildScale(rootMidi, type = 'major', octaves = 1) {
  const steps = SCALES[type].steps;
  const out = [];
  for (let o = 0; o < octaves; o++) {
    for (const s of steps) out.push(rootMidi + o * 12 + s);
  }
  out.push(rootMidi + octaves * 12);
  return out;
}

/* ---------- 和弦 ---------- */

export const CHORDS = {
  maj:     { label: '大三和弦',     suffix: '',     intervals: [0, 4, 7] },
  min:     { label: '小三和弦',     suffix: 'm',    intervals: [0, 3, 7] },
  dim:     { label: '減三和弦',     suffix: 'dim',  intervals: [0, 3, 6] },
  aug:     { label: '增三和弦',     suffix: 'aug',  intervals: [0, 4, 8] },
  sus4:    { label: '掛留四和弦',   suffix: 'sus4', intervals: [0, 5, 7] },
  sus2:    { label: '掛留二和弦',   suffix: 'sus2', intervals: [0, 2, 7] },
  maj7:    { label: '大七和弦',     suffix: 'maj7', intervals: [0, 4, 7, 11] },
  min7:    { label: '小七和弦',     suffix: 'm7',   intervals: [0, 3, 7, 10] },
  dom7:    { label: '屬七和弦',     suffix: '7',    intervals: [0, 4, 7, 10] },
  m7b5:    { label: '半減七和弦',   suffix: 'm7b5', intervals: [0, 3, 6, 10] },
};

export function buildChord(rootMidi, type = 'maj', inversion = 0) {
  let notes = CHORDS[type].intervals.map((i) => rootMidi + i);
  for (let i = 0; i < inversion; i++) notes = [...notes.slice(1), notes[0] + 12];
  return notes;
}

export function chordName(rootMidi, type) {
  return SHARP_NAMES[pitchClass(rootMidi)] + CHORDS[type].suffix;
}

/** 大調級數和弦（I ii iii IV V vi vii°） */
export const DEGREE_LABELS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
export const DEGREE_TYPES  = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];

export function diatonicChord(keyRoot, degree /* 0-6 */) {
  const root = keyRoot + SCALES.major.steps[degree];
  return { root, type: DEGREE_TYPES[degree], label: DEGREE_LABELS[degree] };
}

/* ---------- 音程 ---------- */

export const INTERVALS = [
  { semitones: 0,  short: 'P1',  label: '完全一度（同音）' },
  { semitones: 1,  short: 'm2',  label: '小二度' },
  { semitones: 2,  short: 'M2',  label: '大二度' },
  { semitones: 3,  short: 'm3',  label: '小三度' },
  { semitones: 4,  short: 'M3',  label: '大三度' },
  { semitones: 5,  short: 'P4',  label: '完全四度' },
  { semitones: 6,  short: 'TT',  label: '三全音' },
  { semitones: 7,  short: 'P5',  label: '完全五度' },
  { semitones: 8,  short: 'm6',  label: '小六度' },
  { semitones: 9,  short: 'M6',  label: '大六度' },
  { semitones: 10, short: 'm7',  label: '小七度' },
  { semitones: 11, short: 'M7',  label: '大七度' },
  { semitones: 12, short: 'P8',  label: '完全八度' },
];

/* ---------- 調號 ---------- */

/* 每個調的升降記號數量：正數為升記號、負數為降記號 */
export const KEY_SIGNATURES = {
  'C':  0, 'G':  1, 'D':  2, 'A':  3, 'E':  4, 'B':  5, 'F#': 6,
  'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6,
};

/* 升記號出現順序 F C G D A E B；降記號 B E A D G C F */
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER  = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
