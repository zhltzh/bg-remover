# 多语言扩展设计：9 语言单域名版本

> 日期：2026-08-01
> 项目：AI 背景去除工具（D:\建个APP\bg-remover）
> 状态：已确认设计，待实施

## 1. 背景与目标

当前站点已完成中英双语（`prefix_except_default` 策略，`zh` 无前缀默认，`/en` 前缀）。
目标：扩展到 **9 种语言**（新增 8 种），全部置于同一域名 `https://ai-bg-remover.vercel.app` 下，
并以 **SEO/GEO 最大化**为原则逐语言本地化，而非简单直译。

新增语言：日语（ja）、韩语（ko）、法语（fr）、德语（de）、西班牙语（es）、俄语（ru）、葡萄牙语（pt）、阿拉伯语（ar，需完整 RTL）。

## 2. 架构总览

### 2.1 URL 结构

```
https://ai-bg-remover.vercel.app
├── /        (zh 中文，默认，无前缀)
├── /en      (英语)      ← 已完成
├── /ja      (日本語)
├── /ko      (한국어)
├── /fr      (Français)
├── /de      (Deutsch)
├── /es      (Español)
├── /ru      (Русский)
├── /pt      (Português)
└── /ar      (العربية)  ← RTL，dir="rtl"
```

### 2.2 核心机制

- **配置**：`nuxt.config.ts` → `i18n.locales` 注册 9 语言；`routeRules` 对每个前缀 `prerender` `/` 与 `/404`
- **翻译文件**：每语言一个 `i18n/locales/{code}.json`（226 key 全量对齐，含数组值 key 7 个）
- **方向**：`app.vue` 按 locale 设置 `<html dir>`（`ar` → `rtl`，其余 → `ltr`）
- **SEO**：`useLocaleHead` 自动生成每语言 hreflang / canonical / og:locale（en 已验证生效）
- **组件**：全部组件零结构改动，翻译走既有 `$t` / `tm`（已就位）
- **语言切换器**：改 9 语言下拉菜单

## 3. 语言切换器设计

当前 `AppHeader.vue` 为「中文/EN」两按钮，改为**下拉菜单**：

- 选项用各语言**本地名**展示：中文 / English / 日本語 / 한국어 / Français / Deutsch / Español / Русский / Português / العربية
- 阿拉伯语选项旁加方向标记（如 ⬅ 或 "RTL" 徽标）
- 使用既有 `useSwitchLocalePath` 切换，切换后保持当前页面路径（`/es/...` → `/fr/...`）
- 桌面与移动端统一为下拉交互

## 4. RTL 布局适配（阿拉伯语）

### 4.1 方案：逻辑属性类改造

将组件中的**物理方向类**替换为 Tailwind v4 **逻辑属性类**，RTL 下自动镜像，LTR 行为不变：

| 现状（物理） | 改造后（逻辑） |
|---|---|
| `ml-*` / `mr-*` | `ms-*` / `me-*` |
| `pl-*` / `pr-*` | `ps-*` / `pe-*` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `left-0` / `right-0` | `start-0` / `end-0` |
| `border-l-*` / `border-r-*` | `border-s-*` / `border-e-*` |
| `rounded-l-*` / `rounded-r-*` | `rounded-s-*` / `rounded-e-*` |
| `space-x-*` | 无需改（v4 已用 `margin-inline-start`，自动镜像） |

### 4.2 影响面（已实测盘点）

自家组件约 15-20 处方向类，涉及：
- `ModelSelector.vue`：`ml-1.5`、`pl-6`、`left-0 sm:left-auto sm:right-0`、`text-left`
- `FaqSection.vue`：`text-left`、`pr-4`
- `pages/index.vue`：`ml-1`、`pr-1`
- `ComparisonSlider.vue`：`left-3`、`-translate-x-1/2`（**特例**：滑块手柄需在 RTL 下镜像偏移，用 `rtl:` 变体微调 2-3 处）
- `ImagePreview.vue`：`left-2`、`left-0 right-0`、`text-center`
- `UploadZone.vue`：`ml-1`

### 4.3 字体

阿拉伯语补充字体栈（Tailwind 默认 sans 已含系统阿拉伯字体；如需统一视觉可评估 Google Fonts 引入，列入可选项）。

## 5. SEO / GEO 本地化策略

### 5.1 每语言独立关键词（非直译）

以 en 已有做法为模板，8 种语言各自调研/优化本语种真实搜索词：

- **title**：本地化 SEO 标题（例：`"AI背景去除 - 在线免费抠图工具"` → ja `"AI背景除去 - 画像の背景を無料で消す"`、fr `"Suppression d'arrière-plan IA - Gratuit en ligne"`）
- **keywords / description**：按目标语种自然语言组织
- **JSON-LD**（WebApplication + FAQPage）：全量本地化，question/answer 逐语言翻译

### 5.2 GEO（生成式引擎优化）

- 每语言 `llms-{code}.txt`（已做 zh+en，扩展到 9 语言）
- 保持结构化内容层级（HowItWorks 步骤、模型对比表格、FAQ）——已设计为结构化，跨语言自动保留语义
- `<html lang>` 与 `dir` 正确设置，辅助 LLM 按语言路由内容

