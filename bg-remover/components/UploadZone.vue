<template>
  <div
    class="relative"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @paste.prevent="onPaste"
    ref="dropZoneRef"
    data-upload-zone
    tabindex="0"
    @keydown.enter="$emit('click')"
    role="button"
    :aria-label="$t('upload.ariaLabel')"
  >
    <!-- 全局错误提示 -->
    <Transition name="fade">
      <div
        v-if="errorMsg"
        class="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2.5"
      >
        <svg class="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div class="flex-1 min-w-0">
          <p>{{ errorMsg }}</p>
          <button
            v-if="errorDismissable"
            @click.stop="errorMsg = ''"
            class="text-red-500 hover:text-red-700 underline text-xs mt-1"
          >{{ $t('upload.close') }}</button>
        </div>
      </div>
    </Transition>

    <!-- 上传区域 -->
    <div
      :class="[
        'relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer',
        isDragActive
          ? 'border-indigo-500 bg-indigo-50/80 scale-[1.02]'
          : hasFiles
            ? 'border-transparent bg-transparent'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50/80'
      ]"
      @click="onAreaClick"
    >
      <!-- 有文件时的状态 -->
      <div v-if="hasFiles" class="p-4 sm:p-6">
        <div class="flex items-center gap-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-600">
              {{ $t('upload.addedCount', { count: fileCount }) }}
              <span v-if="totalSizeMB !== ''" class="text-gray-400 ms-1">{{ $t('upload.totalSize', { size: totalSizeMB }) }}</span>
            </p>
            <p v-if="hasFolders" class="text-xs text-gray-400 mt-0.5">
              {{ $t('upload.hasFolders') }}
            </p>
          </div>
          <button
            @click.stop="onAddMore"
            class="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 transition-colors text-gray-500 shrink-0"
          >
            {{ $t('upload.addMore') }}
          </button>
        </div>
        <!-- 文件列表预览 -->
        <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
          <div
            v-for="(item, idx) in previewItems"
            :key="item.id"
            class="relative shrink-0 group"
          >
            <img
              :src="item.originalUrl"
              class="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border border-gray-100"
              :alt="item.file.name"
              loading="lazy"
            />
            <button
              @click.stop="$emit('remove', item.id)"
              class="absolute -top-1.5 -end-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="p-8 sm:p-12 md:p-16 text-center">
        <!-- 上传图标 -->
        <div class="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
          <svg class="w-8 h-8 sm:w-10 sm:h-10 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p class="text-base sm:text-lg font-medium text-gray-700 mb-2">
          {{ $t('upload.dropTitle') }}<span class="text-indigo-600">{{ $t('upload.clickUpload') }}</span>
        </p>
        <p class="text-sm text-gray-400 mb-4">
          {{ $t('upload.supported') }}
        </p>

        <!-- 快捷键提示 -->
        <div class="inline-flex items-center gap-2 text-xs text-gray-400">
          <span>{{ $t('upload.support') }}</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[11px] border border-gray-200">Ctrl</kbd>
          <span class="text-gray-300">+</span>
          <kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[11px] border border-gray-200">V</kbd>
          <span>{{ $t('upload.paste') }}</span>
          <span class="mx-1 text-gray-200">|</span>
          <span>{{ $t('upload.supportFolder') }}</span>
          <span class="mx-1 text-gray-200">|</span>
          <span>{{ $t('upload.unlimited') }}</span>
        </div>
      </div>
    </div>

    <!-- 粘贴覆盖层提示 -->
    <Transition name="fade">
      <div
        v-if="showPasteHint"
        class="absolute inset-0 rounded-2xl bg-indigo-600/90 text-white flex items-center justify-center text-lg font-medium backdrop-blur-sm"
      >
        {{ $t('upload.pasting') }}
      </div>
    </Transition>

    <!-- 隐藏的 file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { useImageProcessor } from '~/composables/useImageProcessor'

