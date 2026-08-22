/* progress.js — 學習進度、星星、經驗值、連續練習天數（存在 localStorage） */

const KEY = 'notequest.save.v1';

const DEFAULTS = {
  profileName: '',
  mode: 'kid',                 // kid | adult
  xp: 0,
  stars: {},                   // lessonId -> 0~3
  songBest: {},                // songId -> { accuracy, score, stars }
  completed: [],               // lessonId[]
  streak: 0,
  lastPracticeDay: null,
  totalPracticeMinutes: 0,
  stickers: [],                // 小朋友模式收集到的貼紙
  settings: {
    volume: 0.75,
    labelStyle: 'solfege',     // none | letter | solfege | number | full
    colorfulKeys: true,
    showStaff: false,
    metronome: false,
    tempoScale: 1,
    waitMode: true,            // 等待模式：彈對了才前進
    range: [48, 84],
  },
};

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function daysBetween(a, b) {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const da = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const db = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((db - da) / 86400000);
}

class Progress {
  constructor() {
    this.data = this._load();
    this.listeners = new Set();
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULTS),
        ...parsed,
        settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      };
    } catch (_) {
      return structuredClone(DEFAULTS);
    }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) { /* 無痕模式 */ }
    this.listeners.forEach((fn) => fn(this.data));
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  get settings() { return this.data.settings; }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  setMode(mode) {
    this.data.mode = mode;
    // 兩種模式的預設呈現方式不同
    if (mode === 'kid') {
      this.data.settings.labelStyle = 'solfege';
      this.data.settings.colorfulKeys = true;
      this.data.settings.showStaff = false;
    } else {
      this.data.settings.labelStyle = 'letter';
      this.data.settings.colorfulKeys = false;
      this.data.settings.showStaff = true;
    }
    this.save();
  }

  addXp(amount) {
    this.data.xp += Math.round(amount);
    this.save();
  }

  get level() { return Math.floor(Math.sqrt(this.data.xp / 40)) + 1; }
  get xpInLevel() {
    const base = (this.level - 1) ** 2 * 40;
    const next = this.level ** 2 * 40;
    return { current: this.data.xp - base, needed: next - base };
  }

  /** 每天第一次練習時更新連續天數 */
  touchPractice() {
    const today = todayKey();
    const last = this.data.lastPracticeDay;
    if (last === today) return this.data.streak;
    if (last && daysBetween(last, today) === 1) this.data.streak += 1;
    else this.data.streak = 1;
    this.data.lastPracticeDay = today;
    this.save();
    return this.data.streak;
  }

  completeLesson(lessonId, stars, xp = 20) {
    const prev = this.data.stars[lessonId] ?? -1;
    if (stars > prev) this.data.stars[lessonId] = stars;
    if (!this.data.completed.includes(lessonId)) this.data.completed.push(lessonId);
    this.data.xp += xp;
    this.save();
  }

  starsFor(lessonId) { return this.data.stars[lessonId] ?? 0; }
  isCompleted(lessonId) { return this.data.completed.includes(lessonId); }

  recordSong(songId, result) {
    const prev = this.data.songBest[songId];
    if (!prev || result.score > prev.score) this.data.songBest[songId] = result;
    this.data.xp += Math.round(result.score / 25);
    this.save();
  }

  bestFor(songId) { return this.data.songBest[songId] ?? null; }

  awardSticker(id) {
    if (!this.data.stickers.includes(id)) {
      this.data.stickers.push(id);
      this.save();
      return true;
    }
    return false;
  }

  reset() {
    this.data = structuredClone(DEFAULTS);
    this.save();
  }
}

export const progress = new Progress();
