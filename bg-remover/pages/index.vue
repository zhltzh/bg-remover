<template>
  <div class="min-h-screen bg-grid">
    <AppHeader :show-cache-info="isModelLoading || processError !== null" @clear-cache="handleClearCache" />

    <!-- 全屏加载闪屏（仅首次模型下载时展示） -->
    <LoadingSplash
      :visible="showSplash"
      :percent="modelLoadPercent"
      :step-text="modelStepText"
      :model-size="selectedModel === 'all' ? MODELS.bria.size : (MODELS[selectedModel]?.size || MODELS.bria.size)"
    />

    <main>
      <!-- ===== HERO SECTION (H1)：无图时完整展示，有图时折叠为紧凑统计条 ===== -->
      <section ref="heroRef" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-6 text-center">
        <template v-if="imageItems.length === 0">
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-4 leading-tight">
            {{ $t('hero.title') }}
          </h1>
          <p class="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto leading-relaxed mb-6">
            {{ $t('hero.sub1') }}
            <strong class="text-indigo-600 font-semibold">{{ $t('hero.sub2Strong') }}</strong>，
            {{ $t('hero.sub2') }}
          </p>
          <!-- 统计数据行（GEO：可信度信号） -->
          <div class="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-400">
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
              {{ $t('hero.stat1') }}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
              {{ $t('hero.stat2') }}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
              {{ $t('hero.stat3') }}
            </span>
          </div>
        </template>
        <!-- 折叠态：紧凑单行（仍保留 H1，SEO + 语义完整性） -->
        <div v-else class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-1">
          <h1 class="text-base sm:text-lg font-bold gradient-text">{{ $t('hero.title') }}</h1>
          <span class="text-xs sm:text-sm font-medium text-gray-600">{{ $t('tool.uploadedCount', { count: imageItems.length }) }}</span>
          <span v-if="totalSizeMB !== '0'" class="text-xs text-gray-400">{{ $t('tool.totalSize', { size: totalSizeMB }) }}</span>
          <span class="text-xs text-gray-400 hidden sm:inline">{{ $t('hero.stat1') }}</span>
          <span class="text-xs text-gray-400 hidden md:inline">{{ $t('hero.stat2') }}</span>
          <span class="text-xs text-gray-400 hidden lg:inline">{{ $t('hero.stat3') }}</span>
        </div>
      </section>

      <!-- ===== 工具操作区（ClientOnly 避免 SSR 冲突） ===== -->
      <ClientOnly>
        <!-- ██████ 空状态：全宽上传 ██████ -->
        <section ref="toolSectionRef" v-if="imageItems.length === 0" :aria-label="$t('tool.ariaTool')" class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div class="space-y-4">
            <UploadZone
              :items="imageItems"
              @files-added="addFiles"
              @remove="removeItem"
            />
            <div class="text-center py-8 text-xs text-gray-300">
              {{ $t('tool.footerNote') }}
            </div>
          </div>
        </section>

        <!-- ██████ 有图片：左右分栏（左图区大 / 右操作区小） ██████ -->
        <section ref="toolSectionRef" v-else :aria-label="$t('tool.ariaTool')" class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div class="grid lg:grid-cols-5 gap-6">
            <!-- ===== 左栏：图片列表（占 3/5） ===== -->
            <div class="space-y-4 lg:col-span-3">
              <!-- 顶部操作 -->
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-sm font-medium text-gray-700">{{ $t('tool.uploadedCount', { count: imageItems.length }) }}</span>
                  <span v-if="totalSizeMB !== '0'" class="text-xs text-gray-400 ms-1">{{ $t('tool.totalSize', { size: totalSizeMB }) }}</span>
                </div>
                <label class="text-sm px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {{ $t('tool.addMore') }}
                  <input type="file" multiple accept="image/*" class="hidden" @change="onAddMoreFiles" />
                </label>
              </div>

              <!-- 内联提示区：批量软限制 + WebGPU 降级（不弹窗） -->
              <div class="space-y-2">
                <Transition name="fade">
                  <div
                    v-if="imageItems.length > BATCH_SOFT_LIMIT"
                    class="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-start gap-2"
                  >
                    <svg class="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>{{ $t('tool.batchHint', { count: imageItems.length }) }}</span>
                  </div>
                </Transition>
                <Transition name="fade">
                  <div
                    v-if="wasmFallbackActive"
                    class="px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs flex items-start gap-2"
                  >
                    <svg class="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>{{ $t('bg.fallbackWasm') }}</span>
                  </div>
                </Transition>
              </div>

              <!-- 缩略图网格（动态列数：1张单列大图 / 2-4张两列 / ≥5张三列） -->
              <!-- 单张时无内部滚动（图片 + 下载按钮完整可见），多张时才启用最大高度滚动 -->
              <div :class="[thumbGridClass, thumbScrollClass]">
                <ImagePreview
                  v-for="item in imageItems"
                  :key="item.id"
                  :item="item"
                  :single="imageItems.length === 1"
                  @download="downloadSingle"
                  @preview="openPreview"
                  @remove="removeItem"
                  @retry="retryItem"
                  @edit="openEdit"
                />
              </div>

              <!-- 全部下载（底部快捷操作，醒目主色）：全部完成或部分失败时均可下载成功的图片 -->
              <button
                v-if="someDone && imageItems.length > 1 && !isProcessing"
                @click="downloadAllResults"
                class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-300 transition-all text-sm active:scale-[0.98]"
              >
                ⬇ {{ allDone ? $t('tool.downloadAll', { count: doneCount }) : $t('tool.downloadAllPartial', { count: doneCount }) }}
              </button>
            </div>

            <!-- ===== 右栏：操作面板（占 2/5） ===== -->
            <div class="space-y-5 lg:col-span-2">
              <!-- 步骤指示器 -->
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="flex items-center gap-1"><span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 inline-flex items-center justify-center text-[10px] font-bold">✓</span> {{ $t('tool.step1') }}</span>
                <span class="text-gray-300">→</span>
                <span class="flex items-center gap-1">
                  <span class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold" :class="hasInteracted ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-600 text-white'">②</span>
                  {{ $t('tool.step2') }}
                </span>
                <span class="text-gray-300">→</span>
                <span class="flex items-center gap-1"><span class="w-5 h-5 rounded-full bg-gray-100 text-gray-400 inline-flex items-center justify-center text-[10px] font-bold">③</span> {{ $t('tool.step3') }}</span>
              </div>

              <!-- 编辑工具条（常驻在模型选择器上方）：点击橡皮擦/复原弹出浮层编辑画布，无完成图置灰 -->
              <EditPanel
                :items="editableItems"
                v-model:brush-size="editBrushSize"
                @open="openEditModal"
              />

              <!-- 模型选择（带醒目提示） -->
              <div class="relative">
                <!-- 大号引导横幅（未选择模型时显示） -->
                <Transition name="fade">
                  <div v-if="!hasInteracted" class="mb-3">
                    <div class="rounded-xl overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white shadow-lg shadow-indigo-200">
                      <div class="px-4 py-3 flex items-center gap-3">
                        <span class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm sm:text-base font-bold">{{ $t('tool.guideTitle') }}</p>
                          <p class="text-[11px] text-indigo-100 mt-0.5">{{ $t('tool.guideSub') }}</p>
                        </div>
                        <svg class="w-5 h-5 shrink-0 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Transition>

                <div :class="!hasInteracted ? 'rounded-2xl ring-4 ring-indigo-300 ring-offset-2 animate-pulse' : ''">
                  <ModelSelector v-model="selectedModel" :highlight="!hasInteracted" @select="hasInteracted = true" @open="hasInteracted = true" />
                </div>
              </div>

              <!-- 操作按钮组 -->
              <div class="flex gap-3">
                <button
                  @click="isProcessing ? stopProcessing() : startProcessing()"
                  :disabled="!isProcessing && (isModelLoading || (allDone && !hasErrorItems))"
                  class="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base"
                  :class="btnClass"
                >
                  <span class="flex items-center justify-center gap-2">
                    <template v-if="isProcessing">
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12" rx="1"/><rect x="14" y="6" width="4" height="12" rx="1"/></svg>
                      {{ $t('tool.stopProcessing') }}
                    </template>
                    <template v-else-if="isModelLoading">
                      <SpinnerIcon /> {{ $t('tool.loadingModel', { percent: modelLoadPercent }) }}
                    </template>
                    <template v-else-if="allDone">
                      <template v-if="hasErrorItems">
                        <WandIcon /> {{ $t('tool.reprocess') }}
                      </template>
                      <template v-else>
                        <CheckIcon /> {{ $t('tool.allDone') }}
                      </template>
                    </template>
                    <template v-else>
                      <WandIcon /> {{ $t('tool.start') }}
                    </template>
                  </span>
                </button>

                <button
                  @click="clearAll"
                  class="px-3 py-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
                  :title="$t('tool.clearAllTitle')"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              <!-- 内联批处理结果摘要（不弹窗）：处理结束后展示成功/失败统计 -->
              <Transition name="fade">
                <div
                  v-if="finishedBatch && !isProcessing && hasErrorItems"
                  class="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  <p class="font-medium flex items-center gap-2">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {{ doneCount > 0 ? $t('tool.summaryFail', { done: doneCount, fail: failCount }) : $t('tool.summaryAllFail', { count: failCount }) }}
                  </p>
                  <p class="text-xs text-red-500 mt-1">{{ $t('tool.batchHint', { count: imageItems.length }) }}</p>
                </div>
                <div
                  v-else-if="finishedBatch && !isProcessing && !hasErrorItems && doneCount > 0"
                  class="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"
                >
                  ✓ {{ $t('tool.summaryDone', { done: doneCount }) }}
                </div>
              </Transition>

              <!-- 进度条 -->
              <LoadingProgress
                :show="showProgress"
                :state="progressState"
                :percent="currentPercent"
                :title="progressTitle"
                :sub-text="progressSubText"
                :error-msg="processError"
              />
            </div>
          </div>
        </section>

        <!-- 大图对比预览：在原图位置弹出（lightbox 弹层） -->
        <PreviewModal
          v-if="previewItem"
          :item="previewItem"
          :anchor-rect="previewAnchorRect"
          @close="previewItem = null"
        />

        <!-- 编辑浮层：点击工具条橡皮擦/复原或缩略图铅笔后弹出，居中编辑画布 -->
        <EditModal
          v-if="editOpen && editableItems.length > 0"
          v-model:selected-id="editSelectedId"
          v-model:brush-size="editBrushSize"
          :items="editableItems"
          :initial-tool="editTool"
          @save="onEditSaved"
          @close="editOpen = false"
        />

        <!-- 收藏提示：每下载 5 次居中弹窗 -->
        <BookmarkHint ref="bookmarkHintRef" />

        <!-- SSR fallback：工具加载前显示的占位 -->
        <template #fallback>
          <div class="max-w-4xl mx-auto px-4 py-12 text-center">
            <div class="w-12 h-12 mx-auto rounded-xl bg-gray-100 animate-pulse mb-4" />
            <div class="h-8 w-48 mx-auto bg-gray-100 rounded-lg animate-pulse mb-2" />
            <div class="h-4 w-64 mx-auto bg-gray-50 rounded animate-pulse" />
          </div>
        </template>
      </ClientOnly>

      <!-- ===== 使用步骤（H2）- GEO HowTo ===== -->
      <HowItWorks />

      <!-- ===== 模型对比（H2） ===== -->
      <section class="max-w-4xl mx-auto py-16 px-4" :aria-label="$t('section.modelCompare.ariaLabel')">
        <h2 class="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-4">
          {{ $t('section.modelCompare.title') }}
        </h2>
        <p class="text-center text-gray-500 text-sm mb-10 max-w-lg mx-auto">
          {{ $t('section.modelCompare.sub') }}
        </p>

        <div class="grid sm:grid-cols-3 gap-4 sm:gap-6">
          <div v-for="m in modelCards" :key="m.id"
            class="rounded-2xl p-5 sm:p-6 bg-white card-shadow border"
            :class="m.recommended ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100'"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-gray-800">{{ m.name }}</h3>
              <span v-if="m.recommended" class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">{{ $t('section.modelCompare.recommended') }}</span>
            </div>
            <ul class="space-y-2 text-sm text-gray-500">
              <li v-for="(item, i) in m.items" :key="i" class="flex items-start gap-2">
                <svg class="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ===== 为什么选择我们（H2）- 带统计数据 ===== -->
      <section class="bg-white py-16 sm:py-20" :aria-label="$t('section.why.ariaLabel')">
        <div class="max-w-4xl mx-auto px-4">
          <h2 class="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-12">
            {{ $t('section.why.title') }}
          </h2>

          <div class="grid sm:grid-cols-2 gap-6 sm:gap-8">
            <div v-for="(item, i) in benefits" :key="i" class="flex gap-4 p-4 sm:p-6 rounded-2xl bg-gray-50">
              <div class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg" :class="item.bg">
                {{ item.icon }}
              </div>
              <div>
                <h3 class="font-semibold text-gray-800 mb-1 text-sm sm:text-base">{{ item.title }}</h3>
                <p class="text-sm text-gray-500 leading-relaxed">{{ item.desc }}</p>
              </div>
            </div>
          </div>

          <!-- 统计引用 GEO：带数据 -->
          <div class="mt-10 grid grid-cols-3 gap-4 max-w-lg mx-auto text-center">
            <div v-for="(stat, i) in stats" :key="i" class="p-3">
              <div class="text-xl sm:text-2xl font-bold gradient-text">{{ stat.num }}</div>
              <div class="text-[11px] text-gray-400 mt-1">{{ stat.label }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== 技术原理（H2） ===== -->
      <section class="max-w-3xl mx-auto py-16 px-4" :aria-label="$t('section.tech.ariaLabel')">
        <h2 class="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">
          {{ $t('section.tech.title') }}
        </h2>
        <div class="prose prose-sm sm:prose-base max-w-none text-gray-500 space-y-4">
          <p>
            {{ $t('section.tech.p1', {
              eng: 'ONNX Runtime Web',
              bria: 'BRIA RMBG v1.4',
              modnet: 'MODNet',
              u2net: 'U²-Net'
            }) }}
          </p>
          <p>
            {{ $t('section.tech.p2', { gpu: 'WebGPU', wasm: 'WebAssembly SIMD' }) }}
          </p>
          <p>
            {{ $t('section.tech.p3') }}
          </p>
        </div>
      </section>

      <!-- ===== FAQ（H2）- GEO 关键 ===== -->
      <FaqSection />
    </main>
  </div>
</template>

<script setup lang="ts">
import type { ImageItem } from '~/types'
import { MODELS } from '~/types'
import { useBgRemover } from '~/composables/useBgRemover'
import { useImageProcessor } from '~/composables/useImageProcessor'

// ===== 注入结构化数据（SEO + GEO） =====
const { injectSchemas } = useStructuredData()
injectSchemas()

// ===== SVG 图标组件 =====
const SpinnerIcon = () => h('svg', { class: 'w-4 h-4 animate-spin', viewBox: '0 0 24 24', fill: 'none' }, [
  h('circle', { cx: 12, cy: 12, r: 10, stroke: 'currentColor', 'stroke-width': 3, 'stroke-dasharray': '31.4 31.4', 'stroke-linecap': 'round' })
])
const CheckIcon = () => h('svg', { class: 'w-4 h-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, [
  h('polyline', { points: '20 6 9 17 4 12' })
])
const WandIcon = () => h('svg', { class: 'w-4 h-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }, [
  h('path', { d: 'M4 20V8l8-4 8 4v12H4z' }),
  h('path', { d: 'M8 14l3-3 2 2 3-3 3 3' })
])

// ===== 模型对比卡片数据 =====
const { t, tm, rt } = useI18n()
// vue-i18n compiles messages to AST nodes, so tm() values must be resolved with rt()
const messageText = (message: unknown) => (typeof message === 'string' ? message : rt(message as never))
const messageList = (key: string) => ((tm(key) as unknown[]) || []).map(messageText)
const modelCards = computed(() => [
  {
    id: 'bria',
    name: t('section.modelCompare.cardProName'),
    recommended: true,
    items: messageList('section.modelCompare.cardProItems'),
  },
  {
    id: 'modnet',
    name: t('section.modelCompare.cardPortraitName'),
    recommended: false,
    items: messageList('section.modelCompare.cardPortraitItems'),
  },
  {
    id: 'u2net',
    name: t('section.modelCompare.cardMiniName'),
    recommended: false,
    items: messageList('section.modelCompare.cardMiniItems'),
  },
])

// ===== 优势数据 =====
const benefits = computed(() => [
  { icon: '🔐', bg: 'bg-green-100', title: t('section.why.b1Title'), desc: t('section.why.b1Desc') },
  { icon: '⚡', bg: 'bg-indigo-100', title: t('section.why.b2Title'), desc: t('section.why.b2Desc') },
  { icon: '🆓', bg: 'bg-amber-100', title: t('section.why.b3Title'), desc: t('section.why.b3Desc') },
  { icon: '📦', bg: 'bg-purple-100', title: t('section.why.b4Title'), desc: t('section.why.b4Desc') },
])

// ===== 统计数据 =====
const stats = computed(() => [
  { num: t('section.stats.s1Num'), label: t('section.stats.s1Label') },
  { num: t('section.stats.s2Num'), label: t('section.stats.s2Label') },
  { num: t('section.stats.s3Num'), label: t('section.stats.s3Label') },
])

// ===== 核心逻辑 =====
const {
  isLoaded, isLoading: isModelLoading, modelProgress: modelLoadPercent,
  stepText: modelStepText,
  isProcessing, processError,
  loadedModelId,
  wasmFallbackActive,
  initModel, processImage, dispose
} = useBgRemover()

const { createImageItem, isImageFile, getImageFromClipboard, validateFiles, applyLimits } = useImageProcessor()
const { isModelCached } = useModelLoader()

// 批量软限制：超过该数量仅提示，不阻断（图片越多处理越慢）
const BATCH_SOFT_LIMIT = 6

const imageItems = ref<ImageItem[]>([])
const selectedModel = ref('bria')
const previewItem = ref<ImageItem | null>(null)
const previewAnchorRect = ref<DOMRect | null>(null)
const hasInteracted = ref(false)
const showSplash = ref(false)
// 是否完成了一轮批量处理（用于展示内联结果摘要）
const finishedBatch = ref(false)
// 当前正在处理的第几张（用于进度标题"正在处理第 X/N 张"，批量 >1 时显示）
const currentProcessingIndex = ref(0)
// 编辑浮层当前选中的目标图片 id（无完成图时自动回退到第一张）
const editSelectedId = ref<string | null>(null)
// 编辑浮层是否打开
const editOpen = ref(false)
// 打开浮层时激活的笔刷工具
const editTool = ref<'eraser' | 'restore'>('eraser')
// 画笔大小（工具条与浮层双向同步）
const editBrushSize = ref(30)
// 收藏提示（每下载 5 次弹一次）
import BookmarkHint from '~/components/BookmarkHint.vue'

const bookmarkHintRef = ref<InstanceType<typeof BookmarkHint> | null>(null)
// 工具区滚动锚点
const toolSectionRef = ref<HTMLElement | null>(null)
// hero 区滚动锚点（上传后滚动到 hero，让标题与统计信息保持可见）
const heroRef = ref<HTMLElement | null>(null)
// 是否已自动滚动到工具区（仅首次上传触发一次）
let hasScrolledToTool = false
// 处理令牌：清空/删除时自增，用于中止正在进行的批量处理
let processingToken = 0

const pendingCount = computed(() => imageItems.value.filter(i => i.state === 'pending').length)
const doneCount = computed(() => imageItems.value.filter(i => i.state === 'done').length)
const failCount = computed(() => imageItems.value.filter(i => i.state === 'error').length)
const hasErrorItems = computed(() => imageItems.value.some(i => i.state === 'error'))
const someDone = computed(() => imageItems.value.some(i => i.state === 'done'))

// 可编辑项（完成态且有结果的图片）
const editableItems = computed(() =>
  imageItems.value.filter(i => i.state === 'done' && (i.resultUrl || i.modelResults))
)

// 总大小
const totalSizeMB = computed(() => {
  const totalBytes = imageItems.value.reduce((acc, item) => acc + item.file.size, 0)
  return totalBytes > 0 ? (totalBytes / 1024 / 1024).toFixed(1) : '0'
})
const allDone = computed(() =>
  imageItems.value.length > 0 && imageItems.value.every(i => i.state === 'done')
)

// 缩略图网格动态列数：1张单列大图 / 2-4张两列 / ≥5张三列
const thumbGridClass = computed(() => {
  const n = imageItems.value.length
  if (n === 1) return 'grid grid-cols-1'
  if (n >= 5) return 'grid grid-cols-3'
  return 'grid grid-cols-2'
})

// 缩略图网格滚动：单张时不设 max-height / 内部滚动（大图 + 下载按钮完整可见），多张时才滚动
const thumbScrollClass = computed(() => {
  if (imageItems.value.length <= 1) return 'gap-2.5'
  return 'gap-2.5 max-h-[72vh] overflow-y-auto pe-1'
})

// 按钮样式
const btnClass = computed(() => {
  if (isProcessing.value) return 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
  if (isModelLoading.value) return 'bg-gray-400 text-white cursor-not-allowed'
  if (allDone.value && !hasErrorItems.value) return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200'
  return 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 active:scale-[0.98]'
})

// 进度状态
const showProgress = computed(() =>
  isModelLoading.value || isProcessing.value || processError.value !== null
)
const progressState = computed(() => {
  if (processError.value) return 'error'
  if (isModelLoading.value) return 'loading'
  if (isProcessing.value) return 'processing'
  return 'done'
})
const currentPercent = computed(() => {
  if (isModelLoading.value) return modelLoadPercent.value
  if (isProcessing.value) return computeOverallProgress()
  return 100
})
const progressTitle = computed(() => {
  if (isModelLoading.value) return t('tool.progressLoading', { step: modelStepText.value })
  if (isProcessing.value) {
    // 批量（>1 张）时显示"正在处理第 X/N 张"，单张显示传统文案
    if (imageItems.value.length > 1 && currentProcessingIndex.value > 0) {
      return t('tool.progressCurrent', { current: currentProcessingIndex.value, total: imageItems.value.length })
    }
    return t('tool.progressProcessing', { done: doneCount.value, total: imageItems.value.length })
  }
  if (processError.value) return t('tool.progressError')
  return t('tool.progressDone')
})
const progressSubText = computed(() => {
  if (isModelLoading.value) return modelStepText.value
  if (isProcessing.value) {
    // 批量处理时副标题显示已完成的张数（"已完成 X 张"）
    if (imageItems.value.length > 1) return t('tool.progressSubDone', { count: doneCount.value })
    return t('tool.progressSubDone', { count: doneCount.value })
  }
  return ''
})

function computeOverallProgress(): number {
  if (imageItems.value.length === 0) return 0
  const total = imageItems.value.reduce((acc, item) => {
    if (item.state === 'done') return acc + 100
    if (item.state === 'processing') return acc + item.progress
    return acc
  }, 0)
  return Math.round(total / imageItems.value.length)
}

// 文件管理
function addFiles(files: File[]) {
  const newItems = files.map(f => createImageItem(f))
  imageItems.value.push(...newItems)
  // 首次上传后：滚动到 hero 顶部（hero 折叠为紧凑统计条），
  // 让标题/统计信息留在视口内，模型选择器不被遮挡
  if (newItems.length > 0) {
    nextTick(() => {
      if (!hasScrolledToTool) {
        hasScrolledToTool = true
        heroRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }
  // 注意：不自动隐藏模型选择提示，等用户真正点击模型选择器后再隐藏
}

// 左侧"添加更多"文件选择（复用共享验证逻辑）
function onAddMoreFiles(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const files = Array.from(input.files)
    // 过滤：只取支持格式（与上传区规则一致）
    const validFiles = files.filter(f => isImageFile(f))

    // 数量/总大小限制
    const currentSize = imageItems.value.reduce((acc, item) => acc + item.file.size, 0)
    const { allowed } = applyLimits(validFiles, imageItems.value.length, currentSize)

    if (allowed.length > 0) {
      addFiles(allowed)
    }
  }
  input.value = ''
}

// 全局粘贴：页面任意位置 Ctrl+V 上传图片（守卫：输入框内不拦截、不双触发、浮层打开时跳过）
async function onGlobalPaste(e: ClipboardEvent) {
  // 守卫1：焦点在可编辑元素内（input/textarea/contenteditable）时交给原输入行为
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  // 守卫2：焦点在 UploadZone 内部时由 UploadZone 自己的 handler 处理（避免重复添加）
  if (target && target.closest('[data-upload-zone]')) return
  // 守卫3：编辑/预览浮层打开时不处理
  if (editOpen.value || previewItem.value) return
  if (!e.clipboardData) return

  const file = await getImageFromClipboard(Array.from(e.clipboardData.items))
  if (!file) return
  const { valid } = validateFiles([file])
  const currentSize = imageItems.value.reduce((acc, it) => acc + it.file.size, 0)
  const { allowed } = applyLimits(valid, imageItems.value.length, currentSize)
  if (allowed.length > 0) addFiles(allowed)
}

onMounted(() => {
  window.addEventListener('paste', onGlobalPaste)
})
onBeforeUnmount(() => {
  window.removeEventListener('paste', onGlobalPaste)
})

function revokeItemUrls(item: ImageItem) {
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl)
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  if (item.modelResults) {
    for (const mid of Object.keys(item.modelResults)) {
      const r = item.modelResults[mid]
      if (r.resultUrl) URL.revokeObjectURL(r.resultUrl)
    }
  }
}

function removeItem(id: string) {
  const item = imageItems.value.find(i => i.id === id)
  if (item) revokeItemUrls(item)
  imageItems.value = imageItems.value.filter(i => i.id !== id)
  if (previewItem.value?.id === id) previewItem.value = null
}

function clearAll() {
  // 中止正在进行的批量处理
  processingToken++
  currentProcessingIndex.value = 0
  imageItems.value.forEach(item => revokeItemUrls(item))
  imageItems.value = []
  previewItem.value = null
  finishedBatch.value = false
  hasScrolledToTool = false
}

// 处理逻辑
async function startProcessing() {
  // 包含失败项，支持重试
  const pendingItems = imageItems.value.filter(i => i.state === 'pending' || i.state === 'error')
  if (pendingItems.length === 0 || allDone.value) return

  // 用户点击了开始按钮，视为已了解模型选择器
  hasInteracted.value = true
  const token = ++processingToken

  const isAll = selectedModel.value === 'all'
  const modelIds = isAll ? Object.keys(MODELS) : [selectedModel.value]
  if (modelIds.length === 0 || !MODELS[modelIds[0]]) return
  const firstModel = MODELS[modelIds[0]]

  // 仅当需要加载/切换模型时显示闪屏（已加载同模型则 initModel 立即返回）
  const effectiveModelId = firstModel.id
  const needModelLoad = !isLoaded.value || loadedModelId.value !== effectiveModelId
  if (needModelLoad) {
    // 缓存命中则跳过全屏 splash，仅显示内联加载进度（不遮罩内容）
    const cached = await isModelCached(firstModel)
    showSplash.value = !cached
    const ok = await initModel(firstModel)
    showSplash.value = false
    if (!ok) {
      finishedBatch.value = true
      return
    }
  }

  for (const [itemIdx, item] of pendingItems.entries()) {
    // 处理过程中被清空/删除则中止
    if (token !== processingToken) break
    // 当前正在处理第几张（基于待处理队列的实际位置；与缩略图顺序一致）
    currentProcessingIndex.value = itemIdx + 1
    item.state = 'processing'
    item.progress = 0
    item.errorMsg = undefined

    if (isAll) {
      // "运行全部"：三个模型分别处理，结果按模型存储
      item.modelResults = {}
      let allOk = true
      for (const mid of modelIds) {
        // 用户点击"停止处理"：当前图片处理完后中止后续图片
        if (token !== processingToken) break
        const cfg = MODELS[mid]
        // 切换到对应模型
        if (loadedModelId.value !== cfg.id) {
          const ok = await initModel(cfg)
          if (!ok) {
            item.modelResults[mid] = { resultUrl: null, state: 'error', progress: 0, errorMsg: processError.value || undefined }
            allOk = false
            break
          }
        }
        item.modelResults[mid] = { resultUrl: null, state: 'processing', progress: 0 }
        const result = await processImage(item, cfg, (p) => {
          if (item.modelResults?.[mid]) item.modelResults[mid].progress = p
        }, (msg) => {
          if (item.modelResults?.[mid]) item.modelResults[mid].errorMsg = msg
        })
        if (result) {
          item.modelResults[mid].resultUrl = await canvasToBlobUrl(result)
          item.modelResults[mid].state = 'done'
          item.modelResults[mid].progress = 100
        } else {
          item.modelResults[mid].state = 'error'
          allOk = false
        }
      }
      item.state = allOk ? 'done' : 'error'
      item.progress = allOk ? 100 : 0
      if (!allOk && item.errorMsg === undefined) {
        // 汇总首个失败模型的错误原因，供缩略图错误态展示
        const failed = Object.values(item.modelResults || {}).find(r => r.state === 'error')
        item.errorMsg = failed?.errorMsg
      }
    } else {
      const result = await processImage(item, firstModel, (p) => { item.progress = p }, (msg) => { item.errorMsg = msg })
      if (result) {
        // 用 toBlob 生成 Blob URL（比 toDataURL 高效，避免超大 base64 字符串卡顿）
        item.resultUrl = await canvasToBlobUrl(result)
        item.state = 'done'
        item.progress = 100
      } else {
        item.state = 'error'
      }
    }
  }
  finishedBatch.value = true
}

// 停止处理：让正在进行的图片处理完后中止后续图片
function stopProcessing() {
  processingToken++
  currentProcessingIndex.value = 0
  isProcessing.value = false
  // 停止后允许"重新处理"
  finishedBatch.value = false
}

// 重试单个失败项：将该图片重置为 pending 并立即处理
async function retryItem(id: string) {
  const item = imageItems.value.find(i => i.id === id)
  if (!item) return
  item.state = 'pending'
  item.progress = 0
  item.errorMsg = undefined
  await startProcessing()
}

// 将 ImageData 转为 Blob URL（高效，不占 JS 主线程生成 base64）
function canvasToBlobUrl(imageData: ImageData): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob))
      } else {
        // 回退：使用 toDataURL
        resolve(canvas.toDataURL('image/png'))
      }
    }, 'image/png')
  })
}

