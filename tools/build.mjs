/* tools/build.mjs — 把整個 App 打包成單一 HTML 檔
 *
 * 用法：node tools/build.mjs
 * 產出：notequest.html（不需要伺服器，直接用瀏覽器打開就能用）
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'notequest-'));
const bundlePath = join(tmp, 'bundle.js');

try {
  execFileSync('npx', [
    '--yes', 'esbuild@0.25.0',
    join(root, 'js/app.js'),
    '--bundle',
    '--format=iife',
    '--minify',
    '--target=es2020',
    '--charset=utf8',
    '--outfile=' + bundlePath,
  ], { stdio: ['ignore', 'pipe', 'inherit'] });

  const js = readFileSync(bundlePath, 'utf8');
  const css = readFileSync(join(root, 'css/style.css'), 'utf8');
  let html = readFileSync(join(root, 'index.html'), 'utf8');

  // 用函式形式取代：程式碼裡的 $$、$& 等字元在字串取代中有特殊意義，會被吃掉
  html = html
    .replace('<link rel="stylesheet" href="css/style.css">', () => `<style>\n${css}\n</style>`)
    .replace('<script type="module" src="js/app.js"></script>', () => `<script>\n${js}\n</script>`)
    .replace('<title>', () => '<!-- 這是打包後的單檔版本，原始碼在 js/ 與 css/ 底下 -->\n<title>');

  if (js.includes('</script') || css.includes('</style')) {
    throw new Error('程式碼裡出現會提前結束標籤的字串，需要另外跳脫');
  }

  const out = join(root, 'notequest.html');
  writeFileSync(out, html);
  console.log(`✅ 已產出 ${out}（${(Buffer.byteLength(html) / 1024).toFixed(0)} KB）`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
