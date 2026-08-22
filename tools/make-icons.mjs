/* tools/make-icons.mjs — 從 assets/icon.svg 產生各尺寸的 PNG 圖示
 *
 * 用法：node tools/make-icons.mjs
 * 需要 playwright（開發時用，執行 App 本身不需要）
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright 只有產生圖示時才需要；找不到就給明確的安裝提示
let chromium;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT_PATH || 'playwright'));
} catch (err) {
  console.error('找不到 playwright。請先安裝：npm i -D playwright');
  console.error('或指定路徑：PLAYWRIGHT_PATH=/path/to/playwright node tools/make-icons.mjs');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'assets/icon.svg'), 'utf8');

/* maskable 圖示要留安全邊界：內容縮到中央約 62%，四周由底色填滿 */
const MASKABLE_SCALE = 0.64;

const TARGETS = [
  { file: 'icon-180.png', size: 180, maskable: false },   // apple-touch-icon
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-512-maskable.png', size: 512, maskable: true },
];

const browser = await chromium.launch();

for (const t of TARGETS) {
  const inner = t.maskable
    ? `<div style="width:${MASKABLE_SCALE * 100}%;height:${MASKABLE_SCALE * 100}%">${svg}</div>`
    : svg;
  const html = `<!doctype html><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:0}
      body{width:${t.size}px;height:${t.size}px;display:grid;place-items:center;
           background:${t.maskable ? '#f97316' : 'transparent'}}
      svg{width:100%;height:100%;display:block}
      div{display:grid;place-items:center}
    </style>${inner}`;

  const page = await browser.newPage({
    viewport: { width: t.size, height: t.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  const buf = await page.screenshot({ omitBackground: !t.maskable });
  writeFileSync(join(root, 'assets', t.file), buf);
  await page.close();
  console.log(`✅ assets/${t.file}  ${t.size}×${t.size}${t.maskable ? '（maskable）' : ''}`);
}

await browser.close();
