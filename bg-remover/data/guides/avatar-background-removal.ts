import type { Guide } from './types'

export const avatarBackgroundRemoval: Guide = {
  slug: 'avatar-background-removal',
  datePublished: '2026-11-23',
  dateModified: '2026-11-23',
  related: ['id-photo-remove-background', 'remove-white-background-to-transparent', 'save-transparent-png'],
  zh: {
    title: '头像怎么抠图？透明背景头像制作与使用注意',
    description:
      '把生活照、工作照做成透明背景头像：怎么选图、用哪个模型、发丝边缘怎么修，以及透明头像在社交平台上显示成黑底时怎么办。',
    summary: '选图、抠图、修发丝、确认平台兼容性，四步做出可用的透明背景头像。',
    keyword: '头像抠图',
    blocks: [
      {
        type: 'p',
        text: '头像抠图的需求比想象中多：简历和作品集要一张干净的职业头像，社群和游戏要透明背景的立绘，做贴纸和表情包也需要把人从杂乱背景里拎出来。这篇用站内的 AI 抠图工具演示头像抠图的完整流程，人像照片在浏览器本地处理，不会上传，介意照片外泄的话这点很关键。',
      },
      { type: 'h2', text: '什么样的照片适合做头像' },
      {
        type: 'ul',
        items: [
          '脸部清晰、正面或轻微侧脸，五官没有被头发或手挡住。',
          '背景尽量简单：纯色墙、天空、虚化背景都行，避免身后有柜子、招牌等硬边物体。',
          '光线均匀，别让半边脸埋在阴影里，阴影边缘抠出来会很脏。',
          '分辨率至少 800×800，社交平台显示虽小，但导出后还要裁切，留足余量。',
        ],
      },
      { type: 'h2', text: '操作步骤' },
      {
        type: 'ol',
        items: [
          '打开抠图工具，拖入照片，或直接把图片粘贴进页面（手机上可长按粘贴）。',
          '模型选「肖像」（MODNet），它专门处理人像，发丝和脸部轮廓更贴合，约 1.5 秒一张。',
          '点击「开始抠图」，等缩略图出现棋盘格，说明背景已经透明。',
          '放大检查发丝、耳朵、脖子和肩膀交界：缺失的用「复原」补，残留的原背景色用「橡皮擦」清掉。',
          '点击下载，得到透明背景的 PNG。',
          '按目标平台需要再做裁切：多数平台会自动圆形裁切，人物四周留一点空间，别让头顶或肩膀被切掉。',
        ],
      },
      {
        type: 'cta',
        label: '打开 AI 抠图工具处理头像',
        text: '选「肖像」模型，约 1.5 秒完成；支持手机浏览器触屏上传与粘贴。',
      },
      { type: 'h2', text: '透明头像在平台上显示成黑色怎么办' },
      {
        type: 'p',
        text: '这是最常见的坑：很多社交平台和系统并不支持透明头像，会把透明区域填成黑色、深灰或白色，具体取决于平台的深色模式和头像容器。解决办法是先确认平台的显示效果——上传后看预览；如果被填成深色，就回到编辑软件里在人物下方铺一层浅色或品牌色底，再导出 JPG。想要透明效果又想通用，可以准备两版：一版透明 PNG 用于支持透明的场景（PPT、海报、贴纸），一版浅色底 JPG 用于社交平台。',
      },
      { type: 'h2', text: '圆形裁切时留多少边距' },
      {
        type: 'p',
        text: '大多数头像容器是圆形，原图是方图。裁切时让人物（头部加部分肩膀）落在圆的内切区域内，头顶留 5% 到 10% 的空白，既不会顶到边，也不会显得人很小。如果要做「头像 + 底色 + 描边」的组合，先抠出透明 PNG，再在底层铺色、外层加描边，顺序错了会重复抠图。',
      },
      { type: 'h2', text: '抠图前先想清楚头像用在哪里' },
      {
        type: 'p',
        text: '同一个透明头像，用在简历、社群、游戏和贴纸上的处理并不一样。简历和作品集通常要浅色或纯白底，重点是脸部干净、衣着整齐；社群头像多在深色界面里展示，抠得太干净反而显得空，可以保留一点肩部轮廓；做贴纸和表情包则要求边缘完整，方便叠加在任何背景上。先确定用途，再决定是输出透明 PNG，还是铺好底色导出 JPG，能省掉一次返工。',
      },
      { type: 'h2', text: '头像抠图的隐私说明' },
      {
        type: 'p',
        text: '人像照片比商品图敏感得多，所以处理方式值得确认：本站的抠图在浏览器里通过 ONNX Runtime Web 完成，照片从始至终没有上传到服务器，也不经过第三方图像接口。模型文件首次使用需要下载约 25MB（肖像模型），之后缓存在浏览器里，第二次打开直接可用。关闭页面后，页面里的图片数据会被浏览器释放。',
      },
    ],
    faq: [
      {
        q: '头像抠完上传到社交平台，背景变成黑色了？',
        a: '多数平台不支持透明头像，会把透明区域填成黑色或白色。上传前先看平台预览；需要通用就用浅色或品牌色铺底后导出 JPG。',
      },
      {
        q: '头发边缘总是缺一块怎么办？',
        a: '先确认用的是「肖像」模型；仍有缺失时打开编辑，用「复原」笔刷在缺失处涂抹补回，再用橡皮擦清掉残留背景。',
      },
      {
        q: '可以用手机做头像抠图吗？',
        a: '可以。工具适配手机浏览器，支持触屏拖拽上传和粘贴图片，处理仍在手机浏览器本地完成。',
      },
      {
        q: '头像照片会被存到服务器吗？',
        a: '不会。抠图完全在浏览器本地推理，照片不会离开设备；下载的 PNG 直接保存到你的手机或电脑。',
      },
    ],
  },
  en: {
    title: 'How to Cut Out an Avatar With a Transparent Background',
    description:
      'Turn a casual or professional photo into a transparent avatar: which photo to pick, which model to use, how to clean up hair, and what to do when a platform fills transparency with black.',
    summary: 'Pick the photo, cut it out, fix the hair, then check platform support — four steps to a usable avatar.',
    keyword: 'avatar background removal',
    blocks: [
      {
        type: 'p',
        text: 'Avatar cutouts come up more often than expected: a clean headshot for a résumé or portfolio, a transparent character for a community profile, a sticker or emoji set built from a photo. This guide uses the site’s AI background remover, and portraits are processed locally in your browser — never uploaded.',
      },
      { type: 'h2', text: 'Photos that cut out well' },
      {
        type: 'ul',
        items: [
          'A clear, mostly frontal face with no hair or hands covering features.',
          'A simple background: a plain wall, sky or blurred scene beats shelves and signs with hard edges.',
          'Even lighting; a face half in shadow produces dirty edges.',
          'At least 800×800 pixels, so there is room to crop afterwards.',
        ],
      },
      { type: 'h2', text: 'Steps' },
      {
        type: 'ol',
        items: [
          'Open the background remover and drop the photo in, or paste it directly into the page.',
          'Choose the Portrait model (MODNet), which is tuned for people and finishes in about 1.5 seconds.',
          'Click Start and wait for the checkerboard thumbnail that marks transparency.',
          'Zoom in on hair, ears, neck and shoulders. Use the restore brush for missing parts and the eraser for leftover background.',
          'Download the transparent PNG.',
          'Crop for the target platform: most avatars are cropped to a circle, so leave some space around the head and shoulders.',
        ],
      },
      {
        type: 'cta',
        label: 'Open the background remover',
        text: 'The Portrait model takes about 1.5 seconds. Touch upload and paste work on mobile browsers.',
      },
      { type: 'h2', text: 'When a platform turns transparency black' },
      {
        type: 'p',
        text: 'Many social platforms and operating systems do not support transparent avatars and fill the empty area with black, dark grey or white depending on the theme. Check the upload preview first. If it turns dark, place the cutout over a light or brand-colored shape in an editor and export JPG. Keeping two versions — a transparent PNG for slides, posters and stickers, and a light-background JPG for social profiles — avoids the problem entirely.',
      },
      { type: 'h2', text: 'Cropping for a circular avatar' },
      {
        type: 'p',
        text: 'Avatar containers are usually circular while the source is square. Keep the head and part of the shoulders inside the inscribed circle, with roughly 5–10% empty space above the head. If you want a background color plus an outline, cut out to a transparent PNG first, then fill and stroke beneath it — doing it in the wrong order means cutting out twice.',
      },
      { type: 'h2', text: 'Decide where the avatar will be used first' },
      {
        type: 'p',
        text: 'A résumé or portfolio avatar usually sits on white and favors a clean face and tidy clothing. A community avatar is often shown on a dark interface, where a light or brand-colored background reads better than pure transparency. Stickers and emoji sets need intact edges so they composite over anything. Deciding the destination first tells you whether to deliver a transparent PNG or a JPG with a filled background — and saves a second pass.',
      },
      { type: 'h2', text: 'Privacy matters for portraits' },
      {
        type: 'p',
        text: 'Portrait photos are more sensitive than product shots. Inference runs via ONNX Runtime Web inside the browser, so the photo is never uploaded and never touches a third-party image API. The Portrait model is about 25MB on first use and is cached afterwards. Closing the page releases the in-memory image data.',
      },
    ],
    faq: [
      {
        q: 'My avatar background turned black after uploading. Why?',
        a: 'Most platforms do not support transparency and fill the empty area with black or white. Check the platform preview and, if needed, export a JPG with a light background instead.',
      },
      {
        q: 'Part of the hair is missing after the cutout.',
        a: 'Make sure you used the Portrait model, then paint over the missing area with the restore brush and clean leftovers with the eraser.',
      },
      {
        q: 'Can I do this on a phone?',
        a: 'Yes. The tool works in mobile browsers with touch drag-and-drop and paste. Processing still happens locally on the device.',
      },
      {
        q: 'Is the photo stored on a server?',
        a: 'No. Inference is fully local; the downloaded PNG goes straight to your device.',
      },
    ],
  },
}
