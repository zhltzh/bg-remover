<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200]" @keydown.esc="close">
      <!-- 遮罩 -->
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        :class="{ 'opacity-100': mounted, 'opacity-0': !mounted }"
        @click="close"
      ></div>

      <!-- 居中弹层 -->
      <div class="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
        <div
          class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out"
          :style="modalStyle"
        >
          <!-- 头部：标题 + 图片切换 + 关闭 -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span class="text-sm font-medium text-gray-700 truncate">{{ $t('edit.title') }}</span>

              <!-- 图片切换（多图时可切，单图禁用） -->
              <div class="flex items-center gap-1 ms-2 shrink-0" :class="{ 'opacity-40 pointer-events-none': items.length <= 1 }">
                <button
                  @click="prevItem"
                  class="w-6 h-6 rounded-md hover:bg-indigo-100 flex items-center justify-center text-indigo-500 transition-colors"
                  :title="$t('edit.prev')"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span class="text-[11px] text-indigo-700 font-medium tabular-nums whitespace-nowrap">{{ currentIndex + 1 }} / {{ items.length }}</span>
                <button
                  @click="nextItem"
                  class="w-6 h-6 rounded-md hover:bg-indigo-100 flex items-center justify-center text-indigo-500 transition-colors"
                  :title="$t('edit.next')"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>
            </div>

            <button
              @click="close"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              :title="$t('edit.close')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- 画布区 -->
          <div class="relative p-4 bg-gray-50 max-h-[75vh] overflow-auto">
            <!-- 工具提示 -->
            <div v-if="hasItem" class="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] pointer-events-none whitespace-nowrap">
              {{ tool === 'eraser' ? $t('edit.tipEraser') : $t('edit.tipRestore') }}
            </div>

            <canvas
              v-if="hasItem"
              ref="canvasRef"
              class="checker-bg mx-auto max-w-full shadow rounded-lg cursor-crosshair touch-none"
              :style="{ maxWidth: '100%', maxHeight: '65vh' }"
              @mousedown="startStroke"
              @mousemove="moveStroke"
              @mouseup="endStroke"
              @mouseleave="endStroke"
              @touchstart="startStroke"
              @touchmove="moveStroke"
              @touchend="endStroke"
              @touchcancel="endStroke"
            ></canvas>
          </div>

          <!-- 底部工具栏 -->
          <div class="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-white flex-wrap">
            <!-- 橡皮擦 / 复原切换 -->
            <div class="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                @click="tool = 'eraser'"
                class="px-2.5 py-1.5 text-[11px] font-medium transition-colors flex items-center gap-1"
                :class="tool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
                  <path d="M22 21H7"/><path d="m5 11 9 9"/>
                </svg>
                {{ $t('edit.eraser') }}
              </button>
              <button
                @click="tool = 'restore'"
                class="px-2.5 py-1.5 text-[11px] font-medium transition-colors flex items-center gap-1"
                :class="tool === 'restore' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                {{ $t('edit.restore') }}
              </button>
            </div>

            <!-- 画笔大小 -->
            <label class="flex items-center gap-1.5 text-[11px] text-gray-500">
              {{ $t('edit.brushSize') }}
              <input
                v-model.number="brushSize"
                type="range"
                min="5"
                max="100"
                step="1"
                class="w-16 accent-indigo-600"
              />
              <span class="text-gray-700 font-medium tabular-nums w-5 text-center">{{ brushSize }}</span>
            </label>

            <div class="flex-1"></div>

            <!-- 撤销 / 重做 -->
            <button
              @click="undo"
              :disabled="undoStack.length === 0"
              class="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :title="$t('edit.undo')"
            >
              ↶ {{ $t('edit.undo') }}
            </button>
            <button
              @click="redo"
              :disabled="redoStack.length === 0"
              class="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              :title="$t('edit.redo')"
            >
              ↷ {{ $t('edit.redo') }}
            </button>

            <!-- 保存（应用修改并关闭浮层） -->
            <button
              @click="save"
              :disabled="saving"
              class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
            >
              {{ saving ? $t('edit.saved') : $t('edit.save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ImageItem } from '~/types'

const props = defineProps<{
  /** 可编辑图片列表（完成态且有结果） */
  items: ImageItem[]
  /** 打开时激活的笔刷工具 */
  initialTool?: 'eraser' | 'restore'
}>()

const selectedId = defineModel<string | null>('selectedId', { default: null })
const brushSize = defineModel<number>('brushSize', { default: 30 })

const emit = defineEmits<{
  save: [resultUrl: string, itemId: string]
  close: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tool = ref<'eraser' | 'restore'>(props.initialTool || 'eraser')
const saving = ref(false)
const mounted = ref(false)
const expanded = ref(false)

// 编辑状态
let ctx: CanvasRenderingContext2D | null = null
let baseImage: HTMLImageElement | null = null
// 编辑前的原始图像数据（复原笔刷恢复用）
let originalImageData: ImageData | null = null
let drawing = false
let lastX = 0
let lastY = 0
// 撤销/重做栈：保存每次 stroke 前的 ImageData 快照
const undoStack: ImageData[] = []
const redoStack: ImageData[] = []
const MAX_STACK = 20

const hasItem = computed(() => props.items.length > 0)
const currentItem = computed<ImageItem | null>(() => {
  if (!hasItem.value) return null
  return props.items.find(i => i.id === selectedId.value) || props.items[0]
})
const currentIndex = computed(() => {
  if (!currentItem.value) return 0
  const idx = props.items.findIndex(i => i.id === currentItem.value!.id)
  return idx === -1 ? 0 : idx
})

// 选中项不在列表中时回退到第一张
watch(() => props.items.map(i => i.id).join(','), () => {
  if (props.items.length > 0 && !props.items.some(i => i.id === selectedId.value)) {
    selectedId.value = props.items[0].id
  }
})

// 首次有可用图片时默认选中第一张
watch(hasItem, (v) => {
  if (v && props.items.length > 0 && !selectedId.value) {
    selectedId.value = props.items[0].id
  }
})

function prevItem() {
  if (!hasItem.value || props.items.length <= 1) return
  selectedId.value = props.items[(currentIndex.value - 1 + props.items.length) % props.items.length].id
}
function nextItem() {
  if (!hasItem.value || props.items.length <= 1) return
  selectedId.value = props.items[(currentIndex.value + 1) % props.items.length].id
}

// 切换目标图片时重新加载画布
watch(() => currentItem.value?.id, async () => {
  if (currentItem.value) await loadCanvas()
}, { immediate: true })

onMounted(() => {
  // 打开动画
  mounted.value = true
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { expanded.value = true })
  })
  window.addEventListener('keydown', onKeyShortcuts)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyShortcuts)
})

