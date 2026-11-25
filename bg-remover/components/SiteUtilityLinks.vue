<template>
  <!-- 页脚：站群、分享、反馈与隐私入口 -->
  <div class="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
    <nav aria-label="Aixuno 产品线" class="mt-8 border-t border-gray-200 pt-5">
      <div class="text-[11px] font-bold uppercase tracking-widest text-gray-400">Aixuno 工具生态</div>
      <div class="mt-2.5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a
          v-for="site in SITES"
          :key="site.id"
          :href="site.id === CURRENT ? undefined : site.href"
          :aria-current="site.id === CURRENT ? 'page' : undefined"
          :class="site.id === CURRENT ? 'font-semibold text-gray-900' : 'text-gray-600 transition-colors hover:text-gray-900'"
          >{{ site.label }}</a
        >
      </div>
    </nav>
    <ShareLinks />
    <p class="mt-3 text-center text-xs text-gray-400">
      <a
        :href="mailHref"
        rel="nofollow"
        class="underline-offset-2 hover:text-gray-700 hover:underline"
        >邮件反馈</a
      >
      <span class="mx-1.5">·</span>
      <a
        href="https://github.com/zhltzh/bg-remover/issues/new"
        target="_blank"
        rel="noopener noreferrer"
        class="underline-offset-2 hover:text-gray-700 hover:underline"
        >GitHub</a
      >
      <span class="mx-1.5">·</span>
      <NuxtLink :to="localePath('/guides')" class="underline-offset-2 hover:text-gray-700 hover:underline"
        >{{ $t('header.guides') }}</NuxtLink
      >
      <span class="mx-1.5">·</span>
      <NuxtLink to="/privacy" class="underline-offset-2 hover:text-gray-700 hover:underline"
        >隐私说明</NuxtLink
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

const localePath = useLocalePath();

// 跨站入口：与 SiteNetwork.vue 保持同一份数据
const SITES = [
  { id: 'markdown', href: 'https://aixuno.com/', label: 'Markdown 转换' },
  { id: 'image', href: 'https://image.aixuno.com/', label: 'Pixkit 图片批量处理' },
  { id: 'compress', href: 'https://compress.aixuno.com/', label: '文件压缩' },
  { id: 'pdf', href: 'https://pdf.aixuno.com/', label: 'PDF 工具' },
  { id: 'bg', href: 'https://bg.aixuno.com/', label: 'AI 抠图' },
  { id: 'scan', href: 'https://scan.aixuno.com/', label: '文档扫描' },
  { id: 'idphoto', href: 'https://idphoto.aixuno.com/', label: '证件照制作' },
  { id: 'restore', href: 'https://restore.aixuno.com/', label: '老照片修复' },
  { id: 'watermark', href: 'https://watermark.aixuno.com/', label: '视频去水印' },
]

const CURRENT = 'bg'

// 静态 HTML 里不写完整邮箱，挂载后再拼接，避免被垃圾邮件爬虫抓走。
// 以后换域名邮箱，只改下面两行。
const mailHref = ref("#");

onMounted(() => {
  const address = ["bushiyayaya", "qq.com"].join("@");
  mailHref.value = `mailto:${address}?subject=${encodeURIComponent("抠图工具反馈")}`;
});
</script>
