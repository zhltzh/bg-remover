/**
 * 明确测试：居中物体（前景）vs 白色背景
 * 用 rmbg 归一化 (v-128)/256（rmbg 库的官方方案）
 */
const ort = require('onnxruntime-node');

// 白底 + 中央灰色圆（模拟产品图）
function makeCenteredBlob(size, scheme) {
  const W = size, H = size;
  const data = new Float32Array(3 * W * H);
  const stride = W * H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const dx = x - W / 2, dy = y - H / 2;
      const inBlob = Math.sqrt(dx * dx + dy * dy) < size * 0.25;
      const r = inBlob ? 120 : 255, g = inBlob ? 120 : 255, b = inBlob ? 120 : 255;
      switch (scheme) {
        case 'rmbg':
          data[idx] = (r - 128) / 256;
          data[idx + stride] = (g - 128) / 256;
          data[idx + stride * 2] = (b - 128) / 256;
          break;
        case 'half_std1':
          data[idx] = r / 255 - 0.5;
          data[idx + stride] = g / 255 - 0.5;
          data[idx + stride * 2] = b / 255 - 0.5;
          break;
      }
    }
  }
  return data;
}

// 人形剪影（中央深色人体 + 亮背景，模拟人像）
function makePortrait(size, scheme) {
  const W = size, H = size;
  const data = new Float32Array(3 * W * H);
  const stride = W * H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      // 简单人形：头(圆) + 身体(椭圆)
      const hx = x - W / 2, hy = y - H * 0.32;
      const inHead = Math.sqrt(hx * hx + hy * hy) < size * 0.13;
      const bx = (x - W / 2) / (size * 0.28), by = (y - H * 0.62) / (size * 0.35);
      const inBody = bx * bx + by * by < 1;
      const person = inHead || inBody;
      const r = person ? 90 : 240, g = person ? 90 : 240, b = person ? 90 : 240;
      switch (scheme) {
        case 'rmbg':
          data[idx] = (r - 128) / 256;
          data[idx + stride] = (g - 128) / 256;
          data[idx + stride * 2] = (b - 128) / 256;
          break;
        case 'half_std1':
          data[idx] = r / 255 - 0.5;
          data[idx + stride] = g / 255 - 0.5;
          data[idx + stride * 2] = b / 255 - 0.5;
          break;
      }
    }
  }
  return data;
}

function analyze(label, data, size) {
  const stride = size * size;
  let min = 1, max = 0, sum = 0;
  const centerSum = { total: 0, count: 0 }, bgSum = { total: 0, count: 0 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = data[y * size + x];
      if (v < min) min = v;
      if (v > max) max = v;
      sum += v;
      const dx = x - size / 2, dy = y - size / 2;
      if (Math.sqrt(dx * dx + dy * dy) < size * 0.3) {
        centerSum.total += v; centerSum.count++;
      } else {
        bgSum.total += v; bgSum.count++;
      }
    }
  }
  const cAvg = centerSum.total / centerSum.count;
  const bAvg = bgSum.total / bgSum.count;
  const diff = Math.abs(cAvg - bAvg);
  const score = diff > 0.7 ? '✓✓ 优秀' : diff > 0.4 ? '✓ 可用' : diff > 0.15 ? '△ 较弱' : '✗ 失败';
  console.log(`[${label}] 中心(物体)=${cAvg.toFixed(4)} 边缘(背景)=${bAvg.toFixed(4)} 差=${diff.toFixed(4)} min=${min.toFixed(4)} max=${max.toFixed(4)} ${score}`);
}

(async () => {
  // ===== u2netp =====
  {
    const s = await ort.InferenceSession.create('u2netp.onnx', { executionProviders: ['cpu'] });
    console.log('=== u2netp (白底+灰圆) ===');
    for (const scheme of ['rmbg']) {
      const r = await s.run({ 'input.1': new ort.Tensor('float32', makeCenteredBlob(320, scheme), [1, 3, 320, 320]) });
      analyze(`out1959 [${scheme}]`, r['1959'].data, 320);
      analyze(`out1965 [${scheme}]`, r['1965'].data, 320);
    }
  }
  // ===== modnet =====
  {
    const s = await ort.InferenceSession.create('modnet.onnx', { executionProviders: ['cpu'] });
    console.log('=== modnet (人形剪影) ===');
    for (const scheme of ['rmbg']) {
      const r = await s.run({ 'input': new ort.Tensor('float32', makePortrait(512, scheme), [1, 3, 512, 512]) });
      analyze(`out [${scheme}]`, r['output'].data, 512);
    }
    console.log('=== modnet (白底+灰圆) ===');
    for (const scheme of ['rmbg']) {
      const r = await s.run({ 'input': new ort.Tensor('float32', makeCenteredBlob(512, scheme), [1, 3, 512, 512]) });
      analyze(`out [${scheme}]`, r['output'].data, 512);
    }
  }
  // ===== briaai =====
  {
    const s = await ort.InferenceSession.create('briaai.onnx', { executionProviders: ['cpu'] });
    console.log('=== briaai (白底+灰圆) ===');
    for (const scheme of ['rmbg', 'half_std1']) {
      const r = await s.run({ 'input': new ort.Tensor('float32', makeCenteredBlob(1024, scheme), [1, 3, 1024, 1024]) });
      analyze(`out [${scheme}]`, r['output'].data, 1024);
    }
    console.log('=== briaai (人形剪影) ===');
    for (const scheme of ['rmbg', 'half_std1']) {
      const r = await s.run({ 'input': new ort.Tensor('float32', makePortrait(1024, scheme), [1, 3, 1024, 1024]) });
      analyze(`out [${scheme}]`, r['output'].data, 1024);
    }
  }
})();
