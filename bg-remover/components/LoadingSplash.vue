<template>
  <Transition name="splash">
    <div
      v-if="visible"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <!-- 小弹窗卡片：居中浮层，半透明遮罩下仍能看到页面背景（参考站式设计，避免全屏假死感） -->
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <!-- 动画图标 -->
        <div class="relative w-16 h-16 mx-auto mb-4">
          <!-- 外圈旋转 -->
          <div class="absolute inset-0 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
          <!-- 内圈旋转（反向） -->
          <div class="absolute inset-2 rounded-full border-4 border-violet-200 border-b-violet-500 animate-spin-reverse" />
          <!-- 中心图标 -->
          <div class="absolute inset-0 flex items-center justify-center">
            <svg class="w-7 h-7 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
        </div>

        <!-- 标题 -->
        <h2 class="text-lg font-bold text-gray-900 mb-1.5">
          {{ $t('splash.title') }}
        </h2>
        <p class="text-sm text-gray-500 mb-1">
          {{ subText }}
        </p>

        <!-- 只需一次下载提示（重点，模型首次下载时明示） -->
        <p class="text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-4">
          {{ $t('splash.downloadOnce', { size: modelSize }) }}
        </p>

        <!-- 进度条 -->
        <div class="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
          <div
            class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 transition-all duration-500 ease-out"
            :style="{ width: displayPercent + '%' }"
          />
        </div>

        <!-- 百分比 + 步骤 -->
        <div class="flex justify-between items-center text-xs mb-4">
          <span class="text-gray-400">{{ stepHint }}</span>
          <span class="text-gray-700 font-semibold tabular-nums">{{ displayPercent }}%</span>
        </div>

        <!-- 信息行：预计时间 / 缓存 / 本地处理 -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-center gap-4 text-[11px] text-gray-400">
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {{ $t('splash.expected', { time: estimatedTime }) }}
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
            {{ $t('splash.cached') }}
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {{ $t('splash.local') }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  percent: number
  stepText?: string
  modelSize?: string
}>()

const { t } = useI18n()

// 显示用的百分比（0-100 之间平滑）
const displayPercent = computed(() => Math.min(Math.max(Math.round(props.percent), 0), 100))

// 子文本
const subText = computed(() => {
  if (props.stepText && props.stepText !== t('bg.ready')) {
    return props.stepText
  }
  if (displayPercent.value < 30) return t('splash.connecting')
  if (displayPercent.value < 70) return t('splash.downloading')
  if (displayPercent.value < 100) return t('splash.loadingEngine')
  return t('splash.ready')
})

// 步骤提示
const stepHint = computed(() => {
  if (displayPercent.value < 100) return t('splash.initializing')
  return t('splash.almostDone')
})

// 预计时间
const estimatedTime = computed(() => {
  const pct = displayPercent.value
  if (pct < 10) return t('splash.est10to30')
  if (pct < 50) return t('splash.downloadingDots')
  if (pct < 90) return t('splash.almostDone')
  return t('splash.seconds')
})
</script>

<style scoped>
.splash-enter-active {
  transition: opacity 0.3s ease-out;
}
.splash-leave-active {
  transition: opacity 0.4s ease-in;
}
.splash-enter-from, .splash-leave-to {
  opacity: 0;
}
.splash-enter-active .bg-white {
  transform: scale(0.92);
  transition: transform 0.3s ease-out;
}
.splash-enter-from .bg-white {
  transform: scale(0.92);
}

@keyframes spin-reverse {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
.animate-spin-reverse {
  animation: spin-reverse 3s linear infinite;
}
</style>
