// Verify all 3 models produce correct background removal in the browser
// Uses 128x128 white bg + centered grey circle test image (zlib-based PNG, no deps)
const { chromium } = require('playwright');
const zlib = require('zlib');

const BASE_URL = 'http://localhost:3000';
const MODELS = [
  { label: 'Pro', nameRe: /适用范围广，支持半透明物体/ },
  { label: 'Mini', nameRe: /轻量快速，适合简单图片/ },
  { label: '肖像', nameRe: /适合人像、证件照或主体明显的图片/ },
];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function createPng(w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const rowLen = w * 3;
  const raw = Buffer.alloc((rowLen + 1) * h);
  for (let y = 0; y < h; y++) {
    const off = y * (rowLen + 1);
    raw[off] = 0;
    for (let x = 0; x < w; x++) {
      const dx = x - w / 2, dy = y - h / 2;
      const inCircle = Math.sqrt(dx * dx + dy * dy) < w * 0.3;
      const p = off + 1 + x * 3;
      raw[p] = inCircle ? 120 : 255;
      raw[p + 1] = inCircle ? 120 : 255;
      raw[p + 2] = inCircle ? 120 : 255;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

const testPng = createPng(128, 128);

async function runModel(browser, model) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', (e) => consoleErrs.push('[pageerror] ' + e.message));
  page.on('requestfailed', (r) => consoleErrs.push(`[reqfail] ${r.url()} -> ${r.failure()?.errorText}`));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({ name: 'circle.png', mimeType: 'image/png', buffer: testPng });
  await page.waitForTimeout(1500);

  const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
  await trigger.click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: model.nameRe }).first().click();
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: /开始抠图/ }).first().click();

  const deadline = Date.now() + 240000; // Pro model is bigger, allow more time
  let state = 'timeout';
  while (Date.now() < deadline) {
    if (await page.getByText('全部完成 ✓', { exact: false }).count().catch(() => 0)) { state = 'done'; break; }
    if (await page.getByText('处理出错', { exact: false }).count().catch(() => 0)) { state = 'error'; break; }
    await page.waitForTimeout(2000);
  }

  let result = { model: model.label, state };
  if (state === 'done') {
    await page.locator('img[alt="circle.png"]').first().hover();
    await page.waitForTimeout(500);
    const previewBtn = page.locator('button[title="对比预览"]').first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(1500);
    }

    const analysis = await page.evaluate(async () => {
      const img = document.querySelector('img[alt="抠图结果"]');
      if (!img) return { error: '未找到结果图' };
      const image = new Image();
      await new Promise((res, rej) => { image.onload = res; image.onerror = () => rej(new Error('load fail')); image.src = img.src; });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const c = canvas.getContext('2d');
      c.drawImage(image, 0, 0);
      const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
      const W = canvas.width, H = canvas.height;
      const region = (cx, cy, r) => {
        let sum = 0, n = 0;
        for (let y = Math.floor(cy - r); y < cy + r; y++) {
          for (let x = Math.floor(cx - r); x < cx + r; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            sum += data[(y * W + x) * 4 + 3];
            n++;
          }
        }
        return n ? +(sum / n).toFixed(1) : 0;
      };
      let alpha0 = 0, alpha200 = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) alpha0++;
        else if (data[i] >= 200) alpha200++;
      }
      const total = W * H;
      return {
        width: W, height: H,
        transparentPct: +(alpha0 / total * 100).toFixed(1),
        solidPct: +(alpha200 / total * 100).toFixed(1),
        centerAlpha: region(W / 2, H / 2, Math.min(W, H) * 0.2),
        cornerAlpha: region(8, 8, 4),
        edgeAlpha: region(W * 0.9, H * 0.9, 4),
      };
    });
    result.analysis = analysis;
    if (analysis && !analysis.error) {
      result.pass = analysis.solidPct > 15 && analysis.cornerAlpha < 30 && analysis.centerAlpha > 100;
    }
  }
  result.errors = consoleErrs.slice(0, 5);
  await ctx.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const m of MODELS) {
    console.log(`=== 测试模型: ${m.label} ===`);
    const r = await runModel(browser, m);
    console.log(JSON.stringify(r, null, 2));
    console.log(r.pass ? `✓ ${m.label} 抠图成功` : `✗ ${m.label} 未通过判定`);
    console.log('');
  }
  await browser.close();
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
