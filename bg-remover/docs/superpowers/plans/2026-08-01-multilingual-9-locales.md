# 9 语言多语言扩展实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 背景去除工具从中英双语扩展为 9 语言单域名版本（zh/en/ja/ko/fr/de/es/ru/pt/ar），含阿拉伯语完整 RTL 布局，SEO/GEO 逐语言本地化。

**Architecture:** 沿用现有 `@nuxtjs/i18n` `prefix_except_default` 策略（zh 无前缀默认，其余语言路径前缀）。每语言一个 `i18n/locales/{code}.json` 翻译文件；`nuxt.config.ts` 注册 locales + prerender；`app.vue` 已通过 `useLocaleHead` 处理 `<html lang/dir>`（ar 配置 `dir: 'rtl'` 后自动生效）；方向类改为 Tailwind v4 逻辑属性（`ms-`/`ps-`/`text-start` 等）实现 RTL 镜像；语言切换器改 9 语言下拉。

**Tech Stack:** Nuxt 3.19 / @nuxtjs/i18n 10.6 / Tailwind CSS v4（@nuxtjs/tailwindcss 6.13）/ Vercel 静态部署

**设计文档:** `docs/superpowers/specs/2026-08-01-multilingual-9-locales-design.md`

---

## 关键先验知识（执行者必读）

- 翻译文件结构：`i18n/locales/zh.json` 与 `en.json` 均为 226 个 key（含 7 个数组值 key：`models.tags.bria/u2net/modnet`（各 2 项）、`faq.items`（7 项）、`section.modelCompare.cardProItems/cardPortraitItems/cardMiniItems`（各 4 项））。`en.json` 是结构与翻译质量的权威参考，新语言从 `en.json` 派生翻译。
- **vue-i18n 数组坑（已踩过）**：`t()` 对数组值返回字符串，必须用 `tm()`。所有新翻译保持数组结构，消费端已全部用 `tm()`（ModelSelector `modelTags`、FaqSection `faqs`、index.vue `modelCards`）。
- **i18n 初始化**：`lazy: true` + `langDir: 'locales'`，运行时按需加载 JSON。
- **RTL 触发**：`@nuxtjs/i18n` 支持 locales 配置项加 `dir` 属性，`useLocaleHead()` 自动输出 `<html dir>`。`app.vue` 第 19-20 行已处理 `head.htmlAttrs?.dir`，**只需在 locales 中给 ar 加 `dir: 'rtl'`**。
- **构建与部署**：`npm run build`（`nuxi generate` 静态预渲染），输出 `.output/public`。`vercel.json` 用 `nuxi generate`。本地静态服务 `npx serve .output/public -l 3000`。
- **测试模式**：Playwright，持久上下文 + 预热模型缓存目录 `C:\Users\黄明珠\AppData\Local\Temp\bgremover-runall-cache`，ModelSelector 触发器定位 `page.locator('button', { has: page.locator('div.min-w-0') }).first()`，处理按钮 `/开始抠图/` 或 `/Remove Background/`。
- **模型加载**：CDN jsDelivr/unpkg，`public/models/` 为空属正常。慢网络下现下载模型可达 70s+。

## 文件结构

**修改：**
- `nuxt.config.ts`：locales 追加 8 语言（含 ar 的 `dir: 'rtl'`）、routeRules 追加 16 条 prerender
- `components/AppHeader.vue`：语言切换器改 9 语言下拉
- `components/ModelSelector.vue`：方向类 → 逻辑属性
- `components/FaqSection.vue`：方向类 → 逻辑属性
- `components/ComparisonSlider.vue`：方向类 → 逻辑属性 + RTL 滑块镜像
- `components/ImagePreview.vue`：方向类 → 逻辑属性
- `components/UploadZone.vue`：方向类 → 逻辑属性
- `pages/index.vue`：方向类 → 逻辑属性
- `pages/404.vue`、`error.vue`：方向类 → 逻辑属性（少量）

**新增：**
- `i18n/locales/{ja,ko,fr,de,es,ru,pt,ar}.json` × 8
- `public/llms-{ja,ko,fr,de,es,ru,pt,ar}.txt` × 8
- `e2e-runner/verify-i18n-multi.js`：9 语言专项验证
- `scripts/check-translations.js`：翻译完整性校验脚本
- `i18n/TERMINOLOGY.md`：术语表

