<template>
  <div class="min-h-screen bg-grid">
    <SiteNetwork />
    <AppHeader />
    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <!-- 面包屑 -->
      <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
        <NuxtLink :to="localePath('/')" class="hover:text-indigo-600">{{ ui.home }}</NuxtLink>
        <span class="text-gray-300">/</span>
        <span class="font-medium text-gray-700">{{ ui.guides }}</span>
      </nav>

      <h1 class="text-2xl sm:text-3xl font-bold gradient-text leading-snug">{{ ui.listTitle }}</h1>
      <p class="mt-3 text-sm sm:text-base text-gray-500 leading-relaxed">{{ ui.listDesc }}</p>

      <ul class="mt-8 grid gap-4 sm:grid-cols-2">
        <li v-for="guide in GUIDES" :key="guide.slug">
          <NuxtLink
            :to="localePath(`${GUIDE_LIST_PATH}/${guide.slug}`)"
            class="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-300 hover:shadow-md"
          >
            <h2 class="text-base font-semibold leading-snug text-gray-900">{{ content(guide).title }}</h2>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{{ content(guide).summary }}</p>
            <span class="mt-3 text-xs text-gray-400">{{ ui.updated }} {{ guide.dateModified }}</span>
          </NuxtLink>
        </li>
      </ul>

      <p class="mt-8 text-xs text-gray-400">{{ ui.listCta }}</p>

      <div class="mt-6">
        <NuxtLink
          :to="localePath('/')"
          class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700"
        >
          {{ ui.openTool }}
        </NuxtLink>
      </div>
    </main>
    <SiteUtilityLinks />
  </div>
</template>

<script setup lang="ts">
import type { Guide } from '~/data/guides'
import { GUIDES, GUIDE_LIST_PATH, guideContent } from '~/data/guides'
import { guideUi } from '~/data/guides/ui'

const { locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl || 'https://bg.aixuno.com'

const ui = computed(() => guideUi(locale.value))
const content = (guide: Guide) => guideContent(guide, locale.value)

const pageTitle = computed(() =>
  locale.value === 'zh' ? `${ui.value.listTitle} | AI 抠图` : `${ui.value.listTitle} | AI Background Remover`
)

useSeoMeta({
  title: pageTitle,
  description: () => ui.value.listDesc,
  ogTitle: pageTitle,
  ogDescription: () => ui.value.listDesc,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  meta: [{ property: 'article:modified_time', content: '2026-11-23T00:00:00Z' }],
  script: [
    {
      type: 'application/ld+json',
      key: 'guide-list-breadcrumb',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: ui.value.home, item: `${siteUrl}${localePath('/')}` },
          { '@type': 'ListItem', position: 2, name: ui.value.guides, item: `${siteUrl}${localePath(GUIDE_LIST_PATH)}` },
        ],
      }),
    },
  ],
}))
</script>
