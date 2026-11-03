<template>
  <!-- 顶部跨站条：让访客一眼看到 Aixuno 的其他工具，当前站高亮 -->
  <nav aria-label="Aixuno 产品线" class="border-b border-gray-200 bg-white">
    <div class="mx-auto flex max-w-6xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
      <span class="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-widest text-gray-400">
        Aixuno
      </span>
      <component
        :is="site.id === CURRENT ? 'span' : 'a'"
        v-for="site in SITES"
        :key="site.id"
        v-bind="site.id === CURRENT ? { 'aria-current': 'page' } : { href: site.href }"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors"
        :class="
          site.id === CURRENT
            ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
            : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-900'
        "
      >
        <span
          class="inline-grid h-5 min-w-[26px] shrink-0 place-items-center rounded bg-gradient-to-br px-1 text-[10px] font-bold leading-none text-white"
          :class="site.tone"
          >{{ site.mark }}</span
        >
        <span class="whitespace-nowrap text-xs font-semibold">{{ site.label }}</span>
      </component>
    </div>
  </nav>
</template>

<script setup lang="ts">
// 跨站入口：五个站点互相跳转，当前站以静态标签呈现
const SITES = [
  { id: 'markdown', href: 'https://aixuno.com/', mark: 'MD', label: 'Markdown 转换', tone: 'from-amber-400 to-orange-500' },
  { id: 'image', href: 'https://image.aixuno.com/', mark: 'IMG', label: 'Pixkit 图片', tone: 'from-fuchsia-500 to-pink-500' },
  { id: 'compress', href: 'https://compress.aixuno.com/', mark: 'ZIP', label: '文件压缩', tone: 'from-sky-500 to-emerald-500' },
  { id: 'pdf', href: 'https://pdf.aixuno.com/', mark: 'PDF', label: 'PDF 工具', tone: 'from-rose-500 to-red-500' },
  { id: 'bg', href: 'https://bg.aixuno.com/', mark: 'BG', label: 'AI 抠图', tone: 'from-violet-500 to-indigo-500' },
]

const CURRENT = 'bg'
</script>
