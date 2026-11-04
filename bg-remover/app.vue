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

// ===== 全站 Organization（每页都有，与 Aixuno 主实体关联） =====
useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      key: 'org-schema',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: t('seo.orgName'),
        url: siteUrl,
        description: t('seo.orgDesc'),
        logo: {
          '@type': 'ImageObject',
          url: `${siteUrl}/icons/icon-512.png`,
          width: 512,
          height: 512,
        },
        sameAs: ['https://github.com/zhltzh/bg-remover'],
        parentOrganization: {
          '@type': 'Organization',
          '@id': 'https://aixuno.com/#organization',
          name: 'Aixuno',
          url: 'https://aixuno.com/',
        },
      }),
    },
  ],
}))

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