---

### Task 1: 建立术语表（TERMINOLOGY.md）

**Files:**
- Create: `i18n/TERMINOLOGY.md`

- [ ] **Step 1: 创建术语表文件**

```markdown
# 多语言术语表（TERMINOLOGY）

所有语言翻译必须遵守本表，保证全站术语一致。

## 模型名
| zh | en | ja | ko | fr | de | es | ru | pt | ar |
|---|---|---|---|---|---|---|---|---|---|
| Pro | Pro | Pro | Pro | Pro | Pro | Pro | Pro | Pro | Pro |
| Mini | Mini | Mini | Mini | Mini | Mini | Mini | Mini | Mini | Mini |
| 肖像 | Portrait | ポートレート | 인물 | Portrait | Porträt | Retrato | Портрет | Retrato | صورة شخصية |

## 功能术语
| zh | en | ja | ko | fr | de | es | ru | pt | ar |
|---|---|---|---|---|---|---|---|---|---|
| 运行全部 | Run all | すべて実行 | 모두 실행 | Tout exécuter | Alle ausführen | Ejecutar todo | Запустить все | Executar tudo | تشغيل الكل |
| 对比效果 | Compare | 比較 | 비교 | Comparer | Vergleichen | Comparar | Сравнить | Comparar | مقارنة |
| 推荐 | Recommended | おすすめ | 추천 | Recommandé | Empfohlen | Recomendado | Рекомендуется | Recomendado | موصى به |
| 开始抠图 | Remove Background | 背景を削除 | 배경 제거 | Supprimer l'arrière-plan | Hintergrund entfernen | Quitar fondo | Удалить фон | Remover fundo | إزالة الخلفية |
| 全部完成 | All done | すべて完了 | 모두 완료 | Tout terminé | Alles fertig | Todo listo | Все готово | Tudo pronto | اكتمل الكل |

## 下载后缀（download.suffix，不得含空格/特殊字符）
| zh | en | ja | ko | fr | de | es | ru | pt | ar |
|---|---|---|---|---|---|---|---|---|---|
| 抠图 | bgremoved | 背景透過 | 배경제거 | sans-fond | entfernt | sin-fondo | bez-fona | sem-fundo | بدون-خلفية |

## 固定项
- 品牌名 "AI BG Remover" 在所有语言保持原名，不翻译
- 技术名 "ONNX Runtime Web" / "WebGPU" / "WebAssembly SIMD" 不翻译
- 模型架构名 "BRIA RMBG v1.4" / "MODNet" / "U²-Net" 不翻译
```

- [ ] **Step 2: 提交**

```bash
git add i18n/TERMINOLOGY.md
git commit -m "docs: add multilingual terminology table"
```

---

### Task 2: 编写翻译完整性校验脚本

**Files:**
- Create: `scripts/check-translations.js`

- [ ] **Step 1: 创建校验脚本**

