<template>
  <div class="flex flex-wrap items-center justify-center gap-2 text-xs">
    <span class="text-gray-400">{{ label }}</span>
    <button type="button" :aria-label="copyLabel" class="share-pill" @click="handleCopy">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="12" height="12" rx="2" />
        <path d="M5 15V5a2 2 0 0 1 2-2h8" />
      </svg>
      {{ copied ? copiedLabel : copyLabel }}
    </button>
    <a
      v-if="url"
      :href="xHref"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Share on X"
      class="share-pill"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-7 8 8.2 12h-6.6l-5.2-7.6L5.5 22H2.3l7.5-8.6L2 2h6.8l4.7 7L18.9 2Zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20Z" />
      </svg>
      X
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const { locale } = useI18n()
const url = ref('')
const copied = ref(false)

const isZh = computed(() => locale.value.startsWith('zh'))
const label = computed(() => (isZh.value ? '分享' : 'Share'))
const copyLabel = computed(() => (isZh.value ? '复制链接' : 'Copy link'))
const copiedLabel = computed(() => (isZh.value ? '已复制' : 'Copied'))

const xHref = computed(
  () => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url.value)}`,
)

onMounted(() => {
  url.value = `${window.location.origin}${window.location.pathname}`
})

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission can still be denied inside a secure context.
    }
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

async function handleCopy() {
  if (!url.value) return
  const ok = await copyText(url.value)
  if (!ok) return
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2200)
}
</script>

<style scoped>
.share-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #4b5563;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.share-pill:hover {
  border-color: #9ca3af;
  color: #111827;
}
</style>
