// 教程页面的界面文案（中英各一份，其他语言回退英文）
export const GUIDE_UI = {
  zh: {
    home: '首页',
    guides: '教程',
    updated: '更新于',
    faqTitle: '常见问题',
    relatedTitle: '相关教程',
    allGuides: '查看全部教程',
    backToList: '← 返回教程列表',
    openTool: '打开抠图工具',
    listTitle: 'AI 抠图教程：透明背景实操指南',
    listDesc:
      '从白底图变透明、证件照去背、商品图批量抠图，到头像抠图和透明 PNG 保存，每篇都按站内真实功能写成，可照着一步步操作。',
    listCta: '所有教程都在浏览器本地完成，图片不上传服务器',
    langNotice: '',
  },
  en: {
    home: 'Home',
    guides: 'Guides',
    updated: 'Updated',
    faqTitle: 'FAQ',
    relatedTitle: 'Related guides',
    allGuides: 'View all guides',
    backToList: '← Back to all guides',
    openTool: 'Open the background remover',
    listTitle: 'AI Background Removal Guides',
    listDesc:
      'Hands-on guides for turning white-background images transparent, cutting out ID photos, batching e-commerce product shots, and saving a PNG that stays transparent.',
    listCta: 'Every guide runs locally in your browser — images never leave your device',
    langNotice: 'This guide is available in English.',
  },
} as const

export function guideUi(locale: string) {
  return locale === 'zh' ? GUIDE_UI.zh : GUIDE_UI.en
}