```js
// 翻译完整性校验：所有语言必须与 zh.json 结构完全一致
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'i18n', 'locales');
const zhPath = path.join(LOCALES_DIR, 'zh.json');
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));

// 递归展开为 flat key -> 类型标记
function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      out[key] = `ARRAY(${v.length})`;
    } else if (typeof v === 'object' && v !== null) {
      flatten(v, key, out);
    } else {
      out[key] = 'STRING';
    }
  }
  return out;
}

const zhFlat = flatten(zh);
const zhKeys = Object.keys(zhFlat);

let failed = false;

// 检查所有语言文件
const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
for (const file of files) {
  const code = file.replace('.json', '');
  const lang = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8'));
  const flat = flatten(lang);
  const keys = Object.keys(flat);

  const missing = zhKeys.filter(k => !keys.includes(k));
  const extra = keys.filter(k => !zhKeys.includes(k));
  const typeMismatch = zhKeys.filter(k => keys.includes(k) && flat[k] !== zhFlat[k]);

  const issues = [];
  if (missing.length) issues.push(`缺少 key: ${missing.join(', ')}`);
  if (extra.length) issues.push(`多余 key: ${extra.join(', ')}`);
  if (typeMismatch.length) issues.push(`结构不一致: ${typeMismatch.join(', ')}`);

  // 检查占位符括号是否匹配（{count} 等）
  const placeholderIssues = [];
  for (const k of keys) {
    if (flat[k] === 'STRING') {
      const val = getValue(lang, k);
      const opens = (val.match(/\{/g) || []).length;
      const closes = (val.match(/\}/g) || []).length;
      if (opens !== closes) placeholderIssues.push(`${k} 占位符括号不匹配: ${val}`);
      // 检查占位符在 zh 中存在但翻译中缺失
      const zhVal = getValue(zh, k);
      const zhPh = (zhVal.match(/\{(\w+)\}/g) || []).map(x => x.replace(/[{}]/g, ''));
      const enPh = (val.match(/\{(\w+)\}/g) || []).map(x => x.replace(/[{}]/g, ''));
      const lostPh = zhPh.filter(p => !enPh.includes(p));
      if (lostPh.length) placeholderIssues.push(`${k} 丢失占位符 {${lostPh.join(', ')}}: ${val}`);
    }
  }

  const status = issues.length === 0 && placeholderIssues.length === 0 ? 'OK' : 'FAIL';
  if (status === 'FAIL') failed = true;
  console.log(`${status} | ${code} | ${keys.length}/${zhKeys.length} keys`);
  issues.forEach(i => console.log(`   ✗ ${i}`));
  placeholderIssues.forEach(i => console.log(`   ✗ ${i}`));
}

function getValue(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: 运行校验（当前应 2 语言全 OK）**

Run: `node scripts/check-translations.js`
Expected: `OK | zh | 226/226 keys` 与 `OK | en | 226/226 keys`

- [ ] **Step 3: 提交**

```bash
git add scripts/check-translations.js
git commit -m "test: add translation completeness checker"
```

---

### Task 3: 生成 8 个语言翻译文件（ja/ko/fr/de/es/ru/pt/ar）

**Files:**
- Create: `i18n/locales/ja.json`
- Create: `i18n/locales/ko.json`
- Create: `i18n/locales/fr.json`
- Create: `i18n/locales/de.json`
- Create: `i18n/locales/es.json`
- Create: `i18n/locales/ru.json`
- Create: `i18n/locales/pt.json`
- Create: `i18n/locales/ar.json`

**注意：** 本任务工作量最大（8 语言 × 226 key）。**建议每个语言拆分为单独子任务执行**，或至少按"基础 UI 区块（header/hero/tool/models/download/preview/upload/compare/error/bg/loader）→ 内容区块（section/howTo/faq/seo）"分批。以 `en.json` 为翻译底稿（结构权威），以 `zh.json` 为语义对照。

- [ ] **Step 1: 生成 ja.json**

以 en.json 为底稿翻译成日语，遵循术语表 Task 1。关键点：
- `seo.keywords` 用日语搜索词（如 `背景 透過, 画像 背景 削除, AI 背景除去, 無料 写真 背景 消す`），非直译
- `seo.title` / `ogTitle` / `twitterTitle` 本地化 SEO 标题，含"背景除去"核心词
- `faq.*`、`howTo*` 完整日语翻译
- `models.modnet.name` = ポートレート，`download.suffix` = 背景透過
- 数组值保持数组（`models.tags.*`、`faq.items`、`section.modelCompare.card*Items`）

- [ ] **Step 2: 生成 ko.json（韩语）**

同 Step 1 模式。`models.modnet.name` = 인물，`download.suffix` = 배경제거，`seo.keywords` 用韩语搜索词（`배경 제거, 이미지 배경 지우기, AI 누끼따기`）。

- [ ] **Step 3: 生成 fr.json（法语）**

`models.modnet.name` = Portrait，`download.suffix` = sans-fond，`seo.keywords` 用法语搜索词（`supprimer fond image, détourer image en ligne, suppression arrière-plan IA`）。注意法语文本普遍较长，遵守 §9 风险对策。

- [ ] **Step 4: 生成 de.json（德语）**

`download.suffix` = entfernt，`seo.keywords` 用德语搜索词（`hintergrund entfernen, bild freistellen online, KI hintergrund entfernen`）。德语复合词多，标题可能长。

- [ ] **Step 5: 生成 es.json（西班牙语）**

`models.modnet.name` = Retrato，`download.suffix` = sin-fondo，`seo.keywords` 用西语搜索词（`quitar fondo de imagen, eliminar fondo foto online, recortar imagen fondo`）。

- [ ] **Step 6: 生成 ru.json（俄语）**

`models.modnet.name` = Портрет，`download.suffix` = bez-fona，`seo.keywords` 用俄语搜索词（`удалить фон с фото, вырезать фон изображения онлайн, ИИ удаление фона`）。注意西里尔字符与 `~`、`→` 等符号共存。

- [ ] **Step 7: 生成 pt.json（葡萄牙语）**

`models.modnet.name` = Retrato，`download.suffix` = sem-fundo，`seo.keywords` 用葡语搜索词（`remover fundo de imagem, tirar fundo de foto online, IA cortar fundo`）。

- [ ] **Step 8: 生成 ar.json（阿拉伯语）**

`models.modnet.name` = صورة شخصية，`download.suffix` = بدون-خلفية，`seo.keywords` 用阿拉伯语搜索词（`إزالة خلفية الصورة, قص خلفية الصورة اون لاين, ذكاء اصطناعي حذف الخلفية`）。**注意 RTL 语言中数字/百分比（`{count}`、`{percent}%`）由 vue-i18n 处理，翻译文本保持占位符完整。**

- [ ] **Step 9: 运行校验脚本验证全部语言结构一致**

Run: `node scripts/check-translations.js`
Expected: 全部 10 个语言（含 zh/en）均输出 `OK`

- [ ] **Step 10: 提交（建议每语言一个 commit，或至少一批）**

```bash
git add i18n/locales/
git commit -m "feat(i18n): add ja/ko/fr/de/es/ru/pt/ar translation files"
```

---

### Task 4: nuxt.config.ts 注册 8 语言 + prerender

**Files:**
- Modify: `nuxt.config.ts`

- [ ] **Step 1: 扩展 locales 数组**

将 `i18n.locales`（第 38-41 行）替换为：

```ts
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
```

- [ ] **Step 2: 扩展 routeRules prerender**

将 `routeRules`（第 18-25 行）替换为：

```ts
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
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功，输出 `.output/public`，包含 `/ja/index.html`、`/ar/index.html` 等 9 语言首页与 404 页。