function close() {
  expanded.value = false
  mounted.value = false
  setTimeout(() => emit('close'), 200)
}

async function loadCanvas() {
  const item = currentItem.value
  if (!item) return
  const url = item.resultUrl || (item.modelResults && Object.values(item.modelResults).find(r => r.resultUrl)?.resultUrl)
  if (!url) return

  // 重置编辑状态（切换图片后撤销栈清空）
  undoStack.length = 0
  redoStack.length = 0
  tool.value = 'eraser'

  baseImage = new Image()
  baseImage.src = url
  await new Promise<void>((resolve, reject) => {
    baseImage!.onload = () => resolve()
    baseImage!.onerror = () => reject(new Error('image load failed'))
  })

  const canvas = canvasRef.value
  if (!canvas) return
  canvas.width = baseImage.naturalWidth
  canvas.height = baseImage.naturalHeight
  ctx = canvas.getContext('2d')!
  ctx.drawImage(baseImage, 0, 0)
  originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
}

// 撤销/重做快捷键 Ctrl+Z / Ctrl+Y
function onKeyShortcuts(e: KeyboardEvent) {
  if (!hasItem.value) return
  if (!(e.ctrlKey || e.metaKey)) return
  const k = e.key.toLowerCase()
  if (k === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  } else if (k === 'y') {
    e.preventDefault()
    redo()
  }
}

