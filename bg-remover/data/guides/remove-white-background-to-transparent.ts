import type { Guide } from './types'

export const removeWhiteBackground: Guide = {
  slug: 'remove-white-background-to-transparent',
  datePublished: '2026-11-23',
  dateModified: '2026-11-23',
  related: ['save-transparent-png', 'ecommerce-product-batch-cutout', 'avatar-background-removal'],
  zh: {
    title: '图片怎么去掉背景变透明？白底图转透明 PNG 完整步骤',
    description:
      '白底图不等于透明图。说明怎么把白底商品图、人像照去掉背景变成透明 PNG：上传、选模型、修边、下载、验证透明，全部在浏览器本地完成。',
    summary: '白底 ≠ 透明。四步把白底图变成真正带透明通道的 PNG，并验证透明是否生效。',
    keyword: '图片去掉背景变透明',
    blocks: [
      {
        type: 'p',
        text: '搜索「图片去掉背景变透明」的人，大多手上是一张白底图：拍商品时铺了白纸，拍证件照时用了白墙，做 Logo 时放在白色画布上。但白底不是透明——把这类图片直接放上深色页面，白色方块会一起露出来。要把背景变成真正的透明，需要让 AI 判断哪些像素属于主体，再把其余部分抹掉。这篇按站内的 AI 抠图工具演示完整流程，处理全部在浏览器本地完成，图片不会上传到服务器。',
      },
      { type: 'h2', text: '先分清白底和透明的区别' },
      {
        type: 'p',
        text: '白底图的背景是实打实的白色像素，文件里没有透明通道；透明图的背景是「没有像素」，由 PNG 的 Alpha 通道记录。JPG 格式本身不支持透明，所以无论怎么处理，最后都必须导出 PNG。很多人抠完图发现「还是白的」，通常不是抠图失败，而是保存时选了 JPG，或者在预览软件里看到的是白色画布，误以为背景没去掉。',
      },
      { type: 'h2', text: '操作步骤' },
      {
        type: 'ol',
        items: [
          '打开站内抠图工具，把图片拖进上传区，或点击上传选择文件。支持 JPG、PNG、WEBP、AVIF、GIF，单张最大 50MB。',
          '选择模型：通用图片选 Pro，速度稍慢但边缘最稳；纯人像可选「肖像」；简单主体可选 Mini。',
          '点击「开始抠图」，等待处理完成。Pro 模型通常 4 秒左右一张，Mini 约 1 秒。',
          '处理完成后缩略图会显示棋盘格底纹，这就是透明区域的标记，说明背景已经去掉。',
          '边缘有残留（比如商品底部的阴影、发丝间的白边），点缩略图上的编辑按钮，用橡皮擦抹掉多余部分，或用复原笔刷找回被误删的部分。',
          '点击下载，得到以「原文件名_抠图.png」命名的透明 PNG。多张图片可以点「全部下载」，自动打包成 ZIP。',
        ],
      },
      {
        type: 'cta',
        label: '打开 AI 抠图工具',
        text: '拖入图片即可开始，模型首次使用需下载约 42MB，之后走浏览器缓存，秒开。',
      },
      { type: 'h2', text: '怎么确认背景真的透明了' },
      {
        type: 'ul',
        items: [
          '看站内预览：处理完成后的缩略图是棋盘格，不是白色，说明透明通道已经生成。',
          '下载后放到深色背景上：把 PNG 拖进深色网页、深色幻灯片，背景应该直接透出底色。',
          '看文件信息：透明 PNG 一般比同尺寸 JPG 大，因为多了 Alpha 通道；体积变大不是出问题。',
          '别再另存为 JPG：JPG 会强制把透明区域填成白色，一路处理就白做了。',
        ],
      },
      { type: 'h2', text: '边缘发白、有锯齿怎么办' },
      {
        type: 'p',
        text: '白底图最容易出现的是「白边」：主体和背景颜色接近时，AI 会把交界处的一圈浅色像素判定为背景残留。处理办法是用编辑里的橡皮擦，把画笔调到 10 到 20 像素，沿边缘轻轻扫一遍；反过来，如果抠得太狠，主体边缘被吃掉，就用复原笔刷补回来。头发、毛绒、纱质这类半透明边缘，Pro 模型的表现明显好于轻量模型，值得多等几秒。',
      },
      { type: 'h2', text: '哪些图不适合直接抠' },
      {
        type: 'p',
        text: '主体和背景颜色几乎一样（白衬衫贴白墙、白色陶瓷放白桌），AI 缺少边界线索，效果会打折，拍图时换一块灰底或浅蓝底会好很多。另外，截图里的文字、表格、纯色图标不属于「抠图」场景，用设计软件直接重建更快。超大图注意模型的尺寸上限：Pro 支持到 16000×16000，肖像和 Mini 支持到 2048×2048，超过会由模型自动缩放推理。',
      },
      { type: 'h2', text: '整个流程的数据去了哪里' },
      {
        type: 'p',
        text: '图片通过 ONNX Runtime Web 在浏览器里推理，用 WebGPU 或 WebAssembly 加速，全程没有上传请求；模型文件下载一次后缓存在浏览器 IndexedDB，第二次打开直接命中缓存。关闭页面后，页面内的图片数据会被浏览器释放，只有你点下载的那份 PNG 会写进设备。',
      },
    ],
    faq: [
      {
        q: '白底图直接改成透明，为什么导出的图还是白的？',
        a: '多半是保存成了 JPG。JPG 不支持透明通道，透明区域会被填成白色。请下载本站输出的 PNG，并避免用只支持 JPG 的工具二次另存。',
      },
      {
        q: '抠完边缘有一圈白边怎么处理？',
        a: '用站内编辑里的橡皮擦，把画笔调到 10–20 像素沿边缘轻扫；如果主体被抠掉了一部分，用复原笔刷补回。头发和毛绒边缘建议用 Pro 模型重新处理。',
      },
      {
        q: '需要把图片上传到服务器吗？',
        a: '不需要。AI 推理在浏览器本地完成，图片不会离开设备。模型文件首次使用需下载约 42MB，之后走浏览器缓存。',
      },
      {
        q: '一张图要处理多久？支持多大尺寸？',
        a: 'Pro 模型约 4 秒一张，肖像模型约 1.5 秒，Mini 约 1 秒。Pro 支持最大 16000×16000 像素，肖像和 Mini 支持 2048×2048。',
      },
    ],
  },
  en: {
    title: 'How to Remove a White Background and Make It Transparent',
    description:
      'A white background is not transparency. Follow these steps to turn white-background product shots and portraits into a real transparent PNG, then verify it — all processed locally in your browser.',
    summary: 'White is not transparent. Four steps to a PNG with a real alpha channel, plus how to verify it.',
    keyword: 'remove white background transparent',
    blocks: [
      {
        type: 'p',
        text: 'Most people searching for "remove white background transparent" are holding an image shot on white paper or a white wall. A white background is made of solid white pixels; a transparent background has no pixels at all, recorded by the PNG alpha channel. JPG cannot store transparency, so the result must be a PNG. This guide walks through the site’s AI background remover, and everything runs locally in your browser — images are never uploaded.',
      },
      { type: 'h2', text: 'White background vs. transparent background' },
      {
        type: 'p',
        text: 'If your cutout still looks white after processing, the usual cause is not a failed cutout but the export format: saving as JPG fills transparent areas with white. The other common cause is a preview tool that draws a white canvas behind the image, which hides the checkerboard pattern that indicates transparency.',
      },
      { type: 'h2', text: 'Step by step' },
      {
        type: 'ol',
        items: [
          'Open the background remover and drag your image into the upload area, or click to select a file. JPG, PNG, WEBP, AVIF and GIF are supported, up to 50MB per file.',
          'Pick a model: Pro for general images and the cleanest edges, Portrait for people, Mini for simple subjects and speed.',
          'Click Start and wait. Pro takes roughly 4 seconds per image; Mini about 1 second.',
          'When it finishes, the thumbnail shows a checkerboard pattern — that is the visual marker for transparency.',
          'Clean up leftovers with the eraser brush, or restore areas that were cut away by mistake.',
          'Download the PNG. For several images, use Download all to get a single ZIP.',
        ],
      },
      {
        type: 'cta',
        label: 'Open the background remover',
        text: 'Drop an image to start. The first run downloads about 42MB of model files, then they are cached by your browser.',
      },
      { type: 'h2', text: 'How to verify the result is really transparent' },
      {
        type: 'ul',
        items: [
          'The preview thumbnail shows a checkerboard, not a white block.',
          'Place the PNG over a dark background — the background should show through.',
          'A transparent PNG is usually larger than the same image as JPG, because of the alpha channel. That is expected.',
          'Never re-save as JPG afterwards; it flattens transparency back to white.',
        ],
      },
      { type: 'h2', text: 'Fixing white fringes and rough edges' },
      {
        type: 'p',
        text: 'When the subject and background are close in color, a thin light halo can remain at the boundary. Use the eraser at a 10–20 pixel brush size along the edge. If the cutout went too far and ate into the subject, use the restore brush. For hair, fur and translucent fabric, Pro handles the edges noticeably better than the lighter models.',
      },
      { type: 'h2', text: 'When a direct cutout is not the right tool' },
      {
        type: 'p',
        text: 'A white shirt on a white wall leaves the model with almost no boundary to find; shooting against grey or light blue helps. Text, tables and flat icons in screenshots are not cutout material either — rebuild those in a design tool. Also mind the size limits: Pro accepts up to 16000×16000 pixels, while Portrait and Mini accept up to 2048×2048.',
      },
    ],
    faq: [
      {
        q: 'Why does my exported image still have a white background?',
        a: 'Most likely it was saved as JPG, which cannot store transparency and fills those areas with white. Download the PNG this tool produces and avoid tools that only export JPG.',
      },
      {
        q: 'How do I remove a white fringe around the subject?',
        a: 'Use the eraser brush at 10–20 pixels along the edge. If part of the subject was removed, use the restore brush. For hair and fur, re-run with the Pro model.',
      },
      {
        q: 'Are images uploaded to a server?',
        a: 'No. Inference runs in your browser with ONNX Runtime Web. Model files are downloaded once (about 42MB) and then cached locally.',
      },
      {
        q: 'How fast is it, and how large can images be?',
        a: 'About 4 seconds per image with Pro, 1.5 seconds with Portrait and 1 second with Mini. Pro supports up to 16000×16000 pixels; Portrait and Mini up to 2048×2048.',
      },
    ],
  },
}
