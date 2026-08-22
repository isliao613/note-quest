/* customsongs.js — 使用者自己輸入的曲目（存在瀏覽器本機） */

import { parseMelody, totalBeats, noteCount, NotationError } from './notation.js';

const KEY = 'notequest.custom.v1';

/* 簡譜「1」可以對應到哪些調 */
export const KEY_ROOTS = [
  ['C', 60], ['D', 62], ['E', 64], ['F', 65], ['G', 55], ['A', 57], ['B', 59],
  ['bB', 58], ['bE', 63], ['#F', 66],
];

export function loadCustomSongs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isValidSong) : [];
  } catch (_) {
    return [];
  }
}

function isValidSong(s) {
  return s && typeof s.id === 'string' && Array.isArray(s.rh) && s.rh.length > 0;
}

function persist(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function saveCustomSong(song) {
  const list = loadCustomSongs();
  const i = list.findIndex((s) => s.id === song.id);
  if (i >= 0) list[i] = song;
  else list.push(song);
  persist(list);
  return song;
}

export function deleteCustomSong(id) {
  persist(loadCustomSongs().filter((s) => s.id !== id));
}

export const getCustomSong = (id) => loadCustomSongs().find((s) => s.id === id);

export const newSongId = () =>
  'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

/**
 * 把編輯器的草稿轉成正式的曲目物件。
 * 解析失敗時丟出 NotationError，訊息會直接顯示給使用者。
 *
 * draft: { id, title, keyRoot, tempo, beatsPerBar, level, rhText, lhText, hint }
 */
export function buildCustomSong(draft) {
  const title = (draft.title || '').trim() || '我的曲子';
  const keyRoot = draft.keyRoot ?? 60;

  let rh;
  try {
    rh = parseMelody(draft.rhText, { keyRoot });
  } catch (err) {
    throw new NotationError('右手：' + err.message, err.token, err.index);
  }

  let lh;
  if ((draft.lhText || '').trim()) {
    try {
      lh = parseMelody(draft.lhText, { keyRoot });
    } catch (err) {
      throw new NotationError('左手：' + err.message, err.token, err.index);
    }
  }

  // 兩手拍數對不上的話，短的那一手補休止符，播放才不會走位
  let warning = null;
  if (lh) {
    const rb = totalBeats(rh);
    const lb = totalBeats(lh);
    if (Math.abs(rb - lb) > 1e-6) {
      warning = `右手 ${round(rb)} 拍、左手 ${round(lb)} 拍長度不一樣，已自動用休止符補齊。`;
      if (rb > lb) lh.push([null, rb - lb]);
      else rh.push([null, lb - rb]);
    }
  }

  const song = {
    id: draft.id || newSongId(),
    custom: true,
    title,
    subtitle: draft.subtitle || '自訂曲目',
    level: Math.min(5, Math.max(1, draft.level ?? 2)),
    audience: 'both',
    tempo: Math.min(240, Math.max(30, draft.tempo ?? 100)),
    timeSig: [draft.beatsPerBar ?? 4, 4],
    keySig: 0,
    tags: ['自訂'],
    hint: (draft.hint || '').trim() || undefined,
    keyRoot,
    source: { rhText: draft.rhText || '', lhText: draft.lhText || '' },
    rh,
    lh,
  };

  return { song, warning, stats: statsFor(song) };
}

export function statsFor(song) {
  return {
    notes: noteCount(song.rh) + (song.lh ? noteCount(song.lh) : 0),
    beats: round(totalBeats(song.rh)),
    bars: round(totalBeats(song.rh) / (song.timeSig?.[0] ?? 4)),
  };
}

const round = (n) => Math.round(n * 100) / 100;

/* ---------- 匯出 / 匯入 ---------- */

export function exportCustomSongs() {
  return JSON.stringify({ app: 'notequest', version: 1, songs: loadCustomSongs() }, null, 2);
}

/** 回傳匯入的數量；格式不對會丟錯 */
export function importCustomSongs(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error('這不是有效的 JSON 檔');
  }
  const incoming = Array.isArray(data) ? data : data.songs;
  if (!Array.isArray(incoming)) throw new Error('檔案裡找不到曲目資料');

  const list = loadCustomSongs();
  let added = 0;
  for (const s of incoming) {
    if (!isValidSong(s)) continue;
    // 撞號就換一個新的，不要蓋掉原本的曲子
    const song = { ...s, custom: true };
    if (list.some((x) => x.id === song.id)) song.id = newSongId();
    list.push(song);
    added++;
  }
  if (!added) throw new Error('沒有可以匯入的曲目');
  persist(list);
  return added;
}

/* ---------- 範例（教學用） ---------- */

export const EXAMPLES = [
  {
    name: '小蜜蜂',
    tempo: 104, beatsPerBar: 4,
    rhText: '5 3 3 - | 4 2 2 - | 1 2 3 4 | 5 5 5 -',
    lhText: '1, - - - | 5, - - - | 1, - - - | 1, - - -',
  },
  {
    name: '小星星',
    tempo: 96, beatsPerBar: 4,
    rhText: '1 1 5 5 | 6 6 5 - | 4 4 3 3 | 2 2 1 -',
    lhText: '1, - - - | 4, - 1, - | 1, - - - | 5, - 1, -',
  },
  {
    name: '有八分音符的句子',
    tempo: 100, beatsPerBar: 4,
    rhText: "5_ 5_ 6_ 5_ 1' - | 7 5 3 1",
    lhText: '',
  },
];
