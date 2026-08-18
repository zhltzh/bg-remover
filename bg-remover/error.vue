<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <!-- 404 图标 -->
      <div class="text-8xl font-bold text-gray-200 mb-4 select-none">
        {{ error?.statusCode || 404 }}
      </div>

      <h1 class="text-2xl font-bold text-gray-800 mb-3">
        {{ is404 ? $t('error.pageTitle') : $t('error.genericTitle') }}
      </h1>

      <p class="text-gray-500 mb-8 leading-relaxed">
        <template v-if="is404">
          {{ $t('error.pageDesc1') }}<br>
          {{ $t('error.pageDesc2') }}
        </template>
        <template v-else>
          {{ $t('error.genericDesc') }}
        </template>
      </p>

      <NuxtLink
        :to="localePath('/')"
        class="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl
               hover:bg-indigo-700 transition-colors font-medium shadow-lg shadow-indigo-600/20"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {{ $t('error.backHome') }}
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  error?: {
    statusCode?: number
    statusMessage?: string
  } | null
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const is404 = computed(() => props.error?.statusCode === 404)

useHead({
  title: is404.value ? t('error.pageTitle') : t('error.genericTitle'),
  meta: [
    { name: 'description', content: t('error.metaDesc') },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>
