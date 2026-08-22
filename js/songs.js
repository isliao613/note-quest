import { loadCustomSongs } from './customsongs.js';

/* songs.js — 曲庫（全部為傳統民謠或公有領域的古典作品）
 *
 * 記譜方式：[midi, beats] 的陣列，midi 為 null 表示休止符。
 * rh = 右手，lh = 左手。和弦用 [[60,64,67], beats]。
 */

const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71;
const C5 = 72, D5 = 74, E5 = 76, F5 = 77, G5 = 79, A5 = 81, B5 = 83;
const C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55, A3 = 57, B3 = 59;
const G2 = 43, A2 = 45, B2 = 47;
const FS4 = 66, FS5 = 78;   // F#4 / F#5

export const SONGS = [
  {
    id: 'twinkle',
    title: '小星星',
    subtitle: 'Twinkle, Twinkle, Little Star',
    level: 1, audience: 'both', tempo: 96, timeSig: [4, 4], keySig: 0,
    tags: ['入門', '單手', '五指位置'],
    hint: '右手放在中央 C 的五指位置，大拇指按 Do。',
    rh: [
      [C4,1],[C4,1],[G4,1],[G4,1],[A4,1],[A4,1],[G4,2],
      [F4,1],[F4,1],[E4,1],[E4,1],[D4,1],[D4,1],[C4,2],
      [G4,1],[G4,1],[F4,1],[F4,1],[E4,1],[E4,1],[D4,2],
      [G4,1],[G4,1],[F4,1],[F4,1],[E4,1],[E4,1],[D4,2],
      [C4,1],[C4,1],[G4,1],[G4,1],[A4,1],[A4,1],[G4,2],
      [F4,1],[F4,1],[E4,1],[E4,1],[D4,1],[D4,1],[C4,2],
    ],
    lyrics: '一閃一閃亮晶晶 滿天都是小星星 掛在天上放光明 好像許多小眼睛 一閃一閃亮晶晶 滿天都是小星星'.replace(/ /g, '').split(''),
    fingers: [1,1,5,5,6,6,5, 4,4,3,3,2,2,1, 5,5,4,4,3,3,2, 5,5,4,4,3,3,2, 1,1,5,5,6,6,5, 4,4,3,3,2,2,1],
    lh: [[C3,4],[C3,4],[F3,2],[C3,2],[G3,2],[C3,2],
         [C3,4],[G3,4],[C3,4],[G3,4],
         [C3,4],[C3,4],[F3,2],[C3,2],[G3,2],[C3,2]],
  },
  {
    id: 'two-tigers',
    title: '兩隻老虎',
    subtitle: 'Frère Jacques',
    level: 1, audience: 'kid', tempo: 108, timeSig: [4, 4], keySig: 0,
    tags: ['入門', '單手', '輪唱曲'],
    hint: '整首都在五指位置裡，只有最後一句要往左邊的 Sol。',
    rh: [
      [C4,1],[D4,1],[E4,1],[C4,1], [C4,1],[D4,1],[E4,1],[C4,1],
      [E4,1],[F4,1],[G4,2],        [E4,1],[F4,1],[G4,2],
      [G4,0.5],[A4,0.5],[G4,0.5],[F4,0.5],[E4,1],[C4,1],
      [G4,0.5],[A4,0.5],[G4,0.5],[F4,0.5],[E4,1],[C4,1],
      [C4,1],[G3,1],[C4,2],        [C4,1],[G3,1],[C4,2],
    ],
    lyrics: '兩隻老虎兩隻老虎跑得快跑得快一隻沒有眼睛一隻沒有尾巴真奇怪真奇怪'.split(''),
  },
  {
    id: 'little-bee',
    title: '小蜜蜂',
    subtitle: '嗡嗡嗡',
    level: 1, audience: 'kid', tempo: 104, timeSig: [4, 4], keySig: 0,
    tags: ['入門', '單手'],
    hint: '開頭的 Sol Mi Mi 要彈得輕快，像蜜蜂飛。',
    rh: [
      [G4,1],[E4,1],[E4,2], [F4,1],[D4,1],[D4,2],
      [C4,1],[D4,1],[E4,1],[F4,1], [G4,1],[G4,1],[G4,2],
      [G4,1],[E4,1],[E4,2], [F4,1],[D4,1],[D4,2],
      [C4,1],[E4,1],[G4,1],[G4,1], [E4,4],
    ],
    lyrics: '嗡嗡嗡嗡嗡嗡大家一起勤做工來匆匆去匆匆做工興味濃'.split(''),
  },
  {
    id: 'mary-lamb',
    title: '瑪莉有隻小綿羊',
    subtitle: "Mary Had a Little Lamb",
    level: 1, audience: 'kid', tempo: 100, timeSig: [4, 4], keySig: 0,
    tags: ['入門', '單手', '三指'],
    hint: '只用三根手指：大拇指、食指、中指。',
    rh: [
      [E4,1],[D4,1],[C4,1],[D4,1], [E4,1],[E4,1],[E4,2],
      [D4,1],[D4,1],[D4,2],        [E4,1],[G4,1],[G4,2],
      [E4,1],[D4,1],[C4,1],[D4,1], [E4,1],[E4,1],[E4,1],[E4,1],
      [D4,1],[D4,1],[E4,1],[D4,1], [C4,4],
    ],
    fingers: [3,2,1,2,3,3,3, 2,2,2, 3,5,5, 3,2,1,2,3,3,3,3, 2,2,3,2,1],
  },
  {
    id: 'old-macdonald',
    title: '王老先生有塊地',
    subtitle: 'Old MacDonald Had a Farm',
    level: 2, audience: 'kid', tempo: 112, timeSig: [4, 4], keySig: 0,
    tags: ['單手', '跨越五指'],
    hint: '這首會用到 La，右手小指要伸一下。',
    rh: [
      [C4,1],[C4,1],[C4,1],[G3,1], [A4,1],[A4,1],[G4,2],
      [E4,1],[E4,1],[D4,1],[D4,1], [C4,4],
      [C4,1],[C4,1],[C4,1],[G3,1], [A4,1],[A4,1],[G4,2],
      [E4,1],[E4,1],[D4,1],[D4,1], [C4,4],
    ],
    lyrics: '王老先生有塊地咿呀咿呀唷王老先生有塊地咿呀咿呀唷'.split(''),
  },
  {
    id: 'london-bridge',
    title: '倫敦鐵橋垮下來',
    subtitle: 'London Bridge Is Falling Down',
    level: 2, audience: 'kid', tempo: 116, timeSig: [4, 4], keySig: 0,
    tags: ['單手', '級進'],
    rh: [
      [G4,1],[A4,0.5],[G4,0.5],[F4,1],[E4,1], [F4,1],[G4,1],[D4,1],[E4,1],
      [F4,2],[E4,1],[F4,1],[G4,2],
      [G4,1],[A4,0.5],[G4,0.5],[F4,1],[E4,1], [F4,1],[G4,1],[D4,1],[G4,1],
      [E4,2],[C4,2],
    ],
  },
  {
    id: 'happy-birthday',
    title: '生日快樂',
    subtitle: 'Good Morning to All (1893)',
    level: 2, audience: 'both', tempo: 108, timeSig: [3, 4], keySig: 0,
    tags: ['實用曲', '附點節奏'],
    hint: '前面兩個音是「弱起拍」，先數一二三再開始。',
    rh: [
      [G4,0.75],[G4,0.25],[A4,1],[G4,1], [C5,1],[B4,2],
      [G4,0.75],[G4,0.25],[A4,1],[G4,1], [D5,1],[C5,2],
      [G4,0.75],[G4,0.25],[G5,1],[E5,1], [C5,1],[B4,1],[A4,1],
      [F5,0.75],[F5,0.25],[E5,1],[C5,1], [D5,1],[C5,2],
    ],
  },
  {
    id: 'ode-to-joy',
    title: '歡樂頌',
    subtitle: 'Beethoven — Ode to Joy',
    level: 2, audience: 'both', tempo: 112, timeSig: [4, 4], keySig: 0,
    tags: ['古典', '雙手可選'],
    hint: '貝多芬第九號交響曲的主題，右手幾乎都是相鄰的音。',
    rh: [
      [E4,1],[E4,1],[F4,1],[G4,1], [G4,1],[F4,1],[E4,1],[D4,1],
      [C4,1],[C4,1],[D4,1],[E4,1], [E4,1.5],[D4,0.5],[D4,2],
      [E4,1],[E4,1],[F4,1],[G4,1], [G4,1],[F4,1],[E4,1],[D4,1],
      [C4,1],[C4,1],[D4,1],[E4,1], [D4,1.5],[C4,0.5],[C4,2],
    ],
    lh: [
      [[C3,G3],2],[[C3,G3],2], [[C3,G3],2],[[G3,B3],2],
      [[C3,G3],2],[[C3,G3],2], [[G3,B3],2],[[G3,B3],2],
      [[C3,G3],2],[[C3,G3],2], [[C3,G3],2],[[G3,B3],2],
      [[C3,G3],2],[[C3,G3],2], [[G3,B3],2],[[C3,G3],2],
    ],
  },
  {
    id: 'jingle-bells',
    title: '聖誕鈴聲',
    subtitle: 'Jingle Bells',
    level: 2, audience: 'both', tempo: 132, timeSig: [4, 4], keySig: 0,
    tags: ['節慶', '重複音'],
    rh: [
      [E4,1],[E4,1],[E4,2], [E4,1],[E4,1],[E4,2],
      [E4,1],[G4,1],[C4,1],[D4,1], [E4,4],
      [F4,1],[F4,1],[F4,1],[F4,1], [F4,1],[E4,1],[E4,1],[E4,0.5],[E4,0.5],
      [E4,1],[D4,1],[D4,1],[E4,1], [D4,2],[G4,2],
    ],
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    subtitle: '奇異恩典',
    level: 3, audience: 'adult', tempo: 76, timeSig: [3, 4], keySig: 0,
    tags: ['抒情', '三拍子', '跨音域'],
    hint: '三拍子要唱得寬廣，每小節第一拍稍微強一點；開頭的 Sol 是弱起拍。',
    rh: [
      [G4,1],                                                    // 弱起
      [C5,2],[E5,0.5],[C5,0.5],  [E5,2],[D5,1],
      [C5,2],[A4,1],             [G4,3],
      [C5,2],[E5,0.5],[C5,0.5],  [E5,2],[D5,1],
      [C5,3],                    [C5,2],[E5,1],
      [G5,2],[E5,0.5],[G5,0.5],  [G5,2],[E5,1],
      [D5,2],[C5,1],             [C5,2],[A4,1],
      [G4,3],                    [C5,2],[E5,0.5],[C5,0.5],
      [E5,2],[D5,1],             [C5,3],
    ],
    lh: [
      [null,1],
      [[C3,G3],3],[[C3,G3],3], [[F3,A3],3],[[C3,G3],3],
      [[C3,G3],3],[[C3,E3],3], [[G3,B3],3],[[C3,G3],3],
      [[C3,E3],3],[[C3,G3],3], [[G3,B3],3],[[F3,A3],3],
      [[C3,G3],3],[[F3,A3],3], [[G3,B3],3],[[C3,G3],3],
    ],
  },
  {
    id: 'canon-in-d',
    title: '卡農',
    subtitle: 'Pachelbel — Canon（C 大調簡化版）',
    level: 3, audience: 'adult', tempo: 72, timeSig: [4, 4], keySig: 0,
    tags: ['古典', '雙手', '和聲進行'],
    hint: '左手是有名的卡農低音進行：C G Am Em F C F G。',
    rh: [
      [E5,2],[D5,2], [C5,2],[B4,2], [A4,2],[G4,2], [A4,2],[B4,2],
      [C5,2],[B4,2], [C5,2],[D5,2], [E5,2],[C5,2], [D5,2],[E5,2],
    ],
    lh: [
      [C3,2],[G3,2], [G3,2],[D3,2], [A3,2],[E3,2], [E3,2],[B3,2],
      [F3,2],[C4,2], [C3,2],[G3,2], [F3,2],[C4,2], [G3,2],[D4,2],
    ],
  },
  {
    id: 'minuet-g',
    title: 'G 大調小步舞曲',
    subtitle: 'Bach / Petzold — Minuet in G, BWV Anh.114',
    level: 3, audience: 'adult', tempo: 120, timeSig: [3, 4], keySig: 1,
    tags: ['古典', '三拍子', '雙手', '經典教材'],
    hint: '巴洛克的舞曲，每小節第一拍稍微強一點，八分音符要彈得輕巧均勻。左手是簡化的和聲。',
    rh: [
      [D5,1],[G4,0.5],[A4,0.5],[B4,0.5],[C5,0.5],
      [D5,1],[G4,1],[G4,1],
      [E5,1],[C5,0.5],[D5,0.5],[E5,0.5],[FS5,0.5],
      [G5,1],[G4,1],[G4,1],
      [C5,1],[D5,0.5],[C5,0.5],[B4,0.5],[A4,0.5],
      [B4,1],[C5,0.5],[B4,0.5],[A4,0.5],[G4,0.5],
      [FS4,1],[G4,0.5],[A4,0.5],[B4,0.5],[G4,0.5],
      [A4,3],
      [D5,1],[G4,0.5],[A4,0.5],[B4,0.5],[C5,0.5],
      [D5,1],[G4,1],[G4,1],
      [E5,1],[C5,0.5],[D5,0.5],[E5,0.5],[FS5,0.5],
      [G5,1],[G4,1],[G4,1],
      [C5,1],[D5,0.5],[C5,0.5],[B4,0.5],[A4,0.5],
      [B4,1],[C5,0.5],[B4,0.5],[A4,0.5],[G4,0.5],
      [A4,1],[B4,0.5],[A4,0.5],[G4,0.5],[FS4,0.5],
      [G4,3],
    ],
    lh: [
      [[G2,D3],3],[[G2,D3],3],[[C3,G3],3],[[G2,D3],3],
      [[C3,G3],3],[[G2,D3],3],[[D3,A3],3],[[D3,A3],3],
      [[G2,D3],3],[[G2,D3],3],[[C3,G3],3],[[G2,D3],3],
      [[C3,G3],3],[[G2,D3],3],[[D3,A3],3],[[G2,D3],3],
    ],
  },
  {
    id: 'prelude-c',
    title: '前奏曲 第一號',
    subtitle: 'J.S. Bach — BWV 846（開頭）',
    level: 4, audience: 'adult', tempo: 66, timeSig: [4, 4], keySig: 0,
    tags: ['古典', '琶音', '雙手'],
    hint: '右手是連續的琶音，手腕放鬆保持平穩；左手按住長音。',
    rh: [
      [G4,0.5],[C5,0.5],[E5,0.5],[G4,0.5],[C5,0.5],[E5,0.5],
      [G4,0.5],[C5,0.5],[E5,0.5],[G4,0.5],[C5,0.5],[E5,0.5],
      [A4,0.5],[D5,0.5],[F5,0.5],[A4,0.5],[D5,0.5],[F5,0.5],
      [A4,0.5],[D5,0.5],[F5,0.5],[A4,0.5],[D5,0.5],[F5,0.5],
      [G4,0.5],[D5,0.5],[F5,0.5],[G4,0.5],[D5,0.5],[F5,0.5],
      [G4,0.5],[D5,0.5],[F5,0.5],[G4,0.5],[D5,0.5],[F5,0.5],
      [G4,0.5],[C5,0.5],[E5,0.5],[G4,0.5],[C5,0.5],[E5,0.5],
      [G4,0.5],[C5,0.5],[E5,0.5],[G4,0.5],[C5,0.5],[E5,0.5],
    ],
    lh: [
      [[C3,E3],3],[[C3,E3],3],      // C
      [[C3,D3],3],[[C3,D3],3],      // Dm7 / C
      [[47,D3],3],[[47,D3],3],      // G7（47 = B2）
      [[C3,E3],3],[[C3,E3],3],      // C
    ],
  },
  {
    id: 'fur-elise',
    title: '給愛麗絲',
    subtitle: 'Beethoven — Für Elise（開頭）',
    level: 4, audience: 'adult', tempo: 80, timeSig: [3, 8], keySig: 0,
    tags: ['古典', '半音', '雙手'],
    hint: '開頭的 Mi Re# 是半音交替，手指要非常放鬆地輪替。',
    rh: [
      [E5,0.5],[75,0.5],[E5,0.5],[75,0.5],[E5,0.5],[B4,0.5],[D5,0.5],[C5,0.5],
      [A4,1],[null,0.5],[C4,0.5],[E4,0.5],[A4,0.5],
      [B4,1],[null,0.5],[E4,0.5],[68,0.5],[B4,0.5],
      [C5,1],[null,0.5],[E4,0.5],
      [E5,0.5],[75,0.5],[E5,0.5],[75,0.5],[E5,0.5],[B4,0.5],[D5,0.5],[C5,0.5],
      [A4,1],[null,0.5],[C4,0.5],[E4,0.5],[A4,0.5],
      [B4,1],[null,0.5],[E4,0.5],[C5,0.5],[B4,0.5],[A4,2],
    ],
    lh: [
      [null,4],
      [[45,52,57],1.5],[null,1.5],   // Am
      [[40,52,56],1.5],[null,1.5],   // E
      [[45,52,57],1.5],[null,0.5],   // Am
      [null,4],
      [[45,52,57],1.5],[null,1.5],
      [[40,52,56],1.5],[null,1],[[45,52,57],2.5],
    ],
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    subtitle: '綠袖子（A 小調）',
    level: 4, audience: 'adult', tempo: 92, timeSig: [3, 4], keySig: 0,
    tags: ['小調', '抒情', '三拍子'],
    hint: '小調的憂鬱色彩來自 Do 和 La 之間的音程，注意 G# 的出現。',
    rh: [
      [A4,1],
      [C5,2],[D5,1], [E5,1.5],[F5,0.5],[E5,1], [D5,2],[B4,1], [G4,1.5],[A4,0.5],[B4,1],
      [C5,2],[A4,1], [A4,1.5],[68,0.5],[A4,1], [B4,3],
      [E4,1],
      [C5,2],[D5,1], [E5,1.5],[F5,0.5],[E5,1], [D5,2],[B4,1], [G4,1.5],[A4,0.5],[B4,1],
      [C5,1],[B4,1],[A4,1], [68,1.5],[F4,0.5],[68,1], [A4,3],
    ],
  },
];

