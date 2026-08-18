# AI 抠图工具

免费在线 AI 抠图工具，批量去除图片背景，支持高清 PNG 下载。
**所有处理完全在浏览器本地运行**，图片不上传服务器，保护隐私。

## 技术栈

- **前端**: Vue 3 + Nuxt 3 + Tailwind CSS
- **AI 引擎**: ONNX Runtime Web
- **模型**: BRIA RMBG v1.4 / MODNet / U²-Net
- **加速**: WebGPU / WebAssembly SIMD
- **缓存**: IndexedDB 模型缓存
- **部署**: 纯静态 (Vercel / Netlify / GitHub Pages)

## 特性

- ✨ 完全免费，无使用限制
- 🔐 浏览器本地处理，不上传任何图片
- 🚀 支持 WebGPU 加速（比原站的纯 WASM 更快）
- 📦 IndexedDB 缓存模型，二次加载无需等待
- 🖼️ 拖拽/粘贴/文件夹导入
- 📥 批量处理 + 全部下载
- 🔄 前后对比滑块预览

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建静态文件
npm run generate

# 预览构建结果
npx serve .output/public
```

## 模型配置

默认从 HuggingFace CDN 加载模型。如需自托管：

1. 下载模型到 `public/models/` 目录：
```bash
bash scripts/download-models.sh
```

2. 修改 `nuxt.config.ts` 中的 `modelBaseUrl`:
```ts
runtimeConfig: {
  public: {
    modelBaseUrl: '/models/'
  }
}
```

## 部署

### Vercel

```bash
npm i -g vercel
vercel
```

### Netlify

连接 Git 仓库，设置：
- Build command: `npm run generate`
- Publish directory: `.output/public`

## 架构

```
                    Browser
                ┌─────────────┐
                │  Vue 3 UI   │
                ├─────────────┤
                │ ONNX Runtime│
                │   Web (WASM)│
                ├─────────────┤
                │   Model     │
                │ (IndexedDB) │
                └─────────────┘
                     │
                ┌────┴────┐
                │ CDN/    │
                │ Self    │
                │ Hosted  │
                └─────────┘
```

## License

MIT
