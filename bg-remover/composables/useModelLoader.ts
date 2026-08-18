/**
 * 模型加载器 - 支持 IndexedDB 缓存和断点续传
 */
import type { ModelConfig } from '~/types'

interface CacheEntry {
  data: ArrayBuffer
  timestamp: number
  url: string
}

export function useModelLoader() {
  const { t } = useI18n()
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)
  const stepText = ref('')

  const DB_NAME = 'BgRemoverCache'
  const DB_VERSION = 1
  const STORE_NAME = 'models'

  // 打开 IndexedDB
  async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // 检查 IndexedDB 缓存
  async function getCached(url: string): Promise<ArrayBuffer | null> {
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(url)
        request.onsuccess = () => {
          const entry: CacheEntry | undefined = request.result
          if (entry && entry.data) {
            resolve(entry.data)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch {
      return null
    }
  }

  // 缓存到 IndexedDB
  async function setCache(url: string, data: ArrayBuffer): Promise<void> {
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const entry: CacheEntry = { url, data, timestamp: Date.now() }
        store.put(entry)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // 静默失败 - 缓存非必需
    }
  }

  // 从 URL 下载模型（支持进度回调 + 空闲超时中止）
  async function downloadModel(
    url: string,
    onProgress: (loaded: number, total: number) => void,
    timeoutMs = 30000
  ): Promise<ArrayBuffer> {
    // 空闲超时：仅当超过 timeoutMs 没有收到任何新数据才中止，
    // 持续有数据流动的连接（慢速网络）不会被误杀
    const controller = new AbortController()
    let lastDataTime = Date.now()
    const timeout = setInterval(() => {
      if (Date.now() - lastDataTime > timeoutMs) controller.abort()
    }, 2000)
    console.log('[模型下载] 开始请求:', url)

    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(t('loader.errDownload', { status: response.status, statusText: response.statusText }))

      const contentLength = response.headers.get('content-length')
      const total = contentLength ? parseInt(contentLength, 10) : 0
      console.log('[模型下载] 连接成功, 文件大小:', total ? `${(total / 1024 / 1024).toFixed(1)}MB` : '未知')
      const reader = response.body!.getReader()
      const chunks: Uint8Array[] = []
      let loaded = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          loaded += value.length
          lastDataTime = Date.now()
          onProgress(loaded, total || loaded)
        }
      }

      // 合并所有 chunks
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
      const result = new Uint8Array(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      console.log('[模型下载] 完成, 共', (totalLength / 1024 / 1024).toFixed(1), 'MB')
      return result.buffer as ArrayBuffer
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error(t('loader.errTimeout', { seconds: timeoutMs / 1000 }))
      }
      console.error('[模型下载] 失败:', e.message)
      throw e
    } finally {
      clearInterval(timeout)
    }
  }

  // 下载单个分片：依次尝试多个候选地址（按分片独立回退，避免整组重下）
  async function downloadShardWithFallback(
    candidateUrls: string[],
    onProgress: (loaded: number) => void
  ): Promise<ArrayBuffer> {
    let lastError: Error | null = null
    for (let i = 0; i < candidateUrls.length; i++) {
      try {
        return await downloadModel(candidateUrls[i], (loaded, total) => onProgress(loaded))
      } catch (e: any) {
        lastError = e
        console.warn(`[模型下载] 分片 ${candidateUrls[i].split('/').pop()} 地址 ${i + 1} 失败，尝试下一个:`, candidateUrls[i + 1])
      }
    }
    throw lastError || new Error(t('loader.errShard'))
  }

  // 下载一组分片并拼接（并行下载，每个分片独立回退，参考 rmbg 库的 loadModel 实现）
  async function downloadShards(
    urlSets: string[][],
    sizeBytes: number,
    onProgress: (loaded: number, total: number) => void
  ): Promise<ArrayBuffer> {
    const shardCount = urlSets[0].length
    const loadedPerShard = new Array(shardCount).fill(0)

    // 每个分片：候选地址列表 = 各 CDN 中该分片对应的 URL
    const results = await Promise.all(
      Array.from({ length: shardCount }, (_, idx) => {
        const candidateUrls = urlSets.map((set) => set[idx])
        return downloadShardWithFallback(candidateUrls, (loaded) => {
          loadedPerShard[idx] = loaded
          const totalLoaded = loadedPerShard.reduce((a, b) => a + b, 0)
          onProgress(Math.min(totalLoaded, sizeBytes), sizeBytes)
        })
      })
    )

    // 拼接所有分片（按顺序）
    const totalLength = results.reduce((acc, buf) => acc + buf.byteLength, 0)
    if (totalLength !== sizeBytes) {
      throw new Error(t('loader.errIncomplete', { expected: sizeBytes, actual: totalLength }))
    }
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const buf of results) {
      result.set(new Uint8Array(buf), offset)
      offset += buf.byteLength
    }
    return result.buffer as ArrayBuffer
  }

  // 尝试多组下载地址（每组 = 一套分片），全部失败才报错
  async function downloadWithFallback(
    urlSets: string[][],
    sizeBytes: number,
    onProgress: (loaded: number, total: number) => void
  ): Promise<ArrayBuffer> {
    let lastError: Error | null = null
    try {
      return await downloadShards(urlSets, sizeBytes, onProgress)
    } catch (e: any) {
      lastError = e
      console.error('[模型下载] 全部候选地址均失败:', e.message)
    }
    throw lastError || new Error(t('loader.errAllFailed'))
  }

  // 加载并缓存模型
  async function loadModel(modelConfig: ModelConfig): Promise<{ url: string; cacheKey: string } | null> {
    isLoading.value = true
    progress.value = 0
    error.value = null
    isLoaded.value = false

    // 每组 = 一个 CDN 基址下的全部分片文件
    // jsDelivr 支持多节点镜像（cdn / fastly / gcore），国内网络下不同节点速度差异大，
    // 全部作为候选组，分片级自动回退到最快的可用节点
    const urlSets: string[][] = [
      modelConfig.modelFiles.map((f) => `${modelConfig.modelBaseUrl}${f}`),
      modelConfig.modelFiles.map((f) => `${modelConfig.fallbackBaseUrl}${f}`),
    ]
    // 若主地址是 cdn.jsdelivr.net，追加其多节点镜像作为额外候选
    if (modelConfig.modelBaseUrl.includes('cdn.jsdelivr.net')) {
      const jsDelivrMirrors = [
        'https://fastly.jsdelivr.net/',
        'https://gcore.jsdelivr.net/',
        'https://testingcf.jsdelivr.net/',
      ]
      const basePath = modelConfig.modelBaseUrl.replace('https://cdn.jsdelivr.net/', '')
      for (const mirror of jsDelivrMirrors) {
        urlSets.push(modelConfig.modelFiles.map((f) => `${mirror}${basePath}${f}`))
      }
    }
    const cacheKey = `${modelConfig.id}-${modelConfig.modelFiles.join('+')}`
    console.log('[模型加载] 模型:', modelConfig.name, '候选分片:', urlSets)

    try {
      // 1. 检查 IndexedDB 缓存（用 cacheKey 作缓存键）
      stepText.value = t('loader.stepChecking')
      const cached = await getCached(cacheKey)
      if (cached) {
        stepText.value = t('loader.stepCached')
        progress.value = 100
        isLoaded.value = true
        isLoading.value = false
        console.log('[模型加载] 缓存命中:', modelConfig.name)
        return { url: URL.createObjectURL(new Blob([cached])), cacheKey }
      }

      // 2. 下载模型（自动回退）
      stepText.value = t('loader.stepDownload', { size: modelConfig.size })
      const buffer = await downloadWithFallback(urlSets, modelConfig.sizeBytes, (loaded, total) => {
        const pct = Math.min(Math.round((loaded / total) * 100), 99)
        progress.value = pct
        const loadedMB = (loaded / (1024 * 1024)).toFixed(1)
        const totalMB = (total / (1024 * 1024)).toFixed(1)
        stepText.value = t('loader.stepDownloading', { loaded: loadedMB, total: totalMB })
      })

      // 3. 缓存到 IndexedDB
      stepText.value = t('loader.stepCache')
      await setCache(cacheKey, buffer)

      progress.value = 100
      stepText.value = t('loader.stepReady')
      isLoaded.value = true
      isLoading.value = false
      console.log('[模型加载] 完成:', modelConfig.name)

      return { url: URL.createObjectURL(new Blob([buffer])), cacheKey }
    } catch (e: any) {
      error.value = e.message || t('loader.errGeneric')
      isLoading.value = false
      console.error('[模型加载] 失败:', e.message)
      return null
    }
  }

  // 清除模型缓存
  async function clearCache(): Promise<void> {
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        store.clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    } catch {
      // ignore
    }
  }

  // 获取缓存大小
  async function getCacheSize(): Promise<number> {
    try {
      const db = await openDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()
        request.onsuccess = () => {
          const entries: CacheEntry[] = request.result
          const total = entries.reduce((acc, e) => acc + e.data.byteLength, 0)
          resolve(total)
        }
        request.onerror = () => reject(request.error)
      })
    } catch {
      return 0
    }
  }

  // 检查指定模型是否已缓存（用于缓存命中时跳过全屏闪屏，展示内联加载状态）
  async function isModelCached(modelConfig: ModelConfig): Promise<boolean> {
    const cacheKey = `${modelConfig.id}-${modelConfig.modelFiles.join('+')}`
    const cached = await getCached(cacheKey)
    return !!cached
  }

  return {
    isLoaded,
    isLoading,
    progress,
    error,
    stepText,
    loadModel,
    isModelCached,
    clearCache,
    getCacheSize
  }
}
