<template>
  <div class="relative" ref="dropdownRef">
    <!-- 触发器按钮 -->
    <button
      @click="toggleOpen"
      class="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm transition-all duration-200"
      :class="highlight
        ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-100 shadow-lg shadow-indigo-100 font-semibold text-indigo-900'
        : 'border-gray-200 bg-white hover:border-indigo-300 card-shadow text-gray-700'"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- 模型图标 -->
        <span
          :class="[
            'w-2.5 h-2.5 rounded-full shrink-0',
            selectedModel === 'bria' ? 'bg-violet-500' :
            selectedModel === 'u2net' ? 'bg-emerald-500' :
            selectedModel === 'modnet' ? 'bg-amber-500' : 'bg-gray-400'
          ]"
        />
        <div class="min-w-0">
          <span class="font-medium">{{ currentName }}</span>
          <span class="text-xs ms-1.5" :class="highlight ? 'text-indigo-400' : 'text-gray-400'">{{ currentSpeed }}</span>
          <p class="text-[11px] truncate mt-0.5 leading-tight" :class="highlight ? 'text-indigo-500' : 'text-gray-400'">
            {{ selectedModel === 'all' ? $t('models.allTriggerHint') : modelUseHint }}
          </p>
        </div>
      </div>
      <svg
        class="w-4 h-4 transition-transform duration-200 shrink-0"
        :class="[highlight ? 'text-indigo-500' : 'text-gray-400', { 'rotate-180': isOpen }]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <!-- 下拉菜单 -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute z-50 mt-2 w-full min-w-[280px] sm:min-w-[400px] start-0 sm:start-auto sm:end-0 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
      >
        <div class="p-2">
          <!-- 模型选项 -->
          <button
            v-for="model in modelList"
            :key="model.id"
            @click="selectModel(model.id)"
            :class="[
              'w-full text-start p-3.5 rounded-xl transition-all duration-200',
              selectedModel === model.id
                ? 'bg-indigo-50 border border-indigo-200'
                : 'hover:bg-gray-50 border border-transparent'
            ]"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2.5">
                <!-- Radio 图标 -->
                <div
                  :class="[
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    selectedModel === model.id
                      ? 'border-indigo-500'
                      : 'border-gray-300'
                  ]"
                >
                  <div
                    v-if="selectedModel === model.id"
                    class="w-2 h-2 rounded-full bg-indigo-500"
                  />
                </div>
                <span class="font-semibold text-gray-800">{{ t(`models.${model.id}.name`) }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  {{ t(`models.${model.id}.speed`) }}
                </span>
                <span class="text-xs text-gray-400">{{ model.size }}</span>
              </div>
              <span v-if="model.id === 'bria'" class="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-medium">
                {{ t('models.recommended') }}
              </span>
            </div>
            <p class="text-xs text-gray-500 ps-6 leading-relaxed">{{ t(`models.${model.id}.desc`) }}</p>
            <div class="flex flex-wrap items-center gap-1.5 ps-6 mt-1.5">
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {{ t('models.maxSize', { size: model.maxDimension >= 10000 ? (model.maxDimension / 1000).toFixed(0) : model.maxDimension }) }}
              </span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {{ t('models.inputSize', { res: model.resolution }) }}
              </span>
              <!-- 应用场景标签 -->
              <span
                v-for="tag in modelTags(model.id)"
                :key="tag.label"
                class="text-[10px] px-1.5 py-0.5 rounded font-medium"
                :class="tag.cls"
              >{{ tag.label }}</span>
            </div>
          </button>

          <!-- 运行全部选项 -->
          <button
            @click="selectModel('all')"
            :class="[
              'w-full text-start p-3.5 rounded-xl transition-all duration-200 mt-1',
              selectedModel === 'all'
                ? 'bg-indigo-50 border border-indigo-200'
                : 'hover:bg-gray-50 border border-transparent'
            ]"
          >
            <div class="flex items-center gap-2.5 mb-1">
              <div
                :class="[
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  selectedModel === 'all' ? 'border-indigo-500' : 'border-gray-300'
                ]"
              >
                <div v-if="selectedModel === 'all'" class="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
              <span class="font-semibold text-gray-800">{{ t('models.allName') }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{{ t('models.allCompare') }}</span>
            </div>
            <p class="text-xs text-gray-500 ps-6">{{ t('models.allDesc') }}</p>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { MODELS } from '~/types'

const { t, tm, rt } = useI18n()

const modelList = computed(() => Object.values(MODELS))

const model = defineModel<string>({ default: 'bria' })
const isOpen = ref(false)

const props = defineProps<{
  highlight?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  open: []
}>()

// 展开下拉时通知父组件（用户已开始与模型选择器交互，关闭引导高亮）
function toggleOpen() {
  if (!isOpen.value) emit('open')
  isOpen.value = !isOpen.value
}

const currentModel = computed(() => MODELS[model.value] || MODELS.bria)
const selectedModel = computed(() => model.value)

const currentName = computed(() => t(`models.${currentModel.value.id}.name`))
const currentSpeed = computed(() => t(`models.${currentModel.value.id}.speed`))

const modelUseHint = computed(() => {
  const mid = currentModel.value.id
  return t(`models.${mid}.hint`)
})

// 模型标签（展示应用场景和特点）
function modelTags(id: string): { label: string; cls: string }[] {
  const tagCls: Record<string, string[]> = {
    bria: ['bg-violet-100 text-violet-600', 'bg-blue-100 text-blue-600'],
    u2net: ['bg-emerald-100 text-emerald-600', 'bg-green-100 text-green-600'],
    modnet: ['bg-amber-100 text-amber-600', 'bg-orange-100 text-orange-600'],
  }
  // vue-i18n compiles messages to AST nodes, so tm() values must be resolved with rt()
  const labels = (tm(`models.tags.${id}`) as unknown[] || []).map((label) => (typeof label === 'string' ? label : rt(label as never)))
  return labels.map((label, i) => ({
    label,
    cls: (tagCls[id] || [])[i] || 'bg-gray-100 text-gray-500',
  }))
}

function selectModel(id: string) {
  model.value = id
  isOpen.value = false
  emit('select', id)
}

// 点击外部关闭
const dropdownRef = ref<HTMLElement | null>(null)
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
      isOpen.value = false
    }
  })
})
</script>

<style scoped>
.dropdown-enter-active {
  transition: all 0.2s ease-out;
}
.dropdown-leave-active {
  transition: all 0.15s ease-in;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}
</style>
