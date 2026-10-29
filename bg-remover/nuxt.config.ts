// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // ===== SEO / 渲染模式 =====
  // 启用 SSR 确保搜索引擎和 AI 爬虫能抓取内容
  ssr: true,

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/i18n',
    '@nuxtjs/sitemap',
  ],

  nitro: {
    preset: 'static',
    serveStatic: true,
  },

  routeRules: {
    // 首页预渲染为静态 HTML（SEO + GEO 关键）
    '/': { prerender: true },
    '/404': { prerender: true },
    // 各语言版本静态预渲染
    '/en': { prerender: true },
    '/en/404': { prerender: true },
    '/ja': { prerender: true },
    '/ja/404': { prerender: true },
    '/ko': { prerender: true },
    '/ko/404': { prerender: true },
    '/fr': { prerender: true },
    '/fr/404': { prerender: true },
    '/de': { prerender: true },
    '/de/404': { prerender: true },
    '/es': { prerender: true },
    '/es/404': { prerender: true },
    '/ru': { prerender: true },
    '/ru/404': { prerender: true },
    '/pt': { prerender: true },
    '/pt/404': { prerender: true },
    '/ar': { prerender: true },
    '/ar/404': { prerender: true },
  },

  // ===== 国际化（10 语言，阿拉伯语 RTL） =====
  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'zh',
    baseUrl: 'https://bg.aixuno.com',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      fallbackLocale: 'zh',
    },
    locales: [
      { code: 'zh', name: '中文', language: 'zh-CN', file: 'zh.json' },
      { code: 'en', name: 'English', language: 'en-US', file: 'en.json' },
      { code: 'ja', name: '日本語', language: 'ja-JP', file: 'ja.json' },
      { code: 'ko', name: '한국어', language: 'ko-KR', file: 'ko.json' },
      { code: 'fr', name: 'Français', language: 'fr-FR', file: 'fr.json' },
      { code: 'de', name: 'Deutsch', language: 'de-DE', file: 'de.json' },
      { code: 'es', name: 'Español', language: 'es-ES', file: 'es.json' },
      { code: 'ru', name: 'Русский', language: 'ru-RU', file: 'ru.json' },
      { code: 'pt', name: 'Português', language: 'pt-PT', file: 'pt.json' },
      { code: 'ar', name: 'العربية', language: 'ar-SA', dir: 'rtl', file: 'ar.json' },
    ],
    langDir: 'locales',
  },

  // ===== SEO: Site Config（用于 sitemap 等） =====
  site: {
    url: 'https://bg.aixuno.com',
  },

  // ===== SEO: Sitemap =====
  sitemap: {
    defaults: {
      changefreq: 'weekly',
      priority: 1.0,
    },
  },

  // ===== SEO: Meta Tags（语言相关 meta 已在 app.vue 按 locale 动态输出） =====
  app: {
    head: {
      // 语言相关的 title/meta/OG 由 app.vue 的 useHead + useI18n 按 locale 生成
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'author', content: 'ImagesTool' },
        { name: 'robots', content: 'index, follow' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icons/favicon.svg' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // ONNX Runtime WASM 文件地址（自托管相对路径，构建时由 scripts/download-models.sh 准备）
      wasmBaseUrl: '/wasm/',
      // 站点 URL
      siteUrl: 'https://bg.aixuno.com',
    },
  },

  // onnxruntime-web 需要被 transpile 以在浏览器中运行
  build: {
    transpile: ['onnxruntime-web'],
  },

  compatibilityDate: '2024-11-01',
})
