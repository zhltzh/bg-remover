/**
 * 全面归一化测试：找出每个模型的最佳预处理方案
 */
const ort = require('onnxruntime-node');

function makeInput(size, scheme) {
  const W = size, H = size;
  const data = new Float32Array(3 * W * H);
  const stride = W * H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const bright = x < W / 2;
      const r = bright ? 255 : 40, g = bright ? 0 : 40, b = bright ? 0 : 40;
      switch (scheme) {
        case 'rmbg':      // (v-128)/256 on raw
          data[idx] = (r - 128) / 256;
          data[idx + stride] = (g - 128) / 256;
          data[idx + stride * 2] = (b - 128) / 256;
          break;
        case 'half_std1': // (v/255 - 0.5)/1.0  (BRIA 官方)
          data[idx] = r / 255 - 0.5;
          data[idx + stride] = g / 255 - 0.5;
          data[idx + stride * 2] = b / 255 - 0.5;
          break;
        case 'half_std05': // (v/255 - 0.5)/0.5
          data[idx] = (r / 255 - 0.5) / 0.5;
          data[idx + stride] = (g / 255 - 0.5) / 0.5;
          data[idx + stride * 2] = (b / 255 - 0.5) / 0.5;
          break;
        case 'imagenet':
          const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
          data[idx] = (r / 255 - mean[0]) / std[0];
          data[idx + stride] = (g / 255 - mean[1]) / std[1];
          data[idx + stride * 2] = (b / 255 - mean[2]) / std[2];
          break;
      }
    }
  }
  return data;
}

function analyze(label, data, size) {
  const stride = size * size;
  let lSum = 0, rSum = 0, min = 1, max = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = data[y * size + x];
      if (v < min) min = v;
      if (v > max) max = v;
      if (x < size / 2) lSum += v; else rSum += v;
    }
  }
  const lAvg = lSum / (size * size / 2);
  const rAvg = rSum / (size * size / 2);
  const diff = Math.abs(rAvg - lAvg);
  const score = diff > 0.7 ? '✓✓ 优秀' : diff > 0.4 ? '✓ 可用' : diff > 0.15 ? '△ 较弱' : '✗ 失败';
  console.log(`[${label}] 背景=${lAvg.toFixed(4)} 主体=${rAvg.toFixed(4)} 差=${diff.toFixed(4)} min=${min.toFixed(4)} max=${max.toFixed(4)} ${score}`);
}

(async () => {
  // ===== u2netp =====
  {
    const s = await ort.InferenceSession.create('u2netp.onnx', { executionProviders: ['cpu'] });
    console.log('=== u2netp ===');
    for (const scheme of ['rmbg', 'imagenet', 'half_std05']) {
      const r = await s.run({ 'input.1': new ort.Tensor('float32', makeInput(320, scheme), [1, 3, 320, 320]) });
      analyze(`out1965 [${scheme}]`, r['1965'].data, 320);
      analyze(`out1959 [${scheme}]`, r['1959'].data, 320);
    }
  }
  // ===== modnet =====
  {
    const s = await ort.InferenceSession.create('modnet.onnx', { executionProviders: ['cpu'] });
    console.log('=== modnet ===');
    for (const scheme of ['rmbg', 'half_std1', 'half_std05', 'imagenet']) {
      const r = await s.run({ 'input': new ort.Tensor('float32', makeInput(512, scheme), [1, 3, 512, 512]) });
      analyze(`out [${scheme}]`, r['output'].data, 512);
    }
  }
  // ===== briaai =====
  {
    const s = await ort.InferenceSession.create('briaai.onnx', { executionProviders: ['cpu'] });
    console.log('=== briaai ===');
    for (const scheme of ['rmbg', 'half_std1', 'half_std05']) {
      const r = await s.run({ 'input': new ort.Tensor('float32', makeInput(1024, scheme), [1, 3, 1024, 1024]) });
      analyze(`out [${scheme}]`, r['output'].data, 1024);
    }
  }
})();
