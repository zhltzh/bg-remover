import type { Guide, GuideContent, GuideLocale } from './types'
import { removeWhiteBackground } from './remove-white-background-to-transparent'
import { idPhotoBackground } from './id-photo-remove-background'
import { ecommerceBatchCutout } from './ecommerce-product-batch-cutout'
import { avatarBackgroundRemoval } from './avatar-background-removal'
import { saveTransparentPng } from './save-transparent-png'

/** 教程列表页路由（i18n 会按 locale 自动加前缀，默认中文无前缀） */
export const GUIDE_LIST_PATH = '/guides'

/** 数组顺序即列表页展示顺序 */
export const GUIDES: Guide[] = [
  removeWhiteBackground,
  idPhotoBackground,
  ecommerceBatchCutout,
  avatarBackgroundRemoval,
  saveTransparentPng,
]

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug)
}

/** 目前只有中文和英文正文；其他语言回退英文，避免空白页 */
export function guideContent(guide: Guide, locale: string): GuideContent {
  return locale === 'zh' ? guide.zh : guide.en
}

/** 正文实际使用的语言，用于 JSON-LD 的 inLanguage */
export function contentLocale(locale: string): GuideLocale {
  return locale === 'zh' ? 'zh' : 'en'
}

export type { Guide, GuideContent, GuideBlock, GuideFaq, GuideLocale } from './types'
