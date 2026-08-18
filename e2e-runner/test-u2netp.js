/**
 * 本地推理测试：确定 u2netp 模型的正确输出张量 + 归一化方式
 */
const ort = require('onnxruntime-node');

// 生成 320x320 测试图（左半亮=背景，右半暗=主体）
function makeInput() {
  const W = 320, H = 320;
  const data = new Float32Array(3 * W * H);
  const stride = W * H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const bright = x < W / 2; // 左半亮(背景)
      // 0-255 原始值
      let r = bright ? 255 : 40, g = bright ? 0 : 40, b = bright ? 0 : 40;
      // 归一化方案 A: rmbg 的 (v-128)/256 (原始0-255)
      data[idx] = (r - 128) / 256;
      data[idx + stride] = (g - 128) / 256;
      data[idx + stride * 2] = (b - 128) / 256;
    }
  }
  return data;
}

// 方案 B: ImageNet (v/255 - mean)/std
function makeInputImageNet() {
  const W = 320, H = 320;
  const data = new Float32Array(3 * W * H);
  const stride = W * H;
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const bright = x < W / 2;
      const r = bright ? 255 : 40, g = bright ? 0 : 40, b = bright ? 0 : 40;
      data[idx] = (r / 255 - mean[0]) / std[0];
      data[idx + stride] = (g / 255 - mean[1]) / std[1];
      data[idx + stride * 2] = (b / 255 - mean[2]) / std[2];
    }
  }
  return data;
}

function analyze(name, outName, tensorData) {
  const data = tensorData;
  const stride = 320 * 320;
  let min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < stride; i++) {
    const v = data[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const avg = sum / stride;
  // 统计左半(背景)和右半(主体)的平均值
  let lSum = 0, rSum = 0;
  for (let y = 0; y < 320; y++) {
    for (let x = 0; x < 320; x++) {
      const v = data[y * 320 + x];
      if (x < 160) lSum += v; else rSum += v;
    }
  }
  const lAvg = lSum / (320 * 160);
  const rAvg = rSum / (320 * 160);
  console.log(`[${name}] min=${min.toFixed(4)} max=${max.toFixed(4)} avg=${avg.toFixed(4)} 左半(背景)avg=${lAvg.toFixed(4)} 右半(主体)avg=${rAvg.toFixed(4)}`);
}

(async () => {
  const session = await ort.InferenceSession.create('u2netp.onnx', { executionProviders: ['cpu'] });

  // 方案 A: rmbg 归一化
  const a = await session.run({ 'input.1': new ort.Tensor('float32', makeInput(), [1, 3, 320, 320]) });
  console.log('=== 方案 A: rmbg 归一化 (v-128)/256 ===');
  for (const n of ['1959', '1964', '1965']) {
    analyze(`output ${n}`, n, a[n].data);
  }

  // 方案 B: ImageNet 归一化
  const b = await session.run({ 'input.1': new ort.Tensor('float32', makeInputImageNet(), [1, 3, 320, 320]) });
  console.log('=== 方案 B: ImageNet (v/255-mean)/std ===');
  for (const n of ['1959', '1964', '1965']) {
    analyze(`output ${n}`, n, b[n].data);
  }
})();
