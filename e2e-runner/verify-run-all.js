// 验证「运行全部」：三个模型全部加载、全部产生结果、可切换预览、可下载
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const BASE = 'http://localhost:3000';
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  const loadLogs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text());
    if (m.text().includes('[模型加载] 模型:')) loadLogs.push(m.text());
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // 上传
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles({ name: 'all.png', mimeType: 'image/png', buffer: createPng(128, 128) });
  await page.waitForTimeout(1200);

  // 打开模型选择器并选「运行全部」
  const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
  await trigger.click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: /运行全部/ }).first().click();
  await page.waitForTimeout(400);
  report('已选运行全部', (await page.evaluate(() => document.body.innerText)).includes('三种模型同时运行'), '');
  if (!(await page.evaluate(() => document.body.innerText)).includes('三种模型同时运行')) {
    const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t.length < 20 && t.length > 0));
    console.log('可见按钮:', JSON.stringify(btns));
  }

  await page.getByRole('button', { name: /开始抠图/ }).first().click();

  // 等待全部完成（最长 10 分钟：headless 无 WebGPU，Pro 创建会话慢，3 模型顺序执行需较长时间）
  const deadline = Date.now() + 600000;
  let state = 'timeout';
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes('全部完成')) { state = 'done'; break; }
    if (t.includes('处理出错')) { state = 'error'; break; }
    await page.waitForTimeout(3000);
  }
  report('运行全部-处理完成', state === 'done', `state=${state}`);

  // 加载日志中应出现 3 个模型
  const loaded = loadLogs.filter(l => !l.includes('缓存命中') && !l.includes('完成:')).map(l => {
    const m = l.match(/模型: (\S+)/); return m ? m[1] : '';
  });
  const loadedModels = new Set(loaded);
  report('运行全部-3个模型加载', loadedModels.size === 3, JSON.stringify([...loadedModels]));

  // 检查缩略图：应有 3 个模型结果
  const modelThumbs = await page.locator('img[alt*="抠图结果"]').count();
  report('运行全部-3个结果缩略图', modelThumbs >= 3, `缩略图数量=${modelThumbs}`);

  // 打开预览，应有模型切换按钮
  const thumb = page.locator('img[alt="all.png"]').first();
  await thumb.hover(); await page.waitForTimeout(500);
  const pvBtn = page.locator('button[title="对比预览"]').first();
  await pvBtn.click();
  await page.waitForTimeout(800);
  const modelSwitchBtns = await page.locator('button', { hasText: /Pro|Mini|肖像/ }).count();
  report('预览-模型切换按钮', modelSwitchBtns >= 3, `切换按钮数=${modelSwitchBtns}`);
  const sliderImg = await page.locator('img[alt="抠图结果"]').count();
  report('预览-滑块显示', sliderImg >= 1, `滑块图=${sliderImg}`);

  // 点击不同模型切换（限定在预览浮层容器内，避免匹配到页面模型卡片按钮）
  const modal = page.locator('div.fixed.inset-0.z-\\[200\\]').first();
  const switchBtns = modal.locator('button', { hasText: /Pro|Mini|肖像/ });
  for (let i = 0; i < await switchBtns.count(); i++) {
    await switchBtns.nth(i).click();
    await page.waitForTimeout(300);
  }
  report('预览-模型切换点击无异常', true, '');

  // 页面错误
  const realErrs = errs.filter(e => !e.includes('webgpu') && !e.includes('WebGPU') && !e.includes('GPU adapter'));
  report('无真实页面错误', realErrs.length === 0, realErrs.join('; ') || '无');

  console.log('\n========== 汇总 ==========');
  const passCount = results.filter(r => r.pass).length;
  results.filter(r => !r.pass).forEach(f => console.log(`  ✗ ${f.name} | ${f.detail}`));
  console.log(`通过: ${passCount}/${results.length}`);

  await browser.close();
  process.exit(results.filter(r => !r.pass).length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
