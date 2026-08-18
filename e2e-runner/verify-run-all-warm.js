// 「运行全部」验证（缓存预热版）：persistent context 让 IndexedDB 缓存跨页面存活
// 阶段1：分别用 Pro/Mini/肖像 各处理一张图，把 3 个模型下载并写入 IndexedDB 缓存
// 阶段2：重新加载页面，选「运行全部」，3 个模型均命中缓存，快速完成全部 8 项检查
const { chromium } = require('playwright');
const zlib = require('zlib');
const fs = require('fs');
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

const results = [];
function report(name, pass, detail) { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`); }

const BASE = 'http://localhost:3000';
const userDataDir = path.join(os.tmpdir(), 'bgremover-runall-' + Date.now());

// 选择指定模型（通过 ModelSelector 下拉点击）
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
  let page = context.pages()[0] || await context.newPage();

  // ===== 阶段1：预热 3 个模型缓存 =====
  console.log('== 阶段1：预热模型缓存 ==');
  for (const m of [
    { name: /^Pro/, key: 'Pro' },
    { name: /轻量快速/, key: 'Mini' },
    { name: /人像/, key: '肖像' },
  ]) {
    // 每次从首页重新开始，避免加载中状态
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const input = page.locator('input[type=file]').first();
    await input.setInputFiles({ name: 'warm.png', mimeType: 'image/png', buffer: createPng(64, 64) });
    await page.waitForTimeout(800);
    await selectModel(page, m.name);
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
    const t0 = Date.now();
    const state = await waitDone(page, 480000);
    console.log(`  预热 ${m.key}: ${state} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (state !== 'done') { console.log('  预热失败，中止'); process.exit(1); }
  }

  // ===== 阶段2：正式「运行全部」验证（全部命中缓存） =====
  console.log('\n== 阶段2：运行全部验证 ==');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const errs = [];
  const loadLogs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text());
    if (m.text().includes('[模型加载] 模型:')) loadLogs.push(m.text());
  });

  const input = page.locator('input[type=file]').first();
  // 2 张图：触发"全部下载"按钮显示（单张图 UI 不显示全部下载）
  await input.setInputFiles([
    { name: 'all.png', mimeType: 'image/png', buffer: createPng(128, 128) },
    { name: 'all2.png', mimeType: 'image/png', buffer: createPng(96, 128) },
  ]);
  await page.waitForTimeout(1200);

  await selectModel(page, /运行全部/);
  report('已选运行全部', (await page.evaluate(() => document.body.innerText)).includes('三种模型同时运行'), '');

  await page.getByRole('button', { name: /开始抠图/ }).first().click();
  const t2 = Date.now();
  const state = await waitDone(page, 480000);
  report('运行全部-处理完成', state === 'done', `state=${state} (${((Date.now() - t2) / 1000).toFixed(0)}s)`);

  const loaded = loadLogs.filter(l => !l.includes('缓存命中') && !l.includes('完成:')).map(l => {
    const mm = l.match(/模型: (\S+)/); return mm ? mm[1] : '';
  });
  const loadedModels = new Set(loaded);
  const hits = loadLogs.filter(l => l.includes('缓存命中'));
  report('运行全部-3个模型加载', loadedModels.size === 3, `加载=${JSON.stringify([...loadedModels])} 缓存命中=${hits.length}次`);

  const modelThumbs = await page.locator('img[alt*="抠图结果"]').count();
  report('运行全部-3个结果缩略图', modelThumbs >= 3, `缩略图数量=${modelThumbs}`);

  const thumb = page.locator('img[alt="all.png"]').first();
  await thumb.hover(); await page.waitForTimeout(500);
  const pvBtn = page.locator('button[title="对比预览"]').first();
  await pvBtn.click();
  await page.waitForTimeout(800);
  const modal = page.locator('div.fixed.inset-0.z-\\[200\\]').first();
  const modelSwitchBtns = await modal.locator('button', { hasText: /Pro|Mini|肖像/ }).count();
  report('预览-模型切换按钮', modelSwitchBtns >= 3, `切换按钮数=${modelSwitchBtns}`);
  const sliderImg = await page.locator('img[alt="抠图结果"]').count();
  report('预览-滑块显示', sliderImg >= 1, `滑块图=${sliderImg}`);

  const switchBtns = modal.locator('button', { hasText: /Pro|Mini|肖像/ });
  for (let i = 0; i < await switchBtns.count(); i++) {
    await switchBtns.nth(i).click();
    await page.waitForTimeout(300);
  }
  report('预览-模型切换点击无异常', true, '');

  // 关闭预览弹层（否则遮罩会拦截后续主页面点击）
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  // 下载全部（运行全部模式：1 张图应有 3 个模型结果；新版打包为 1 个 ZIP）
  const dlBtn = page.getByRole('button', { name: /全部下载/ }).first();
  const hasDl = await dlBtn.count();
  if (hasDl > 0) {
    const downloads = [];
    page.on('download', dl => downloads.push(dl.suggestedFilename()));
    await dlBtn.click();
    await page.waitForTimeout(2000);
    const oneZip = downloads.length === 1 && downloads[0].toLowerCase().endsWith('.zip');
    report('运行全部-全部下载(3模型结果)', oneZip || downloads.length >= 3, `下载数=${downloads.length} ${downloads.join(',')}`);
  } else {
    report('运行全部-全部下载(3模型结果)', false, '下载按钮未出现');
  }

  const realErrs = errs.filter(e => !e.includes('webgpu') && !e.includes('WebGPU') && !e.includes('GPU adapter'));
  report('无真实页面错误', realErrs.length === 0, realErrs.join('; ') || '无');

  console.log('\n========== 汇总 ==========');
  const passCount = results.filter(r => r.pass).length;
  results.filter(r => !r.pass).forEach(f => console.log(`  ✗ ${f.name} | ${f.detail}`));
  console.log(`通过: ${passCount}/${results.length}`);

  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  process.exit(results.filter(r => !r.pass).length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
