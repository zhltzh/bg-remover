/**
 * 验证 BRIA RMBG-1.4 的预处理方案对比：
 *  - direct-stretch（官方）：直接拉伸到 1024×1024（bilinear）
 *  - aspect-preserve + pad（旧）：保持宽高比 + 白底填充
 * 对比 mask 统计 + min-max 归一化影响
 * 使用 pngjs 解码 + 手写双线性插值（与浏览器 canvas drawImage 行为一致）
 */
const ort = require('onnxruntime-node')
const { PNG } = require('pngjs')
const fs = require('fs')
const path = require('path')

const MODEL = 'C:/Users/黄明珠/AppData/Local/Temp/imagestool/bria-model.onnx'
const TARGET = 1024
const MEAN = [0.502, 0.502, 0.502]
const STD = [1.004, 1.004, 1.004]

/** 双线性插值缩放 rgba 图到 target×target，返回 RGBA 数组 */
function resizeBilinear(src, srcW, srcH, target) {
  const out = new Uint8ClampedArray(target * target * 4)
  const scaleX = srcW / target
  const scaleY = srcH / target
  for (let y = 0; y < target; y++) {
    const srcY = y * scaleY
    const y0 = Math.floor(srcY)
    const fy = srcY - y0
    for (let x = 0; x < target; x++) {
      const srcX = x * scaleX
      const x0 = Math.floor(srcX)
      const fx = srcX - x0
      const o = (y * target + x) * 4
      for (let c = 0; c < 4; c++) {
        const p00 = src[((Math.min(y0, srcH - 1)) * srcW + Math.min(x0, srcW - 1)) * 4 + c]
        const p10 = src[((Math.min(y0, srcH - 1)) * srcW + Math.min(x0 + 1, srcW - 1)) * 4 + c]
        const p01 = src[((Math.min(y0 + 1, srcH - 1)) * srcW + Math.min(x0, srcW - 1)) * 4 + c]
        const p11 = src[((Math.min(y0 + 1, srcH - 1)) * srcW + Math.min(x0 + 1, srcW - 1)) * 4 + c]
        const top = p00 * (1 - fx) + p10 * fx
        const bot = p01 * (1 - fx) + p11 * fx
        out[o + c] = Math.round(top * (1 - fy) + bot * fy)
      }
    }
  }
  return out
}

