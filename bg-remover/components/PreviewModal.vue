<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200]" @keydown.esc="close">
      <!-- 遮罩 -->
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        :class="{ 'opacity-100': mounted, 'opacity-0': !mounted }"
        @click="close"
      ></div>

      <!-- 弹层内容：从原图位置放大居中 -->
      <div
        class="absolute flex items-center justify-center p-4 sm:p-8"
        :style="containerStyle"
      >
        <div
          class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out"
          :style="modalStyle"
        >
          <!-- 头部 -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div class="flex items-center gap-2 min-w-0">
              <svg class="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <span class="text-sm font-medium text-gray-700 truncate">{{ $t('tool.previewTitle') }}</span>
            </div>
            <button
              @click="close"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              :title="$t('tool.close')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- "运行全部"：模型切换 -->
          <div v-if="item.modelResults" class="px-4 pt-3 flex gap-1.5 flex-wrap">
            <button
              v-for="(r, mid) in item.modelResults"
              :key="mid"
              @click="previewModelId = mid"
              :disabled="!r.resultUrl"
              class="text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40"
              :class="previewModelId === mid
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'"
            >
              {{ modelName(mid) }}<span v-if="r.state === 'error'">{{ $t('tool.failedSuffix') }}</span>
            </button>
          </div>

          <!-- 对比滑块 -->
          <div class="p-4">
            <ComparisonSlider
              :before-url="item.originalUrl"
              :after-url="previewUrl || ''"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ImageItem } from '~/types'
import { useI18n } from '#imports'

const props = defineProps<{
  item: ImageItem
  anchorRect?: DOMRect | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const mounted = ref(false)
const previewModelId = ref<string | null>(null)

// 弹层尺寸：动画前与缩略图大小相近，动画后为最大宽度
const expanded = ref(false)

// 动画初始状态：从锚点位置（缩略图中心）开始
const startX = ref(0)
const startY = ref(0)
const startW = ref(320)
const startH = ref(200)
const startScale = ref(0.5)

onMounted(() => {
  // 初始化默认模型（第一个有结果的）
  if (props.item.modelResults) {
    previewModelId.value =
      Object.keys(props.item.modelResults).find(mid => props.item.modelResults?.[mid]?.resultUrl) || null
  }

  const rect = props.anchorRect
  if (rect) {
    startX.value = rect.left + rect.width / 2
    startY.value = rect.top + rect.height / 2
    startW.value = rect.width
    startH.value = rect.height
  }
  mounted.value = true
  // 下一帧展开
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { expanded.value = true })
  })

  // ESC 关闭
  window.addEventListener('keydown', onEsc)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEsc)
})

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function close() {
  expanded.value = false
  mounted.value = false
  setTimeout(() => emit('close'), 200)
}

// 预览当前结果 URL（运行全部时跟随所选模型）
const previewUrl = computed(() => {
  if (props.item.modelResults && previewModelId.value) {
    return props.item.modelResults[previewModelId.value]?.resultUrl || null
  }
  return props.item.resultUrl
})

// 容器：定位为占满全屏的 flex 容器，动画通过 scale/opacity 表现
const containerStyle = computed(() => {
  const { innerWidth: vw, innerHeight: vh } = window
  void vw; void vh
  return {}
})

// 弹层样式：动画起点（缩略图位置，小尺寸）+ 终点（居中展开）
const modalStyle = computed(() => {
  const cx = startX.value
  const cy = startY.value
  const transform = expanded.value
    ? 'translate(0, 0) scale(1)'
    : `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) scale(${startScale.value})`
  return {
    transform,
    opacity: expanded.value ? 1 : 0,
  }
})

function modelName(mid: string): string {
  return t(`models.${mid}.name`)
}
</script>