### 5.3 站点地图与 hreflang

- `@nuxtjs/sitemap` 自动为所有 locale 前缀生成 URL
- 每页 `x-default` hreflang 回指 zh
- 每语言 `alternate` 链接自动由 `useLocaleHead` 生成

### 5.4 模型名与下载文件名本地化

| 字段 | zh | en | ja（示例） | fr（示例） |
|---|---|---|---|---|
| 模型名 肖像 | 肖像 | Portrait | ポートレート | Portrait |
| 下载后缀 | `_抠图` | `_bgremoved` | `_背景透過` | `_fond_transparent` |

实现：`i18n/locales/{code}.json` 中 `models.*.name` 与 `download.suffix` 按语言配置；`useImageProcessor.ts` 已通过 `t('download.suffix')` 读取，零改动。

## 6. 翻译质量保障

### 6.1 术语表（每语言固定）

术语表以 zh 原文为准，各语言统一译法：

| 术语（zh 原文） | en 现状 | 处理原则 |
|---|---|---|
| Pro / Mini / 肖像（模型名） | Pro / Mini / Portrait | 各语言统一译法，写入术语表，全站一致 |
| 运行全部 | Run all | 每语言固定译法 |
| 对比效果 / 推荐 | Compare / Recommended | 每语言固定译法 |
| 品牌/产品名 AI BG Remover | AI BG Remover | 保持原名，不本地化 |
| `download.suffix` | `bgremoved`（zh=`抠图`） | 每语言固定，不含空格/特殊字符 |
| 技术术语（ONNX/WebGPU/背景去除） | 保留 | 术语表统一，不使用口语化变体 |
| 品牌/产品名 AI BG Remover | 保持原名或本地化商标，术语表固定 |
| `download.suffix` | 每语言固定，避免出现空格或特殊字符 |
| 技术术语（ONNX/WebGPU/背景去除） | 术语表统一，不使用口语化变体 |

### 6.2 自动校验（翻译后脚本校验）

- key 数量对等：与 zh.json 完全一致（226 个）
- 无缺漏：无 missing key
- 无残留：无未翻译占位符、无 `{...}` 括号不匹配、无中文字符误入非 CJK 语言
- 数组值 key（`models.tags.*`、`faq.items`、`section.modelCompare.card*Items`）结构一致

### 6.3 人工抽查

每语言抽查 5-10 处关键文案（title / hero / FAQ 首题 / 按钮文案）由用户过目；用户可直接改 JSON 后重跑验证。

## 7. 实施范围

### 7.1 新增文件

- `i18n/locales/{ja,ko,fr,de,es,ru,pt,ar}.json` × 8（226 key 全量对齐）
- `public/llms-{ja,ko,fr,de,es,ru,pt,ar}.txt` × 8（既有 `llms.txt`=zh、`llms-en.txt`=en 保持不动）
- `docs/superpowers/specs/2026-08-01-multilingual-9-locales-design.md`（本文档）

### 7.2 修改文件

- `nuxt.config.ts`：locales 注册 8 语言；routeRules 追加 8 语言 × 2 条 prerender
- `app.vue`：按 locale 设置 `<html dir>`（ar→rtl）
- `components/AppHeader.vue`：语言切换器改 9 语言下拉
- 各组件方向类改造（§4.2 清单）：`ModelSelector` / `FaqSection` / `ComparisonSlider` / `ImagePreview` / `UploadZone` / `pages/index.vue`
- 如需统一阿拉伯字体：`assets/css/main.css` 或 nuxt 配置（可选项）

### 7.3 测试

- 构建成功：`npm run build`（prerender 路由：9 语言 × `/`+`/404` = 18 条主路由，较当前 4 条显著增加）
- 9 语言各验证：`/`、`/404` prerender 输出、`<html lang>` / `dir` 正确
- 阿拉伯语 `/ar`：`dir="rtl"`、布局镜像生效、滑块手柄可拖动
- 语言切换器：9 语言下拉、切换后 URL 正确、RTL 标记显示
- hreflang：每语言页面 `alternate` 齐全、`x-default` 存在
- 下载文件名：各语言后缀正确（如 `test_背景透過.png`）
- 回归：`e2e-runner/verify-i18n.js` 及既有 zh/en 测试全绿
- 翻译校验脚本：8 新语言 key 完整性全部通过

## 8. 明确不做（YAGNI）

- 不做子域名 / 独立域名方案
- 不做翻译管理平台（Crowdin/Lokalise）集成
- 不做按地区（country）细分，仅按语言
- 阿拉伯语不做自定义字体引入（除非视觉验收需要）
- 不做 `llms.txt` 之外的多语言 AI 训练页

## 9. 风险与对策

| 风险 | 对策 |
|---|---|
| 翻译量大（~2000 字符串）导致遗漏 | 术语表 + 自动 key 校验 + 抽查 |
| RTL 布局细节遗漏 | 逻辑属性类系统化替换 + ar 专项测试 |
| 长文本（德/俄）导致布局溢出 | 布局以 flex-wrap 为主，验收时抽查长语言视口 |
| `space-x` 镜像异常 | v4 已自动处理，专项验证 |
| SEO 关键词非目标语习惯 | 逐语言调研优化，非直译 |