/** 加载 PNG 并构建预处理张量 */
function loadTensor(imagePath, stretch) {
  const png = PNG.sync.read(fs.readFileSync(imagePath))
  const srcW = png.width, srcH = png.height

  // 白底合成（RGBA 可能有透明，先按白底压平）
  const flat = new Uint8ClampedArray(srcW * srcH * 4)
  for (let i = 0; i < srcW * srcH; i++) {
    const a = png.data[i * 4 + 3] / 255
    flat[i * 4] = Math.round(png.data[i * 4] * a + 255 * (1 - a))
    flat[i * 4 + 1] = Math.round(png.data[i * 4 + 1] * a + 255 * (1 - a))
    flat[i * 4 + 2] = Math.round(png.data[i * 4 + 2] * a + 255 * (1 - a))
    flat[i * 4 + 3] = 255
  }

  let canvas, drawW, drawH
  if (stretch) {
    canvas = resizeBilinear(flat, srcW, srcH, TARGET)
    drawW = drawH = TARGET
  } else {
    const scale = TARGET / Math.max(srcW, srcH)
    const nw = Math.round(srcW * scale)
    const nh = Math.round(srcH * scale)
    // 白底 canvas
    canvas = new Uint8ClampedArray(TARGET * TARGET * 4).fill(255)
    const offsetX = Math.round((TARGET - nw) / 2)
    const offsetY = Math.round((TARGET - nh) / 2)
    const scaled = resizeBilinear(flat, srcW, srcH, nw)
    // 注意：这里简化处理，先缩放到 nw×nh（保持宽高比），再平移到白底中心
    const scaledCanvas = new Uint8ClampedArray(nw * nh * 4)
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const s = (y * nw + x) * 4
        scaledCanvas[s] = scaled[(y * nw + x) * 4]
        scaledCanvas[s + 1] = scaled[(y * nw + x) * 4 + 1]
        scaledCanvas[s + 2] = scaled[(y * nw + x) * 4 + 2]
        scaledCanvas[s + 3] = 255
      }
    }
    // 直接让 resizeBilinear 输出到 nw 然后二次重采样到 TARGET 是错误的；
    // 正确做法：直接把缩放图放入白底 TARGET×TARGET 中。这里用一次 drawImage 语义：
    // 使用临时双线性到 (nw,nh)，然后平移到白底。
    canvas = new Uint8ClampedArray(TARGET * TARGET * 4).fill(255)
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const dIdx = ((y + offsetY) * TARGET + (x + offsetX)) * 4
        const sIdx = (y * nw + x) * 4
        canvas[dIdx] = scaled[sIdx]
        canvas[dIdx + 1] = scaled[sIdx + 1]
        canvas[dIdx + 2] = scaled[sIdx + 2]
        canvas[dIdx + 3] = 255
      }
    }
    drawW = nw; drawH = nh
  }

  const floatData = new Float32Array(TARGET * TARGET * 3)
  for (let y = 0; y < TARGET; y++) {
    for (let x = 0; x < TARGET; x++) {
      const idx = (y * TARGET + x) * 4
      const c = y * TARGET + x
      floatData[0 * TARGET * TARGET + c] = (canvas[idx] / 255 - MEAN[0]) / STD[0]
      floatData[1 * TARGET * TARGET + c] = (canvas[idx + 1] / 255 - MEAN[1]) / STD[1]
      floatData[2 * TARGET * TARGET + c] = (canvas[idx + 2] / 255 - MEAN[2]) / STD[2]
    }
  }
  return new ort.Tensor('float32', floatData, [1, 3, TARGET, TARGET])
}

function maskStats(mask) {
  let min = 1e9, max = -1e9, sum = 0, n = mask.length
  for (let i = 0; i < n; i++) {
    const v = mask[i]
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  const mean = sum / n
  let high = 0, mid = 0
  for (let i = 0; i < n; i++) {
    if (mask[i] > 0.7) high++
    else if (mask[i] > 0.3) mid++
  }
  return { min, max, mean, highPct: (high / n * 100).toFixed(1), midPct: (mid / n * 100).toFixed(1) }
}

async function main() {
  const session = await ort.InferenceSession.create(MODEL)
  for (const img of ['test2.png', 'test3.png']) {
    const imgPath = path.join('C:/Users/黄明珠/AppData/Local/Temp/imagestool/', img)
    console.log(`\n===== ${img} =====`)
    for (const stretch of [true, false]) {
      const tensor = loadTensor(imgPath, stretch)
      const t0 = Date.now()
      const res = await session.run({ input: tensor })
      const ms = Date.now() - t0
      const mask = res.output.data
      const raw = maskStats(mask)

      let mn = 1e9, mx = -1e9
      for (let i = 0; i < mask.length; i++) {
        const v = mask[i]
        if (!Number.isFinite(v)) continue
        if (v < mn) mn = v
        if (v > mx) mx = v
      }
      const range = mx - mn
      const norm = new Float32Array(mask.length)
      if (range > 1e-6) for (let i = 0; i < mask.length; i++) norm[i] = (mask[i] - mn) / range
      const normStats = maskStats(norm)

      console.log(`  [${stretch ? 'DIRECT-STRETCH' : 'ASPECT-PAD'}] ${ms}ms`)
      console.log(`    raw : min=${raw.min.toFixed(3)} max=${raw.max.toFixed(3)} mean=${raw.mean.toFixed(3)} >0.7=${raw.highPct}% >0.3=${raw.midPct}%`)
      console.log(`    norm: min=${normStats.min.toFixed(3)} max=${normStats.max.toFixed(3)} mean=${normStats.mean.toFixed(3)} >0.7=${normStats.highPct}% >0.3=${normStats.midPct}%`)
    }
  }
  await session.release()
}

main().catch(e => { console.error(e); process.exit(1) })