const emit = defineEmits<{
  filesAdded: [files: File[]]
  remove: [id: string]
  click: []
}>()

const props = defineProps<{
  items: { id: string; file: File; originalUrl: string }[]
}>()

const { isImageFile, readDirectory, getImageFromClipboard, validateFiles, applyLimits } = useImageProcessor()
const { t } = useI18n()

const isDragActive = ref(false)
const showPasteHint = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const dropZoneRef = ref<HTMLElement | null>(null)
const errorMsg = ref('')
const errorDismissable = ref(true)

const hasFiles = computed(() => props.items.length > 0)
const fileCount = computed(() => props.items.length)
const hasFolders = ref(false)
const previewItems = computed(() => props.items.slice(-8)) // 显示最近 8 张
const totalSizeMB = computed(() => {
  const totalBytes = props.items.reduce((acc, item) => acc + item.file.size, 0)
  return totalBytes > 0 ? (totalBytes / 1024 / 1024).toFixed(1) : ''
})

// ===== 添加文件（带验证） =====
function addValidatedFiles(files: File[]) {
  errorMsg.value = ''
  errorDismissable.value = true

  const { valid, errors } = validateFiles(files)

  // 数量/总大小限制
  const currentSize = props.items.reduce((acc, item) => acc + item.file.size, 0)
  const { allowed, errors: limitErrors } = applyLimits(valid, props.items.length, currentSize)
  errors.push(...limitErrors)

  // 显示错误
  if (errors.length > 0) {
    // 超过 3 条则汇总显示
    if (errors.length > 3) {
      errorMsg.value = t('upload.errorSummary', { count: errors.length, first: errors.slice(0, 2).join('；') })
    } else {
      errorMsg.value = errors.join('；')
    }
    // 如果有非警告类错误，则不清除
    const hasBlockers = errors.some(e => e.includes(t('upload.errorTooLarge', { name: '', size: '', max: '' })) || e.includes(t('upload.errorUnsupported', { name: '' })) || e.includes(t('upload.errorMaxFiles', { max: 0 })))
    errorDismissable.value = !hasBlockers
  }

  if (allowed.length > 0) {
    emit('filesAdded', allowed)
  }
}

// ===== 事件处理 =====
function onDragOver(e: DragEvent) {
  isDragActive.value = true
}

function onDragLeave() {
  isDragActive.value = false
}

async function onDrop(e: DragEvent) {
  isDragActive.value = false
  const files: File[] = []

  if (e.dataTransfer?.items) {
    const items = Array.from(e.dataTransfer.items)
    for (const item of items) {
      const entry = item.webkitGetAsEntry?.()
      if (entry?.isDirectory) {
        hasFolders.value = true
        const dirFiles = await readDirectory(entry as FileSystemDirectoryEntry)
        files.push(...dirFiles)
      } else if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
  } else if (e.dataTransfer?.files) {
    files.push(...Array.from(e.dataTransfer.files))
  }

  if (files.length > 0) {
    addValidatedFiles(files)
  }
}

async function onPaste(e: ClipboardEvent) {
  if (!e.clipboardData) return
  errorMsg.value = ''

  const file = await getImageFromClipboard(Array.from(e.clipboardData.items))
  if (file) {
    const { valid, errors } = validateFiles([file])
    if (errors.length > 0) {
      errorMsg.value = errors[0]
    }
    if (valid.length > 0) {
      showPasteHint.value = true
      setTimeout(() => { showPasteHint.value = false }, 500)
      emit('filesAdded', valid)
    }
  }
}

function onAreaClick() {
  errorMsg.value = ''
  if (!hasFiles.value) {
    fileInputRef.value?.click()
  }
}

function onAddMore() {
  errorMsg.value = ''
  fileInputRef.value?.click()
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    const files = Array.from(input.files)
    if (files.length > 0) {
      addValidatedFiles(files)
    }
  }
  input.value = ''
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
