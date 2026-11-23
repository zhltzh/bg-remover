import type { Guide } from './types'

export const saveTransparentPng: Guide = {
  slug: 'save-transparent-png',
  datePublished: '2026-11-23',
  dateModified: '2026-11-23',
  related: ['remove-white-background-to-transparent', 'id-photo-remove-background', 'ecommerce-product-batch-cutout'],
  zh: {
    title: '透明 PNG 怎么保存？怎么确认背景真的透明',
    description:
      '抠完图保存下来却变白、发到群里背景又回来了？说明透明 PNG 的保存方法、怎么验证透明是否生效，以及微信、相册、Office 里最常踩的坑。',
    summary: '透明只存在于 PNG 的 Alpha 通道里。掌握正确的保存与验证方法，避免白底、黑底、压缩回填。',
    keyword: '透明PNG怎么保存',
    blocks: [
      {
        type: 'p',
        text: '「透明 PNG 怎么保存」是抠完图之后最常卡住的一步：明明在工具里看到棋盘格（透明），保存下来放到别处却变成了白底，或者发给同事后背景又回来了。问题几乎都不在抠图，而在保存和传输环节——透明信息只存在于 PNG 的 Alpha 通道里，任何会「拍平」图片的操作都会把它抹掉。这篇把保存方法、验证方法和常见坑一次说清楚。',
      },
      { type: 'h2', text: '透明只存在于 PNG（和部分 WEBP）里' },
      {
        type: 'p',
        text: 'JPG 格式没有 Alpha 通道，背景只能被填成白色或其他纯色；PNG 支持 Alpha，能记录「这个像素完全透明、半透明还是不透明」。所以判断一张图能不能保持透明，先看格式：扩展名是 .jpg 或 .jpeg，就一定没有透明；.png 才可能有。注意「可能有」——PNG 也可以存成不透明的白底，只是画布上画了白色，这在外观上和透明完全一样，需要按下面的方法验证。',
      },
      { type: 'h2', text: '正确的保存步骤' },
      {
        type: 'ol',
        items: [
          '在抠图工具里确认缩略图是棋盘格，不是白色色块。',
          '点图片下方的下载按钮，得到「原文件名_抠图.png」。多张图片点「全部下载」，会打包成 ZIP，解压后同样是 PNG。',
          '电脑上：直接用浏览器下载，不要经过截图工具。截图得到的永远是当前屏幕的样子，透明区域会被拍成白色。',
          '手机上：优先用「存储到文件」而不是相册。部分应用把图片存进相册时会转码成 JPG。',
          '需要发给别人时，用「发送文件」而不是「发送图片」。聊天软件的图片通道会压缩并可能转格式，文件通道才会原样保留。',
        ],
      },
      {
        type: 'cta',
        label: '打开 AI 抠图工具导出透明 PNG',
        text: '输出固定为 PNG，命名带「_抠图」后缀；多张自动打包 ZIP，均在浏览器本地完成。',
      },
      { type: 'h2', text: '三步验证背景是不是真的透明' },
      {
        type: 'ul',
        items: [
          '换背景看：把 PNG 拖到深色网页、深色幻灯片背景或深色聊天背景上，背景应该直接透出底色。如果出现白色方块，说明透明已经丢失。',
          '看文件体积：同一张图，透明 PNG 通常明显大于 JPG，因为多了 Alpha 通道。体积变大是正常现象，不是损坏。',
          '看扩展名与打开方式：确认是 .png，并且用浏览器或支持透明的软件打开。Windows 照片查看器会用白/灰底显示，看不出透明，容易误判。',
        ],
      },
      { type: 'h2', text: '最常见的五个坑' },
      {
        type: 'ul',
        items: [
          '用截图代替下载：屏幕截图一定没有透明通道。',
          '在聊天软件里「发送图片」：会被压缩，甚至转成 JPG。',
          '粘贴进 Word、PPT 后另存：Office 里透明通常保留，但如果设置了页面背景色再导出 PDF/JPG，透明会被拍平。',
          '设计软件导出时勾了「合并背景」或选择了 JPG 导出：导出设置里的格式决定最终有没有透明。',
          '用手机自带编辑器裁剪后保存：部分系统编辑器会重新编码为 JPG，裁剪前先确认格式。',
        ],
      },
      { type: 'h2', text: '透明 PNG 适合用在哪里' },
      {
        type: 'p',
        text: '透明 PNG 适合叠加使用：网页元素、PPT 和海报排版、贴纸与表情包、视频剪辑叠加层、电商详情页的场景合成。反过来，需要打印或上传到只接受 JPG 的系统时，透明没有意义，反而可能因为体积大被压缩，这时在透明 PNG 下方铺好目标底色，再导出 JPG 更合适。',
      },
    ],
    faq: [
      {
        q: '为什么我保存下来的图片背景还是白色？',
        a: '先确认是不是保存成了 JPG，或用截图代替了下载。JPG 与截图都没有透明通道。请下载工具输出的 .png，并用支持透明的软件打开验证。',
      },
      {
        q: '透明 PNG 比 JPG 大很多，是文件坏了吗？',
        a: '不是。PNG 无损且带 Alpha 通道，体积通常大于 JPG。只要能在深色背景上透出底色，文件就是正常的。',
      },
      {
        q: '微信发给别人后背景变白，怎么办？',
        a: '用「发送文件」而不是「发送图片」。图片通道会压缩并可能转成 JPG，文件通道才会原样保留 PNG 的透明通道。',
      },
      {
        q: '手机上怎么保存才不丢透明？',
        a: '优先选「存储到文件」或直接下载到文件管理器，避免经过相册转码。保存后用支持透明的应用打开，或在深色背景上查看确认。',
      },
      {
        q: '透明 PNG 打印出来背景是黑的吗？',
        a: '打印不支持透明，透明区域会按纸张颜色呈现。如果打印出来发黑，通常是排版软件把透明当成了黑色填充，请在下方铺白底再输出。',
      },
    ],
  },
  en: {
    title: 'How to Save a Transparent PNG (and Verify It)',
    description:
      'Saved your cutout and the background came back? Learn how transparent PNGs are saved, how to verify transparency actually survived, and the five most common mistakes with chat apps, galleries and Office.',
    summary: 'Transparency lives only in the PNG alpha channel. Save and verify it correctly to avoid white or black fills.',
    keyword: 'save transparent png',
    blocks: [
      {
        type: 'p',
        text: 'Saving a transparent PNG is where many cutouts fail: the checkerboard is visible in the tool, but the saved file shows a white background, or the background returns after sending it to a colleague. The cutout is usually fine — the loss happens during saving or transfer, because transparency exists only in the PNG alpha channel and any operation that flattens the image removes it.',
      },
      { type: 'h2', text: 'Only PNG (and some WEBP) can stay transparent' },
      {
        type: 'p',
        text: 'JPG has no alpha channel; transparent areas become white or another solid color. PNG supports alpha, recording whether each pixel is fully transparent, partially transparent or opaque. So the first check is the extension: .jpg or .jpeg can never be transparent. A .png can be transparent, but it can also contain a painted white canvas that looks identical — verification is still needed.',
      },
      { type: 'h2', text: 'Save it the right way' },
      {
        type: 'ol',
        items: [
          'Confirm the thumbnail shows a checkerboard rather than a white block.',
          'Click the download button to get a .png. For multiple images, Download all produces a ZIP of PNGs.',
          'On desktop, download directly from the browser — never use a screenshot, which flattens transparency to white.',
          'On mobile, prefer "Save to Files" over the photo gallery, since some apps transcode to JPG.',
          'When sharing, use "Send as file" instead of "Send as photo". Photo channels compress and may convert the format.',
        ],
      },
      {
        type: 'cta',
        label: 'Open the background remover',
        text: 'Output is always PNG; multiple images are bundled into a ZIP. Everything runs locally in your browser.',
      },
      { type: 'h2', text: 'Three ways to verify transparency' },
      {
        type: 'ul',
        items: [
          'Place the PNG on a dark background — a dark webpage, slide or chat theme. The background should show through. A white square means transparency was lost.',
          'Compare file sizes: a transparent PNG is usually larger than the same image as JPG because of the alpha channel.',
          'Check the extension and the viewer. Many default image viewers draw a white or grey canvas and cannot show transparency at all.',
        ],
      },
      { type: 'h2', text: 'The five most common mistakes' },
      {
        type: 'ul',
        items: [
          'Screenshotting instead of downloading.',
          'Sending as a photo in a chat app, which compresses and may convert to JPG.',
          'Exporting from Office with a page background, which flattens the image on PDF export.',
          'Choosing JPG or "merge background" in an editor’s export dialog.',
          'Re-saving in a mobile editor that re-encodes to JPG after cropping.',
        ],
      },
      { type: 'h2', text: 'Where transparent PNGs are worth using' },
      {
        type: 'p',
        text: 'Transparency is for compositing: web elements, slides and posters, stickers, video overlays, product-scene composites. If the destination only accepts JPG or you are printing, transparency adds nothing — fill the background with the target color first, then export JPG.',
      },
    ],
    faq: [
      {
        q: 'Why does my saved image still have a white background?',
        a: 'Check whether it was saved as JPG or captured as a screenshot; neither has transparency. Download the .png the tool produces and open it in an app that supports transparency.',
      },
      {
        q: 'The transparent PNG is much larger than a JPG. Is it corrupted?',
        a: 'No. PNG is lossless and carries an alpha channel, so it is usually larger. If the background shows through on a dark surface, the file is fine.',
      },
      {
        q: 'The background came back after sending it in a chat app.',
        a: 'Send it as a file rather than as a photo. Photo channels compress and may convert to JPG.',
      },
      {
        q: 'How do I save it on a phone without losing transparency?',
        a: 'Use "Save to Files" or download to a file manager instead of the gallery, then open it in a transparency-aware app.',
      },
      {
        q: 'Does a transparent PNG print with a black background?',
        a: 'Printing has no transparency; the paper shows through. If it prints black, the layout app filled transparency with black — place a white shape underneath before exporting.',
      },
    ],
  },
}
