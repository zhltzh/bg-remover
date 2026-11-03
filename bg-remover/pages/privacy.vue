<template>
  <div class="min-h-screen bg-grid">
    <SiteNetwork />
    <AppHeader />
    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">隐私说明</h1>
      <p class="text-sm text-gray-500 mb-10">最后更新：2026-11-01</p>

      <div class="space-y-8 text-sm sm:text-base leading-relaxed text-gray-700">
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">图片在本地处理，不会上传</h2>
          <p>
            抠图在浏览器内完成：图片通过 ONNX Runtime Web 加载模型，使用 WebGPU 或 WebAssembly 在设备本地推理。
            图片数据不发送到 Aixuno 的服务器，也不经过任何第三方图像处理服务。
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">首次使用会下载 AI 模型</h2>
          <p>
            第一次打开页面时需要下载抠图模型（约 42&nbsp;MB）。下载完成后模型保存在浏览器缓存中，
            之后再打开无需重复下载。清除浏览器数据后需要重新下载。
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">不收集的内容</h2>
          <ul class="list-disc pl-5 space-y-1.5">
            <li>不要求注册或登录，没有账号体系。</li>
            <li>不收集姓名、邮箱、手机号等个人信息。</li>
            <li>不上传、不存储、不留存你处理的图片。</li>
            <li>本站未接入任何第三方分析或广告脚本。</li>
          </ul>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">站点托管产生的访问日志</h2>
          <p>
            本站是静态站点，托管在 GitHub Pages，域名解析由 Cloudflare 提供。
            作为基础设施提供方，它们可能按行业标准记录访问日志（如 IP 地址、浏览器标识、访问时间）。
            这类日志不由 Aixuno 控制，也不用于识别个人身份。
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">处理结果由你掌握</h2>
          <p>
            抠图结果只存在于当前页面内，点击下载后才会写入你的设备。
            关闭页面后，页面内的数据会被浏览器释放。
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">反馈与隐私请求</h2>
          <p>
            发现页面错误、需要更正内容，或对隐私处理有疑问，可以在
            <a
              href="https://github.com/zhltzh/bg-remover/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
            >GitHub Issues</a>
            提交。提交时请勿粘贴身份证件、银行卡或未公开的文件内容。
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-3">说明变更</h2>
          <p>
            本说明随产品功能变化更新。涉及数据处理的实质变化会更新页首日期，
            并在
            <NuxtLink to="/" class="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">首页</NuxtLink>
            保持可达。
          </p>
        </section>
      </div>

      <p class="mt-12 text-sm">
        <NuxtLink to="/" class="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">← 返回抠图工具</NuxtLink>
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: '隐私说明 - 图片本地处理，不上传服务器 | AI 抠图',
  description: 'AI 抠图工具的隐私说明：图片在浏览器本地通过 ONNX Runtime Web 处理，不上传服务器；无账号体系、不接入第三方分析脚本。',
  ogTitle: '隐私说明 - 图片本地处理，不上传服务器 | AI 抠图',
  ogDescription: '图片在浏览器本地处理，不上传服务器；无账号体系、无第三方分析脚本。',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: 'https://bg.aixuno.com/privacy' }],
  htmlAttrs: { lang: t('seo.lang') || 'zh-CN' },
})
</script>
