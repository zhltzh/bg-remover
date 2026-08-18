// 预热模型缓存：把指定模型下载并写入固定 userDataDir 的 IndexedDB 缓存
// 用法: node warm-models.js <Pro|Mini|肖像>
const { chromium } = require('playwright');
const zlib = require('zlib');
const os = require('os');
const path = require('path');

function crc32(b) { let t = crc32.table; if (!t) { t = crc32.table = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } } let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function pngChunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const tb = Buffer.from(t, 'ascii'); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, d]))); return Buffer.concat([l, tb, d, cb]); }
function createPng(w, h, circle = true) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const rowLen = w * 3; const raw = Buffer.alloc((rowLen + 1) * h);
  for (let y = 0; y < h; y++) { const off = y * (rowLen + 1); raw[off] = 0;
    for (let x = 0; x < w; x++) { const dx = x - w / 2, dy = y - h / 2;
      const inC = circle ? Math.sqrt(dx * dx + dy * dy) < w * 0.3 : false;
      const p = off + 1 + x * 3; raw[p] = inC ? 120 : 255; raw[p + 1] = inC ? 120 : 255; raw[p + 2] = inC ? 120 : 255; } }
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw)), pngChunk('IEND', Buffer.alloc(0))]);
}

const BASE = 'http://localhost:3000';
const userDataDir = path.join(os.tmpdir(), 'bgremover-runall-cache');

const target = process.argv[2];
const modelDefs = {
  Pro: { name: /^Pro/, file: 'p.png' },
  Mini: { name: /轻量快速/, file: 'm.png' },
  '肖像': { name: /人像/, file: 's.png' },
};
if (!modelDefs[target]) { console.error('参数需为 Pro|Mini|肖像'); process.exit(1); }
const def = modelDefs[target];

async function selectModel(page, nameRegex) {
  const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
  await trigger.click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: nameRegex }).first().click();
  await page.waitForTimeout(300);
}

async function waitDone(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let state = 'timeout';
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes('全部完成')) { state = 'done'; break; }
    if (t.includes('处理出错')) { state = 'error'; break; }
    await page.waitForTimeout(2000);
  }
  return state;
}

(async () => {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true, viewport: { width: 1280, height: 900 },
  });
  const page = context.pages()[0] || await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.locator('input[type=file]').first().setInputFiles({ name: def.file, mimeType: 'image/png', buffer: createPng(64, 64) });
  await page.waitForTimeout(800);
  await selectModel(page, def.name);
  await page.getByRole('button', { name: /开始抠图/ }).first().click();
  const t0 = Date.now();
  const state = await waitDone(page, 480000);
  console.log(`预热 ${target}: ${state} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  await context.close();
  process.exit(state === 'done' ? 0 : 1);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
