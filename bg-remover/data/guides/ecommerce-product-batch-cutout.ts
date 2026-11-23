import type { Guide } from './types'

export const ecommerceBatchCutout: Guide = {
  slug: 'ecommerce-product-batch-cutout',
  datePublished: '2026-11-23',
  dateModified: '2026-11-23',
  related: ['remove-white-background-to-transparent', 'save-transparent-png', 'avatar-background-removal'],
  zh: {
    title: '商品图怎么批量去背景？电商主图透明底完整流程',
    description:
      '上新几十张商品图，一张张抠太慢。说明怎么一次拖入多张或整个文件夹批量去背景、分批处理的张数建议、失败重试，以及批量下载 ZIP 后的检查清单。',
    summary: '整批拖入、分批处理、一次打包下载：电商商品图的批量去背景流程。',
    keyword: '商品图批量去背景',
    blocks: [
      {
        type: 'p',
        text: '商品图批量去背景是电商上新季最耗时的环节：同一款商品有正面、侧面、细节、场景图，一季几十上百张，外包一张几块钱、等一天；手动用魔棒和套索，边缘还容易毛糙。站内的 AI 抠图工具支持一次拖入多张图片甚至整个文件夹，批量处理后一键打包下载。整条链路在浏览器本地跑，商品图不会传到任何服务器——对还没上架的款式尤其重要。',
      },
      { type: 'h2', text: '批量处理前先整理文件' },
      {
        type: 'ul',
        items: [
          '同一批放同一个文件夹，文件名保留商品编号，方便下载后对号入座。',
          '单张控制在 50MB 以内，格式用 JPG、PNG、WEBP 都可以，GIF 和 AVIF 也支持。',
          '先把明显不合格的图挑出去：严重虚焦、主体被裁掉、背景和商品同色的，AI 也救不回来。',
          '需要统一尺寸的，抠完再批量裁剪，不要在抠图前压缩，否则边缘细节会损失。',
        ],
      },
      { type: 'h2', text: '操作步骤' },
      {
        type: 'ol',
        items: [
          '打开抠图工具，把整个商品图文件夹拖进上传区，或点「+ 添加更多」多次选择文件。',
          '模型选 Pro：商品边缘、金属反光、半透明包装都处理得更稳，约 4 秒一张。',
          '点击「开始抠图」。数量多时会逐张处理，进度条显示当前是第几张、已完成几张。',
          '建议一批不超过 6 张（超过会提示），处理完一批再拖入下一批，浏览器更流畅，也方便中途检查。',
          '全部完成后点「全部下载」，多张结果会打包成一个 ZIP，单张则直接下载。',
          '解压后抽查：重点看商品与背景交界处、细长部件（如数据线、鞋带）是否断裂。',
        ],
      },
      {
        type: 'cta',
        label: '打开 AI 抠图工具开始批量处理',
        text: '支持整文件夹拖入、批量下载 ZIP；一张约 4 秒，全部在浏览器本地完成。',
      },
      { type: 'h2', text: '透明底和平台要求的白底不是一回事' },
      {
        type: 'p',
        text: '要分清目标平台的规则：多数电商主图要求「纯白底」（RGB 255,255,255），而不是透明底。本站输出的是透明 PNG，透明区域在部分平台会被渲染成黑色或灰色，直接上传可能被判不合规。正确做法是抠出透明底后，在图片编辑软件里在底层铺一块纯白，再导出 JPG 上传；需要透明底的场景（详情页叠场景、做贴图素材）才直接用 PNG。',
      },
      { type: 'h2', text: '提高批量抠图成功率的拍摄细节' },
      {
        type: 'ul',
        items: [
          '商品和背景拉开色差：白杯子放灰布上，比放白纸上好抠得多。',
          '避免硬阴影：侧光会在商品旁留下深色投影，AI 可能把投影当成商品保留，也可能切掉，两边都难看。',
          '细长和镂空结构（项链、网格、透明瓶）建议单独用 Pro 处理，并放大检查。',
          '同一批商品尽量用同一套光位拍摄，批量结果的一致性会更好。',
        ],
      },
      { type: 'h2', text: '失败和张数限制怎么处理' },
      {
        type: 'p',
        text: '单张失败不会中断整批：失败的缩略图会标红，点击重试可以只重跑那一张，已完成的不会重做。数量上没有硬性上限，但受浏览器内存限制，几百张一次性处理容易卡顿，按每批 6 到 20 张分批更稳妥。如果批量到一半想停，点「停止处理」，当前这张处理完就中止，已完成的图仍然可以下载。',
      },
      { type: 'h2', text: '隐私和成本' },
      {
        type: 'p',
        text: '所有推理在浏览器里完成，商品图、未发布的新款、带价格的吊牌都不会上传，也不经过第三方图像接口。工具免费、无水印、不限次数，唯一成本是模型首次下载约 42MB，之后走 IndexedDB 缓存，换一批图不用再等下载。',
      },
    ],
    faq: [
      {
        q: '一次最多能批量处理多少张商品图？',
        a: '没有硬性上限，但建议每批 6–20 张。超过 6 张会提示分批，图片越多越吃浏览器内存。分批处理更稳，也方便中途抽查。',
      },
      {
        q: '能直接拖入整个文件夹吗？',
        a: '可以。上传区支持拖拽文件夹，会递归收集里面的图片；也可以点「+ 添加更多」多次追加文件。',
      },
      {
        q: '批量下载是什么格式？',
        a: '多张结果点「全部下载」会打包成一个 ZIP，里面是每张图的透明 PNG，命名沿用原文件名加「_抠图」后缀；只有一张时直接下载 PNG。',
      },
      {
        q: '平台要求白底主图，透明底能直接传吗？',
        a: '不建议。多数平台要求纯白底，透明区域可能被渲染成黑色。请在透明 PNG 下方铺纯白后导出 JPG 再上传。',
      },
      {
        q: '有的图抠失败了，要整批重做吗？',
        a: '不用。失败的缩略图可以单独点重试，只重跑失败的那几张，已完成的不会重做。',
      },
    ],
  },
  en: {
    title: 'Batch Remove Backgrounds From E-commerce Product Photos',
    description:
      'Dozens of product shots to prepare for a new listing? Drag in a whole folder, process them in batches, retry only the failures, and download everything as one ZIP.',
    summary: 'Drag in a folder, process in batches, download one ZIP: a repeatable product photo workflow.',
    keyword: 'batch remove background product photos',
    blocks: [
      {
        type: 'p',
        text: 'Batch background removal is the slowest part of a product launch: front, side, detail and lifestyle shots for every SKU, dozens or hundreds per season. The site’s AI background remover accepts multiple files or an entire folder at once, processes them in a batch and lets you download everything as one ZIP. Everything runs locally in the browser, so unreleased product photos never leave your computer.',
      },
      { type: 'h2', text: 'Prepare the folder first' },
      {
        type: 'ul',
        items: [
          'Keep one batch per folder and include the SKU in the filename so results are easy to match.',
          'Keep each file under 50MB. JPG, PNG, WEBP, AVIF and GIF are supported.',
          'Remove obvious failures before uploading: heavy motion blur, cropped subjects, or products that match the background color.',
          'Crop to final sizes after the cutout, not before — pre-compressing costs edge detail.',
        ],
      },
      { type: 'h2', text: 'Steps' },
      {
        type: 'ol',
        items: [
          'Drag the whole folder into the upload area, or add files repeatedly with "+ Add more".',
          'Choose the Pro model. It handles product edges, metallic reflections and translucent packaging best, at about 4 seconds per image.',
          'Click Start. The progress bar shows which image is being processed and how many are done.',
          'Keep batches to about 6 images. The app warns past that point, and smaller batches are easier to spot-check.',
          'When finished, click Download all to get a single ZIP, or download single images directly.',
          'Spot-check the ZIP: look at boundaries, thin parts such as cables and laces, and hollow structures.',
        ],
      },
      {
        type: 'cta',
        label: 'Open the background remover',
        text: 'Folder upload, ZIP download and local processing — roughly 4 seconds per product photo.',
      },
      { type: 'h2', text: 'Transparent is not the same as marketplace white' },
      {
        type: 'p',
        text: 'Many marketplaces require a pure white background (255,255,255), not transparency. This tool outputs transparent PNGs; some platforms render transparent areas as black or grey, which can fail review. The reliable workflow is: cut out to transparency, place the PNG over a pure white shape in an editor, then export JPG for upload. Use the transparent PNG directly only where transparency is actually wanted.',
      },
      { type: 'h2', text: 'Shooting details that improve batch results' },
      {
        type: 'ul',
        items: [
          'Separate the product from the background in value: a white mug on grey cloth cuts out far better than on white paper.',
          'Avoid hard shadows; a strong cast shadow may be kept as part of the product or sliced away.',
          'Handle thin, hollow or transparent items one at a time with Pro and inspect at 100%.',
          'Shoot a whole batch with the same lighting for more consistent results.',
        ],
      },
      { type: 'h2', text: 'Failures, limits and stopping early' },
      {
        type: 'p',
        text: 'A single failure does not stop the batch: failed thumbnails are marked and can be retried individually, and finished images are not reprocessed. There is no hard count limit, but browser memory sets a practical ceiling — batches of 6 to 20 are safest. Clicking Stop finishes the current image and then halts, and completed images remain downloadable.',
      },
    ],
    faq: [
      {
        q: 'How many product photos can I process at once?',
        a: 'There is no hard limit, but 6–20 per batch is recommended. Past 6 the app suggests splitting, and larger batches use more browser memory.',
      },
      {
        q: 'Can I drop a whole folder?',
        a: 'Yes. The upload area accepts folders and collects images recursively. You can also append files with "+ Add more".',
      },
      {
        q: 'What does the batch download contain?',
        a: 'Download all produces one ZIP with a transparent PNG per image, keeping the original filename plus a suffix. A single image downloads as a PNG directly.',
      },
      {
        q: 'My marketplace requires a white background — can I upload the transparent PNG?',
        a: 'Better not. Transparent areas may render black. Place the PNG over pure white and export JPG before uploading.',
      },
      {
        q: 'A few images failed. Do I need to redo the whole batch?',
        a: 'No. Retry each failed thumbnail individually; completed images are left untouched.',
      },
    ],
  },
}
