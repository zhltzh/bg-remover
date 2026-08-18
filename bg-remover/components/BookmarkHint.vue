<template>
  <Teleport to="body">
    <Transition name="hint">
      <div
        v-if="visible"
        class="fixed inset-0 z-[300] flex items-center justify-center p-4"
        @keydown.esc="close"
      >
        <!-- 半透明遮罩 -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="close"
        ></div>

        <!-- 居中卡片 -->
        <div class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
          <!-- 收藏图标 -->
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.26 6.6.56-5 4.4 1.5 6.48L12 16.9 5.99 19.7l1.5-6.48-5-4.4 6.6-.56L12 2z"/>
            </svg>
          </div>

          <!-- 标题 -->
          <h2 class="text-lg font-bold text-gray-800 mb-2">
            {{ $t('bookmark.title') }}
          </h2>

          <!-- 平台相关文案 -->
          <p class="text-sm text-gray-500 leading-relaxed mb-5">
            {{ isMobile ? $t('bookmark.descMobile') : $t('bookmark.descDesktop') }}
          </p>

          <!-- 关闭按钮 -->
          <button
            @click="close"
            class="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors active:scale-[0.98]"
          >
            {{ $t('bookmark.close') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const visible = ref(false)

// 简单移动端检测：UA 含移动关键词 或 触摸设备
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini/i.test(navigator.userAgent)
})

function show() {
  visible.value = true
  window.addEventListener('keydown', onEsc)
}

function close() {
  visible.value = false
  window.removeEventListener('keydown', onEsc)
}

function onEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

defineExpose({ show, close })
</script>

<style scoped>
.hint-enter-active, .hint-leave-active { transition: all 0.3s ease; }
.hint-enter-from, .hint-leave-to { opacity: 0; transform: scale(0.92); }
</style>
