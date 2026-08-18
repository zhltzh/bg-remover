<template>
  <div
    class="relative overflow-hidden rounded-xl bg-gray-100 select-none"
    :class="{ 'comparison-slider': !isMobile }"
    ref="containerRef"
    @mousedown="startDrag"
    @touchstart.prevent="startDrag"
    @mousemove="onDrag"
    @touchmove.prevent="onDrag"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
    @touchend="stopDrag"
  >
    <!-- 原图 -->
    <img
      :src="beforeUrl"
      class="block w-full h-full object-contain"
      :alt="$t('compare.beforeAlt')"
      draggable="false"
    />

    <!-- 结果图（裁切） -->
    <div
      class="absolute inset-0 overflow-hidden"
      :style="{ clipPath: isRtl ? `inset(0 0 0 ${sliderPosition}%)` : `inset(0 ${100 - sliderPosition}% 0 0)` }"
    >
      <img
        :src="afterUrl"
        class="block w-full h-full object-contain"
        :alt="$t('compare.afterAlt')"
        draggable="false"
      />
    </div>

    <!-- 分割线 -->
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
      :style="{ [isRtl ? 'right' : 'left']: `calc(${sliderPosition}% - 1px)` }"
    >
      <!-- 拖拽手柄 -->
      <div
        class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-white"
        :class="{ 'scale-110': isDragging }"
      >
        <svg class="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="9" y1="5" x2="9" y2="19" />
          <line x1="15" y1="5" x2="15" y2="19" />
          <polyline points="5 10 9 6 5 2" />
          <polyline points="19 14 15 18 19 22" />
        </svg>
      </div>
    </div>

    <!-- 标签 -->
    <div class="absolute bottom-3 start-3 px-2.5 py-1 rounded-lg bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
      {{ $t('compare.before') }}
    </div>
    <div
      class="absolute bottom-3 px-2.5 py-1 rounded-lg bg-black/50 text-white text-xs font-medium backdrop-blur-sm transition-all"
      :style="{ [isRtl ? 'right' : 'left']: `calc(${sliderPosition}% - 20px)` }"
      :class="{ 'opacity-0': sliderPosition < 15 }"
    >
      {{ $t('compare.after') }}
    </div>

    <!-- 操作提示 -->
    <div v-if="showHint" class="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs backdrop-blur-sm animate-pulse">
      {{ $t('compare.hint') }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  beforeUrl: string
  afterUrl: string
}>()

const { locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')

const sliderPosition = ref(50)
const isDragging = ref(false)
const showHint = ref(true)
const containerRef = ref<HTMLElement | null>(null)

// 检查是否移动端
const isMobile = ref(false)
onMounted(() => {
  isMobile.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  // 3秒后隐藏提示
  setTimeout(() => { showHint.value = false }, 3000)
})

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true
  showHint.value = false
  updatePosition(e)
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  updatePosition(e)
}

function stopDrag() {
  isDragging.value = false
}

function updatePosition(e: MouseEvent | TouchEvent) {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
  sliderPosition.value = isRtl.value
    ? (1 - x / rect.width) * 100
    : (x / rect.width) * 100
}
</script>
