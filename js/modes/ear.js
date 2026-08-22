/* modes/ear.js — 聽力訓練：音高高低、聽音找鍵、音程、和弦性質 */

import { audio } from '../audio.js';
import { progress } from '../progress.js';
import { $, el, esc, app, setHandler, setDock, go, toast } from '../app.js';
import {
  SOLFEGE, SHARP_NAMES, INTERVALS, CHORDS, buildChord, pitchClass, noteName,
} from '../theory.js';

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);

const MODE_INFO = {
  'high-low':     { title: '高音還是低音', desc: '聽兩個音，判斷第二個是高是低' },
  'match-note':   { title: '聽音找鍵', desc: '聽到的是哪一個音？可以直接在鍵盤上彈出來' },
  'interval':     { title: '音程聽辨', desc: '兩個音之間差多遠' },
  'chord-quality':{ title: '和弦性質', desc: '這個和弦是什麼顏色的' },
};

/**
 * 建立一輪聽力訓練。
 * @param {HTMLElement} container 要畫在哪裡
 * @param {object} config { mode, rounds, pool, reference }
 * @param {function} onDone 結束時回呼 ({ correct, total })
 */
export function createEarDrill(container, config, onDone) {
  const state = {
    mode: config.mode,
    rounds: config.rounds ?? 8,
    pool: config.pool,
    reference: config.reference,
    index: 0,
    correct: 0,
    results: [],
    question: null,
    answered: false,
  };

  container.innerHTML = '';
  const card = el('div', 'quiz-card');
  container.appendChild(card);

  function playQuestion() {
    const q = state.question;
    if (!q) return;
    audio.allNotesOff();
    if (q.kind === 'sequence') {
      audio.playSequence(q.notes.map((m, i) => ({ midi: m, time: i * 0.62, duration: 0.55 })));
    } else {
      audio.playSequence([{ midis: q.notes, time: 0, duration: 1.5 }]);
    }
  }

  function makeQuestion() {
    state.answered = false;
    switch (state.mode) {
      case 'high-low': {
        const base = 55 + Math.floor(Math.random() * 24);
        const up = Math.random() < 0.5;
        const gap = 2 + Math.floor(Math.random() * 10);
        const second = up ? base + gap : base - gap;
        return {
          kind: 'sequence', notes: [base, second],
          prompt: '第二個音是比較高還是比較低？',
          options: ['⬆️ 比較高', '⬇️ 比較低'],
          answer: up ? 0 : 1,
          explain: `第一個是 ${noteName(base)}，第二個是 ${noteName(second)}，相差 ${gap} 個半音。`,
        };
      }
      case 'match-note': {
        const pool = state.pool ?? [60, 62, 64, 65, 67];
        const target = rand(pool);
        const notes = state.reference && state.reference !== target
          ? [state.reference, target] : [target];
        return {
          kind: 'sequence', notes,
          acceptMidi: target,
          prompt: state.reference ? '先聽到基準音 Do，第二個音是哪一個？' : '你聽到的是哪一個音？',
          options: pool.map((m) => `${SOLFEGE[pitchClass(m)]}（${SHARP_NAMES[pitchClass(m)]}）`),
          answer: pool.indexOf(target),
          explain: `答案是 ${SOLFEGE[pitchClass(target)]} ${noteName(target)}。`,
        };
      }
      case 'interval': {
        const pool = state.pool ?? [3, 4, 5, 7, 12];
        const semi = rand(pool);
        const base = 55 + Math.floor(Math.random() * 12);
        const info = INTERVALS.find((i) => i.semitones === semi);
        const opts = shuffle(pool).map((s) => INTERVALS.find((i) => i.semitones === s));
        return {
          kind: 'sequence', notes: [base, base + semi],
          prompt: '這兩個音之間是什麼音程？',
          options: opts.map((o) => `${o.label}（${o.short}）`),
          answer: opts.findIndex((o) => o.semitones === semi),
          explain: `${info.label}＝${semi} 個半音。${INTERVAL_TIP[semi] ?? ''}`,
        };
      }
      case 'chord-quality': {
        const pool = state.pool ?? ['maj', 'min'];
        const type = rand(pool);
        const root = 52 + Math.floor(Math.random() * 12);
        const opts = shuffle(pool);
        return {
          kind: 'chord', notes: buildChord(root, type),
          prompt: '這是什麼和弦？',
          options: opts.map((t) => CHORDS[t].label),
          answer: opts.indexOf(type),
          explain: `${CHORDS[type].label}：${CHORDS[type].intervals.join('－')} 個半音疊起來。${CHORD_TIP[type] ?? ''}`,
        };
      }
      default:
        return null;
    }
  }

  function render() {
    const q = state.question;
    card.innerHTML = `
      <div class="quiz-progress">
        ${Array.from({ length: state.rounds }, (_, i) =>
          `<i class="${state.results[i] === true ? 'ok' : state.results[i] === false ? 'no' : ''}"></i>`).join('')}
      </div>
      <div class="quiz-q">${esc(q.prompt)}</div>
      <button class="btn btn-primary" id="ear-play" style="margin-bottom:16px">🔊 再聽一次</button>
      <div class="quiz-options" id="ear-opts"></div>
      <div id="ear-explain"></div>`;

    $('#ear-play').onclick = playQuestion;
    const opts = $('#ear-opts');
    q.options.forEach((text, i) => {
      const b = el('button', null, esc(text));
      b.onclick = () => answer(i);
      opts.appendChild(b);
    });
  }

  function answer(choice) {
    if (state.answered) return;
    state.answered = true;
    const q = state.question;
    const ok = choice === q.answer;
    state.results[state.index] = ok;
    if (ok) state.correct++;
    audio.sfx(ok ? 'good' : 'bad');

    const buttons = [...$('#ear-opts').children];
    buttons[q.answer]?.classList.add('correct');
    if (!ok) buttons[choice]?.classList.add('wrong');

    $('#ear-explain').innerHTML =
      `<div class="quiz-explain">${ok ? '✅ 答對了！' : '❌ 再聽聽看'} ${esc(q.explain)}</div>`;

    // 播放正確答案，加深印象
    setTimeout(playQuestion, 420);

    setTimeout(() => {
      state.index++;
      if (state.index >= state.rounds) {
        onDone({ correct: state.correct, total: state.rounds });
      } else {
        next();
      }
    }, 2000);
  }

  function next() {
    state.question = makeQuestion();
    render();
    setTimeout(playQuestion, 320);
  }

  // 「聽音找鍵」可以直接在鍵盤上彈出答案
  if (state.mode === 'match-note') {
    setDock(true);
    setHandler({
      onNoteOn: (midi) => {
        const q = state.question;
        if (!q || state.answered) return;
        const idx = (state.pool ?? []).indexOf(midi);
        if (idx >= 0) answer(idx);
      },
    });
    $('#dock-hint').textContent = '在鍵盤上彈出你聽到的音，或按下方的選項';
  }

  next();
  return { destroy: () => { audio.allNotesOff(); } };
}