/* ---------- 展開成有時間軸的音符序列 ---------- */


/**
 * 把 [midi, beats] 的緊湊寫法展開成 { midis, hand, start, beats, lyric, finger }
 * start 以「拍」為單位。
 */
export function expandSong(song, { hands = 'both' } = {}) {
  const out = [];
  const addTrack = (track, hand) => {
    if (!track) return;
    let t = 0;
    let noteIdx = 0;
    for (const [pitch, beats] of track) {
      if (pitch !== null && pitch !== undefined) {
        const midis = Array.isArray(pitch) ? pitch.slice() : [pitch];
        out.push({
          midis,
          hand,
          start: t,
          beats,
          lyric: hand === 'r' ? song.lyrics?.[noteIdx] : undefined,
          finger: hand === 'r' ? song.fingers?.[noteIdx] : undefined,
        });
        noteIdx++;
      }
      t += beats;
    }
  };

  if (hands !== 'left') addTrack(song.rh, 'r');
  if (hands !== 'right') addTrack(song.lh, 'l');

  out.sort((a, b) => a.start - b.start || (a.hand === 'l' ? -1 : 1));
  out.forEach((n, i) => { n.index = i; });
  return out;
}

/** 把同一時間點的音符合併成「同時要彈的一組」，用於逐音教學 */
export function toSteps(notes) {
  const groups = [];
  const EPS = 1e-6;
  for (const n of notes) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.start - n.start) < EPS) {
      last.midis.push(...n.midis);
      last.beats = Math.max(last.beats, n.beats);
      last.lyric = last.lyric ?? n.lyric;
      last.finger = last.finger ?? n.finger;
    } else {
      groups.push({ start: n.start, beats: n.beats, midis: [...n.midis], lyric: n.lyric, finger: n.finger });
    }
  }
  return groups;
}

/** 曲子總長度（拍） */
export function songLength(notes) {
  return notes.reduce((m, n) => Math.max(m, n.start + n.beats), 0);
}

/** 內建曲目 + 使用者自己新增的曲目 */
export function allSongs() {
  return [...SONGS, ...loadCustomSongs()];
}

export const getSong = (id) => allSongs().find((s) => s.id === id);
