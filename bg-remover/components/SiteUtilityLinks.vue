<template>
  <!-- 页脚：分享、反馈与隐私入口 -->
  <div class="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
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
      <NuxtLink to="/privacy" class="underline-offset-2 hover:text-gray-700 hover:underline"
        >隐私说明</NuxtLink
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

// 静态 HTML 里不写完整邮箱，挂载后再拼接，避免被垃圾邮件爬虫抓走。
// 以后换域名邮箱，只改下面两行。
const mailHref = ref("#");

onMounted(() => {
  const address = ["bushiyayaya", "qq.com"].join("@");
  mailHref.value = `mailto:${address}?subject=${encodeURIComponent("抠图工具反馈")}`;
});
</script>
