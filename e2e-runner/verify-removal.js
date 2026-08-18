/**
 * 验证抠图结果是否真的包含透明通道
 * 上传纯色背景图片 → 选 Mini → 开始抠图 → 打开对比预览 → 检查结果图 alpha
 */
const { chromium } = require('playwright');
const zlib = require('zlib');

const BASE_URL = 'http://localhost:3000';

function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
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
function createRedPng(w, h) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // RGB
  const rowLen = w * 3;
  const raw = Buffer.alloc((rowLen + 1) * h);
  for (let y = 0; y < h; y++) {
    const off = y * (rowLen + 1);
    raw[off] = 0;
    for (let x = 0; x < w; x++) {
      const center = Math.abs(x - w / 2) < w / 4 && Math.abs(y - h / 2) < h / 4;
      const p = off + 1 + x * 3;
      raw[p] = center ? 40 : 255;
      raw[p + 1] = center ? 40 : 0;
      raw[p + 2] = center ? 40 : 0;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

const testPng = createRedPng(64, 64);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  const consoleErrs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', (e) => consoleErrs.push('[pageerror] ' + e.message));
  page.on('requestfailed', (r) => consoleErrs.push(`[reqfail] ${r.url()} -> ${r.failure()?.errorText}`));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // 上传
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({ name: 'red.png', mimeType: 'image/png', buffer: testPng });
  await page.waitForTimeout(1500);

  // 选 Mini
  const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
  await trigger.click();
  await page.waitForTimeout(500);
  const optMini = page.getByRole('button', { name: /轻量快速，适合简单图片/ }).first();
  await optMini.click();
  await page.waitForTimeout(500);

  // 开始抠图
  const startBtn = page.getByRole('button', { name: /开始抠图/ }).first();
  await startBtn.click();

  // 等待完成
  const deadline = Date.now() + 120000;
  let state = 'timeout';
  while (Date.now() < deadline) {
    const done = await page.getByText('全部完成 ✓', { exact: false }).count().catch(() => 0);
    if (done > 0) { state = 'done'; break; }
    const err = await page.getByText('处理出错', { exact: false }).count().catch(() => 0);
    if (err > 0) { state = 'error'; break; }
    await page.waitForTimeout(2000);
  }
  console.log('=== 处理终态:', state);

  if (state === 'done') {
    // 悬停缩略图显示按钮，点击"对比预览"
    const thumb = page.locator('img[alt="red.png"]').first();
    await thumb.hover();
    await page.waitForTimeout(500);
    const previewBtn = page.locator('button[title="对比预览"]').first();
    const btnOk = await previewBtn.isVisible().catch(() => false);
    if (btnOk) {
      await previewBtn.click();
      await page.waitForTimeout(1500);
    } else {
      console.log('=== 未找到对比预览按钮，尝试直接点击缩略图区域');
    }

    // 分析结果图 alt="抠图结果"
    const result = await page.evaluate(async () => {
      const img = document.querySelector('img[alt="抠图结果"]');
      if (!img) return { error: '未找到抠图结果图', alts: [...document.querySelectorAll('img')].map(i => i.alt) };
      const src = img.src;
      const image = new Image();
      await new Promise((res, rej) => { image.onload = res; image.onerror = () => rej(new Error('load fail')); image.src = src; });
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const c = canvas.getContext('2d');
      c.drawImage(image, 0, 0);
      const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
      let alpha0 = 0, alpha255 = 0, other = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) alpha0++;
        else if (data[i] === 255) alpha255++;
        else other++;
      }
      const total = canvas.width * canvas.height;
      const samples = [];
      for (let i = 0; i < data.length; i += 4 * 211) {
        samples.push(`rgba(${data[i]},${data[i+1]},${data[i+2]},${data[i+3]})`);
      }
      return {
        width: canvas.width, height: canvas.height,
        alpha0, alpha255, other, total,
        transparentPct: (alpha0 / total * 100).toFixed(1),
        opaquePct: (alpha255 / total * 100).toFixed(1),
        semiPct: (other / total * 100).toFixed(1),
        samples,
      };
    });
    console.log('=== 结果分析:', JSON.stringify(result, null, 2));

    // 判定
    if (!result.error) {
      const removed = parseFloat(result.transparentPct) > 5;
      const hasSubject = parseFloat(result.opaquePct) > 5;
      console.log(`\n=== 判定: ${removed && hasSubject ? '✓ 背景已去除（存在透明区域 + 保留主体）' : '✗ 效果不佳'}`);
    }
  }

  console.log('=== 控制台错误:');
  consoleErrs.forEach((e) => console.log('  - ' + e));
  if (consoleErrs.length === 0) console.log('  (无)');

  await browser.close();
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
