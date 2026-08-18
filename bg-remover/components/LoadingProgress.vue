<template>
  <div class="w-full">
    <!-- 模型下载进度 -->
    <div v-if="show" class="bg-white rounded-xl p-4 sm:p-5 card-shadow border border-gray-100">
      <!-- 主状态 -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <!-- 状态图标 -->
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center',
              state === 'loading' ? 'bg-indigo-100' :
              state === 'processing' ? 'bg-amber-100' :
              state === 'done' ? 'bg-emerald-100' :
              state === 'error' ? 'bg-red-100' : 'bg-gray-100'
            ]"
          >
            <!-- 加载中 -->
            <svg v-if="state === 'loading'" class="w-4 h-4 text-indigo-600 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round" />
            </svg>
            <!-- 处理中 -->
            <svg v-else-if="state === 'processing'" class="w-4 h-4 text-amber-600 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 7V4m0 0h3M4 4l4 4" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M20 17v3m0 0h-3m3 0l-4-4" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="12" cy="12" r="7" />
            </svg>
            <!-- 完成 -->
            <svg v-else-if="state === 'done'" class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <!-- 错误 -->
            <svg v-else-if="state === 'error'" class="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <div>
            <p class="text-sm font-medium text-gray-700">{{ title }}</p>
            <p v-if="subText" class="text-xs text-gray-400 mt-0.5">{{ subText }}</p>
          </div>
        </div>

        <!-- 百分比 -->
        <span class="text-sm font-semibold tabular-nums"
          :class="{
            'text-indigo-600': state === 'loading',
            'text-amber-600': state === 'processing',
            'text-emerald-600': state === 'done',
            'text-red-600': state === 'error'
          }"
        >
          <template v-if="state === 'done'">100%</template>
          <template v-else-if="state === 'error'">{{ $t('progress.failed') }}</template>
          <template v-else>{{ percent + '%' }}</template>
        </span>
      </div>

      <!-- 进度条 -->
      <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          :class="[
            'h-full rounded-full',
            state === 'loading' ? 'bg-gradient-to-r from-indigo-500 to-violet-500 progress-striped' :
            state === 'processing' ? 'bg-gradient-to-r from-amber-400 to-orange-500 progress-striped' :
            state === 'done' ? 'bg-emerald-500' :
            state === 'error' ? 'bg-red-400' : 'bg-gray-200'
          ]"
          :style="{ width: clampedPercent + '%', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }"
        />
      </div>

      <!-- 错误信息 -->
      <Transition name="fade">
        <p v-if="errorMsg && state === 'error'" class="mt-2 text-xs text-red-500">
          {{ errorMsg }}
        </p>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  show: boolean
  state: 'idle' | 'loading' | 'processing' | 'done' | 'error'
  percent: number
  title: string
  subText?: string
  errorMsg?: string | null
}>()

const clampedPercent = computed(() => Math.min(Math.max(props.percent, 0), 100))
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