function downloadSingle(item: ImageItem) {
  const baseName = item.file.name.replace(/\.[^.]+$/, '')
  const suffix = t('download.suffix')
  // "运行全部"：下载所有模型的抠图结果
  if (item.modelResults) {
    for (const mid of Object.keys(item.modelResults)) {
      const r = item.modelResults[mid]
      if (r.resultUrl) {
        const a = document.createElement('a')
        a.href = r.resultUrl
        a.download = `${baseName}_${modelName(mid)}_${suffix}.png`
        a.click()
      }
    }
    maybeShowBookmarkHint()
    return
  }
  if (!item.resultUrl) return
  const a = document.createElement('a')
  a.href = item.resultUrl
  a.download = `${baseName}_${suffix}.png`
  a.click()
  maybeShowBookmarkHint()
}

async function downloadAllResults() {
  const doneItems = imageItems.value.filter(i => i.state === 'done')
  if (doneItems.length === 0) return
  const suffix = t('download.suffix')
  // 收集所有结果条目
  const entries: { url: string; name: string }[] = []
  for (const item of doneItems) {
    const base = item.file.name.replace(/\.[^.]+$/, '')
    const urls = item.modelResults
      ? Object.keys(item.modelResults).map(mid => ({ url: item.modelResults![mid].resultUrl, name: modelName(mid) })).filter(x => x.url)
      : item.resultUrl ? [{ url: item.resultUrl, name: null as string | null }] : []
    for (const { url, name } of urls) {
      if (!url) continue
      entries.push({ url, name: base + (name ? `_${name}` : '') + `_${suffix}.png` })
    }
  }
  if (entries.length === 0) return
  // 单张直接下载，多张打包 ZIP
  if (entries.length === 1) {
    const a = document.createElement('a')
    a.href = entries[0].url
    a.download = entries[0].name
    a.click()
    maybeShowBookmarkHint()
    return
  }
  // 多张：fflate 打包 ZIP
  try {
    const { zipSync, strToU8 } = await import('fflate')
    const fileMap: Record<string, Uint8Array> = {}
    for (const entry of entries) {
      const res = await fetch(entry.url)
      if (!res.ok) continue
      const buf = new Uint8Array(await res.arrayBuffer())
      fileMap[entry.name] = buf
    }
    if (Object.keys(fileMap).length === 0) return
    const zipData = zipSync(fileMap, { level: 6 })
    const blob = new Blob([zipData], { type: 'application/zip' })
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${suffix}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
  } catch (err) {
    console.error('ZIP 打包失败，回退逐张下载', err)
    for (const entry of entries) {
      const a = document.createElement('a')
      a.href = entry.url
      a.download = entry.name
      a.click()
      await new Promise(r => setTimeout(r, 300))
    }
  }
  maybeShowBookmarkHint()
}