- [ ] **Step 4: 验证 ar 页 html dir**

Run: `node -e "const fs=require('fs');const html=fs.readFileSync('.output/public/ar/index.html','utf8');console.log(html.match(/<html[^>]*>/)[0])"`
Expected: 包含 `dir="rtl"` 与 `lang="ar-SA"`。同时抽查 `lang="ja-JP"`（/ja）。

- [ ] **Step 5: 提交**

```bash
git add nuxt.config.ts
git commit -m "feat(i18n): register 9 locales with RTL for Arabic and prerender routes"
```

---

### Task 5: RTL 逻辑属性类改造（组件方向类）

**Files:**
- Modify: `components/ModelSelector.vue`
- Modify: `components/FaqSection.vue`
- Modify: `components/ComparisonSlider.vue`
- Modify: `components/ImagePreview.vue`
- Modify: `components/UploadZone.vue`
- Modify: `pages/index.vue`
- Modify: `pages/404.vue`（核对后预计无方向类改动）
- Modify: `error.vue`（核对后预计无方向类改动）

**原则：** 方向类（margin/padding/text-align/inset/border-radius 的左右变体）替换为逻辑属性类。**唯一例外** ComparisonSlider 的滑块几何（见下）。

- [ ] **Step 1: ModelSelector.vue 方向类替换**

- 第 23 行：`text-xs ml-1.5` → `text-xs ms-1.5`
- 第 45 行：`left-0 sm:left-auto sm:right-0` → `start-0 sm:start-auto sm:end-0`
- 第 54、108 行：`text-left` → `text-start`
- 第 86、126 行：`pl-6` → `ps-6`
- 第 87 行：`pl-6 mt-1.5` → `ps-6 mt-1.5`

- [ ] **Step 2: FaqSection.vue 方向类替换**

- 第 16 行：`text-left` → `text-start`
- 第 18 行：`pr-4` → `pe-4`

- [ ] **Step 3: ImagePreview.vue 方向类替换**

- 第 66 行：`left-0 right-0` → `start-0 end-0`
- 第 101 行：`top-2 right-2` → `top-2 end-2`
- 第 131 行：`top-2 left-2` → `top-2 start-2`

