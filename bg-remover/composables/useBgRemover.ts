/**
 * AI 背景去除核心引擎
 * 使用 ONNX Runtime Web 在浏览器本地运行抠图模型
 */
import type { ModelConfig, ImageItem } from '~/types'
// 仅类型导入（编译期擦除，不触发运行时加载 onnxruntime-web）
import type { InferenceSession as OrtInferenceSession, Tensor as OrtTensor } from 'onnxruntime-web'

// onnxruntime-web 采用动态导入：避免 2.5MB WASM 在首页加载时被急切加载，
// 仅在用户首次开始抠图时才加载运行时（LCP 优化）
type OrtModule = typeof import('onnxruntime-web')
let ort: OrtModule | null = null

// ===== 友好的错误消息映射 =====
function friendlyErrorMessage(error: Error, context: string, t: (key: string, params?: Record<string, unknown>) => string): string {
  const msg = error.message || String(error)

  // 网络错误
  if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('网络错误')) {
    return t('bg.net')
  }

  // WebGPU 错误
  if (msg.includes('WebGPU') || msg.includes('webgpu') || msg.includes('WGPU')) {
    return t('bg.webgpu')
  }

  // WebGPU 不支持 MaxPool 的 ceil_mode（已知限制：onnxruntime-web 后端限制）
  if (msg.includes('maxpool') || msg.includes('MaxPool') || (msg.includes('ceil') && msg.includes('pool'))) {
    return t('bg.maxpool')
  }

  // 处理超时
  if (msg.includes('__TIMEOUT__')) {
    return t('bg.timeout', { seconds: 120 })
  }

  // 内存不足
  if (msg.includes('memory') || msg.includes('Memory') || msg.includes('out of memory') || msg.includes('OOM')) {
    return t('bg.memory')
  }

  // WASM 错误
  if (msg.includes('WASM') || msg.includes('wasm') || msg.includes('WebAssembly')) {
    return t('bg.wasm')
  }

  // ONNX Runtime 错误
  if (msg.includes('InferenceSession') || msg.includes('session')) {
    return t('bg.onnx')
  }

  // 图片解码错误
  if (msg.includes('Image') || msg.includes('image') || msg.includes('decode') || msg.includes('canvas')) {
    return t('bg.decode')
  }

  return context ? `${context}: ${msg}` : msg
}

// ===== WebGPU MaxPool ceil 限制检测（onnxruntime-web WebGPU 后端已知限制） =====
function isMaxPoolError(error: Error): boolean {
  const msg = error.message || ''
  return msg.includes('maxpool') || msg.includes('MaxPool') ||
    (msg.includes('ceil') && msg.includes('pool'))
}

// ===== Promise 超时包装：超时后 reject('__TIMEOUT__') =====
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('__TIMEOUT__')), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

