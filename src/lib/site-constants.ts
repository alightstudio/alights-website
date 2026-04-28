/**
 * 统一站点配置常量
 * 
 * M-8 / L-4 修复：集中管理硬编码的品牌信息、联系方式等，
 * 避免散落在 15+ 文件中导致维护遗漏。
 * 
 * 这些是应用层的默认值，数据库 site_config 表中的值优先级更高。
 */

// ─── 品牌信息 ───────────────────────────────────────────

/** 公司全称 */
export const COMPANY_NAME = '西安栖光文化传播有限公司'

/** 品牌名（中文） */
export const BRAND_NAME = '栖光文化'

/** 品牌名（英文） */
export const BRAND_NAME_EN = 'ALIGHTS'

/** 品牌标语 */
export const SLOGAN = '光栖之处 · 自有答案'

/** 公司英文名 */
export const COMPANY_NAME_EN = 'Alights'

// ─── 联系方式 ───────────────────────────────────────────

export const CONTACT = {
  phone: '15091855505',
  email: '184436962@qq.com',
  address: '陕西省西安市',
  wechat: '15091855505',
} as const

// ─── SEO ────────────────────────────────────────────────

export const SEO = {
  title: `${BRAND_NAME} | ${BRAND_NAME_EN} - ${SLOGAN}`,
  description: `${COMPANY_NAME}，专注于高端视效制作领域。TVC广告、产品动画、发布会、影视剧。`,
  keywords: '栖光,视效,TVC广告',
} as const

// ─── 版权 ──────────────────────────────────────────────

export const COPYRIGHT = `© 2024-2026 ${COMPANY_NAME}. All rights reserved.`

// ─── 业务范围 ──────────────────────────────────────────

export const SERVICES = [
  'AIGC',
  'TVC广告',
  '产品动画',
  '产品发布会',
  '影视剧',
] as const

export const SERVICE_DESCRIPTION = `${COMPANY_NAME}，专注于高端视效制作领域。以光影为笔，以创意为墨，为品牌讲述动人故事。`
