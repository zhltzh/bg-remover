/**
 * 下载三个 @rmbg 模型的全部文件，检查输入/输出名
 */
const https = require('https');
const fs = require('fs');

const models = {
  u2netp: ['https://unpkg.com/@rmbg/model-u2netp@0.0.1/u2netp.onnx'],
  modnet: [
    'https://unpkg.com/@rmbg/model-modnet@0.0.1/modnet-1.onnx',
    'https://unpkg.com/@rmbg/model-modnet@0.0.1/modnet-2.onnx',
    'https://unpkg.com/@rmbg/model-modnet@0.0.1/modnet-3.onnx',
  ],
  briaai: [
    'https://unpkg.com/@rmbg/model-briaai@0.0.1/briaai-1.onnx',
    'https://unpkg.com/@rmbg/model-briaai@0.0.1/briaai-2.onnx',
    'https://unpkg.com/@rmbg/model-briaai@0.0.1/briaai-3.onnx',
    'https://unpkg.com/@rmbg/model-briaai@0.0.1/briaai-4.onnx',
    'https://unpkg.com/@rmbg/model-briaai@0.0.1/briaai-5.onnx',
  ],
};

function download(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => res(Buffer.concat(chunks)));
    }).on('error', rej);
  });
}

async function concatToFile(model, urls) {
  const parts = [];
  for (const u of urls) {
    parts.push(await download(u));
  }
  const total = Buffer.concat(parts);
  fs.writeFileSync(`${model}.onnx`, total);
  return total.length;
}

(async () => {
  for (const [model, urls] of Object.entries(models)) {
    const size = await concatToFile(model, urls);
    console.log(`=== ${model}: downloaded ${size} bytes ===`);
    const ort = require('onnxruntime-node');
    const session = await ort.InferenceSession.create(`${model}.onnx`);
    console.log('  inputNames:', JSON.stringify(session.inputNames));
    console.log('  inputMetadata:', JSON.stringify(session.inputMetadata));
    console.log('  outputNames:', JSON.stringify(session.outputNames));
    console.log('  outputMetadata:', JSON.stringify(session.outputMetadata));
  }
})();
