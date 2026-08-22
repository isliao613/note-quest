/* audio.js — Web Audio 鋼琴合成器、節拍器與介面音效（不需任何音檔） */

import { midiToFreq } from './theory.js';

/* 鋼琴的泛音結構：基音最強，往上快速衰減 */
const PIANO_HARMONICS = [0, 1, 0.44, 0.26, 0.16, 0.10, 0.07, 0.045, 0.03, 0.02, 0.013, 0.009];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.voices = new Map();     // midi -> voice
    this.sustained = new Set();  // 踏板踩著時等待釋放的音
    this.pedalDown = false;
    this.masterVolume = 0.75;
    this.ready = false;
  }

  /** 必須在使用者互動後才能啟動（瀏覽器自動播放限制） */
  async init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterVolume;

    // 壓縮器避免多音齊發時破音
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 24;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.18;

    // 殘響（程式生成的脈衝響應）
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this._makeImpulse(1.9, 2.4);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.22;
    this.dry = this.ctx.createGain();
    this.dry.gain.value = 0.88;

    this.bus = this.ctx.createGain();
    this.bus.connect(this.dry).connect(this.comp);
    this.bus.connect(this.reverb).connect(this.wet).connect(this.comp);
    this.comp.connect(this.master).connect(this.ctx.destination);

    this.pianoWave = this.ctx.createPeriodicWave(
      new Float32Array(PIANO_HARMONICS.length),
      new Float32Array(PIANO_HARMONICS),
      { disableNormalization: false }
    );

    this.noiseBuffer = this._makeNoise(0.4);
    this.ready = true;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  _makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // 前面留一點預延遲讓直達聲更清楚
        const pre = i < rate * 0.012 ? 0.15 : 1;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * pre;
      }
    }
    return buf;
  }

  _makeNoise(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  setVolume(v) {
    this.masterVolume = v;
    if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  /**
   * 彈下一個音。velocity 0~1。
   * duration 有值時會自動放開（用於示範播放）。
   */
  noteOn(midi, velocity = 0.8, when = 0, duration = null) {
    if (!this.ready) return null;
    const t = when || this.ctx.currentTime;
    if (this.voices.has(midi)) this._release(midi, t, 0.05);

    const freq = midiToFreq(midi);
    const vel = Math.max(0.05, Math.min(1, velocity));

    // 高音衰減快、低音綿長（模擬真實鋼琴）
    const pitchNorm = (midi - 21) / 87;                 // 0(最低) ~ 1(最高)
    const decayTime = 9.5 * Math.pow(0.18, pitchNorm) + 0.45;
    const sustainLevel = 0.16 * (1 - pitchNorm * 0.7);

    const out = this.ctx.createGain();
    out.gain.value = 0;

    // 音色濾波：力度越大越明亮，並隨時間變暗
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.6;
    const openCutoff = Math.min(16000, freq * (5 + vel * 12) + 900);
    filter.frequency.setValueAtTime(openCutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 2.4), t + Math.min(2.4, decayTime));

    const osc = this.ctx.createOscillator();
    osc.setPeriodicWave(this.pianoWave);
    osc.frequency.value = freq;

    // 第二顆振盪器輕微失諧，產生真實鋼琴的複弦拍頻
    const osc2 = this.ctx.createOscillator();
    osc2.setPeriodicWave(this.pianoWave);
    osc2.frequency.value = freq;
    osc2.detune.value = 4.5;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.5;

    osc.connect(filter);
    osc2.connect(g2).connect(filter);
    filter.connect(out).connect(this.bus);

    // 音量包絡：極短 attack + 指數衰減
    const peak = 0.34 * (0.35 + vel * 0.65);
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(peak, t + 0.005);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0008, peak * sustainLevel), t + decayTime * 0.55);
    out.gain.exponentialRampToValueAtTime(0.0006, t + decayTime);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + decayTime + 0.4);
    osc2.stop(t + decayTime + 0.4);

    this._hammer(freq, vel, t);

    const voice = { osc, osc2, out, filter, endsAt: t + decayTime };
    this.voices.set(midi, voice);
    osc.onended = () => { if (this.voices.get(midi) === voice) this.voices.delete(midi); };

    if (duration != null) this.noteOff(midi, t + duration);
    return voice;
  }

  /** 琴槌敲擊的短暫雜訊，讓起音更有「木頭感」 */
  _hammer(freq, vel, t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(9000, freq * 3.2);
    bp.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.055 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.045);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t);
    src.stop(t + 0.08);
  }

  noteOff(midi, when = 0) {
    const t = when || this.ctx?.currentTime || 0;
    if (this.pedalDown) { this.sustained.add(midi); return; }
    this._release(midi, t);
  }

  _release(midi, t, releaseTime = 0.32) {
    const v = this.voices.get(midi);
    if (!v) return;
    try {
      v.out.gain.cancelScheduledValues(t);
      const current = Math.max(0.0005, v.out.gain.value);
      v.out.gain.setValueAtTime(current, t);
      v.out.gain.exponentialRampToValueAtTime(0.0004, t + releaseTime);
      v.osc.stop(t + releaseTime + 0.02);
      v.osc2.stop(t + releaseTime + 0.02);
    } catch (_) { /* 音已自然結束 */ }
    this.voices.delete(midi);
  }

  setPedal(down) {
    this.pedalDown = down;
    if (!down) {
      for (const m of this.sustained) this._release(m, this.ctx.currentTime);
      this.sustained.clear();
    }
  }

  allNotesOff() {
    const t = this.ctx?.currentTime ?? 0;
    for (const midi of [...this.voices.keys()]) this._release(midi, t, 0.12);
    this.sustained.clear();
  }

  /** 排程播放一串音符（示範用）。notes: [{midi|midis, time, duration, velocity}] */
  playSequence(notes, startAt = null) {
    if (!this.ready) return 0;
    const base = startAt ?? this.ctx.currentTime + 0.06;
    let end = base;
    for (const n of notes) {
      const list = n.midis ?? [n.midi];
      for (const m of list) this.noteOn(m, n.velocity ?? 0.75, base + n.time, n.duration);
      end = Math.max(end, base + n.time + n.duration);
    }
    return end - this.ctx.currentTime;
  }

  /* ---------- 節拍器與介面音效 ---------- */

  click(accent = false, when = 0) {
    if (!this.ready) return;
    const t = when || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1600 : 1050;
    g.gain.setValueAtTime(accent ? 0.16 : 0.09, t);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 0.045);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  /** 介面回饋音：'good' 上行、'bad' 下行、'win' 小樂句 */
  sfx(kind) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const patterns = {
      good: [[880, 0], [1320, 0.07]],
      bad:  [[300, 0], [200, 0.09]],
      win:  [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]],
      star: [[1047, 0], [1319, 0.06], [1568, 0.12]],
    };
    for (const [freq, delay] of patterns[kind] ?? patterns.good) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t + delay);
      g.gain.linearRampToValueAtTime(0.13, t + delay + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0003, t + delay + 0.24);
      osc.connect(g).connect(this.master);
      osc.start(t + delay);
      osc.stop(t + delay + 0.3);
    }
  }
}

export const audio = new AudioEngine();
