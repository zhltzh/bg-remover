<template>
  <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-14 sm:h-16">
        <!-- Logo -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 20V8l8-4 8 4v12H4z" />
              <path d="M8 14l3-3 2 2 3-3 3 3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <div class="flex items-baseline gap-1.5">
            <span class="text-lg sm:text-xl font-bold gradient-text">{{ $t('header.brand') }}</span>
            <span class="hidden sm:inline text-xs text-gray-400">{{ $t('header.tagline') }}</span>
          </div>
        </div>

        <!-- 右侧操作 -->
        <div class="flex items-center gap-3">
          <!-- 语言切换器（多语言下拉） -->
          <div class="relative" ref="langRef">
            <button
              @click="langOpen = !langOpen"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs transition-colors text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
              aria-label="Switch language"
            >
              <GlobeIcon />
              <span class="hidden sm:inline">{{ currentLangName }}</span>
              <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': langOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <Transition name="dropdown">
              <div
                v-if="langOpen"
                class="absolute z-50 mt-2 end-0 w-48 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1"
              >
                <NuxtLink
                  v-for="l in localeOptions"
                  :key="l.code"
                  :to="switchLocalePath(l.code as Parameters<typeof switchLocalePath>[0])"
                  class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors"
                  :class="locale === l.code
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'"
                >
                  <span>{{ l.name }}</span>
                  <span v-if="l.dir === 'rtl'" class="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400" title="RTL">⬅</span>
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <!-- 模型缓存状态 -->
          <button
            v-if="showCacheInfo"
            @click="onClearCache"
            class="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
            :title="$t('header.clearCacheTitle')"
          >
            {{ $t('header.clearCache') }}
          </button>

          <!-- GitHub 或类似链接占位 -->
          <a
            :href="localePath('/')"
            class="text-xs text-gray-400 hover:text-gray-600 transition-colors hidden sm:block"
          >
            v1.0
          </a>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

// 语言选项（全部 10 个语言，本地名展示；locales.value 来自 i18n）
const localeOptions = computed(() => (locales.value as { code: string; name: string; dir?: string }[]))
const currentLangName = computed(() => {
  const cur = localeOptions.value.find(l => l.code === locale.value)
  return cur?.name || '中文'
})

// 下拉开关与外部点击关闭
const langOpen = ref(false)
const langRef = ref<HTMLElement | null>(null)
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (langRef.value && !langRef.value.contains(e.target as Node)) {
      langOpen.value = false
    }
  })
})

// 简单地球图标
const GlobeIcon = () => h('svg', { class: 'w-3.5 h-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('line', { x1: 2, y1: 12, x2: 22, y2: 12 }),
  h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }),
])

defineProps<{
  showCacheInfo?: boolean
}>()

const emit = defineEmits<{
  clearCache: []
}>()

function onClearCache() {
  emit('clearCache')
}
</script>

<style scoped>
.dropdown-enter-active { transition: all 0.2s ease-out; }
.dropdown-leave-active { transition: all 0.15s ease-in; }
.dropdown-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); }
.dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
</style>
