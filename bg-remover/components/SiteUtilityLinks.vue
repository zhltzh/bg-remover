<template>
  <!-- 页脚：分享、反馈与隐私入口 -->
  <div class="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
    <ShareLinks />
    <p class="mt-3 text-center text-xs text-gray-400">
      <a
        href="https://github.com/zhltzh/bg-remover/issues/new"
        target="_blank"
        rel="noopener noreferrer"
        class="underline-offset-2 hover:text-gray-700 hover:underline"
        >意见反馈</a
      >
      <span class="mx-1.5">·</span>
      <NuxtLink to="/privacy" class="underline-offset-2 hover:text-gray-700 hover:underline"
        >隐私说明</NuxtLink
      >
    </p>
  </div>
</template>
