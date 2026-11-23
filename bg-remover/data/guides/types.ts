// 教程正文块：纯数据，中英共用同一个渲染器
export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'cta'; label: string; text: string }

export interface GuideFaq {
  q: string
  a: string
}

export interface GuideContent {
  /** H1 与页面标题（不含站点后缀） */
  title: string
  /** meta description，150 字以内 */
  description: string
  /** 列表页卡片摘要 */
  summary: string
  /** 主要长尾关键词，用于 Article 结构化数据 */
  keyword: string
  blocks: GuideBlock[]
  faq: GuideFaq[]
}

/** 教程目前只有中英两种正文；其他语言回退英文 */
export type GuideLocale = 'zh' | 'en'

export interface Guide {
  slug: string
  datePublished: string
  dateModified: string
  /** 相关教程 slug，必须存在于 GUIDES，避免死链 */
  related: string[]
  zh: GuideContent
  en: GuideContent
}