// 计算画布坐标（考虑 CSS 缩放）
function getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

function startStroke(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  if (!ctx || !canvasRef.value) return
  // 推入撤销栈（stroke 前快照）
  pushUndo()
  drawing = true
  const pos = getCanvasPos(e)
  lastX = pos.x
  lastY = pos.y
  paintAt(pos.x, pos.y)
}

function moveStroke(e: MouseEvent | TouchEvent) {
  if (!drawing) return
  e.preventDefault()
  const pos = getCanvasPos(e)
  paintLine(lastX, lastY, pos.x, pos.y)
  lastX = pos.x
  lastY = pos.y
}

function endStroke() {
  drawing = false
}

function paintAt(x: number, y: number) {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const r = brushSize.value / 2

  if (tool.value === 'eraser') {
    // 擦除：alpha 置 0
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  } else {
    // 复原：从原始数据恢复该圆形区域
    const sx = Math.max(0, Math.floor(x - r))
    const sy = Math.max(0, Math.floor(y - r))
    const sw = Math.min(canvas.width - sx, Math.ceil(r * 2))
    const sh = Math.min(canvas.height - sy, Math.ceil(r * 2))
    if (sw <= 0 || sh <= 0 || !originalImageData) return
    const region = ctx.getImageData(sx, sy, sw, sh)
    const orig = originalImageData
    // 圆形蒙版：只恢复圆内像素
    const cx = r
    const cy = r
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const dx = px - cx
        const dy = py - cy
        if (dx * dx + dy * dy <= r * r) {
          const srcIdx = ((sy + py) * canvas.width + (sx + px)) * 4
          const dstIdx = (py * sw + px) * 4
          region.data[dstIdx] = orig.data[srcIdx]
          region.data[dstIdx + 1] = orig.data[srcIdx + 1]
          region.data[dstIdx + 2] = orig.data[srcIdx + 2]
          region.data[dstIdx + 3] = orig.data[srcIdx + 3]
        }
      }
    }
    ctx.putImageData(region, sx, sy)
  }
}

function paintLine(x0: number, y0: number, x1: number, y1: number) {
  const dist = Math.hypot(x1 - x0, y1 - y0)
  const steps = Math.max(1, Math.ceil(dist / (brushSize.value / 4)))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    paintAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)
  }
}

function pushUndo() {
  if (!ctx || !canvasRef.value) return
  const snapshot = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  undoStack.push(snapshot)
  if (undoStack.length > MAX_STACK) undoStack.shift()
  redoStack.length = 0
}

function undo() {
  if (undoStack.length === 0 || !ctx || !canvasRef.value) return
  const snapshot = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  redoStack.push(snapshot)
  const prev = undoStack.pop()!
  ctx.putImageData(prev, 0, 0)
}

function redo() {
  if (redoStack.length === 0 || !ctx || !canvasRef.value) return
  const snapshot = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height)
  undoStack.push(snapshot)
  const next = redoStack.pop()!
  ctx.putImageData(next, 0, 0)
}

async function save() {
  if (!canvasRef.value || saving.value || !currentItem.value) return
  saving.value = true
  try {
    const canvas = canvasRef.value
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) {
      const url = URL.createObjectURL(blob)
      emit('save', url, currentItem.value.id)
      // 应用修改并关闭浮层
      close()
    } else {
      saving.value = false
    }
  } catch {
    saving.value = false
  }
}

// 弹层样式：淡入 + 轻微放大
const modalStyle = computed(() => ({
  transform: expanded.value ? 'scale(1)' : 'scale(0.95)',
  opacity: expanded.value ? 1 : 0,
}))
</script>

<style scoped>
.checker-bg {
  background-image:
    conic-gradient(#e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb 100%);
  background-size: 16px 16px;
}
</style>
