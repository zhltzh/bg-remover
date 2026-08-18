/**
 * 国际化（i18n）验证测试：
 * 1. 中文版 (/) 显示中文文案，标题/描述/hreflang 正确
 * 2. 英文版 (/en) 显示英文文案，标题/描述/hreflang/canonical 正确
 * 3. 语言切换器在两种语言下均可工作
 * 4. 下载文件名后缀：zh=_抠图.png，en=_bgremoved.png
 * 5. JSON-LD 结构化数据按 locale 本地化
 * 6. 404 页面双语
 * 7. /en/404 可访问
 * 8. 模型选择器名称本地化（Pro/Mini/Portrait）
 *
 * 分两阶段：
 * - Phase A（新浏览器）：SEO/head/文案/语言切换/404/llms.txt 快速检查，不涉及模型下载
 * - Phase B（持久上下文 + 预热缓存）：真实上传+抠图+下载文件名，复用 warm-models.js 的缓存
 */
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const results = [];
function report(name, pass, detail) { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`); }

const BASE = 'http://localhost:3000';
const userDataDir = path.join(os.tmpdir(), 'bgremover-runall-cache');

async function waitForText(page, text, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes(text)) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

// 等待处理完成或失败，返回 'done' | 'error' | 'timeout'
async function waitForProcess(page, doneText, errText, timeoutMs = 480000) {
  const deadline = Date.now() + timeoutMs;
  let state = 'timeout';
  while (Date.now() < deadline) {
    const t = await page.evaluate(() => document.body.innerText);
    if (t.includes(doneText)) { state = 'done'; break; }
    if (t.includes(errText)) { state = 'error'; break; }
    await page.waitForTimeout(2000);
  }
  return state;
}

// 获取页面的 head 信息（渲染后）
async function getHead(page) {
  return page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getAttribute('content') || '';
    const link = (rel) => Array.from(document.querySelectorAll(`link[rel="${rel}"]`)).map(l => ({ href: l.getAttribute('href'), hreflang: l.getAttribute('hreflang') }));
    const ldjson = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => JSON.parse(s.textContent));
    return {
      title: document.title,
      description: q('meta[name="description"]'),
      keywords: q('meta[name="keywords"]'),
      canonical: link('canonical')[0]?.href || '',
      alternates: link('alternate'),
      htmlLang: document.documentElement.lang,
      ldjson,
    };
  });
}

// 生成测试 PNG
function createPng(w, h) {
  const zlib = require('zlib');
  const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function chunk(t, d) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const tb = Buffer.from(t, 'ascii'); const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, d]))); return Buffer.concat([l, tb, d, cb]); }
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2;
  const rowLen = w*3; const raw = Buffer.alloc((rowLen+1)*h);
  for (let y=0;y<h;y++){const off=y*(rowLen+1);raw[off]=0; for(let x=0;x<w;x++){const p=off+1+x*3;raw[p]=120;raw[p+1]=120;raw[p+2]=120;}}
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// 检查下载文件名
async function checkDownloadName(page, expectedSuffix) {
  try {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    // 点击已处理图片下方的常驻「立即下载」按钮（文本匹配，兼容所有语言）
    const btn = page.getByRole('button', { name: /立即下载|Download Now|今すぐダウンロード|지금 다운로드|Télécharger maintenant|Jetzt herunterladen|Descargar ahora|Скачать сейчас|Descarregar agora|تنزيل الآن/ }).first();
    await btn.click({ timeout: 8000 });
    const download = await downloadPromise;
    return download.suggestedFilename();
  } catch (e) {
    return null;
  }
}

function finish(code) {
  const failed = results.filter(r => !r.pass);
  console.log(`\n===== i18n 验证完成：${results.length - failed.length}/${results.length} 通过 =====`);
  if (failed.length > 0) {
    console.log('失败项：');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.detail}`));
  }
  process.exit(code);
}

