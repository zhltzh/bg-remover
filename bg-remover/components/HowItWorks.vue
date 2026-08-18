<template>
  <section :aria-label="$t('how.ariaLabel')" class="max-w-4xl mx-auto py-16 px-4">
    <h2 class="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
      {{ $t('how.title') }}
    </h2>
    <p class="text-center text-gray-500 text-sm sm:text-base mb-12 max-w-lg mx-auto">
      {{ $t('how.sub') }}
    </p>

    <div class="grid sm:grid-cols-3 gap-6 sm:gap-8">
      <div
        v-for="(step, i) in steps"
        :key="i"
        class="relative text-center p-6 rounded-2xl bg-white card-shadow"
      >
        <!-- Step number -->
        <div
          class="w-10 h-10 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-sm font-bold flex items-center justify-center"
        >
          {{ i + 1 }}
        </div>

        <!-- Icon -->
        <div class="mb-3 flex justify-center" v-html="step.icon"></div>

        <h3 class="text-base font-semibold text-gray-800 mb-2">
          {{ step.title }}
        </h3>
        <p class="text-sm text-gray-500 leading-relaxed">
          {{ step.desc }}
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n()

const steps = [
  {
    title: t('how.step1Title'),
    desc: t('how.step1Desc'),
    icon: '<svg class="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  },
  {
    title: t('how.step2Title'),
    desc: t('how.step2Desc'),
    icon: '<svg class="w-8 h-8 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2a4 4 0 0 1 4 4c0 2-4 6-4 6s-4-4-4-6a4 4 0 0 1 4-4z"/><circle cx="12" cy="22" r="1"/><path d="M9 18c0-1.5 1.5-3 3-3s3 1.5 3 3"/></svg>',
  },
  {
    title: t('how.step3Title'),
    desc: t('how.step3Desc'),
    icon: '<svg class="w-8 h-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  },
]
</script>
