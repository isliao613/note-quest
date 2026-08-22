/* notation.js — 把簡譜／音名文字轉成音符資料
 *
 * 支援兩種寫法，可以混用：
 *   簡譜   1 2 3 4 5 6 7    （0 = 休止符；依「調」決定 1 是哪個音）
 *   音名   C D E F G A B    （可加八度數字，例如 C4、F#3、Bb5）
 *
 * 修飾符號（跟在音的後面）：
 *   '   高八度（可疊加：1''）          ,   低八度
 *   _   時值減半（1_ = 半拍，1__ = 1/4 拍）
 *   .   附點（時值 ×1.5）
 *   -   延長一拍（1 - - - = 四拍）；也可以單獨寫成一個 -
 *   |   小節線，只是排版用，會被忽略
 *
 * 例：小蜜蜂 →  5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 -
 */

const DEGREE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];   // 簡譜 1 2 3 4 5 6 7
const LETTER_SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_CHARS = ["#", "♯"];
const FLAT_CHARS = ["b", "♭"];
const UP_CHARS = ["'", "’", "+"];
const DOWN_CHARS = [",", "，"];
const DASH_CHARS = ["-", "－", "—"];

export class NotationError extends Error {
  constructor(message, token, index) {
    super(message);
    this.token = token;
    this.index = index;
  }
}

/**
 * @param {string} text 樂譜文字
 * @param {object} opts
 *   keyRoot  簡譜「1」對應的 MIDI 音高（預設 60 = 中央 C）
 *   octave   音名沒寫八度時的預設八度（預設 4）
 *   beatUnit 一個音預設幾拍（預設 1）
 * @returns {Array<[number|null, number]>} songs.js 使用的 [音高, 拍數] 陣列
 */
export function parseMelody(text, opts = {}) {
  const keyRoot = opts.keyRoot ?? 60;
  const defaultOctave = opts.octave ?? 4;
  const beatUnit = opts.beatUnit ?? 1;

  const tokens = String(text || "")
    .replace(/[|\r\n\t｜]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const out = [];

  tokens.forEach((tok, i) => {
    // 單獨的「-」：把前一個音延長
    if ([...tok].every((c) => DASH_CHARS.includes(c))) {
      if (!out.length) throw new NotationError("開頭不能是延長線「-」", tok, i);
      out[out.length - 1][1] += beatUnit * tok.length;
      return;
    }
    const parsed = parseToken(tok, { keyRoot, defaultOctave, beatUnit });
    if (!parsed) throw new NotationError(`看不懂「${tok}」`, tok, i);
    out.push(parsed);
  });

  if (!out.length) throw new NotationError("還沒有輸入任何音符", "", 0);
  return out;
}

function parseToken(tok, { keyRoot, defaultOctave, beatUnit }) {
  let s = tok;
  let accidental = 0;

  // 前置升降記號（簡譜寫法：#4、b7）
  while (s.length && (SHARP_CHARS.includes(s[0]) || FLAT_CHARS.includes(s[0]))) {
    accidental += SHARP_CHARS.includes(s[0]) ? 1 : -1;
    s = s.slice(1);
  }
  if (!s) return null;

  let midi = null;
  const head = s[0];

  if (head >= "0" && head <= "7") {
    s = s.slice(1);
    if (head !== "0") {
      midi = keyRoot + DEGREE_SEMITONES[Number(head) - 1] + accidental;
    }
  } else if (/[A-Ga-g]/.test(head)) {
    s = s.slice(1);
    const base = LETTER_SEMITONES[head.toUpperCase()];
    // 後置升降記號（音名寫法：F#4、Bb3）
    while (s.length && (SHARP_CHARS.includes(s[0]) || FLAT_CHARS.includes(s[0]))) {
      accidental += SHARP_CHARS.includes(s[0]) ? 1 : -1;
      s = s.slice(1);
    }
    const octMatch = /^(-?\d)/.exec(s);
    const octave = octMatch ? Number(octMatch[1]) : defaultOctave;
    if (octMatch) s = s.slice(octMatch[1].length);
    midi = (octave + 1) * 12 + base + accidental;
  } else {
    return null;
  }

  // 八度與時值修飾
  let beats = beatUnit;
  for (const ch of s) {
    if (UP_CHARS.includes(ch)) {
      if (midi != null) midi += 12;
    } else if (DOWN_CHARS.includes(ch)) {
      if (midi != null) midi -= 12;
    } else if (ch === "_") {
      beats /= 2;
    } else if (ch === ".") {
      beats *= 1.5;
    } else if (DASH_CHARS.includes(ch)) {
      beats += beatUnit;
    } else {
      return null;
    }
  }

  if (beats <= 0 || beats > 64) return null;
  if (midi != null && (midi < 12 || midi > 120)) return null;
  return [midi, beats];
}

/** 一段樂譜總共幾拍 */
export const totalBeats = (track) => track.reduce((sum, [, b]) => sum + b, 0);

/** 有幾個實際發聲的音（不含休止符） */
export const noteCount = (track) => track.filter(([m]) => m != null).length;
