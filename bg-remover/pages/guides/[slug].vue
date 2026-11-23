<template>
  <div class="min-h-screen bg-grid">
    <SiteNetwork />
    <AppHeader />
    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <!-- 面包屑 -->
      <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-gray-500" aria-label="Breadcrumb">
        <NuxtLink :to="localePath('/')" class="hover:text-indigo-600">{{ ui.home }}</NuxtLink>
        <span class="text-gray-300">/</span>
        <NuxtLink :to="localePath(GUIDE_LIST_PATH)" class="hover:text-indigo-600">{{ ui.guides }}</NuxtLink>
        <span class="text-gray-300">/</span>
        <span class="line-clamp-1 font-medium text-gray-700">{{ content.title }}</span>
      </nav>

      <!-- 非中英语言：正文回退英文的提示 -->
      <p
        v-if="showLangNotice"
        class="mb-5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-700"
      >
        {{ ui.langNotice }}
      </p>

      <article>
        <h1 class="text-2xl sm:text-3xl font-bold leading-snug text-gray-900 sm:leading-tight">{{ content.title }}</h1>
        <p class="mt-3 text-xs text-gray-400">{{ ui.updated }} {{ guide.dateModified }}</p>

        <div class="mt-8 space-y-4 text-sm sm:text-base leading-relaxed text-gray-700">
          <template v-for="(block, i) in content.blocks" :key="i">
            <h2 v-if="block.type === 'h2'" class="!mt-8 text-lg sm:text-xl font-semibold text-gray-900">
              {{ block.text }}
            </h2>
            <p v-else-if="block.type === 'p'">{{ block.text }}</p>
            <ul v-else-if="block.type === 'ul'" class="list-disc space-y-1.5 ps-5">
              <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
            </ul>
            <ol v-else-if="block.type === 'ol'" class="list-decimal space-y-1.5 ps-5">
              <li v-for="(item, j) in block.items" :key="j">{{ item }}</li>
            </ol>
            <div
              v-else-if="block.type === 'cta'"
              class="!mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5"
            >
              <p class="text-sm text-gray-600">{{ block.text }}</p>
              <NuxtLink
                :to="localePath('/')"
                class="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-violet-700"
              >
                {{ block.label }}
              </NuxtLink>
            </div>
          </template>
        </div>
      </article>

      <!-- FAQ -->
      <section class="mt-12" :aria-label="ui.faqTitle">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900">{{ ui.faqTitle }}</h2>
        <div class="mt-5 space-y-2.5">
          <details
            v-for="(item, i) in content.faq"
            :key="i"
            class="group rounded-xl border border-gray-200 bg-white px-4 py-3"
            :open="i === 0"
          >
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-gray-800">
              <span>{{ item.q }}</span>
              <svg
                class="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <p class="mt-2 text-sm leading-relaxed text-gray-600">{{ item.a }}</p>
          </details>
        </div>
      </section>

      <!-- 相关教程 -->
      <section v-if="related.length" class="mt-12 border-t border-gray-200 pt-6">
        <h2 class="text-base font-semibold text-gray-900">{{ ui.relatedTitle }}</h2>
        <ul class="mt-3 grid gap-2.5 sm:grid-cols-2">
          <li v-for="item in related" :key="item.slug">
            <NuxtLink
              :to="localePath(`${GUIDE_LIST_PATH}/${item.slug}`)"
              class="flex h-full items-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
            >
              {{ guideContent(item, locale).title }}
            </NuxtLink>
          </li>
        </ul>
      </section>

      <div class="mt-10 flex flex-wrap items-center gap-4 text-sm">
        <NuxtLink :to="localePath(GUIDE_LIST_PATH)" class="text-indigo-600 hover:text-indigo-800">
          {{ ui.backToList }}
        </NuxtLink>
        <NuxtLink :to="localePath('/')" class="text-gray-500 hover:text-gray-800">{{ ui.openTool }}</NuxtLink>
      </div>
    </main>
    <SiteUtilityLinks />
  </div>
</template>

<script setup lang="ts">
import type { Guide } from '~/data/guides'
import { getGuide, GUIDE_LIST_PATH, guideContent, contentLocale } from '~/data/guides'
import { guideUi } from '~/data/guides/ui'

const route = useRoute()
const { locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useRuntimeConfig().public.siteUrl || 'https://bg.aixuno.com'

const slug = String(route.params.slug || '')
const found = getGuide(slug)
if (!found) {
  throw createError({ statusCode: 404, statusMessage: 'Guide not found', fatal: true })
}
const guide: Guide = found

const ui = computed(() => guideUi(locale.value))
const content = computed(() => guideContent(guide, locale.value))
const showLangNotice = computed(() => locale.value !== 'zh' && locale.value !== 'en')
const related = guide.related
  .map((item) => getGuide(item))
  .filter((item): item is Guide => Boolean(item))

const canonical = `${siteUrl}${localePath(`${GUIDE_LIST_PATH}/${guide.slug}`)}`
const listUrl = `${siteUrl}${localePath(GUIDE_LIST_PATH)}`
const homeUrl = `${siteUrl}${localePath('/')}`
const inLanguage = contentLocale(locale.value) === 'zh' ? 'zh-CN' : 'en'

const pageTitle = computed(() =>
  locale.value === 'zh' ? `${content.value.title} | AI 抠图教程` : `${content.value.title} | AI Background Removal`
)

useSeoMeta({
  title: pageTitle,
  description: () => content.value.description,
  ogTitle: pageTitle,
  ogDescription: () => content.value.description,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  meta: [
    { property: 'article:published_time', content: '2026-11-23T00:00:00Z' },
    { property: 'article:modified_time', content: '2026-11-23T00:00:00Z' },
  ],
  script: [
    {
      type: 'application/ld+json',
      key: 'guide-article-schema',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: content.value.title,
        description: content.value.description,
        inLanguage,
        datePublished: guide.datePublished,
        dateModified: guide.dateModified,
        about: content.value.keyword,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        image: `${siteUrl}/icons/og-image.png`,
        author: {
          '@type': 'Organization',
          name: inLanguage === 'zh-CN' ? 'AI 抠图' : 'AI Background Remover',
          url: siteUrl,
        },
        publisher: {
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: inLanguage === 'zh-CN' ? 'AI 抠图' : 'AI Background Remover',
          logo: { '@type': 'ImageObject', url: `${siteUrl}/icons/favicon.svg` },
        },
        isAccessibleForFree: true,
      }),
    },
    {
      type: 'application/ld+json',
      key: 'guide-faq-schema',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage,
        mainEntity: content.value.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }),
    },
    {
      type: 'application/ld+json',
      key: 'guide-breadcrumb-schema',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: ui.value.home, item: homeUrl },
          { '@type': 'ListItem', position: 2, name: ui.value.guides, item: listUrl },
          { '@type': 'ListItem', position: 3, name: content.value.title, item: canonical },
        ],
      }),
    },
  ],
}))
</script>
