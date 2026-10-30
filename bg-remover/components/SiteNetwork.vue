<template>
  <nav aria-label="Aixuno" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
    <ul class="flex flex-wrap items-center justify-center gap-2 text-xs">
      <li v-for="site in SITES" :key="site.id">
        <span
          v-if="site.id === 'bg'"
          aria-current="page"
          class="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 font-medium text-indigo-600"
        >
          <span class="font-bold">{{ site.mark }}</span>{{ t('seo.orgName') }}
        </span>
        <a
          v-else
          :href="site.href"
          class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
        >
          <span class="font-bold">{{ site.mark }}</span>{{ site.label }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// 跨站入口：五个站点互相跳转，当前站以静态标签呈现
const { t } = useI18n()

const SITES = [
  { id: 'markdown', href: 'https://aixuno.com/', mark: 'MD', label: 'Markdown' },
  { id: 'image', href: 'https://image.aixuno.com/', mark: 'IMG', label: 'Pixkit' },
  { id: 'compress', href: 'https://compress.aixuno.com/', mark: 'ZIP', label: 'FilePomelo' },
  { id: 'pdf', href: 'https://pdf.aixuno.com/', mark: 'PDF', label: 'PDFBzy' },
  { id: 'bg', href: 'https://bg.aixuno.com/', mark: 'BG', label: '' },
]
</script>
