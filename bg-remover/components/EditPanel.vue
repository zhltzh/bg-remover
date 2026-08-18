<template>
  <!-- 编辑工具条：常驻显示在模型选择器上方，点击橡皮擦/复原弹出浮层编辑画布 -->
  <div
    data-edit-toolbar
    class="rounded-xl border border-indigo-200 card-shadow overflow-hidden bg-white transition-opacity"
    :class="{ 'opacity-40 pointer-events-none': !hasItem }"
  >
    <div class="flex items-center gap-2 px-3 py-2.5 flex-wrap">
      <!-- 橡皮擦 / 复原：点击打开浮层并激活对应工具 -->
      <div class="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
        <button
          @click="$emit('open', 'eraser')"
          class="px-2.5 py-1.5 text-[11px] font-medium transition-colors flex items-center gap-1 bg-white text-gray-600 hover:bg-indigo-50"
          :title="$t('edit.tipEraser')"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
            <path d="M22 21H7"/><path d="m5 11 9 9"/>
          </svg>
          {{ $t('edit.eraser') }}
        </button>
        <button
          @click="$emit('open', 'restore')"
          class="px-2.5 py-1.5 text-[11px] font-medium transition-colors flex items-center gap-1 bg-white text-gray-600 hover:bg-emerald-50"
          :title="$t('edit.tipRestore')"
        >
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          {{ $t('edit.restore') }}
        </button>
      </div>

      <!-- 画笔大小（双向同步到浮层） -->
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

      <!-- 撤销 / 保存：点击打开浮层（浮层内执行对应操作） -->
      <button
        @click="$emit('open')"
        class="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-50 transition-colors"
        :title="$t('edit.undo')"
      >
        ↶ {{ $t('edit.undo') }}
      </button>
      <button
        @click="$emit('open')"
        class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all"
      >
        {{ $t('edit.save') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImageItem } from '~/types'

const props = defineProps<{
  /** 可编辑图片列表（完成态且有结果），为空时工具条置灰 */
  items: ImageItem[]
}>()

const brushSize = defineModel<number>('brushSize', { default: 30 })

const hasItem = computed(() => props.items.length > 0)

defineEmits<{
  /** 点击工具按钮：打开编辑浮层；tool 为要激活的笔刷（不传则默认橡皮擦） */
  open: [tool?: 'eraser' | 'restore']
}>()
</script>
