/**
 * 图片处理工具函数
 */
import type { ImageItem } from '~/types'

export function useImageProcessor() {
  const { t } = useI18n()

  // 生成唯一 ID
  function genId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  // 从 File 创建 ImageItem
  function createImageItem(file: File): ImageItem {
    return {
      id: genId(),
      file,
      originalUrl: URL.createObjectURL(file),
      resultUrl: null,
      originalData: null,
      state: 'pending',
      progress: 0
    }
  }

  // 从粘贴或拖拽创建文件列表
  function filesFromItems(items: DataTransferItem[]): File[] {
    const files: File[] = []
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && isImageFile(file)) {
          files.push(file)
        }
      }
      // 处理文件夹
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry()
        if (entry?.isDirectory) {
          // 文件夹会在拖拽时以独立 items 形式出现，这里不做递归处理
          // 由 drop 事件的 handleDirectory 处理
        }
      }
    }
    return files
  }

  // 检查是否为支持的图片格式
  function isImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml']
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg']
    if (validTypes.includes(file.type)) return true
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    return validExts.includes(ext)
  }

  // 读取文件夹中的文件
  async function readDirectory(entry: FileSystemDirectoryEntry): Promise<File[]> {
    const files: File[] = []
    const reader = entry.createReader()

    const readEntries = async (): Promise<void> => {
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject)
      })
      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve, reject) => {
            (entry as FileSystemFileEntry).file(resolve, reject)
          })
          if (isImageFile(file)) files.push(file)
        } else if (entry.isDirectory) {
          const subFiles = await readDirectory(entry as FileSystemDirectoryEntry)
          files.push(...subFiles)
        }
      }
      // 分批读取（FileSystem API 每次只返回部分结果）
      if (entries.length > 0) await readEntries()
    }

    await readEntries()
    return files
  }

  // 从剪贴板获取图片
  async function getImageFromClipboard(items: DataTransferItem[]): Promise<File | null> {
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) return file
      }
    }
    return null
  }

  // ===== 文件验证（上传区 / 全局粘贴共用） =====
  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB 单张限制
  const MAX_TOTAL_FILES = 200 // 最多 200 张
  const MAX_TOTAL_SIZE = 500 * 1024 * 1024 // 总大小 500MB 限制
  const MAX_FILE_SIZE_WARN = 20 * 1024 * 1024 // 超过 20MB 时弹出警告

  // 校验一组文件，返回合法文件列表 + 错误信息列表
  function validateFiles(files: File[]): { valid: File[]; errors: string[] } {
    const errors: string[] = []
    const valid: File[] = []

    for (const file of files) {
      if (!isImageFile(file)) {
        errors.push(t('upload.errorUnsupported', { name: file.name }))
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(0)
        errors.push(t('upload.errorTooLarge', { name: file.name, size: sizeMB, max: MAX_FILE_SIZE / 1024 / 1024 }))
        continue
      }
      if (file.size > MAX_FILE_SIZE_WARN) {
        errors.push(t('upload.warnLarge', { name: file.name, size: (file.size / 1024 / 1024).toFixed(0) }))
      }
      valid.push(file)
    }

    return { valid, errors }
  }

  // 应用数量/总大小限制（从前往后逐个加入，超限即停）
  function applyLimits(
    files: File[],
    existingCount: number,
    existingSize: number
  ): { allowed: File[]; errors: string[] } {
    const errors: string[] = []
    let list = files.slice()

    const allowed = Math.max(0, MAX_TOTAL_FILES - existingCount)
    if (list.length > allowed) {
      errors.push(t('upload.errorMaxFiles', { max: MAX_TOTAL_FILES }))
      list = list.slice(0, allowed)
    }

    let accSize = existingSize
    const sizeAllowed: File[] = []
    for (const f of list) {
      if (accSize + f.size > MAX_TOTAL_SIZE) break
      accSize += f.size
      sizeAllowed.push(f)
    }
    if (sizeAllowed.length < list.length) {
      errors.push(t('upload.errorMaxSize', { max: MAX_TOTAL_SIZE / 1024 / 1024 }))
    }

    return { allowed: sizeAllowed, errors }
  }

  // 下载处理结果
  function downloadImage(imageData: ImageData, fileName: string): void {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.[^.]+$/, '') + `_${t('download.suffix')}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  // 批量下载（导出为 ZIP 或逐个下载）
  async function downloadAll(results: { imageData: ImageData; fileName: string }[]): Promise<void> {
    for (const result of results) {
      downloadImage(result.imageData, result.fileName)
      // 给浏览器喘息时间
      await new Promise(r => setTimeout(r, 200))
    }
  }

  // 压缩图片（控制在 model 支持的最大尺寸内）
  function ensureMaxDimension(
    imageData: ImageData,
    maxDimension: number
  ): { imageData: ImageData; width: number; height: number } {
    const { width, height } = imageData
    if (width <= maxDimension && height <= maxDimension) {
      return { imageData, width, height }
    }

    const scale = maxDimension / Math.max(width, height)
    const newWidth = Math.round(width * scale)
    const newHeight = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = newWidth
    canvas.height = newHeight
    const ctx = canvas.getContext('2d')!
    // 用 putImageData 无法缩放，需要用 drawImage
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = width
    tempCanvas.height = height
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(imageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight)

    return {
      imageData: ctx.getImageData(0, 0, newWidth, newHeight),
      width: newWidth,
      height: newHeight
    }
  }

  // Canvas 转 File
  function canvasToFile(canvas: HTMLCanvasElement, fileName: string, quality = 0.92): Promise<File> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], fileName.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' }))
        } else {
          reject(new Error(t('bg.canvasBlobFailed')))
        }
      }, 'image/png', quality)
    })
  }

  return {
    genId,
    createImageItem,
    filesFromItems,
    isImageFile,
    readDirectory,
    getImageFromClipboard,
    validateFiles,
    applyLimits,
    downloadImage,
    downloadAll,
    ensureMaxDimension,
    canvasToFile
  }
}
