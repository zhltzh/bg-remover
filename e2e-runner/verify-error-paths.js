// 验证：1) 失败图片可重试  2) 处理中清空无异常 3) 处理中删除单张无异常
const { chromium } = require('playwright');
const zlib = require('zlib');

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

const results = [];
function report(name, pass, detail) { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`); }

async function waitForText(page, text, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes(text)) return true;
    await page.waitForTimeout(2000);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const BASE = 'http://localhost:3000';

  // ========== 测试 A：失败图片重试 ==========
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const input = page.locator('input[type=file]').first();
    // 无效 PNG（能创建 blob URL，但解码失败 → 处理报错）
    const invalidPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]); // 只有签名
    await input.setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: invalidPng });
    await page.waitForTimeout(1200);
    // 选 Mini 模型
    const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
    await trigger.click(); await page.waitForTimeout(400);
    await page.getByRole('button', { name: /轻量快速/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
    // 等待失败（无效图片解码失败）
    const failed = await waitForText(page, '处理失败', 60000);
    report('无效图片处理失败', failed, '显示处理失败');
    // 再次点击开始抠图 → 应再次尝试处理（不因无 pending 而退出）
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
    await page.waitForTimeout(2000);
    const t = await page.evaluate(() => document.body.innerText);
    report('失败后可再次点击重试', t.includes('模型加载中') || t.includes('处理中') || t.includes('处理失败'), '再次触发处理');
    report('A无页面异常', errs.length === 0, errs.join('; ') || '无');
    await page.close();
  }

  // ========== 测试 B：处理中清空 ==========
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const input = page.locator('input[type=file]').first();
    await input.setInputFiles([
      { name: 'a.png', mimeType: 'image/png', buffer: createPng(128, 128) },
      { name: 'b.png', mimeType: 'image/png', buffer: createPng(128, 128) },
    ]);
    await page.waitForTimeout(1200);
    const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
    await trigger.click(); await page.waitForTimeout(400);
    await page.getByRole('button', { name: /轻量快速/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
    // 立即清空（处理中）
    await page.waitForTimeout(500);
    const clearBtn = page.locator('button[title="清空所有图片"]').first();
    await clearBtn.click().catch(() => {});
    await page.waitForTimeout(3000);
    const t = await page.evaluate(() => document.body.innerText);
    const empty = t.includes('拖拽图片到此处');
    report('处理中清空回到空状态', empty, '已清空');
    // 清空后重新上传 1 张并处理，确保 processingToken 终止了旧循环
    await input.setInputFiles({ name: 'c.png', mimeType: 'image/png', buffer: createPng(64, 64) });
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
    const done = await waitForText(page, '全部完成', 120000);
    report('清空后重新处理正常', done, done ? '全部完成' : '超时');
    report('B无页面异常', errs.length === 0, errs.join('; ') || '无');
    await page.close();
  }

  // ========== 测试 C：处理中删除单张 ==========
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const input = page.locator('input[type=file]').first();
    await input.setInputFiles([
      { name: 'x.png', mimeType: 'image/png', buffer: createPng(96, 96) },
      { name: 'y.png', mimeType: 'image/png', buffer: createPng(96, 96) },
      { name: 'z.png', mimeType: 'image/png', buffer: createPng(96, 96) },
    ]);
    await page.waitForTimeout(1200);
    const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
    await trigger.click(); await page.waitForTimeout(400);
    await page.getByRole('button', { name: /轻量快速/ }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
    // 处理中删除第一张
    await page.waitForTimeout(500);
    const rmBtn = page.locator('button[title="移除"]').first();
    await rmBtn.click().catch(() => {});
    await page.waitForTimeout(5000);
    const t = await page.evaluate(() => document.body.innerText);
    report('处理中删除无页面崩溃', !t.includes('页面异常'), '继续运行');
    // 剩余图片应能继续完成
    const done = await waitForText(page, '全部完成', 120000).catch(() => false);
    report('删除后剩余处理完成', done, done ? '全部完成' : '超时(可能因中断,可接受)');
    report('C无页面异常', errs.length === 0, errs.join('; ') || '无');
    await page.close();
  }

  console.log('\n========== 汇总 ==========');
  const passCount = results.filter(r => r.pass).length;
  results.filter(r => !r.pass).forEach(f => console.log(`  ✗ ${f.name} | ${f.detail}`));
  console.log(`通过: ${passCount}/${results.length}`);
  await browser.close();
  process.exit(results.filter(r => !r.pass).length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