// ===== mask 输出质量自检 =====
// 背景：WebGPU EP 默认 fp16 精度，对 fp32/fp16 混合权重的 BiRefNet 类模型（BRIA RMBG-1.4）
// 在部分 GPU/驱动上可能产生数值异常（全 0、全 1、NaN、低对比度），导致"完全不能抠像"。
// 检测到退化输出时，调用方应降级为 WASM（fp32）重建会话重试。
function isMaskDegenerate(data: Float32Array | number[]): boolean {
  if (!data || data.length === 0) return true
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let nonFinite = 0
  const n = data.length
  for (let i = 0; i < n; i++) {
    const v = data[i]
    if (!Number.isFinite(v)) { nonFinite++; continue }
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  // NaN/Infinity 过多 → 异常
  if (nonFinite > n * 0.001) return true
  // 全 0 或全 1（无区分度）→ 异常
  if (max - min < 0.02) return true
  // 对比度过低（几乎全透明或全不透明，平均 mask 值贴边）→ 异常
  const mean = sum / Math.max(n - nonFinite, 1)
  if (mean < 0.005 || mean > 0.995) return true
  // 主体占比过小（<1%）→ 异常（正常主体至少占几个百分点）
  if (max < 0.1) return true
  return false
}

export function useBgRemover() {
  const { t } = useI18n()
  const { loadModel, isLoaded, isLoading, progress: modelProgress, error: modelError, stepText } = useModelLoader()

  const config = useRuntimeConfig()

  const isProcessing = ref(false)
  const processProgress = ref(0)
  const processError = ref<string | null>(null)
  const resultImages = ref<ImageItem[]>([])

  // WebGPU 不支持 MaxPool ceil 时已降级到 WASM（供调用方显示内联提示）
  const wasmFallbackActive = ref(false)

  let session: OrtInferenceSession | null = null
  const loadedModelId = ref<string | null>(null)
  let sessionUrl: string | null = null
  // 保存最近加载的模型二进制，供 MaxPool 降级时重建 WASM 会话（无需重新下载）
  let currentModelBlob: ArrayBuffer | null = null

  // 初始化 ONNX Runtime（延迟加载，仅在用户开始处理时执行）
  async function initRuntime(): Promise<OrtModule> {
    if (ort) return ort
    try {
      // 动态加载 onnxruntime-web（首页不加载，点击开始抠图后才下载 WASM）
      const mod = await import('onnxruntime-web')
      // 配置 WASM 路径 - 首选本地，回退 CDN
      mod.env.wasm.wasmPaths = config.public.wasmBaseUrl
      ort = mod
      return mod
    } catch (e: any) {
      throw new Error(`${t('bg.initFailed', { msg: e.message })}`)
    }
  }

  // 加载模型并创建推理会话
  async function initModel(modelConfig: ModelConfig): Promise<boolean> {
    const runtime = await initRuntime()

    // 已加载相同模型，直接复用（避免切换模型后仍用旧模型处理）
    if (session && loadedModelId.value === modelConfig.id) {
      return true
    }

    // 释放旧会话（切换模型时）
    if (session) {
      try { session.release() } catch { /* ignore */ }
      session = null
      if (sessionUrl) {
        URL.revokeObjectURL(sessionUrl)
        sessionUrl = null
      }
    }

    const result = await loadModel(modelConfig)
    if (!result || !result.url) {
      processError.value = modelError.value
        ? friendlyErrorMessage(new Error(modelError.value), t('bg.modelLoadFailed'), t)
        : t('bg.modelLoadFailedRefresh')
      return false
    }

    try {
      // 创建推理会话
      stepText.value = t('bg.loadingEngine')
      const response = await fetch(result.url)
      if (!response.ok) {
        throw new Error(t('bg.httpFailed', { status: response.status }))
      }
      const modelBlob = await response.arrayBuffer()
      currentModelBlob = modelBlob

      session = await runtime.InferenceSession.create(modelBlob, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'all',
        intraOpNumThreads: 4,
      })
      loadedModelId.value = modelConfig.id
      sessionUrl = result.url
      wasmFallbackActive.value = false

      stepText.value = t('bg.ready')
      return true
    } catch (e: any) {
      processError.value = friendlyErrorMessage(e, t('bg.modelLoadFailed'), t)
      return false
    }
  }

  // MaxPool 降级：用内存中的模型二进制重建仅 WASM 的会话（解决 WebGPU 后端不支持 ceil_mode 的问题）
  async function rebuildSessionWasmOnly(modelConfig: ModelConfig): Promise<boolean> {
    try {
      if (!currentModelBlob) return false
      // 释放旧会话（WebGPU 优先）
      if (session) {
        try { session.release() } catch { /* ignore */ }
        session = null
        if (sessionUrl) {
          URL.revokeObjectURL(sessionUrl)
          sessionUrl = null
        }
      }
      const runtime = await initRuntime()
      session = await runtime.InferenceSession.create(currentModelBlob, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
        intraOpNumThreads: 4,
      })
      loadedModelId.value = modelConfig.id
      wasmFallbackActive.value = true
      return true
    } catch (e) {
      console.error('[MaxPool 降级] 重建 WASM 会话失败:', e)
      return false
    }
  }

  // 超时后重建会话（清理可能仍挂起的 WebGPU run），保持原后端配置
  async function recreateSession(modelConfig: ModelConfig): Promise<boolean> {
    try {
      if (!currentModelBlob) return false
      if (session) {
        try { session.release() } catch { /* ignore */ }
        session = null
      }
      const runtime = await initRuntime()
      session = await runtime.InferenceSession.create(currentModelBlob, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'all',
        intraOpNumThreads: 4,
      })
      loadedModelId.value = modelConfig.id
      return true
    } catch (e) {
      console.error('[超时恢复] 重建会话失败:', e)
      return false
    }
  }

  // 推理 + 超时保护 + WebGPU MaxPool 自动降级重试
  async function runInferenceWithFallback(
    feeds: Record<string, OrtTensor>,
    modelConfig: ModelConfig
  ): Promise<Record<string, OrtTensor>> {
    if (!session) throw new Error(t('bg.modelNotLoaded'))

    // 第一轮：直接推理（WebGPU 优先），带超时保护
    try {
      return await withTimeout(session.run(feeds), modelConfig.timeoutMs)
    } catch (e: any) {
      const isTimeout = e?.message === '__TIMEOUT__'
      const isMaxPool = isMaxPoolError(e)

      // 超时：单张超时按失败处理（重建会话避免后续卡死），由调用方决定跳过
      if (isTimeout) {
        console.warn(`[推理] 单张超时（>${modelConfig.timeoutMs}ms），重建会话继续后续图片`)
        await recreateSession(modelConfig)
        throw new Error('__TIMEOUT__')
      }

      // MaxPool ceil_mode 限制：WebGPU 后端不支持，重建 WASM 会话后重试 1 次
      if (isMaxPool) {
        console.warn('[推理] 检测到 WebGPU MaxPool ceil 限制，降级为 WASM 会话重试')
        const rebuilt = await rebuildSessionWasmOnly(modelConfig)
        if (rebuilt && session) {
          return await session.run(feeds)
        }
      }
      throw e
    }
  }

  // 预处理图片：缩放到模型输入尺寸 + 归一化
  // stretchInput=true：直接拉伸到 targetSize×targetSize（官方 BRIA preprocess 方案）
  //   官方 preprocess_image: F.interpolate(直接拉伸, bilinear) → ÷255 → normalize(mean=[0.5,0.5,0.5], std=[1,1,1])
  //   实测：aspect-preserve+pad 对非正方形图有明显偏差（白边影响分割），直接拉伸更贴合模型训练分布
  // stretchInput=false：保持宽高比缩放 + 白底居中填充（旧方案，作为兜底）
  function preprocess(
    imageData: ImageData,
    targetSize: number,
    mean: [number, number, number],
    std: [number, number, number],
    stretchInput = true
  ): { tensor: OrtTensor; originalWidth: number; originalHeight: number } {
    const { width, height } = imageData

    // 创建 Canvas 进行缩放
    const canvas = document.createElement('canvas')
    canvas.width = targetSize
    canvas.height = targetSize
    const ctx = canvas.getContext('2d')!

    // 使用离屏 Canvas 做高质量缩放
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)

    if (stretchInput) {
      // 直接拉伸（官方方案）：整图填满 targetSize×targetSize
      // drawImage 默认使用双线性插值缩放，与官方 F.interpolate(bilinear) 行为一致
      ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize)
    } else {
      // 旧方案：保持宽高比 + 白底居中填充
      const scale = targetSize / Math.max(width, height)
      const newWidth = Math.round(width * scale)
      const newHeight = Math.round(height * scale)
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, targetSize, targetSize)
      const offsetX = Math.round((targetSize - newWidth) / 2)
      const offsetY = Math.round((targetSize - newHeight) / 2)
      ctx.drawImage(tempCanvas, offsetX, offsetY, newWidth, newHeight)
    }

    // 获取像素数据
    const pixels = ctx.getImageData(0, 0, targetSize, targetSize).data

    // 转换为 CHW 格式并归一化
    const numChannels = 3
    const floatData = new Float32Array(targetSize * targetSize * numChannels)

    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const pixelIdx = (y * targetSize + x) * 4
        const chwIdx = y * targetSize + x
        // CHW: 先存所有通道的同一行
        floatData[0 * targetSize * targetSize + chwIdx] = (pixels[pixelIdx] / 255 - mean[0]) / std[0]
        floatData[1 * targetSize * targetSize + chwIdx] = (pixels[pixelIdx + 1] / 255 - mean[1]) / std[1]
        floatData[2 * targetSize * targetSize + chwIdx] = (pixels[pixelIdx + 2] / 255 - mean[2]) / std[2]
      }
    }

    const tensor = new ort!.Tensor('float32', floatData, [1, numChannels, targetSize, targetSize])
    return { tensor, originalWidth: width, originalHeight: height }
  }

  // 处理单张图片
  async function processImage(
    imageItem: ImageItem,
    modelConfig: ModelConfig,
    onProgress?: (progress: number) => void,
    onError?: (message: string) => void
  ): Promise<ImageData | null> {
    if (!session) {
      processError.value = t('bg.modelNotLoaded')
      onError?.(t('bg.modelNotLoaded'))
      return null
    }

    try {
      isProcessing.value = true
      processError.value = null
      onProgress?.(10)

      // 加载图片到 Canvas（应用 EXIF 方向：手机拍摄的 JPEG 常带旋转信息，
      // 用 createImageBitmap 的 from-image 自动应用，避免结果方向错误）
      let source: ImageBitmap | HTMLImageElement
      try {
        source = await createImageBitmap(imageItem.file, { imageOrientation: 'from-image' })
      } catch {
        // 回退：不支持 createImageBitmap 的浏览器用 Image 解码
        const img = new Image()
        img.src = imageItem.originalUrl
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })
        source = img
      }

      // 降采样：限制处理尺寸，避免超大图导致内存爆炸（8000×8000 ≈ 256MB）
      // 处理上限 2048px，对大多数用途（电商、头像、证件照）足够
      const MAX_PROCESS_DIM = 2048
      const scale = Math.min(1, MAX_PROCESS_DIM / Math.max(source.width, source.height))
      const workWidth = Math.round(source.width * scale)
      const workHeight = Math.round(source.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = workWidth
      canvas.height = workHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(source, 0, 0, workWidth, workHeight)
      const imageData = ctx.getImageData(0, 0, workWidth, workHeight)

      // 释放 ImageBitmap 内存（HTMLImageElement 无需手动释放）
      if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
        source.close()
      }

      onProgress?.(30)

      // 预处理
      const { tensor, originalWidth, originalHeight } = preprocess(
        imageData,
        modelConfig.resolution,
        modelConfig.mean,
        modelConfig.std,
        modelConfig.stretchInput !== false
      )

      onProgress?.(50)

      // 推理
      // 优先使用配置的输入/输出名，若会话中不存在则回退到会话提供的第一个名称
      const inputName = session.inputNames.includes(modelConfig.inputName)
        ? modelConfig.inputName
        : session.inputNames[0]
      const outputName = session.outputNames.includes(modelConfig.outputName)
        ? modelConfig.outputName
        : session.outputNames[0]

      const feeds: Record<string, OrtTensor> = {}
      feeds[inputName] = tensor

      // 推理阶段无原生进度事件，百分比自然停在"预处理完成"(50%)，
      // 完成后由 onProgress 跳转到 90→100（真实进度，不伪造递增）
      onProgress?.(50)

      // 超时保护 + MaxPool 自动降级（WebGPU 后端不支持 ceil_mode 时重建 WASM 会话重试）
      const results = await runInferenceWithFallback(feeds, modelConfig)
      let maskOutput = results[outputName]

      // mask 质量自检：WebGPU fp16 精度问题可能导致输出退化（全 0/全 1/NaN/低对比度）
      // 检测到异常时降级为 WASM（fp32）重建会话重试一次
      const maskData0 = maskOutput.data as Float32Array
      if (!wasmFallbackActive.value && isMaskDegenerate(maskData0)) {
        console.warn('[推理] 检测到 mask 输出退化（可能是 WebGPU fp16 精度问题），降级 WASM 重试')
        const rebuilt = await rebuildSessionWasmOnly(modelConfig)
        if (rebuilt && session) {
          try {
            const retryResults = await session.run(feeds)
            maskOutput = retryResults[outputName]
          } catch (e: any) {
            console.warn('[推理] WASM 重试失败:', e?.message)
          }
        }
      }

      onProgress?.(90)

      // 后处理：合成 alpha 通道
      const maskData = maskOutput.data as Float32Array
      const maskSize = modelConfig.resolution

      // min-max 归一化（官方 BRIA postprocess_image 方案）：
      //   result = (result - min) / (max - min)，将 sigmoid 输出映射到 [0,1] 全动态范围
      //   官方在 resize 回原尺寸后执行；我们提前到模型分辨率下执行，效果一致且更省算力
      //   避免全常数 mask（max==min）时除零
      let maskMin = Infinity
      let maskMax = -Infinity
      for (let i = 0; i < maskData.length; i++) {
        const v = maskData[i]
        if (!Number.isFinite(v)) continue
        if (v < maskMin) maskMin = v
        if (v > maskMax) maskMax = v
      }
      const maskRange = maskMax - maskMin
      const normMask = new Float32Array(maskData.length)
      if (maskRange > 1e-6) {
        for (let i = 0; i < maskData.length; i++) {
          const v = maskData[i]
          normMask[i] = Number.isFinite(v) ? (v - maskMin) / maskRange : 0
        }
      } else {
        // 全常数：按值是否偏大给全 0 或全 1（避免纯噪声输出）
        normMask.fill(maskMax > 0.5 ? 1 : 0)
      }

      // 从 mask 提取 alpha 并缩放到原图尺寸
      // 先构建 mask 在模型分辨率下的表示
      const maskCanvas2 = document.createElement('canvas')
      maskCanvas2.width = maskSize
      maskCanvas2.height = maskSize
      const maskCtx2 = maskCanvas2.getContext('2d')!
      const maskImgData = maskCtx2.createImageData(maskSize, maskSize)
      for (let i = 0; i < maskSize * maskSize; i++) {
        const alpha = Math.round(Math.min(Math.max(normMask[i] * 255, 0), 255))
        maskImgData.data[i * 4] = 255
        maskImgData.data[i * 4 + 1] = 255
        maskImgData.data[i * 4 + 2] = 255
        maskImgData.data[i * 4 + 3] = alpha
      }
      maskCtx2.putImageData(maskImgData, 0, 0)

      // 将 mask 缩放到原图尺寸
      const alphaCanvas = document.createElement('canvas')
      alphaCanvas.width = originalWidth
      alphaCanvas.height = originalHeight
      const alphaCtx = alphaCanvas.getContext('2d')!
      alphaCtx.drawImage(maskCanvas2, 0, 0, originalWidth, originalHeight)

      // 获取 alpha 通道数据
      const alphaData = alphaCtx.getImageData(0, 0, originalWidth, originalHeight)

      // 合成最终结果：原图 RGB + mask Alpha，并做边缘优化
      // 1) 羽化：对 alpha 做 3×3 box blur，柔化硬边锯齿
      // 2) 去白边/光晕：半透明边缘像素做 unmultiply（去背景色残留）
      const resultImageData = ctx.createImageData(originalWidth, originalHeight)
      const src = imageData.data
      const dst = resultImageData.data
      const alpha = alphaData.data
      const W = originalWidth
      const H = originalHeight

      // 原始 alpha 归一化到 0-1
      const rawAlpha = new Float32Array(W * H)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          rawAlpha[y * W + x] = alpha[(y * W + x) * 4 + 3] / 255
        }
      }

      // 3×3 box blur（仅当模型分辨率远小于原图时 mask 已有插值平滑，此处再柔化一级）
      const smoothAlpha = new Float32Array(W * H)
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          let sum = 0
          let count = 0
          for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy
            if (ny < 0 || ny >= H) continue
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx
              if (nx < 0 || nx >= W) continue
              sum += rawAlpha[ny * W + nx]
              count++
            }
          }
          smoothAlpha[y * W + x] = sum / count
        }
      }

      for (let i = 0; i < W * H; i++) {
        const a = smoothAlpha[i]
        // 完全透明：直接置 0（rgb 无意义）
        if (a <= 0.001) {
          dst[i * 4] = 0
          dst[i * 4 + 1] = 0
          dst[i * 4 + 2] = 0
          dst[i * 4 + 3] = 0
          continue
        }
        let r = src[i * 4]
        let g = src[i * 4 + 1]
        let b = src[i * 4 + 2]

        // 半透明边缘：unmultiply 去除背景色残留（白边/光晕）
        // 假设背景为白色（模型预测的透明区域原图多为浅色背景）
        if (a < 0.99) {
          const invA = 1 - a
          r = (r - invA * 255) / a
          g = (g - invA * 255) / a
          b = (b - invA * 255) / a
          r = Math.min(Math.max(r, 0), 255)
          g = Math.min(Math.max(g, 0), 255)
          b = Math.min(Math.max(b, 0), 255)
        }

        dst[i * 4] = r
        dst[i * 4 + 1] = g
        dst[i * 4 + 2] = b
        dst[i * 4 + 3] = Math.round(a * 255)
      }

      onProgress?.(100)
      return resultImageData
    } catch (e: any) {
      // 区分是否是因为模型未加载还是处理异常
      if (!session) {
        const msg = t('bg.modelNotLoadedFull')
        processError.value = msg
        onError?.(msg)
      } else {
        // 单张图片失败：通过 onError 回调传给调用方（供缩略图错误态内联展示），
        // 不设置全局 processError（避免批量处理中单张失败干扰整体进度显示）
        let msg: string
        if (e?.message === '__TIMEOUT__') {
          msg = t('bg.timeout', { seconds: Math.round(modelConfig.timeoutMs / 1000) })
        } else {
          msg = friendlyErrorMessage(e, t('bg.imgProcessFailed'), t)
        }
        onError?.(msg)
      }
      return null
    } finally {
      isProcessing.value = false
    }
  }

  // 获取当前模型信息
  function getSessionInfo(): string {
    return session ? t('bg.sessionInfoLoaded') : t('bg.sessionInfoNotLoaded')
  }

  // 释放资源
  function dispose(): void {
    try { session?.release() } catch { /* ignore */ }
    session = null
    if (sessionUrl) {
      URL.revokeObjectURL(sessionUrl)
      sessionUrl = null
    }
    loadedModelId.value = null
    isLoaded.value = false
  }

  return {
    // 状态
    isLoaded,
    isLoading,
    modelProgress,
    modelError,
    stepText,
    isProcessing,
    processProgress,
    processError,
    resultImages,
    loadedModelId,
    // WebGPU 不支持 MaxPool 时已降级为 WASM（供调用方显示内联提示）
    wasmFallbackActive,

    // 方法
    initModel,
    processImage,
    getSessionInfo,
    dispose,
  }
}
