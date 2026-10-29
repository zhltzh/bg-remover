<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
// ===== 全局 SEO（按 locale 输出） =====
const { t } = useI18n()
const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl || 'https://bg.aixuno.com'
const i18nHead = useLocaleHead()

useHead(() => {
  const head = i18nHead.value
  return {
    title: t('seo.title'),
    htmlAttrs: {
      lang: head.htmlAttrs?.lang,
      ...(head.htmlAttrs?.dir ? { dir: head.htmlAttrs.dir as 'ltr' | 'rtl' | 'auto' } : {}),
    },
    link: [...(head.link || [])],
    meta: [
      ...(head.meta || []),
      { name: 'description', content: t('seo.description') },
      { name: 'keywords', content: t('seo.keywords') },
      // OG Tags（社交分享）
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: t('seo.ogTitle') },
      { property: 'og:description', content: t('seo.ogDesc') },
      { property: 'og:image', content: `${siteUrl}/icons/og-image.png` },
      { property: 'og:url', content: siteUrl },
      { property: 'og:site_name', content: t('seo.orgName') },
      // Twitter Cards
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: t('seo.twitterTitle') },
      { name: 'twitter:description', content: t('seo.twitterDesc') },
      { name: 'twitter:image', content: `${siteUrl}/icons/og-image.png` },
    ],
  }
})
</script>

<style>
/* 全局样式已在 main.css 中定义 */
</style>
