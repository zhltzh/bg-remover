import type { Guide } from './types'

export const idPhotoBackground: Guide = {
  slug: 'id-photo-remove-background',
  datePublished: '2026-11-23',
  dateModified: '2026-11-23',
  related: ['remove-white-background-to-transparent', 'avatar-background-removal', 'save-transparent-png'],
  zh: {
    title: '证件照怎么去背景？红底蓝底白底照片的处理方法',
    description:
      '报名要白底、社保要蓝底、表格要红底，手里只有一张手机拍的杂色背景照片。说明怎么用 AI 抠出透明底的证件照，以及换底色这一步该怎么做。',
    summary: '先把证件照抠成透明底，再按需要铺白底、蓝底或红底。抠图这一步在浏览器本地完成。',
    keyword: '证件照去背景',
    blocks: [
      {
        type: 'p',
        text: '证件照去背景是抠图里最常见也最容易翻车的场景：报名系统要求白底，社保或居住证常用蓝底，个别表格又要红底，而手头往往只有一张在宿舍白墙前用手机拍的照片。这篇说明用站内工具怎么把证件照的背景干净地去成透明，以及「换底色」这一步到底在哪完成——先说清楚边界：本站负责去背景、输出透明 PNG，不提供一键换红底蓝底的功能。',
      },
      { type: 'h2', text: '先明确：去背景和换底色是两件事' },
      {
        type: 'p',
        text: '去背景是把人物从原背景里分离出来，得到四周透明的 PNG；换底色是在这层透明底下面铺一块白、蓝或红。前者靠 AI 分割，后者只是给透明区域填色。很多在线「证件照换底色」工具其实把两步串在一起做，但底层仍然是先抠图再填色。本站只做第一步，好处是结果干净、可反复使用：同一张透明底证件照，可以拿去任何支持铺底色的软件里出白底、蓝底、红底三份，不用重复抠图。',
      },
      { type: 'h2', text: '处理步骤' },
      {
        type: 'ol',
        items: [
          '选一张光线均匀、正面、肩部完整的照片，分辨率不低于 600×800 像素，单张不超过 50MB。',
          '打开抠图工具上传照片，模型选择「肖像」（MODNet），它针对人像和证件照做了优化，速度约 1.5 秒一张。',
          '点击「开始抠图」，等缩略图出现棋盘格底纹，说明背景已经透明。',
          '检查肩线、发丝和耳朵边缘：证件照对边缘要求高，发现被抠掉的碎发用复原笔刷补回，发现残留的背景色块用橡皮擦抹掉。',
          '点击下载，保存透明底的 PNG。',
          '需要白底、蓝底或红底时，把这张透明 PNG 放进支持铺底色的证件照软件或设计工具里，在人物下方铺上目标颜色，再导出 JPG。',
        ],
      },
      {
        type: 'cta',
        label: '打开 AI 抠图工具处理证件照',
        text: '选「肖像」模型，约 1.5 秒完成；处理在浏览器本地进行，证件照不会上传到任何服务器。',
      },
      { type: 'h2', text: '拍一张好抠的证件照' },
      {
        type: 'ul',
        items: [
          '背景和衣服要有色差：白衬衫配白墙是最难抠的组合，换深色衣服或换一面灰墙立刻变简单。',
          '正面平视，肩膀入镜，头顶留一点空间，避免头发被裁切。',
          '光线均匀，别让一侧脸陷进阴影，阴影会被误判成背景。',
          '手机竖拍即可，注意别用美颜相机过度磨皮，边缘糊了抠图也会糊。',
        ],
      },
      { type: 'h2', text: '尺寸和合规提醒' },
      {
        type: 'p',
        text: '抠图不改变像素尺寸：原图多大，导出的透明 PNG 就多大。「肖像」模型支持到 2048×2048 像素，一寸、二寸证件照都远超这个范围，不需要担心。但要注意，证件照的合规要求（背景色值、头部比例、是否允许修图）由受理机构规定，本站只处理背景，不改变面部特征；涉及身份证、护照等证件时，请按官方要求现场拍摄或使用指定渠道，不要自行替换背景。',
      },
      { type: 'h2', text: '为什么边缘不能太狠' },
      {
        type: 'p',
        text: '证件照放大后会看边缘：抠得太狠，发际线和肩线会出现一圈硬切口，打印出来很明显；抠得太松，肩膀两侧会留下原背景的浅色残影。稳妥的做法是先用「肖像」模型出一版，再放大到 100% 检查，用 10 像素左右的橡皮擦沿轮廓修一圈，最后再导出。透明底的好处是修坏了还能重新下载原图重来，不会损失原片。',
      },
    ],
    faq: [
      {
        q: '这个工具能直接把证件照换成红底或蓝底吗？',
        a: '不能。本站只做去背景，输出的是透明底 PNG，不提供一键换底色。拿到透明 PNG 后，在支持铺底色的证件照软件或设计工具里垫上红、蓝、白即可。',
      },
      {
        q: '证件照会被上传到服务器吗？',
        a: '不会。抠图在浏览器本地通过 ONNX Runtime Web 完成，图片不离开设备；只有点下载时才会把结果写进你的电脑或手机。',
      },
      {
        q: '用哪个模型处理证件照最好？',
        a: '选「肖像」（MODNet），它针对人像优化，约 1.5 秒一张。如果发丝细节多、边缘复杂，可以换 Pro 模型对比，Pro 约 4 秒一张但边缘更稳。',
      },
      {
        q: '抠完发现头发边缘缺了一块怎么办？',
        a: '打开站内编辑，用「复原」笔刷在缺失区域涂抹即可补回；残留的背景色块用「橡皮擦」抹掉。修完保存会更新结果，不需要重新抠图。',
      },
    ],
  },
  en: {
    title: 'How to Remove the Background From an ID Photo',
    description:
      'Applications often demand a white, blue or red ID photo background, while you only have a phone shot against a wall. Learn how to cut the person out to a transparent PNG, then add the background color separately.',
    summary: 'Cut the ID photo to a transparent base first, then lay white, blue or red underneath.',
    keyword: 'id photo remove background',
    blocks: [
      {
        type: 'p',
        text: 'Removing the background from an ID photo is the most common cutout request, and also the easiest to get wrong: forms ask for white, portals ask for blue, some ask for red, and all you have is a phone photo taken against a wall. This guide covers cutting the person out to a transparent PNG with the site’s tool, and is explicit about the boundary: this site removes the background and exports transparency. It does not have a one-click "change background color" button.',
      },
      { type: 'h2', text: 'Cutting out and adding a color are two steps' },
      {
        type: 'p',
        text: 'Removing the background separates the person from the original scene and leaves everything else transparent. Adding a color simply fills that transparent area with white, blue or red. Many "ID photo background changer" tools chain both, but internally they cut out first and fill second. Doing only the first step is useful: one clean transparent PNG can produce white, blue and red versions in any editor that supports filling behind an image, without cutting out again.',
      },
      { type: 'h2', text: 'Steps' },
      {
        type: 'ol',
        items: [
          'Pick a photo with even lighting, facing forward, shoulders visible, at least 600×800 pixels and under 50MB.',
          'Upload it, then choose the Portrait model (MODNet), which is tuned for people and takes about 1.5 seconds.',
          'Click Start and wait for the checkerboard thumbnail, which marks transparency.',
          'Inspect the shoulder line, hair and ears. Restore missing strands with the restore brush; erase leftover background patches with the eraser.',
          'Download the transparent PNG.',
          'To get a white, blue or red version, place the PNG over a filled shape in an ID-photo editor or design tool, then export as JPG.',
        ],
      },
      {
        type: 'cta',
        label: 'Open the background remover',
        text: 'Choose the Portrait model for about 1.5 seconds per photo. Everything runs locally; the photo is never uploaded.',
      },
      { type: 'h2', text: 'Take a photo that cuts out cleanly' },
      {
        type: 'ul',
        items: [
          'Keep contrast between clothing and wall: a white shirt against a white wall is the hardest case.',
          'Face the camera, keep both shoulders in frame, and leave a little space above the head.',
          'Use even light so one side of the face does not fall into shadow — shadows get read as background.',
          'Avoid heavy beauty filters; blurred edges produce blurred cutouts.',
        ],
      },
      { type: 'h2', text: 'Sizes, limits and compliance' },
      {
        type: 'p',
        text: 'The cutout keeps your pixel dimensions. The Portrait model accepts up to 2048×2048, far above any standard ID photo size. Background color rules, head proportions and retouching limits are set by the authority receiving the photo; this tool only removes the background and never alters facial features. For passports and national IDs, follow the official capture instructions instead of substituting a background.',
      },
    ],
    faq: [
      {
        q: 'Can this tool change my ID photo to a red or blue background?',
        a: 'No. It removes the background and outputs a transparent PNG. Add the color afterwards in an editor that supports filling behind the image.',
      },
      {
        q: 'Is the photo uploaded anywhere?',
        a: 'No. The cutout runs locally in your browser. Nothing leaves your device unless you click download.',
      },
      {
        q: 'Which model is best for ID photos?',
        a: 'The Portrait model (MODNet), about 1.5 seconds per image. For complex hair edges, compare with Pro, which is slower but more precise.',
      },
      {
        q: 'Part of the hair disappeared — can I fix it without starting over?',
        a: 'Yes. Open the editor and paint over the missing area with the restore brush; erase leftover patches with the eraser. Saving updates the result in place.',
      },
    ],
  },
}
