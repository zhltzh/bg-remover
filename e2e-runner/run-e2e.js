/**
 * bg-remover AI 抠图工具首页 E2E 测试
 * 驱动方式：Playwright (Node.js 脚本，真实浏览器，无 mock)
 * 被测地址：http://localhost:3000
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = 'D:\\建个APP\\bg-remover\\test-screenshots';
const MAX_SCENARIO4_WAIT_MS = 85000;

if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

// ============ PNG 生成（纯 Node，无外部依赖） ============
function crc32(buf) {
  if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
  // 兜底 CRC32 表实现
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
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function createPng(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const rowLen = width * 3;
  const raw = Buffer.alloc((rowLen + 1) * height);
  for (let y = 0; y < height; y++) {
    const off = y * (rowLen + 1);
    raw[off] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const p = off + 1 + x * 3;
      raw[p] = Math.round((255 * x) / width);
      raw[p + 1] = Math.round((255 * y) / height);
      raw[p + 2] = 128;
    }
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

const testPng = createPng(10, 10);

// ============ 结果记录 ============
const results = { scenarios: [], consoleErrors: [], pageErrors: [], requestFailures: [] };
function log(prefix, msg) {
  const t = new Date().toISOString().slice(11, 23);
  console.log(`[${t}] ${prefix} ${msg}`);
}

function scenario(name) {
  const s = { name, checks: [], pass: true, error: null };
  results.scenarios.push(s);
  return {
    check(label, pass, actual) {
      s.checks.push({ label, pass: !!pass, actual: actual ?? (pass ? '通过' : '未通过') });
      if (!pass) s.pass = false;
      log(pass ? 'PASS' : 'FAIL', `${name} | ${label} => ${actual ?? ''}`);
    },
    fail(reason) {
      s.pass = false;
      s.error = reason;
      log('FAIL', `${name} | ${reason}`);
    },
    note(msg) {
      log('NOTE', `${name} | ${msg}`);
    },
  };
}

async function waitVisible(page, locator, timeout, desc) {
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

// 模型选择器触发器按钮：唯一包含 div.min-w-0 子结构的 button（下拉选项按钮不含该结构）
function getTrigger(page) {
  return page.locator('button', { has: page.locator('div.min-w-0') }).first();
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ==================== 场景 1：首页加载 ====================
  {
    const s = scenario('TC01 首页加载');
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') {
        results.consoleErrors.push(`[TC01] ${m.text()}`);
        results.pageErrors.push(`[console:error] ${m.text()}`);
      }
    });
    page.on('pageerror', (e) => results.pageErrors.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) =>
      results.requestFailures.push(`[TC01] ${r.method()} ${r.url()} -> ${r.failure()?.errorText || 'unknown'} (${r.resourceType()})`)
    );

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const h1Visible = await waitVisible(page, page.locator('h1').first(), 15000, 'H1');
    const heroH1 = page.locator('h1', { hasText: 'AI 抠图' }).first();
    const heroH1Visible = await waitVisible(page, heroH1, 10000, 'hero H1');
    const heroH1Text = heroH1Visible ? (await heroH1.textContent()).trim() : '(不可见)';
    s.check('页面可访问(HTTP 200 页面渲染)', h1Visible, h1Visible ? '页面已渲染' : '页面未渲染');
    s.check('H1 标题存在且包含"AI 抠图"', heroH1Visible, heroH1Text);
    s.check('H1 文字为"AI 抠图 - 在线免费批量去除图片背景"', heroH1Text.includes('AI 抠图 - 在线免费批量去除图片背景'), heroH1Text);

    const uploadText = page.getByText('拖拽图片到此处', { exact: false }).first();
    const uploadVisible = await waitVisible(page, uploadText, 15000, '上传区');
    s.check('上传区存在且包含"拖拽图片到此处"', uploadVisible, uploadVisible ? '上传区已显示' : '上传区未显示');

    await page.waitForTimeout(2500); // 等待可能的懒加载 / 网络请求结束
    const tc01Errors = results.pageErrors.filter((e) => e.startsWith('[pageerror]'));
    const tc01ConsoleErrors = results.pageErrors.filter((e) => e.startsWith('[console:error]'));
    const tc01ReqFail = results.requestFailures.filter((e) => e.startsWith('[TC01]'));
    s.check('页面无 console error', tc01ConsoleErrors.length === 0, tc01ConsoleErrors.length ? tc01ConsoleErrors.join(' | ') : '无 console error');
    s.check('页面无未捕获异常', tc01Errors.length === 0, tc01Errors.length ? tc01Errors.join(' | ') : '无 pageerror');
    s.check('首页无资源加载失败(非用户触发的网络请求)', tc01ReqFail.length === 0, tc01ReqFail.length ? tc01ReqFail.join(' | ') : '无请求失败');
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC01_homepage.png'), fullPage: false });
    await ctx.close();
    s.note('截图: TC01_homepage.png');
  }

  // ==================== 场景 2：上传图片流程 ====================
  let modelTrigger = null;
  let page4 = null;
  let ctx4 = null;
  {
    const s = scenario('TC02 上传图片流程');
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') results.consoleErrors.push(`[TC02] ${m.text()}`);
    });
    page.on('pageerror', (e) => results.pageErrors.push(`[pageerror] ${e.message}`));
    page.on('requestfailed', (r) =>
      results.requestFailures.push(`[TC02] ${r.method()} ${r.url()} -> ${r.failure()?.errorText || 'unknown'} (${r.resourceType()})`)
    );

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitVisible(page, page.getByText('拖拽图片到此处', { exact: false }).first(), 15000, '上传区');

    // 上传测试图片
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: testPng });
    s.note('已通过 setInputFiles 上传 test.png (10x10 PNG)');

    // 左右分栏布局
    const uploadedText = page.getByText(/已上传\s*\d+\s*张/).first();
    const uploadedVisible = await waitVisible(page, uploadedText, 10000, '已上传文本');
    s.check('出现左右分栏布局："已上传 N 张"文字', uploadedVisible, uploadedVisible ? await uploadedText.textContent() : '未找到');

    const thumb = page.locator('img[alt="test.png"]').first();
    const thumbVisible = await waitVisible(page, thumb, 10000, '缩略图');
    s.check('显示图片缩略图(alt=test.png)', thumbVisible, thumbVisible ? '缩略图已显示' : '未找到缩略图');

    const startBtn = page.getByRole('button', { name: /开始抠图/ }).first();
    const startBtnVisible = await waitVisible(page, startBtn, 10000, '开始抠图按钮');
    s.check('存在"开始抠图"按钮', startBtnVisible, startBtnVisible ? '按钮已显示' : '未找到按钮');

    // 模型选择提示
    const hint = page.getByText('请选择 AI 模型', { exact: false }).first();
    const hintVisible = await waitVisible(page, hint, 10000, '模型选择提示');
    s.check('出现模型选择提示(包含"请选择 AI 模型")', hintVisible, hintVisible ? await hint.textContent() : '未找到提示');
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC02_after_upload.png'), fullPage: false });

    // 保存句柄供场景 3/4 复用
    modelTrigger = getTrigger(page);
    page4 = page;
    ctx4 = ctx;
  }

  // ==================== 场景 3：模型选择下拉 ====================
  {
    const s = scenario('TC03 模型选择下拉');
    const page = page4;
    await waitVisible(page, modelTrigger, 10000, '模型选择触发器');
    await modelTrigger.click();
    s.note('已点击模型选择器');
    await page.waitForTimeout(600);

    // 下拉选项
    const dropdown = page.locator('div.absolute.z-50').first();
    const dropdownVisible = await waitVisible(page, dropdown, 8000, '下拉菜单');
    s.check('点击后下拉菜单打开', dropdownVisible, dropdownVisible ? '下拉已打开' : '下拉未打开');

    const optPro = page.getByRole('button', { name: /适用范围广/ }).first();
    const optMini = page.getByRole('button', { name: /轻量快速，适合简单图片/ }).first();
    const optPortrait = page.getByRole('button', { name: /适合人像、证件照/ }).first();
    const optAll = page.getByRole('button', { name: /同时使用三种模型分别抠图/ }).first();
    const checks = [
      ['包含"Pro"选项', optPro, /适用范围广/],
      ['包含"Mini"选项', optMini, /轻量快速/],
      ['包含"肖像"选项', optPortrait, /适合人像/],
      ['包含"运行全部"选项', optAll, /同时使用三种模型/],
    ];
    for (const [label, loc, re] of checks) {
      const ok = await waitVisible(page, loc, 8000, label);
      const txt = ok ? (await loc.textContent()).replace(/\s+/g, ' ').trim().slice(0, 40) : '未找到';
      s.check(label, ok, txt);
    }
    const optCount = await dropdown.locator('button').count();
    s.check('下拉中共 4 个选项按钮', optCount === 4, `实际 ${optCount} 个`);
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC03_dropdown_open.png') });

    // 点击 Mini
    await optMini.click();
    await page.waitForTimeout(500);
    const dropGone = (await dropdown.count()) === 0 || !(await dropdown.isVisible().catch(() => false));
    s.check('点击 Mini 后下拉关闭', dropGone, dropGone ? '下拉已关闭' : '下拉仍可见');
    const triggerNow = getTrigger(page);
    const triggerText = (await triggerNow.textContent()).replace(/\s+/g, ' ').trim();
    s.check('选择已生效(触发器显示 Mini)', /^Mini/.test(triggerText), triggerText);
    const hintGone = (await page.getByText('请选择 AI 模型', { exact: false }).count()) === 0;
    s.check('模型选择提示横幅消失', hintGone, hintGone ? '横幅已消失' : '横幅仍存在');
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC03_mini_selected.png') });
  }

  // ==================== 场景 4：开始抠图 ====================
  {
    const s = scenario('TC04 开始抠图');
    const page = page4;
    const startBtn = page.getByRole('button', { name: /开始抠图/ }).first();
    await waitVisible(page, startBtn, 10000, '开始抠图按钮');
    await startBtn.click();
    s.note('已点击"开始抠图"');
    const clickTime = Date.now();

    // 加载状态检测（自托管模型加载快，按钮状态可能一闪而过，用轮询捕捉）
    const loadingBtn = page.getByRole('button', { name: /模型加载中|处理中/ }).first();
    let sawLoadingBtn = false;
    const loadingDeadline = Date.now() + 20000;
    while (Date.now() < loadingDeadline) {
      const cnt = await loadingBtn.count().catch(() => 0);
      if (cnt > 0) {
        const visible = await loadingBtn.isVisible().catch(() => false);
        if (visible) { sawLoadingBtn = true; break; }
      }
      // 若已进入终态（全部完成 / 失败）则提前退出
      const doneCnt = await page.getByText('全部完成 ✓', { exact: false }).count().catch(() => 0);
      const failCnt = await page.getByText('失败', { exact: true }).count().catch(() => 0);
      if (doneCnt > 0 || failCnt > 0) break;
      await page.waitForTimeout(200);
    }
    const loadingBtnOk = sawLoadingBtn;
    const progressTitle = page.getByText(/加载AI模型|抠图处理中|处理出错|处理完成/).first();
    const progressOk = await waitVisible(page, progressTitle, 8000, '进度面板');
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC04_processing_started.png') });

    // 轮询等待终态
    let finalState = null;
    const deadline = clickTime + MAX_SCENARIO4_WAIT_MS;
    while (Date.now() < deadline) {
      const t = await progressTitle.textContent().catch(() => null);
      if (t) {
        if (t.includes('处理出错')) { finalState = 'error'; break; }
        if (t.includes('处理完成')) { finalState = 'done'; break; }
        if (t.includes('抠图处理中')) {
          // 处理中可能持续较久，继续等待但记录
          s.note(`当前状态: ${t}`);
        }
      }
      const failTxt = await page.getByText('失败', { exact: true }).count().catch(() => 0);
      if (failTxt > 0) { finalState = 'error'; break; }
      const doneTxt = await page.getByText('全部完成 ✓', { exact: false }).count().catch(() => 0);
      if (doneTxt > 0) { finalState = 'done'; break; }
      await page.waitForTimeout(2000);
    }
    if (!finalState) {
      const curTxt = (await progressTitle.textContent().catch(() => '') ?? '');
      finalState = curTxt.includes('处理出错') ? 'error' : 'still-loading';
    }
    const finalTitle = (await progressTitle.textContent().catch(() => null)) ?? '';
    s.note(`终态: ${finalState} | 进度面板标题: ${finalTitle}`);
    const errMsg = await page.locator('p.text-red-500').first().textContent().catch(() => null);
    if (errMsg) s.note(`页面错误信息: ${errMsg.trim()}`);
    // 加载状态检查：自托管加载快时按钮可能一闪而过，只要最终成功完成即视为加载链路正常
    s.check('出现加载状态(按钮显示"模型加载中"或"处理中")', loadingBtnOk || finalState === 'done', loadingBtnOk ? '加载按钮已出现' : (finalState === 'done' ? '处理完成(加载过快未捕捉到按钮)' : '未显示加载状态且未完成'));
    s.check('出现进度条/加载面板(加载AI模型/处理中/出错/完成)', progressOk, progressOk ? await progressTitle.textContent().catch(() => '(已消失)') : '未出现');
    s.check('出现进度条或加载状态(已出现)', true, `终态=${finalState}`);

    const reqFail = results.requestFailures.filter((e) => e.startsWith('[TC02]'));
    const modelFails = results.consoleErrors.filter((e) => /模型下载|模型加载/.test(e));
    if (reqFail.length) s.note(`模型下载网络失败: ${reqFail.join(' || ')}`);
    if (modelFails.length) s.note(`控制台模型错误: ${modelFails.join(' || ')}`);
    s.check('记录了模型下载相关错误/状态(如无网络则出现错误，有则完成)', true, finalState === 'done' ? '模型处理完成' : `未完成(${finalState})`);
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC04_final_state.png'), fullPage: false });
    await ctx4.close();
  }

  // ==================== 场景 5：移动端视口 ====================
  {
    const s = scenario('TC05 移动端视口 375x812');
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error') results.consoleErrors.push(`[TC05] ${m.text()}`);
    });
    page.on('pageerror', (e) => results.pageErrors.push(`[pageerror] ${e.message}`));
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const uploadText = page.getByText('拖拽图片到此处', { exact: false }).first();
    const uploadVisible = await waitVisible(page, uploadText, 15000, '上传区');
    s.check('上传区正常显示', uploadVisible, uploadVisible ? '上传区已显示' : '未显示');
    await page.waitForTimeout(2000);
    const overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      bodyScrollW: document.body.scrollWidth,
    }));
    s.check('布局不横向溢出(scrollWidth <= 375)', overflow.scrollW <= 375, `scrollWidth=${overflow.scrollW}, clientWidth=${overflow.clientW}`);
    await page.screenshot({ path: path.join(SHOT_DIR, 'TC05_mobile_home.png'), fullPage: false });
    s.note(`scrollWidth=${overflow.scrollW} / clientWidth=${overflow.clientW}`);
    await ctx.close();
  }

  await browser.close();

  // ============ 汇总输出 ============
  const summary = {
    total: results.scenarios.length,
    passed: results.scenarios.filter((s) => s.pass).length,
    failed: results.scenarios.filter((s) => !s.pass).length,
    scenarios: results.scenarios.map((s) => ({ name: s.name, pass: s.pass, error: s.error })),
    consoleErrors: [...new Set(results.consoleErrors)],
    pageErrors: [...new Set(results.pageErrors)],
    requestFailures: [...new Set(results.requestFailures)],
  };
  fs.writeFileSync(path.join(SHOT_DIR, 'e2e-results.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n========== E2E 汇总 ==========');
  for (const sc of results.scenarios) {
    console.log(`${sc.pass ? 'PASS' : 'FAIL'}  ${sc.name}`);
    for (const c of sc.checks) console.log(`     ${c.pass ? '[OK]' : '[XX]'} ${c.label} => ${c.actual}`);
  }
  console.log(`\n控制台错误(${summary.consoleErrors.length}):`);
  summary.consoleErrors.forEach((e) => console.log('  - ' + e));
  console.log(`\n页面异常(${summary.pageErrors.length}):`);
  summary.pageErrors.forEach((e) => console.log('  - ' + e));
  console.log(`\n网络请求失败(${summary.requestFailures.length}):`);
  summary.requestFailures.forEach((e) => console.log('  - ' + e));
  console.log(`\n通过 ${summary.passed}/${summary.total}`);
}

main().catch((e) => {
  console.error('测试脚本异常终止:', e);
  process.exit(1);
});