- [ ] **Step 4: UploadZone.vue 方向类替换**

- 第 52 行：`ml-1` → `ms-1`
- 第 80 行：`-top-1.5 -right-1.5` → `-top-1.5 -end-1.5`

- [ ] **Step 5: pages/index.vue 方向类替换**

- 第 66 行：`ml-1` → `ms-1`
- 第 75 行：`pr-1` → `pe-1`

- [ ] **Step 6: pages/404.vue + error.vue 方向类替换**

- 404.vue 第 24 行与 error.vue 第 29 行：`M10 19l-7-7...` 是箭头图标 path，无需改（图标方向在 RTL 下语义上仍是"返回"）。检查两文件无其它左右方向类。
- 确认：这两个文件除箭头 SVG 外无 `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` 类，**无需修改**（跳过）。

- [ ] **Step 7: ComparisonSlider.vue RTL 特殊处理**

该组件是唯一需要**几何镜像**的组件（滑块位置基于 `left` 计算，不是简单的方向类替换）：

1. 第 25 行裁切：`:style="{ clipPath: \`inset(0 ${100 - sliderPosition}% 0 0)\` }"` → RTL 下需反向。改为逻辑值 `clip-path: inset(0 calc(100% - ${sliderPosition}%) 0 0)`，并通过 `dir` 判断：

```vue
    <div
      class="absolute inset-0 overflow-hidden"
      :style="{ clipPath: isRtl ? `inset(0 0 0 ${sliderPosition}%)` : `inset(0 ${100 - sliderPosition}% 0 0)` }"
    >
```

2. 第 38 行分割线：`:style="{ left: \`calc(${sliderPosition}% - 1px)\` }"` → RTL 用 `right`：

```vue
    <div
      class="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
      :style="{ [isRtl ? 'right' : 'left']: `calc(${sliderPosition}% - 1px)` }"
    >
```

3. 第 60 行"after"标签：`:style="{ left: \`calc(${sliderPosition}% - 20px)\` }"` → 同样条件化：

```vue
      :style="{ [isRtl ? 'right' : 'left']: `calc(${sliderPosition}% - 20px)` }"
```

4. 第 55 行 "before" 标签：`bottom-3 left-3` → `bottom-3 start-3`
5. 脚本加 `isRtl`：

```ts
const { locale } = useI18n()
const isRtl = computed(() => locale.value === 'ar')
```

6. `updatePosition`（第 112-113 行）在 RTL 下需反向计算：

```ts
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
  sliderPosition.value = isRtl.value
    ? (1 - x / rect.width) * 100
    : (x / rect.width) * 100
```

- [ ] **Step 8: 构建验证 + 人工检查**

Run: `npm run build`
Expected: 构建成功。打开 `.output/public/ar/index.html` 确认无横向溢出（可运行 e2e 验证 Task 8）。

- [ ] **Step 9: 提交**

```bash
git add components/ pages/
git commit -m "fix(rtl): replace directional classes with logical properties, mirror slider for RTL"
```

---

### Task 6: AppHeader 语言切换器改 9 语言下拉

**Files:**
- Modify: `components/AppHeader.vue`

- [ ] **Step 1: 替换语言切换器区块**

将第 21-41 行（两按钮）替换为下拉菜单：

```vue
          <!-- 语言切换器（9 语言下拉） -->
          <div class="relative" ref="langRef">
            <button
              @click="langOpen = !langOpen"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs transition-colors text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
            >
              <GlobeIcon />
              <span class="hidden sm:inline">{{ currentLangName }}</span>
              <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': langOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            <Transition name="dropdown">
              <div
                v-if="langOpen"
                class="absolute z-50 mt-2 end-0 w-48 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1"
              >
                <NuxtLink
                  v-for="l in localeOptions"
                  :key="l.code"
                  :to="switchLocalePath(l.code)"
                  class="w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors"
                  :class="locale === l.code
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'"
                >
                  <span>{{ l.name }}</span>
                  <span v-if="l.dir === 'rtl'" class="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400" title="RTL">⬅</span>
                </NuxtLink>
              </div>
            </Transition>
          </div>
```

- [ ] **Step 2: 更新 script setup**

在 `<script setup>` 中补充：

