<template>
  <section :aria-label="$t('faq.ariaLabel')" class="max-w-3xl mx-auto py-16 px-4">
    <h2 class="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-10">
      {{ $t('faq.title') }}
    </h2>

    <div class="space-y-3">
      <div
        v-for="(faq, i) in faqs"
        :key="i"
        class="rounded-2xl border border-gray-200 overflow-hidden transition-all duration-200"
        :class="{ 'shadow-md border-indigo-200': openIndex === i }"
      >
        <button
          @click="toggle(i)"
          class="w-full flex items-center justify-between gap-4 px-5 py-4 text-start hover:bg-gray-50 transition-colors"
        >
          <h3 class="text-sm sm:text-base font-medium text-gray-800 pe-4">
            {{ faq.q }}
          </h3>
          <svg
            class="w-5 h-5 shrink-0 text-gray-400 transition-transform duration-200"
            :class="{ 'rotate-180': openIndex === i }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div
          v-show="openIndex === i"
          class="px-5 pb-4 text-sm text-gray-600 leading-relaxed"
        >
          {{ faq.a }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t, tm } = useI18n()
const openIndex = ref<number | null>(0) // default open first

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}

// vue-i18n hands back compiled message nodes from tm(), so read each field by
// its index key instead of rendering the node itself.
const faqs = computed(() => (tm('faq.items') as unknown[]).map((_, i) => ({
  q: t(`faq.items.${i}.q`),
  a: t(`faq.items.${i}.a`),
})))
</script>
