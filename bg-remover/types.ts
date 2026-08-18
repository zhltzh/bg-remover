// ===== 模型配置 =====
export interface ModelConfig {
  id: string
  name: string
  description: string
  modelBaseUrl: string    // 主下载地址（优先使用）
  fallbackBaseUrl: string // 备选下载地址（主地址失败时回退）
  modelFiles: string[]    // 模型分片文件名（按顺序下载后拼接，需与 sizeBytes 匹配）
  sizeBytes: number       // 模型拼接后的总字节数（用于完整性校验）
  size: string
  resolution: number
  speed: string
  inputName: string
  outputName: string
  mean: [number, number, number]
  std: [number, number, number]
  // 模型支持的最大尺寸
  maxDimension: number
  // 单张图片推理超时（毫秒）：超时后标记失败并跳过，避免卡死批量处理
  timeoutMs: number
  // 预处理方式：true=直接拉伸到模型分辨率（官方 BRIA 方案，实测更准）；false=保持宽高比+白底填充
  // 默认 true（参考站与官方均用直接拉伸）
  stretchInput?: boolean
}

// 注意：模型文件已自托管到 public/models/（构建时由 scripts/download-models.sh 下载）
//   - modelBaseUrl（主）：同源相对路径，浏览器直接从本站获取，无需第三方 CDN
//   - fallbackBaseUrl（备）：unpkg CDN 兜底（自托管文件缺失时仍可用）
// 多分片模型需按顺序下载所有分片后拼接（参考 rmbg 库的 loadModel 实现）
// 归一化统一采用 rmbg 库方案：(v - 128) / 256（原始 0-255 像素）
// 等价于本代码的 (pixel/255 - mean)/std 形式：mean = 128/255 ≈ 0.502, std = 256/255 ≈ 1.004
// （已用 onnxruntime 实测三种模型均需此归一化，ImageNet/0.5 方案会明显降低分割效果）
export const MODELS: Record<string, ModelConfig> = {
  bria: {
    id: 'bria',
    name: 'Pro',
    description: '适用范围广，支持半透明物体，效果最佳',
    modelBaseUrl: '/models/bria/',
    fallbackBaseUrl: 'https://unpkg.com/@rmbg/model-briaai@0.0.1/',
    modelFiles: ['briaai-1.onnx', 'briaai-2.onnx', 'briaai-3.onnx', 'briaai-4.onnx', 'briaai-5.onnx'],
    sizeBytes: 44403226,
    size: '42.3MB',
    resolution: 1024,
    speed: '~4s/张',
    inputName: 'input',
    outputName: 'output',
    mean: [0.502, 0.502, 0.502],
    std: [1.004, 1.004, 1.004],
    maxDimension: 16000,
    timeoutMs: 120000
  },
  u2net: {
    id: 'u2net',
    name: 'Mini',
    description: '轻量快速，适合简单图片',
    modelBaseUrl: '/models/u2netp/',
    fallbackBaseUrl: 'https://unpkg.com/@rmbg/model-u2netp@0.0.1/',
    modelFiles: ['u2netp.onnx'],
    sizeBytes: 4574861,
    size: '4.4MB',
    resolution: 320,
    speed: '~1s/张',
    inputName: 'input.1',
    outputName: '1959', // U2-Net 侧输出（rmbg 库取 outputNames[0]，实测首个输出效果最佳）
    mean: [0.502, 0.502, 0.502],
    std: [1.004, 1.004, 1.004],
    maxDimension: 2048,
    timeoutMs: 60000
  },
  modnet: {
    id: 'modnet',
    name: '肖像',
    description: '适合人像、证件照或主体明显的图片',
    modelBaseUrl: '/models/modnet/',
    fallbackBaseUrl: 'https://unpkg.com/@rmbg/model-modnet@0.0.1/',
    modelFiles: ['modnet-1.onnx', 'modnet-2.onnx', 'modnet-3.onnx'],
    sizeBytes: 25888640,
    size: '24.6MB',
    resolution: 512,
    speed: '~1.5s/张',
    inputName: 'input',
    outputName: 'output',
    mean: [0.502, 0.502, 0.502],
    std: [1.004, 1.004, 1.004],
    maxDimension: 2048,
    timeoutMs: 60000
  }
}

// ===== 处理状态 =====
export type ProcessingStep = 'idle' | 'loading-model' | 'processing' | 'done' | 'error'

export interface ProcessingState {
  step: ProcessingStep
  progress: number  // 0-100
  error: string | null
}

// ===== 图片项 =====
export interface ModelResult {
  resultUrl: string | null
  state: 'pending' | 'processing' | 'done' | 'error'
  progress: number
  // 该模型处理失败的原因（本地化诊断信息）
  errorMsg?: string
}

export interface ImageItem {
  id: string
  file: File
  originalUrl: string
  resultUrl: string | null
  originalData: ImageData | null
  state: 'pending' | 'processing' | 'done' | 'error'
  progress: number
  // 失败原因（本地化的诊断信息），供缩略图错误态内联展示
  errorMsg?: string
  // "运行全部"模式：按模型 id 保存各自结果
  modelResults?: Record<string, ModelResult>
}