```ts
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

// 语言选项（本地名展示；`locales.value` 来自 i18n，含全部 10 个语言）
const localeOptions = computed(() => (locales.value as { code: string; name: string; dir?: string }[]))
const currentLangName = computed(() => {
  const cur = localeOptions.value.find(l => l.code === locale.value)
  return cur?.name || '中文'
})

// 下拉开关与外部点击关闭
const langOpen = ref(false)
const langRef = ref<HTMLElement | null>(null)
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (langRef.value && !langRef.value.contains(e.target as Node)) {
      langOpen.value = false
    }
  })
})

// 简单地球图标
const GlobeIcon = () => h('svg', { class: 'w-3.5 h-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('circle', { cx: 12, cy: 12, r: 10 }),
  h('line', { x1: 2, y1: 12, x2: 22, y2: 12 }),
  h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }),
])
```

注意：原代码中 `locale` 从 `useI18n()` 已解构（第 67 行），`switchLocalePath`/`localePath` 已存在（第 68-69 行）。合并时避免重复声明。**下拉列表展示全部 10 个语言**（含"中文"），通过 `switchLocalePath('zh')` 可切回默认首页。`localeOptions` 定义如下：

```ts
// 语言选项（全部 10 个，含默认中文；本地名展示）
const localeOptions = computed(() => (locales.value as { code: string; name: string; dir?: string }[]))
```

- [ ] **Step 3: 添加 dropdown 过渡样式**

在 `<style scoped>` 中追加（与 ModelSelector 一致）：

```css
.dropdown-enter-active { transition: all 0.2s ease-out; }
.dropdown-leave-active { transition: all 0.15s ease-in; }
.dropdown-enter-from { opacity: 0; transform: translateY(-8px) scale(0.98); }
.dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(0.98); }
```

- [ ] **Step 4: 构建 + 手动验证切换器**

Run: `npm run build`
Expected: 构建成功。本地服务起后打开首页，点击语言按钮出现 10 个语言选项，点击 `/ja` 跳转，URL 前缀正确，RTL 标记出现在 العربية 旁。

- [ ] **Step 5: 提交**

```bash
git add components/AppHeader.vue
git commit -m "feat(header): replace 2-button language switcher with 9-language dropdown"
```

---

### Task 7: 生成 8 个 llms-{code}.txt

**Files:**
- Create: `public/llms-ja.txt`
- Create: `public/llms-ko.txt`
- Create: `public/llms-fr.txt`
- Create: `public/llms-de.txt`
- Create: `public/llms-es.txt`
- Create: `public/llms-ru.txt`
- Create: `public/llms-pt.txt`
- Create: `public/llms-ar.txt`

- [ ] **Step 1: 以 llms-en.txt 为模板，逐语言生成**

每文件结构：Brand / Core Capabilities / Tech Stack / Pages（该语言 URL）/ Key Facts / Alternate Languages（列出全部 9 语言 llms 链接）。标题与正文用对应语言撰写。`llms-ar.txt` 注意 RTL 文本与英文技术名混排。

示例 `llms-ja.txt`：

```text
# AI BG Remover - サイト概要
> 無料のオンラインAI背景除去ツール。すべての処理はブラウザ内で完結します。

## ブランド
- 名称: AI BG Remover
- 説明: 画像の背景を無料で除去できるオンラインAIツール。複数画像の一括処理と高品質PNGダウンロードに対応。処理はすべてブラウザ内で行われ、画像がサーバーにアップロードされることはありません。
- 言語: 日本語 (ja-JP)

## 主な機能
- 画像の背景を自動除去
- 複数画像の一括処理
- JPG/PNG/WEBP/AVIF/GIF/SVG 対応
- 複数のAIモデル (BRIA RMBG/MODNet/U²-Net)
- ブラウザ内で処理、アップロード不要

## 技術スタック
- AIエンジン: ONNX Runtime Web
- 高速化: WebGPU, WebAssembly SIMD
- モデル: BRIA RMBG v1.4, MODNet, U²-Net

## ページ
- ホーム: https://ai-bg-remover.vercel.app/ja

## 主な事実
- すべての処理はブラウザ内で完結。画像が端末から送信されることはありません
- 一括処理対応、枚数・サイズ制限なし
- 完全無料、登録・ログイン不要
- 初回利用時はAIモデルをダウンロード (約42MB)。2回目以降はIndexedDBキャッシュにより即時

## 他言語
- 中文: https://ai-bg-remover.vercel.app/llms.txt
- English: https://ai-bg-remover.vercel.app/llms-en.txt
- (其余 7 语言链接同上模式)
```

