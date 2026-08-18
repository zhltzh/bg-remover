<template>
  <div class="relative group">
    <div class="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 card-shadow-hover transition-shadow">
      <!-- 缩略图：完成态显示抠图结果（透明背景配棋盘格），否则显示原图 -->
      <!-- 单张模式：图片高度限高（~52vh），保证下载按钮整卡可见；多张保持 aspect-square 网格 -->
      <div
        class="relative"
        :class="[props.single ? 'h-[52vh]' : 'aspect-square', { 'checker-bg': showResult }]"
      >
        <img
          :src="showResult ? resultSrc : item.originalUrl"
          class="w-full h-full object-cover"
          :alt="item.file.name"
          loading="lazy"
        />

        <!-- 完成态角标 -->
        <div
          v-if="item.state === 'done'"
          class="absolute top-2 start-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-semibold backdrop-blur-sm"
        >
          {{ $t('preview.done') }}
        </div>

        <!-- 处理状态覆盖 -->
        <div
          v-if="item.state === 'processing'"
          class="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm"
        >
          <div class="text-center">
            <svg class="w-8 h-8 mx-auto text-white animate-spin mb-2" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round" stroke-opacity="0.3"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round" stroke-dashoffset="20"/>
            </svg>
            <span class="text-white text-xs font-medium">{{ $t('preview.processing') }}</span>
          </div>
        </div>

        <div
          v-else-if="item.state === 'error'"
          class="absolute inset-0 bg-red-50/90 flex items-center justify-center"
        >
          <div class="text-center px-3">
            <svg class="w-6 h-6 mx-auto text-red-400 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span class="text-red-500 text-xs">{{ $t('preview.failed') }}</span>
            <p v-if="item.errorMsg" class="text-red-400 text-[10px] mt-1 line-clamp-2 leading-snug">{{ item.errorMsg }}</p>
            <div class="flex items-center justify-center gap-2 mt-2">
              <button
                @click.stop="$emit('retry', item.id)"
                class="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-700 transition-colors"
              >
                {{ $t('preview.retry') }}
              </button>
              <button
                @click.stop="$emit('remove', item.id)"
                class="px-2.5 py-1 rounded-md bg-white border border-red-200 text-red-500 text-[11px] font-medium hover:bg-red-50 transition-colors"
              >
                {{ $t('preview.removeTitle') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="p-2.5">
        <p class="text-xs text-gray-600 truncate" :title="item.file.name">
          {{ item.file.name }}
        </p>

        <!-- "运行全部"：各模型结果缩略 -->
        <div v-if="item.modelResults" class="mt-2 grid grid-cols-3 gap-1.5">
          <div
            v-for="(r, mid) in item.modelResults"
            :key="mid"
            class="relative rounded-lg overflow-hidden border border-gray-100 aspect-square bg-gray-50"
            :class="{ 'opacity-50': r.state === 'error' }"
          >
            <img
              v-if="r.resultUrl"
              :src="r.resultUrl"
              class="w-full h-full object-cover"
              :alt="$t('preview.resultAlt', { name: item.file.name, mid: midLabel(mid) })"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-[9px] text-gray-300">
              {{ r.state === 'error' ? $t('preview.failShort') : '…' }}
            </div>
            <span class="absolute bottom-0 start-0 end-0 bg-black/50 text-white text-[8px] text-center py-0.5">
              {{ midLabel(mid) }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between mt-1">
          <span class="text-[11px] text-gray-400">
            {{ (item.file.size / 1024).toFixed(0) }}KB
          </span>
          <!-- 状态指示 -->
          <span
            v-if="item.state === 'done'"
            class="text-[11px] text-emerald-600 font-medium"
          >
            {{ $t('preview.done') }}
          </span>
          <span
            v-else-if="item.state === 'pending'"
            class="text-[11px] text-gray-400"
          >
            {{ $t('preview.pending') }}
          </span>
          <span
            v-else-if="item.state === 'error'"
            class="text-[11px] text-red-500 font-medium"
          >
            {{ $t('preview.failShort') }}
          </span>
        </div>

        <!-- 完成态：常驻醒目的「立即下载」按钮 -->
        <button
          v-if="item.state === 'done' && (item.resultUrl || item.modelResults)"
          @click="$emit('download', item)"
          class="mt-2 w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold shadow-sm hover:from-indigo-700 hover:to-violet-700 hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ $t('preview.downloadNow') }}
        </button>
      </div>

      <!-- hover 操作按钮：预览大图 + 编辑（点击在原图位置弹出对比） -->
      <div
        v-if="item.state === 'done' && (item.resultUrl || item.modelResults)"
        class="absolute top-2 end-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          @click="$emit('edit', item)"
          class="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors"
          :title="$t('edit.title')"
        >
          <svg class="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button
          @click="emitPreview"
          class="w-8 h-8 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center hover:bg-white transition-colors"
          :title="$t('preview.previewTitle')"
        >
          <svg class="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      <!-- 删除按钮 -->
      <button
        @click="$emit('remove', item.id)"
        class="absolute top-2 start-2 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
        :title="$t('preview.removeTitle')"
      >
        <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImageItem } from '~/types'

const props = defineProps<{
  item: ImageItem
  /** 单张模式：限制大图高度，确保整卡（含下载按钮）无需内部滚动即可完整可见 */
  single?: boolean
}>()

const emit = defineEmits<{
  download: [item: ImageItem]
  preview: [item: ImageItem, rect: DOMRect]
  remove: [id: string]
  retry: [id: string]
  edit: [item: ImageItem]
}>()

const { t } = useI18n()

// 完成态主图是否显示抠图结果（运行全部时显示第一个有结果的模型图）
const showResult = computed(() =>
  props.item.state === 'done' && (!!props.item.resultUrl || hasAnyModelResult)
)

const hasAnyModelResult = computed(() =>
  !!props.item.modelResults && Object.values(props.item.modelResults).some(r => r.resultUrl)
)

const resultSrc = computed(() => {
  if (props.item.resultUrl) return props.item.resultUrl
  if (props.item.modelResults) {
    const firstDone = Object.values(props.item.modelResults).find(r => r.resultUrl)
    return firstDone?.resultUrl || props.item.originalUrl
  }
  return props.item.originalUrl
})

// 预览：把当前缩略图在视口内的位置传给父组件（用于在原图位置弹出）
function emitPreview() {
  const el = (getCurrentInstance()?.proxy?.$el as HTMLElement | null)
  const card = el?.closest('.relative.group')
  const rect = card ? card.getBoundingClientRect() : null
  emit('preview', props.item, rect || undefined as unknown as DOMRect)
}

// 模型 id -> 本地化显示名（用于"运行全部"结果缩略标签）
function midLabel(mid: string): string {
  return t(`models.${mid}.name`)
}
</script>

<style scoped>
/* 透明背景棋盘格 */
.checker-bg {
  background-image:
    conic-gradient(#e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%, #e5e7eb 100%);
  background-size: 16px 16px;
}
</style>
