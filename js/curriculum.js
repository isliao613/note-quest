/* curriculum.js — 課程大綱：小朋友路線與大人路線
 *
 * 每個 lesson 的 type 對應到 modes/lesson.js 裡的一種練習玩法：
 *   keys      認鍵：說出音名，在鍵盤上找到它
 *   sequence  跟彈：依序彈出一串音（音階、五指練習）
 *   song      彈奏曲目
 *   read      視奏：看五線譜彈出對應的鍵
 *   ear       聽力訓練
 *   rhythm    節奏：跟著節拍器打拍子
 *   theory    樂理概念卡 + 小測驗
 */

export const UNITS = [
  /* ==================== 小朋友路線 ==================== */
  {
    id: 'k1', audience: 'kid', icon: '🎹',
    title: '認識鋼琴',
    desc: '先跟鋼琴做朋友，找到每個音住在哪裡',
    lessons: [
      {
        id: 'k1-1', type: 'theory', title: '黑鍵的秘密', xp: 15,
        desc: '黑鍵是兩個一組、三個一組',
        config: {
          cards: [
            { q: '黑鍵是怎麼排列的呢？', options: ['都是一個一個分開', '兩個一組、三個一組', '全部連在一起'], answer: 1,
              explain: '黑鍵永遠是「兩個一組」和「三個一組」交替出現，這就是我們找音的地圖！' },
            { q: 'Do 住在哪裡？', options: ['兩個黑鍵的左邊', '三個黑鍵的中間', '三個黑鍵的右邊'], answer: 0,
              explain: 'Do 就躲在「兩個黑鍵」的左邊那顆白鍵，記住這個小秘訣就不會迷路了。' },
          ],
        },
      },
      {
        id: 'k1-2', type: 'keys', title: '找到中央 Do', xp: 20,
        desc: '鋼琴正中間那顆 Do',
        config: { targets: [60], rounds: 5, showHint: true, prompt: '請彈出中央 Do' },
      },
      {
        id: 'k1-3', type: 'keys', title: 'Do Re Mi 在哪裡', xp: 25,
        desc: '認識前三個音',
        config: { targets: [60, 62, 64], rounds: 9, showHint: true },
      },
      {
        id: 'k1-4', type: 'keys', title: 'Fa 和 Sol 也來了', xp: 25,
        desc: '五個好朋友到齊',
        config: { targets: [60, 62, 64, 65, 67], rounds: 12, showHint: false },
      },
    ],
  },
  {
    id: 'k2', audience: 'kid', icon: '🖐️',
    title: '五根手指出動',
    desc: '學會手指編號，把手放在正確的位置',
    lessons: [
      {
        id: 'k2-1', type: 'theory', title: '手指的號碼', xp: 15,
        desc: '大拇指是 1 號',
        config: {
          cards: [
            { q: '大拇指是幾號手指？', options: ['1 號', '5 號', '3 號'], answer: 0,
              explain: '從大拇指開始數：拇指1、食指2、中指3、無名指4、小指5。兩隻手都一樣喔！' },
            { q: '右手的小指是幾號？', options: ['1 號', '4 號', '5 號'], answer: 2,
              explain: '小指是 5 號，在五指位置裡負責最右邊的 Sol。' },
          ],
        },
      },
      {
        id: 'k2-2', type: 'sequence', title: '往上爬樓梯', xp: 25,
        desc: 'Do Re Mi Fa Sol 一路往上',
        config: { notes: [60, 62, 64, 65, 67], fingers: [1, 2, 3, 4, 5], loops: 2, showHint: true },
      },
      {
        id: 'k2-3', type: 'sequence', title: '溜滑梯下來', xp: 25,
        desc: 'Sol Fa Mi Re Do 一路往下',
        config: { notes: [67, 65, 64, 62, 60], fingers: [5, 4, 3, 2, 1], loops: 2, showHint: true },
      },
      {
        id: 'k2-4', type: 'sequence', title: '上上下下', xp: 30,
        desc: '爬上去再溜下來',
        config: { notes: [60, 62, 64, 65, 67, 65, 64, 62, 60], fingers: [1, 2, 3, 4, 5, 4, 3, 2, 1], loops: 2, showHint: false },
      },
    ],
  },
  {
    id: 'k3', audience: 'kid', icon: '🎵',
    title: '我的第一首歌',
    desc: '把學會的五個音變成好聽的歌',
    lessons: [
      { id: 'k3-1', type: 'song', title: '瑪莉有隻小綿羊', xp: 40, desc: '只用三根手指',
        config: { songId: 'mary-lamb', hands: 'right', tempoScale: 0.75, minAccuracy: 0.65 } },
      { id: 'k3-2', type: 'song', title: '小蜜蜂', xp: 40, desc: '嗡嗡嗡',
        config: { songId: 'little-bee', hands: 'right', tempoScale: 0.8, minAccuracy: 0.65 } },
      { id: 'k3-3', type: 'song', title: '兩隻老虎', xp: 45, desc: '大家都會唱的歌',
        config: { songId: 'two-tigers', hands: 'right', tempoScale: 0.8, minAccuracy: 0.7 } },
    ],
  },
  {
    id: 'k4', audience: 'kid', icon: '🥁',
    title: '節奏遊戲',
    desc: '音符有長有短，跟著拍子動起來',
    lessons: [
      {
        id: 'k4-1', type: 'theory', title: '長音和短音', xp: 15,
        desc: '四分音符與二分音符',
        config: {
          cards: [
            { q: '哪一個音符要撐比較久？', options: ['四分音符（黑色實心）', '二分音符（空心）'], answer: 1,
              explain: '空心的二分音符要數 2 拍，黑色實心的四分音符只有 1 拍。空心的比較「胖」，所以撐比較久！' },
            { q: '一小節有 4 拍時，可以放幾個四分音符？', options: ['2 個', '4 個', '8 個'], answer: 1,
              explain: '每個四分音符 1 拍，4 拍就剛好放 4 個。' },
          ],
        },
      },
      { id: 'k4-2', type: 'rhythm', title: '穩穩地打四拍', xp: 25, desc: '跟著節拍器',
        config: { pattern: [1, 1, 1, 1], bars: 4, tempo: 76 } },
      { id: 'k4-3', type: 'rhythm', title: '長短長短', xp: 30, desc: '混合節奏',
        config: { pattern: [1, 1, 2, 0.5, 0.5, 1, 2], bars: 3, tempo: 80 } },
    ],
  },
  {
    id: 'k5', audience: 'kid', icon: '⭐',
    title: '更多好聽的歌',
    desc: '挑戰要用到 La 的曲子',
    lessons: [
      { id: 'k5-1', type: 'song', title: '小星星', xp: 50, desc: '一閃一閃亮晶晶',
        config: { songId: 'twinkle', hands: 'right', tempoScale: 0.8, minAccuracy: 0.7 } },
      { id: 'k5-2', type: 'song', title: '王老先生有塊地', xp: 50, desc: '咿呀咿呀唷',
        config: { songId: 'old-macdonald', hands: 'right', tempoScale: 0.8, minAccuracy: 0.7 } },
      { id: 'k5-3', type: 'song', title: '倫敦鐵橋垮下來', xp: 55, desc: '有八分音符喔',
        config: { songId: 'london-bridge', hands: 'right', tempoScale: 0.75, minAccuracy: 0.7 } },
    ],
  },
  {
    id: 'k6', audience: 'kid', icon: '👂',
    title: '好耳朵訓練',
    desc: '閉上眼睛也知道是哪個音',
    lessons: [
      { id: 'k6-1', type: 'ear', title: '高音還是低音？', xp: 25, desc: '分辨聲音的高低',
        config: { mode: 'high-low', rounds: 8 } },
      { id: 'k6-2', type: 'ear', title: '這是哪個音？', xp: 35, desc: '從 Do Re Mi 裡挑',
        config: { mode: 'match-note', pool: [60, 62, 64], rounds: 8, reference: 60 } },
      { id: 'k6-3', type: 'ear', title: '五個音的挑戰', xp: 40, desc: 'Do 到 Sol',
        config: { mode: 'match-note', pool: [60, 62, 64, 65, 67], rounds: 10, reference: 60 } },
    ],
  },
  {
    id: 'k7', audience: 'kid', icon: '🙌',
    title: '兩隻手一起彈',
    desc: '左手也要出來工作囉',
    lessons: [
      { id: 'k7-1', type: 'sequence', title: '左手找 Do 和 Sol', xp: 30, desc: '低音區的兩個音',
        config: { notes: [48, 55, 48, 55], hand: 'l', loops: 3, showHint: true } },
      { id: 'k7-2', type: 'song', title: '雙手小星星', xp: 70, desc: '右手旋律 + 左手伴奏',
        config: { songId: 'twinkle', hands: 'both', tempoScale: 0.7, minAccuracy: 0.6 } },
      { id: 'k7-3', type: 'song', title: '生日快樂', xp: 70, desc: '學會了就能幫別人慶生',
        config: { songId: 'happy-birthday', hands: 'right', tempoScale: 0.8, minAccuracy: 0.65 } },
    ],
  },

  /* ==================== 大人路線 ==================== */
  {
    id: 'a1', audience: 'adult', icon: '🗺️',
    title: '鍵盤地圖',
    desc: '用最短的時間把整個鍵盤的邏輯搞懂',
    lessons: [
      {
        id: 'a1-1', type: 'theory', title: '十二個半音與八度', xp: 20,
        desc: '鍵盤其實只有 12 個音在重複',
        config: {
          cards: [
            { q: '一個八度裡總共有幾個半音？', options: ['7 個', '10 個', '12 個'], answer: 2,
              explain: '白鍵 7 個 + 黑鍵 5 個 = 12 個半音。整台鋼琴就是這 12 個音不斷往上重複。' },
            { q: 'C4 到 C5 之間的音程是？', options: ['完全五度', '完全八度', '大七度'], answer: 1,
              explain: '相同音名、相差 12 個半音就是完全八度，聽起來像同一個音的「高低分身」。' },
            { q: 'E 和 F 之間隔幾個半音？', options: ['1 個（沒有黑鍵）', '2 個'], answer: 0,
              explain: 'E–F 與 B–C 這兩組之間沒有黑鍵，只差半音，這也是為什麼黑鍵會分成 2、3 一組。' },
          ],
        },
      },
      { id: 'a1-2', type: 'keys', title: '白鍵音名速認', xp: 30, desc: 'C D E F G A B',
        config: { targets: [60, 62, 64, 65, 67, 69, 71], rounds: 14, showHint: false, labelStyle: 'letter' } },
      { id: 'a1-3', type: 'keys', title: '黑鍵與升降記號', xp: 35, desc: 'C# D# F# G# A#',
        config: { targets: [61, 63, 66, 68, 70], rounds: 10, showHint: false, labelStyle: 'letter' } },
      { id: 'a1-4', type: 'keys', title: '跨八度找音', xp: 35, desc: '不只中央那一組',
        config: { targets: [48, 55, 60, 64, 67, 72, 76, 79], rounds: 12, showHint: false, labelStyle: 'letter' } },
    ],
  },
  {
    id: 'a2', audience: 'adult', icon: '📖',
    title: '看懂五線譜',
    desc: '從中央 C 出發，建立讀譜的座標系統',
    lessons: [
      {
        id: 'a2-1', type: 'theory', title: '高音譜號與線間音', xp: 20,
        desc: '線上音與間音的記法',
        config: {
          cards: [
            { q: '高音譜號的螺旋中心指的是哪一個音？', options: ['中央 C', 'G4', 'F4'], answer: 1,
              explain: '高音譜號又叫 G 譜號，捲曲的中心正好圈住第二線 G4，這就是它的定位點。' },
            { q: '中央 C 在高音譜表上畫在哪裡？', options: ['第一線上', '譜表下方加一線', '第二間'], answer: 1,
              explain: '中央 C（C4）比高音譜表最低線 E4 還低，所以要在下方加一條短短的「加線」。' },
            { q: '低音譜號的兩個點夾住哪一條線？', options: ['F3', 'C3', 'A3'], answer: 0,
              explain: '低音譜號又叫 F 譜號，兩個小圓點夾住的第四線就是 F3。' },
          ],
        },
      },
      { id: 'a2-2', type: 'read', title: '視奏：高音譜表白鍵', xp: 40, desc: 'C4 到 C5',
        config: { clef: 'treble', pool: [60, 62, 64, 65, 67, 69, 71, 72], rounds: 12 } },
      { id: 'a2-3', type: 'read', title: '視奏：低音譜表', xp: 40, desc: 'C3 到 C4',
        config: { clef: 'bass', pool: [48, 50, 52, 53, 55, 57, 59, 60], rounds: 12 } },
      { id: 'a2-4', type: 'read', title: '視奏：大譜表混合', xp: 50, desc: '兩個譜號一起來',
        config: { clef: 'grand', pool: [48, 52, 55, 60, 64, 67, 72, 76], rounds: 14 } },
    ],
  },
  {
    id: 'a3', audience: 'adult', icon: '⏱️',
    title: '節奏與拍號',
    desc: '穩定的拍子是所有音樂的骨架',
    lessons: [
      {
        id: 'a3-1', type: 'theory', title: '拍號怎麼看', xp: 20,
        desc: '4/4、3/4、6/8',
        config: {
          cards: [
            { q: '3/4 拍代表什麼？', options: ['每小節 3 拍，以四分音符為一拍', '每小節 4 拍，以三分音符為一拍'], answer: 0,
              explain: '上面的數字是「每小節幾拍」，下面的數字是「以幾分音符當一拍」。3/4 就是華爾滋的節奏。' },
            { q: '附點四分音符等於多少拍？', options: ['1 拍', '1.5 拍', '2 拍'], answer: 1,
              explain: '附點會把原本的長度再加一半，所以 1 拍 + 0.5 拍 = 1.5 拍。' },
          ],
        },
      },
      { id: 'a3-2', type: 'rhythm', title: '四分與八分', xp: 30, desc: '基本節奏型',
        config: { pattern: [1, 0.5, 0.5, 1, 1], bars: 4, tempo: 84 } },
      { id: 'a3-3', type: 'rhythm', title: '附點節奏', xp: 35, desc: '長短長短的搖擺感',
        config: { pattern: [1.5, 0.5, 1, 1], bars: 4, tempo: 80 } },
      { id: 'a3-4', type: 'rhythm', title: '三拍子', xp: 35, desc: '華爾滋的感覺',
        config: { pattern: [1, 1, 1], bars: 4, tempo: 92, beatsPerBar: 3 } },
    ],
  },
  {
    id: 'a4', audience: 'adult', icon: '🎼',
    title: '音階與調性',
    desc: '大調音階的公式，以及最重要的拇指穿越',
    lessons: [
      {
        id: 'a4-1', type: 'theory', title: '大調音階的公式', xp: 20,
        desc: '全全半全全全半',
        config: {
          cards: [
            { q: '大調音階的半音出現在哪兩個位置？', options: ['3-4 與 7-8 級', '2-3 與 5-6 級'], answer: 0,
              explain: '大調公式是「全全半全全全半」，半音落在第 3–4 級與第 7–8 級之間。' },
            { q: 'G 大調需要升哪一個音？', options: ['C#', 'F#', 'Bb'], answer: 1,
              explain: '要讓 G 到 G 符合大調公式，第七級 F 必須升高成 F#，所以 G 大調有一個升記號。' },
          ],
        },
      },
      { id: 'a4-2', type: 'sequence', title: 'C 大調音階（右手）', xp: 45, desc: '含拇指穿越指法',
        config: { notes: [60, 62, 64, 65, 67, 69, 71, 72], fingers: [1, 2, 3, 1, 2, 3, 4, 5], loops: 2, showHint: true,
          tip: '彈到 Fa 時，大拇指要從中指底下「穿過去」，手腕保持平穩不要跳動。' } },
      { id: 'a4-3', type: 'sequence', title: 'C 大調音階（下行）', xp: 45, desc: '中指跨過拇指',
        config: { notes: [72, 71, 69, 67, 65, 64, 62, 60], fingers: [5, 4, 3, 2, 1, 3, 2, 1], loops: 2, showHint: true,
          tip: '下行時換成中指從大拇指上面「跨過去」，動作要提前準備。' } },
      { id: 'a4-4', type: 'sequence', title: 'G 大調音階', xp: 50, desc: '第一個有升記號的調',
        config: { notes: [67, 69, 71, 72, 74, 76, 78, 79], fingers: [1, 2, 3, 1, 2, 3, 4, 5], loops: 2, showHint: true } },
      { id: 'a4-5', type: 'sequence', title: 'A 小調音階', xp: 50, desc: '大調的關係小調',
        config: { notes: [57, 59, 60, 62, 64, 65, 67, 69], fingers: [5, 4, 3, 2, 1, 3, 2, 1], hand: 'l', loops: 2, showHint: true } },
    ],
  },
  {
    id: 'a5', audience: 'adult', icon: '🎹',
    title: '和弦與伴奏',
    desc: '學會三和弦就能幫任何旋律配伴奏',
    lessons: [
      {
        id: 'a5-1', type: 'theory', title: '三和弦怎麼疊', xp: 20,
        desc: '根音、三音、五音',
        config: {
          cards: [
            { q: '大三和弦的組成是？', options: ['根音 + 大三度 + 完全五度', '根音 + 小三度 + 完全五度'], answer: 0,
              explain: 'C 大三和弦 = C（根音）+ E（大三度，4 個半音）+ G（完全五度，7 個半音）。' },
            { q: '小三和弦和大三和弦差在哪裡？', options: ['五音降半音', '三音降半音'], answer: 1,
              explain: '只要把三音降半音，明亮的大和弦就變成憂鬱的小和弦。Cm = C + Eb + G。' },
            { q: 'C 大調裡的 V 級（屬和弦）是哪個和弦？', options: ['F', 'G', 'Am'], answer: 1,
              explain: '第五級是 G，G 和弦最想回到 C，這就是「屬到主」的解決感。' },
          ],
        },
      },
      { id: 'a5-2', type: 'sequence', title: '彈出 C、F、G 三和弦', xp: 45, desc: '最常用的三個和弦',
        config: { chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], loops: 2, showHint: true } },
      { id: 'a5-3', type: 'sequence', title: '和弦轉位', xp: 50, desc: '讓和弦移動更順手',
        config: { chords: [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]], loops: 2, showHint: true,
          tip: '把和弦的音換順序（轉位），手就不用在鍵盤上跳來跳去了。' } },
      { id: 'a5-4', type: 'sequence', title: 'I–V–vi–IV 進行', xp: 55, desc: '流行歌最愛的四個和弦',
        config: { chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], loops: 3, showHint: true,
          tip: '這組進行撐起了半個流行樂壇，把它練熟就能即興伴奏很多歌。' } },
    ],
  },
  {
    id: 'a6', audience: 'adult', icon: '🎶',
    title: '第一批曲目',
    desc: '把技巧放進真正的音樂裡',
    lessons: [
      { id: 'a6-1', type: 'song', title: '歡樂頌（右手）', xp: 55, desc: '貝多芬',
        config: { songId: 'ode-to-joy', hands: 'right', tempoScale: 0.85, minAccuracy: 0.75 } },
      { id: 'a6-2', type: 'song', title: '歡樂頌（雙手）', xp: 75, desc: '加上左手和聲',
        config: { songId: 'ode-to-joy', hands: 'both', tempoScale: 0.75, minAccuracy: 0.7 } },
      { id: 'a6-3', type: 'song', title: 'Amazing Grace', xp: 70, desc: '三拍子的抒情曲',
        config: { songId: 'amazing-grace', hands: 'both', tempoScale: 0.8, minAccuracy: 0.7 } },
      { id: 'a6-4', type: 'song', title: '卡農', xp: 80, desc: '經典的和聲進行',
        config: { songId: 'canon-in-d', hands: 'both', tempoScale: 0.8, minAccuracy: 0.7 } },
    ],
  },
  {
    id: 'a7', audience: 'adult', icon: '🏆',
    title: '進階挑戰',
    desc: '音程聽辨、琶音技巧與經典名曲',
    lessons: [
      { id: 'a7-1', type: 'ear', title: '音程聽辨', xp: 45, desc: '三度、五度、八度',
        config: { mode: 'interval', pool: [3, 4, 5, 7, 12], rounds: 10 } },
      { id: 'a7-2', type: 'ear', title: '大和弦還是小和弦', xp: 45, desc: '和弦色彩',
        config: { mode: 'chord-quality', pool: ['maj', 'min'], rounds: 10 } },
      { id: 'a7-3', type: 'ear', title: '七和弦的味道', xp: 55, desc: 'maj7 / m7 / 屬七',
        config: { mode: 'chord-quality', pool: ['maj7', 'min7', 'dom7'], rounds: 10 } },
      { id: 'a7-4', type: 'song', title: '巴哈：前奏曲', xp: 90, desc: '琶音與雙手獨立',
        config: { songId: 'prelude-c', hands: 'both', tempoScale: 0.7, minAccuracy: 0.65 } },
      { id: 'a7-5', type: 'song', title: '給愛麗絲', xp: 100, desc: '最想學會的那首',
        config: { songId: 'fur-elise', hands: 'both', tempoScale: 0.7, minAccuracy: 0.65 } },
    ],
  },
];

export const unitsFor = (audience) =>
  UNITS.filter((u) => u.audience === audience || u.audience === 'both');

export function allLessons() {
  return UNITS.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id, audience: u.audience })));
}

export const getLesson = (id) => allLessons().find((l) => l.id === id);

/** 找出這個單元的下一課（尚未完成的第一課） */
export function nextLesson(audience, isCompleted) {
  for (const unit of unitsFor(audience)) {
    for (const lesson of unit.lessons) {
      if (!isCompleted(lesson.id)) return { unit, lesson };
    }
  }
  return null;
}

/**
 * 解鎖規則：同單元必須依序完成；要開新單元，前一單元至少完成一半。
 */
export function isUnlocked(unit, lesson, isCompleted) {
  const units = unitsFor(unit.audience);
  const uIdx = units.findIndex((u) => u.id === unit.id);
  if (uIdx > 0) {
    const prev = units[uIdx - 1];
    const done = prev.lessons.filter((l) => isCompleted(l.id)).length;
    if (done < Math.ceil(prev.lessons.length / 2)) return false;
  }
  const lIdx = unit.lessons.findIndex((l) => l.id === lesson.id);
  if (lIdx === 0) return true;
  return isCompleted(unit.lessons[lIdx - 1].id);
}