(async () => {
  // ================= Phase A：SEO / 文案 / 语言切换（新浏览器，无模型下载） =================
  const browser = await chromium.launch({ headless: true });

  // ---------- 1. 中文版首页 ----------
  let page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const zhBody = await page.evaluate(() => document.body.innerText);
  report('zh | 页面标题含中文 H1', zhBody.includes('在线免费批量去除图片背景') || zhBody.includes('AI 抠图'), '');
  report('zh | 上传区文案', zhBody.includes('拖拽图片到此处'), '');
  report('zh | 语言切换器', await page.locator('header div.relative button').count() > 0, '');

  const zhHead = await getHead(page);
  report('zh | title 中文', zhHead.title.includes('AI抠图'), zhHead.title);
  report('zh | html lang', zhHead.htmlLang === 'zh-CN', zhHead.htmlLang);
  report('zh | canonical 无前缀', zhHead.canonical === 'https://ai-bg-remover.vercel.app', zhHead.canonical);
  const zhAltEn = zhHead.alternates.find(a => a.hreflang === 'en');
  report('zh | hreflang en → /en', zhAltEn?.href === 'https://ai-bg-remover.vercel.app/en', JSON.stringify(zhAltEn));
  const zhXdefault = zhHead.alternates.find(a => a.hreflang === 'x-default');
  report('zh | hreflang x-default 存在', !!zhXdefault, '');

  // JSON-LD 本地化
  const zhFAQ = zhHead.ldjson.find(s => s['@type'] === 'FAQPage');
  report('zh | FAQPage JSON-LD 中文', zhFAQ && zhFAQ.mainEntity[0].name.includes('抠图'), JSON.stringify(zhFAQ?.mainEntity?.[0]?.name));
  const zhHowTo = zhHead.ldjson.find(s => s['@type'] === 'HowTo');
  report('zh | HowTo JSON-LD 中文', zhHowTo && zhHowTo.step.length === 3 && zhHowTo.name.includes('抠图'), '');

  // 语言切换器：切到英文（下拉交互）
  await page.locator('header div.relative button').first().click();
  await page.waitForTimeout(500);
  await page.locator('header a', { hasText: 'English' }).first().click();
  await page.waitForTimeout(1500);
  report('zh→en | 切换后 URL 为 /en', page.url().includes('/en'), page.url());

  // ---------- 2. 英文版首页 ----------
  await page.waitForTimeout(1000);
  const enBody = await page.evaluate(() => document.body.innerText);
  report('en | H1 英文', enBody.includes('AI Background Remover'), '');
  report('en | 上传区英文', enBody.includes('Drag images here'), '');
  report('en | 步骤区英文', enBody.includes('Remove Backgrounds in 3 Steps'), '');
  report('en | FAQ 英文', enBody.includes('Frequently Asked Questions'), '');

  const enHead = await getHead(page);
  report('en | title 英文', enHead.title.includes('Free AI Background Remover'), enHead.title);
  report('en | html lang', enHead.htmlLang === 'en-US', enHead.htmlLang);
  report('en | canonical /en', enHead.canonical === 'https://ai-bg-remover.vercel.app/en', enHead.canonical);
  const enAltZh = enHead.alternates.find(a => a.hreflang === 'zh');
  report('en | hreflang zh → /', enAltZh?.href === 'https://ai-bg-remover.vercel.app', JSON.stringify(enAltZh));

  // JSON-LD 英文
  const enFAQ = enHead.ldjson.find(s => s['@type'] === 'FAQPage');
  report('en | FAQPage JSON-LD 英文', enFAQ && enFAQ.mainEntity[0].name.includes('upload images'), JSON.stringify(enFAQ?.mainEntity?.[0]?.name));
  const enWebApp = enHead.ldjson.find(s => s['@type'] === 'WebApplication');
  report('en | WebApplication 英文', enWebApp && enWebApp.name.includes('AI Background Remover'), '');

  // 模型选择器本地化（工具面板需先上传图片才会渲染）
  // 注意：ModelSelector 只在有图片时的工具面板出现，先上传一张图
  const pngSmall = createPng(64, 64);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'sel.png', mimeType: 'image/png', buffer: pngSmall });
  await page.waitForTimeout(1200);
  // 用触发器按钮打开下拉（避免误点 hero 模型对比卡片）
  const trigger = page.locator('button', { has: page.locator('div.min-w-0') }).first();
  await trigger.click();
  await page.waitForTimeout(600);
  const dropdownText = await page.evaluate(() => document.body.innerText);
  report('en | 模型名 Portrait 出现', dropdownText.includes('Portrait'), '');
  report('en | 运行全部英文', dropdownText.includes('Run all'), '');
  report('en | 推荐英文', dropdownText.includes('Recommended'), '');
  // 关闭下拉
  await page.keyboard.press('Escape');
  await page.click('h1');

  // 语言切换器：切回中文（下拉交互）
  await page.locator('header div.relative button').first().click();
  await page.waitForTimeout(500);
  await page.locator('header a', { hasText: '中文' }).first().click();
  await page.waitForTimeout(1500);
  report('en→zh | 切回后 URL 为 /', page.url().replace(/\/+$/, '') === BASE, page.url());

  await page.close();

  // ---------- 4. 404 页面双语 ----------
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE + '/404', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const zh404 = await page.evaluate(() => document.body.innerText);
  report('404 | 中文', zh404.includes('页面未找到') && zh404.includes('返回首页'), '');

  await page.goto(BASE + '/en/404', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const en404 = await page.evaluate(() => document.body.innerText);
  report('/en/404 | 英文', en404.includes('Page Not Found') && en404.includes('Back to Home'), '');

  await page.close();

  // ---------- 5. llms.txt 双语 ----------
  try {
    const zhLlm = await (await fetch(BASE + '/llms.txt')).text();
    report('llms.txt | 中文内容', zhLlm.includes('AI 抠图工具'), '');
    const enLlm = await (await fetch(BASE + '/llms-en.txt')).text();
    report('llms-en.txt | 英文内容', enLlm.includes('AI BG Remover'), '');
  } catch (e) {
    report('llms.txt | 可访问', false, e.message);
    report('llms-en.txt | 可访问', false, e.message);
  }

  await browser.close();

  // ================= Phase B：上传 + 抠图 + 下载文件名（持久上下文，复用预热缓存） =================
  if (!fs.existsSync(userDataDir)) {
    report('Phase B | 缓存目录存在', false, `不存在，请先运行 warm-models.js`);
    finish(1);
    return;
  }
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true, viewport: { width: 1280, height: 900 },
    // 固定浏览器语言，避免 detectBrowserLanguage 把 / 重定向到 /en
    locale: 'zh-CN',
  });
  page = context.pages()[0] || await context.newPage();
  // 清除历史 locale 重定向 cookie，确保从 / 进入中文版
  await context.clearCookies();

  // ---------- 3a. 中文下载后缀 ----------
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const png = createPng(64, 64);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(800);
  const zhStartCount = await page.getByRole('button', { name: /开始抠图/ }).first().count();
  report('zh | 开始抠图按钮可见', zhStartCount > 0, '');
  if (zhStartCount > 0) {
    await page.getByRole('button', { name: /开始抠图/ }).first().click();
  }
  const t0 = Date.now();
  const zhState = await waitForProcess(page, '全部完成', '处理出错');
  report('zh | 图片处理完成', zhState === 'done', `state=${zhState} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  if (zhState === 'done') {
    const zhName = await checkDownloadName(page, '抠图');
    report('zh | 下载文件名含 _抠图.png', zhName && zhName.includes('_抠图.png'), zhName || '无下载');
  }

  // ---------- 3b. 英文下载后缀（直接导航到 /en，重新上传） ----------
  await page.goto(BASE + '/en', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('input[type=file]').first().setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(800);
  const enStartCount = await page.getByRole('button', { name: /Remove Background/ }).first().count();
  report('en | Remove Background 按钮可见', enStartCount > 0, '');
  if (enStartCount > 0) {
    await page.getByRole('button', { name: /Remove Background/ }).first().click();
  }
  const t1 = Date.now();
  const enState = await waitForProcess(page, 'All done', 'Processing failed');
  report('en | 英文版处理完成', enState === 'done', `state=${enState} (${((Date.now() - t1) / 1000).toFixed(0)}s)`);
  if (enState === 'done') {
    const enName = await checkDownloadName(page, 'bgremoved');
    report('en | 下载文件名含 _bgremoved.png', enName && enName.includes('_bgremoved.png'), enName || '无下载');
  }

  // 清理：移除访问 /en 时写入的 i18n_redirected 重定向 cookie，
  // 避免污染共享缓存 profile，导致其他中文默认测试的 / 被重定向到 /en
  await context.clearCookies();
  await context.close();

  // ========== 汇总 ==========
  finish(results.filter(r => !r.pass).length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