const INTERVAL_TIP = {
  3: '小三度聽起來有點憂鬱，是小和弦的味道。',
  4: '大三度明亮開朗，是大和弦的基礎。',
  5: '完全四度，像〈結婚進行曲〉的開頭。',
  7: '完全五度非常空曠穩固，像〈星際大戰〉主題。',
  12: '完全八度就是同一個音的高低分身。',
};
const CHORD_TIP = {
  maj: '明亮、開心的感覺。',
  min: '柔和、帶點憂鬱。',
  maj7: '溫柔漂浮，常見於爵士與抒情歌。',
  min7: '慵懶放鬆的爵士味。',
  dom7: '有一種「還沒結束、想回家」的張力。',
};

/* ---------- 獨立的聽力訓練畫面 ---------- */

const MENU = [
  { mode: 'high-low', rounds: 8, icon: '↕️' },
  { mode: 'match-note', rounds: 10, pool: [60, 62, 64, 65, 67], reference: 60, icon: '🎯' },
  { mode: 'interval', rounds: 10, pool: [3, 4, 5, 7, 12], icon: '📏' },
  { mode: 'chord-quality', rounds: 10, pool: ['maj', 'min', 'maj7', 'dom7'], icon: '🎨' },
];

let activeDrill = null;

export function mountEarTraining() {
  const body = $('#ear-body');
  setDock(false);
  if (activeDrill) { activeDrill.destroy(); activeDrill = null; }

  body.innerHTML = '';
  const grid = el('div', 'tile-grid');
  for (const item of MENU) {
    const info = MODE_INFO[item.mode];
    const t = el('button', 'tile', `
      <span class="tile-icon">${item.icon}</span>
      <b>${esc(info.title)}</b><small>${esc(info.desc)}</small>`);
    t.onclick = () => runDrill(item);
    grid.appendChild(t);
  }
  body.appendChild(grid);
}

function runDrill(config) {
  const body = $('#ear-body');
  body.innerHTML = '';
  const back = el('button', 'btn btn-ghost', '← 換一種訓練');
  back.onclick = () => { activeDrill?.destroy(); setHandler(null); mountEarTraining(); };
  body.appendChild(back);

  const holder = el('div');
  body.appendChild(holder);

  activeDrill = createEarDrill(holder, config, ({ correct, total }) => {
    const pct = Math.round((correct / total) * 100);
    const stars = pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0;
    progress.addXp(correct * 4);
    holder.innerHTML = `
      <div class="quiz-card">
        <div class="result-stars">${[0,1,2].map((i) => `<i>${i < stars ? '⭐' : '☆'}</i>`).join('')}</div>
        <h3 style="font-size:1.2rem">答對 ${correct} / ${total}（${pct}%）</h3>
        <p class="muted" style="margin:8px 0 18px">${pct >= 75 ? '耳朵很敏銳！' : '多聽幾次就會越來越準'}</p>
        <div class="result-actions">
          <button class="btn" id="ear-again">再來一輪</button>
          <button class="btn btn-primary" id="ear-back">選其他訓練</button>
        </div>
      </div>`;
    $('#ear-again').onclick = () => runDrill(config);
    $('#ear-back').onclick = () => { setHandler(null); mountEarTraining(); };
    audio.sfx(stars >= 2 ? 'win' : 'good');
  });
}
