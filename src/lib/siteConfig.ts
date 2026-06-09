// Shared types + cache for site config

import { findFont, loadGoogleFont, googleFontUrl } from '@/lib/fonts'

// ===== Types =====
export interface NavItem {
  id: string
  label: string
  href: string
  visible: boolean
  order: number
}

export interface NavigationConfig {
  logo: string
  items: NavItem[]
}

export interface FooterColumn {
  id: string
  title: string
  type: 'links' | 'text' | 'contact'
  links?: { label: string; href: string; order: number }[]
  items?: string[]
}

export interface FooterConfig {
  logo: string
  tagline: string
  columns: FooterColumn[]
  copyright: string
  bottomText: string
}

export interface ThemeConfig {
  primaryColor: string
  bgColor: string
  textColor: string
  fontFamily: string
  fontDisplay: string
  fontHero: string
  borderRadius: string
  customCSS: string
}

export interface SiteConfigData {
  company: Record<string, any>
  contact: Record<string, any>
  seo: Record<string, any>
  hero: Record<string, any>
  featuredWorks: any[]
  services: any[]
  brands: any[]
  brandDisplay: { opacity: number; opacityHover: number; grayscale: boolean; grayscaleHover: boolean }
  navigation: NavigationConfig
  footer: FooterConfig
  theme: ThemeConfig
  announcement: { enabled: boolean; text: string; type: string; dismissible: boolean; link: string | null }
  pages: Record<string, { label: string; path: string; visible: boolean }>
  codeInjection: { headHTML: string; footerHTML: string; bodyStartHTML: string }
  socialLinks: Record<string, string>
}

// ===== Cache (module-level) =====
let cachedConfig: SiteConfigData | null = null
let pendingPromise: Promise<SiteConfigData> | null = null

// 从字体 ID 解析 CSS font-family 值
function resolveFontFamily(fontId: string | undefined, defaultFamily: string): string {
  if (!fontId) return defaultFamily
  // 如果已经是 CSS font-family 格式（含引号），直接返回
  if (fontId.includes("'")) return fontId
  // 尝试按 ID 查找预设字体
  const font = findFont(fontId)
  if (font?.family) return font.family
  // 旧格式：CSS 原生名称。含空格的名称需加引号
  if (fontId.includes(' ')) return `'${fontId}'`
  return fontId
}

// 动态加载 Google Font 并等待加载完成
function loadFontWithPromise(fontId: string): Promise<void> {
  const font = findFont(fontId)
  if (!font) return Promise.resolve()

  const linkId = `gf-${font.id}`
  if (document.getElementById(linkId)) return Promise.resolve() // 已加载

  return new Promise(resolve => {
    const link = document.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    link.href = googleFontUrl(font)
    link.onload = () => resolve()
    link.onerror = () => resolve() // 不影响页面
    document.head.appendChild(link)
  })
}

// 切换字体时先加载字体文件，再应用 CSS 变量（避免闪烁）
export async function changeFontsSafe(theme: ThemeConfig): Promise<void> {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // 1. 先加载所有需要的 Google Fonts
  const loadPromises: Promise<void>[] = []
  const bodyFont = theme.fontFamily ? findFont(theme.fontFamily) : null
  if (bodyFont) loadPromises.push(loadFontWithPromise(theme.fontFamily!))
  const displayFont = theme.fontDisplay ? findFont(theme.fontDisplay) : null
  if (displayFont && displayFont.id !== bodyFont?.id) loadPromises.push(loadFontWithPromise(theme.fontDisplay!))
  const heroFont = theme.fontHero ? findFont(theme.fontHero) : null
  if (heroFont && heroFont.id !== bodyFont?.id && heroFont.id !== displayFont?.id) loadPromises.push(loadFontWithPromise(theme.fontHero!))

  await Promise.all(loadPromises)

  // 2. 等待浏览器字体可用
  if ('fonts' in document) {
    await document.fonts.ready
  }

  // 3. 再更新 CSS 变量
  root.style.setProperty('--font-family', resolveFontFamily(theme.fontFamily, 'Inter'))
  root.style.setProperty('--font-display', resolveFontFamily(theme.fontDisplay, "'Noto Serif SC'"))
  root.style.setProperty('--font-hero', resolveFontFamily(theme.fontHero, "'Playfair Display'"))
}