// ===== 收藏提示：每下载 5 次弹一次（localStorage 计数） =====
const BOOKMARK_EVERY = 5
const BOOKMARK_KEY = 'bgremover_download_count'

function getDownloadCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(BOOKMARK_KEY) || '0', 10) || 0
}

function maybeShowBookmarkHint() {
  if (typeof window === 'undefined' || !bookmarkHintRef.value) return
  const count = getDownloadCount() + 1
  localStorage.setItem(BOOKMARK_KEY, String(count))
  // 每下载 5 次弹一次
  if (count % BOOKMARK_EVERY === 0) {
    bookmarkHintRef.value.show()
  }
}

// ===== 编辑功能 =====
// 工具条按钮：打开编辑浮层并激活对应笔刷（撤销/保存不带工具则默认橡皮擦）
function openEditModal(tool: 'eraser' | 'restore' = 'eraser') {
  if (editableItems.value.length === 0) return
  // 选中的图片不在可编辑列表中时回退到第一张
  if (!editableItems.value.some(i => i.id === editSelectedId.value)) {
    editSelectedId.value = editableItems.value[0].id
  }
  editTool.value = tool
  editOpen.value = true
}

// 缩略图铅笔按钮：直接打开编辑浮层并选中该图
function openEdit(item: ImageItem) {
  editSelectedId.value = item.id
  editTool.value = 'eraser'
  editOpen.value = true
}

// 编辑保存：更新指定图片的结果 URL（单图模式编辑 resultUrl；运行全部时 resultUrl 兜底更新）
function onEditSaved(newUrl: string, itemId: string) {
  const item = imageItems.value.find(i => i.id === itemId)
  if (!item) return
  // 释放旧 URL
  if (item.resultUrl) URL.revokeObjectURL(item.resultUrl)
  item.resultUrl = newUrl
  item.state = 'done'
  item.progress = 100
}

// 模型 id -> 本地化显示名
function modelName(mid: string): string {
  return t(`models.${mid}.name`)
}

function openPreview(item: ImageItem, rect?: DOMRect) {
  previewItem.value = item
  previewAnchorRect.value = rect || null
}

async function handleClearCache() {
  const { clearCache } = useModelLoader()
  await clearCache()
  dispose()
}

onUnmounted(() => {
  processingToken++
  dispose()
  imageItems.value.forEach(item => revokeItemUrls(item))
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
