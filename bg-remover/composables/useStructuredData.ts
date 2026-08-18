/**
 * 结构化数据（Schema.org JSON-LD）注入
 * SEO + GEO 关键：为 AI 搜索引擎提供可提取的结构化信息
 */
export function useStructuredData() {
  const config = useRuntimeConfig()
  const { t } = useI18n()
  const siteUrl = config.public.siteUrl || 'https://ai-bg-remover.vercel.app'

  // 注入 JSON-LD 到页面 head
  function injectSchemas() {
    const schemas = [
      webApplicationSchema(),
      organizationSchema(),
      faqPageSchema(),
      howToSchema(),
      breadcrumbSchema(),
    ]

    useHead({
      script: schemas.map((schema, i) => ({
        type: 'application/ld+json',
        // 给每个 schema 一个唯一的 innerHTML
        children: JSON.stringify(schema),
        key: `schema-${i}`,
      })),
    })
  }

  // 1. WebApplication Schema - 标记为 Web 应用
  function webApplicationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t('seo.webAppName'),
      url: siteUrl,
      description: t('seo.webAppDesc'),
      applicationCategory: 'Multimedia',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript. Supports WebGPU for acceleration.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'CNY',
      },
      author: {
        '@type': 'Organization',
        name: 'ImagesTool',
      },
    }
  }

  // 2. Organization Schema
  function organizationSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: t('seo.orgName'),
      url: siteUrl,
      description: t('seo.orgDesc'),
    }
  }

  // 3. FAQPage Schema - GEO 关键（AI 最易提取的格式）
  function faqPageSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: t('seo.faqQ1'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA1'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ2'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA2'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ3'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA3'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ4'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA4'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ5'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA5'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ6'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA6'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ7'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA7'),
          },
        },
        {
          '@type': 'Question',
          name: t('seo.faqQ8'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t('seo.faqA8'),
          },
        },
      ],
    }
  }

  // 4. HowTo Schema - GEO 优化（步骤说明）
  function howToSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: t('seo.howToName'),
      description: t('seo.howToDesc'),
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: t('seo.howToStep1Name'),
          text: t('seo.howToStep1Text'),
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: t('seo.howToStep2Name'),
          text: t('seo.howToStep2Text'),
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: t('seo.howToStep3Name'),
          text: t('seo.howToStep3Text'),
        },
      ],
    }
  }

  // 5. BreadcrumbList Schema
  function breadcrumbSchema() {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: t('seo.crumbHome'),
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: t('seo.crumbTool'),
          item: siteUrl,
        },
      ],
    }
  }

  return {
    injectSchemas,
    schemas: {
      webApplicationSchema,
      organizationSchema,
      faqPageSchema,
      howToSchema,
      breadcrumbSchema,
    },
  }
}