- [ ] **Step 2: 提交**

```bash
git add public/llms-*.txt
git commit -m "feat(geo): add per-language llms.txt for 8 new locales"
```

---

### Task 8: 9 语言专项验证测试（verify-i18n-multi.js）

**Files:**
- Create: `e2e-runner/verify-i18n-multi.js`

- [ ] **Step 1: 编写验证脚本**

```js
// 9 语言专项验证：SEO 头 / html lang+dir / 切换器 / 404 / llms / RTL 布局
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';
const LOCALES = [
  { code: 'en', lang: 'en-US', dir: null, titleKw: 'Background Remover' },
  { code: 'ja', lang: 'ja-JP', dir: null, titleKw: '背景' },
  { code: 'ko', lang: 'ko-KR', dir: null, titleKw: '배경' },
  { code: 'fr', lang: 'fr-FR', dir: null, titleKw: 'arrière-plan' },
  { code: 'de', lang: 'de-DE', dir: null, titleKw: 'Hintergrund' },
  { code: 'es', lang: 'es-ES', dir: null, titleKw: 'fondo' },
  { code: 'ru', lang: 'ru-RU', dir: null, titleKw: 'фон' },
  { code: 'pt', lang: 'pt-PT', dir: null, titleKw: 'fundo' },
  { code: 'ar', lang: 'ar-SA', dir: 'rtl', titleKw: 'خلفية' },
];

const results = [];
function report(name, pass, detail) { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} | ${name} | ${detail}`); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const l of LOCALES) {
    const path = l.code === 'en' ? '/en' : `/${l.code}`;
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // 1. html lang / dir
    const html = await page.evaluate(() => {
      const el = document.documentElement;
      return { lang: el.lang, dir: el.getAttribute('dir') };
    });
    report(`${l.code} html lang`, html.lang === l.lang, `lang=${html.lang}`);
    report(`${l.code} html dir`, (l.dir ? html.dir === 'rtl' : html.dir === null), `dir=${html.dir || '(none)'}`);

    // 2. title 含本语言关键词
    const title = await page.title();
    report(`${l.code} title 本地化`, title.includes(l.titleKw), `title="${title.slice(0, 60)}..."`);

    // 3. hreflang 存在（alternate 链接）
    const hreflangs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(l => l.getAttribute('hreflang'))
    );
    report(`${l.code} hreflang 齐全`, hreflangs.length >= 9, `hreflang=${hreflangs.length}个`);

    // 4. H1 渲染（非空、非 key 名）
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    report(`${l.code} H1 渲染`, h1.length > 5 && !h1.includes('seo.title'), `H1="${h1.slice(0, 50)}..."`);

    // 5. ar 布局检查：body 应无横向溢出
    if (l.code === 'ar') {
      const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
      report('ar 无横向溢出', !overflow, `scrollWidth=${overflow ? '溢出' : '正常'}`);
    }

    // 6. 语言切换器：当前语言高亮 + 选项数量
    // 定位：语言按钮是 header 内第一个含 Globe 图标的 button（圆角 border 容器内的第一个 button）
    const langBtn = page.locator('header div.relative button').first();
    await langBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const langItems = await page.locator('header a', { hasText: /中文|English|日本語|한국어|Français|Deutsch|Español|Русский|Português|العربية/ }).count();
    report(`${l.code} 切换器选项数`, langItems >= 9, `选项=${langItems}`);
    // 关闭下拉（点 body 空白处）
    await page.mouse.click(5, 5);
    await page.waitForTimeout(200);
  }

  // 7. 各语言 404 页
  for (const l of LOCALES) {
    const path = l.code === 'en' ? '/en' : `/${l.code}`;
    await page.goto(BASE + path + '/404', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const text = await page.evaluate(() => document.body.innerText);
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    report(`${l.code} 404 页渲染`, h1.length > 0 && !h1.includes('error.pageTitle'), `H1="${h1.slice(0, 40)}"`);
  }

  // 8. llms 文件可访问
  for (const l of LOCALES) {
    const resp = await page.request.get(`${BASE}/llms-${l.code}.txt`).catch(() => null);
    report(`${l.code} llms 文件`, resp && resp.status() === 200, `status=${resp ? resp.status() : 'FAIL'}`);
  }

  console.log('\n========== 汇总 ==========');
  const passCount = results.filter(r => r.pass).length;
  results.filter(r => !r.pass).forEach(f => console.log(`  ✗ ${f.name} | ${f.detail}`));
  console.log(`通过: ${passCount}/${results.length}`);
  await browser.close();
  process.exit(results.filter(r => !r.pass).length ? 1 : 0);
})().catch(e => { console.error('脚本异常:', e); process.exit(1); });
```

- [ ] **Step 2: 启动静态服务并运行**

Run: `npx serve .output/public -l 3000`（若未运行）
Run: `node verify-i18n-multi.js`
Expected: 全部 PASS（约 9 语言 × 6 项 + 404 + llms ≈ 60+ 项）。

- [ ] **Step 3: 提交**

```bash
git add e2e-runner/verify-i18n-multi.js
git commit -m "test: add 9-locale SEO/RTL verification script"
```

---

### Task 9: 全量回归 + 抽样验收

**Files:**
- Run: 既有测试套件

- [x] **Step 1: 跑既有核心回归（确认零破坏）**

Run: `node verify-run-all-cached.js`（9/9 期望）→ **9/9 ✅**
Run: `node full-check.js`（36/36 期望）→ **36/36 ✅**
Run: `node verify-i18n.js`（35/35 期望，zh/en 不受影响）→ **35/35 ✅**
Run: `node verify-gaps.js`（13/13 期望）→ **13/13 ✅**（修复：Step 7 清除缓存按钮改独立 context + `route('**/*.onnx')` 延迟 4s 制造稳定加载窗口，原 1s 文本轮询因缓存命中加载过短而漏检）
Run: `node run-e2e.js` → **5/5 ✅**、`node verify-removal.js`/`verify-removal2.js` → ✅、`node verify-all-models.js` → ✅、`node verify-error-paths.js` → **9/9 ✅**、`node test-ep.js` → ✅

- [x] **Step 2: 跑新增多语言专项验证**

Run: `node verify-i18n-multi.js`
Expected: 全部 PASS → **73/73 ✅**

- [x] **Step 3: 运行翻译校验**

Run: `node scripts/check-translations.js`
Expected: 10 语言全 OK → **10/10 OK ✅**

- [ ] **Step 4: 人工抽查（用户参与）**

每语言抽查 5-10 处关键文案：title、hero.sub1、tool.start、faq 首题、models.modnet.name。用户可修改 JSON 后重跑 Step 3 与 Task 8。

- [x] **Step 5: 最终构建确认**

Run: `npm run build` → **构建成功，65 routes 预渲染**，10 个语言专属 sitemap（zh-CN/en-US/ja-JP/ko-KR/fr-FR/de-DE/es-ES/ru-RU/pt-PT/ar-SA）生成，`.output/public` 含全部 9 语言页面。ar 页 `dir="rtl"` 已在 Task 8 验证。

- [ ] **Step 6: 提交（如抽查后有修改）**

```bash
git add -A
git commit -m "fix(i18n): apply user review feedback on translations"
```

---

## 自审清单对照

| 规格要求 | 对应任务 |
|---|---|
| 8 新语言 JSON（226 key 全量对齐） | Task 3 + Task 2 校验 |
| nuxt.config locales + prerender | Task 4 |
| RTL 触发（ar dir=rtl） | Task 4 Step 1（locales dir 属性）+ app.vue 已就位 |
| RTL 逻辑属性改造 | Task 5 |
| 滑块 RTL 镜像 | Task 5 Step 7 |
| 9 语言切换器下拉 | Task 6 |
| 每语言 SEO 关键词本地化 | Task 3（seo.keywords/title 逐语言优化）|
| llms-{code}.txt × 8 | Task 7 |
| hreflang 自动生成 | 既有 useLocaleHead（Task 8 验证）|
| 下载后缀/模型名本地化 | Task 3（download.suffix、models.*.name）|
| 术语表 | Task 1 |
| 自动校验脚本 | Task 2 |
| 专项验证 + 回归 | Task 8 + Task 9 |