// Apply theme CSS vars to document
export function applyTheme(theme: ThemeConfig) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primaryColor || '#c9a962')
  root.style.setProperty('--color-bg', theme.bgColor || '#0a0a0a')
  root.style.setProperty('--color-text', theme.textColor || '#ffffff')
  root.style.setProperty('--font-family', resolveFontFamily(theme.fontFamily, 'Inter'))
  root.style.setProperty('--font-display', resolveFontFamily(theme.fontDisplay, "'Noto Serif SC'"))
  root.style.setProperty('--font-hero', resolveFontFamily(theme.fontHero, "'Playfair Display'"))
  root.style.setProperty('--border-radius', (theme.borderRadius || '0') + 'px')

  // 动态加载 Google Fonts
  const bodyFont = theme.fontFamily ? findFont(theme.fontFamily) : null
  if (bodyFont) loadGoogleFont(theme.fontFamily!)
  const displayFont = theme.fontDisplay ? findFont(theme.fontDisplay) : null
  if (displayFont && displayFont.id !== bodyFont?.id) loadGoogleFont(theme.fontDisplay!)
  const heroFont = theme.fontHero ? findFont(theme.fontHero) : null
  if (heroFont && heroFont.id !== bodyFont?.id && heroFont.id !== displayFont?.id) loadGoogleFont(theme.fontHero!)
}

// Apply custom CSS
export function applyCustomCSS(css: string) {
  if (typeof document === 'undefined') return
  let el = document.getElementById('alights-custom-css')
  if (!css) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('style')
    el.id = 'alights-custom-css'
    document.head.appendChild(el)
  }
  el.textContent = css
}

// Fetch site config with caching
export async function getSiteConfig(refresh = false): Promise<SiteConfigData> {
  if (cachedConfig && !refresh) return cachedConfig
  if (pendingPromise && !refresh) return pendingPromise
  pendingPromise = (async () => {
    try {
      const res = await fetch('/api/site')
      if (!res.ok) throw new Error('Failed to fetch config')
      const data = await res.json()
      cachedConfig = data
      return data
    } catch (e) {
      console.error('getSiteConfig error:', e)
      // 返回完整默认值，防止组件崩溃
      return cachedConfig || {
        company: { name: '西安栖光文化传播有限公司', nameEn: "Xi'an Alights Culture Communication Co., Ltd.", shortName: '栖光', shortNameEn: 'ALIGHTS', slogan: '光栖之处·自有答案', sloganEn: "Where Alights There Essence", description: '专注于高端视效制作领域。以光影为笔，以创意为墨，为品牌讲述动人故事。', descriptionEn: "Xi'an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production." },
        contact: { phone: '15091855505', email: '184436962@qq.com', address: '陕西省西安市', wechat: '15091855505' },
        seo: { title: '栖光 | ALIGHTS - 光栖之处·自有答案', description: '西安栖光文化传播有限公司，专注于高端视效制作领域。TVC广告、产品动画、发布会、影视剧。', keywords: '栖光,视效,TVC广告' },
        hero: { title: '栖光', titleEn: 'ALIGHTS', subtitle: '光栖之处·自有答案', subtitleEn: "Where Alights There Essence", tags: ['AIGC','TVC广告','产品动画','产品发布会','影视剧'] },
        featuredWorks: [],
        services: [],
        brands: [],
        brandDisplay: { opacity: 0.75, opacityHover: 1, grayscale: true, grayscaleHover: true },
        navigation: { logo: '栖光', items: [] },
        footer: { logo: '栖光', tagline: '光栖之处·自有答案', columns: [], copyright: `© 2024-2026 西安栖光文化传播有限公司. All rights reserved.`, bottomText: 'alights.cn' },
        theme: { primaryColor: '#c9a962', bgColor: '#0a0a0a', textColor: '#ffffff', fontFamily: 'inter', fontDisplay: 'inter', fontHero: 'playfair', borderRadius: '0', customCSS: '' },
        announcement: { enabled: false, text: '', type: 'info', dismissible: true, link: null },
        pages: { home: { label: '首页', path: '/', visible: true }, works: { label: '作品集', path: '/works', visible: true }, gallery: { label: '创意灵感', path: '/gallery', visible: true }, canvas: { label: '实验室', path: '/canvas', visible: true }, community: { label: '社区', path: '/community', visible: true }, about: { label: '关于我们', path: '/about', visible: true }, contact: { label: '联系合作', path: '/contact', visible: true }, login: { label: '登录', path: '/login', visible: true }, register: { label: '注册', path: '/register', visible: true }, profile: { label: '个人中心', path: '/profile', visible: true }, dashboard: { label: '创作中心', path: '/dashboard', visible: true } },
        codeInjection: { headHTML: '', footerHTML: '', bodyStartHTML: '' },
        socialLinks: { wechat: '', weibo: '', xiaohongshu: '', bilibili: '', douyin: '', github: '' },
        particle: null,
        spotlight: null,
        aboutTeamVideo: ''
      }
    }
  })()
  const result = await pendingPromise
  pendingPromise = null
  return result
}
