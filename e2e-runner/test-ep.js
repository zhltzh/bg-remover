/**
 * 对比 wasm vs webgpu 执行提供器在 headless 浏览器中的输出
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  for (const ep of [['wasm'], ['webgpu', 'wasm'], ['cpu', 'wasm']]) {
    const result = await page.evaluate(async (eps) => {
      const ort = await import('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort.min.mjs');
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/';
      const resp = await fetch('https://unpkg.com/@rmbg/model-u2netp@0.0.1/u2netp.onnx');
      const buf = await resp.arrayBuffer();
      let session;
      try {
        session = await ort.InferenceSession.create(buf, { executionProviders: eps });
      } catch (e) {
        return { eps: eps.join(','), error: 'create failed: ' + e.message };
      }
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
      const feeds = {};
      feeds[session.inputNames[0]] = new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]);
      const out = await session.run(feeds);
      const o = out[session.outputNames[0]];
      const od = o.data;
      let cSum = 0, bSum = 0, cN = 0, bN = 0;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const v = od[y * SIZE + x];
          const dx = x - SIZE / 2, dy = y - SIZE / 2;
          if (Math.sqrt(dx * dx + dy * dy) < SIZE * 0.3) { cSum += v; cN++; }
          else { bSum += v; bN++; }
        }
      }
      return {
        eps: eps.join(','),
        centerAvg: (cSum / cN).toFixed(4),
        bgAvg: (bSum / bN).toFixed(4),
      };
    }, ep);
    console.log(JSON.stringify(result));
  }

  await browser.close();
})().catch((e) => { console.error('脚本异常:', e); process.exit(1); });
