/**
 * 在页面内直接测试浏览器端 ONNX 推理，对比 Node 结果
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', (e) => consoleErrs.push('[pageerror] ' + e.message));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 在页面中加载 onnxruntime-web（来自站点 bundle）并直接跑推理
  const result = await page.evaluate(async () => {
    // 通过动态 import 拿 onnxruntime-web —— 站点已打包它
    // 直接用 CDN 版确保拿到 API
    const ort = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort.min.mjs');
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';

    // 下载 u2netp 模型（unpkg 未压缩，字节数准确）
    const resp = await fetch('https://unpkg.com/@rmbg/model-u2netp@0.0.1/u2netp.onnx');
    const buf = await resp.arrayBuffer();
    const session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });

    // 构造与 Node 测试相同的输入：白底 + 中央灰圆, rmbg 归一化
    const SIZE = 320;
    const data = new Float32Array(3 * SIZE * SIZE);
    const stride = SIZE * SIZE;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x;
        const dx = x - SIZE / 2, dy = y - SIZE / 2;
        const inCircle = Math.sqrt(dx * dx + dy * dy) < SIZE * 0.3;
        const v = inCircle ? 120 : 255;
        data[idx] = (v - 128) / 256;
        data[idx + stride] = (v - 128) / 256;
        data[idx + stride * 2] = (v - 128) / 256;
      }
    }
    const inputName = session.inputNames[0];
    const feeds = {};
    feeds[inputName] = new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]);
    const out = await session.run(feeds);
    const outName = session.outputNames[0];

    // 分析 output[0]
    const o = out[outName];
    const od = o.data;
    const st = stride;
    let centerSum = 0, bgSum = 0, cN = 0, bN = 0, min = 1, max = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const v = od[y * SIZE + x];
        if (v < min) min = v;
        if (v > max) max = v;
        const dx = x - SIZE / 2, dy = y - SIZE / 2;
        if (Math.sqrt(dx * dx + dy * dy) < SIZE * 0.3) { centerSum += v; cN++; }
        else { bgSum += v; bN++; }
      }
    }
    return {
      outName,
      outDims: o.dims,
      centerAvg: (centerSum / cN).toFixed(4),
      bgAvg: (bgSum / bN).toFixed(4),
      min: min.toFixed(4),
      max: max.toFixed(4),
      inputName,
    };
  });

  console.log('=== 浏览器内 ONNX 推理结果:');
  console.log(JSON.stringify(result, null, 2));
  console.log('=== 控制台错误:');
  consoleErrs.forEach((e) => console.log('  - ' + e));
  if (consoleErrs.length === 0) console.log('  (无)');

  await browser.close();
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
