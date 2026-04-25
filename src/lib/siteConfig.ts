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

  await Promise.all(loadPromises)

  // 2. 等待浏览器字体可用
  if ('fonts' in document) {
    await document.fonts.ready
  }

  // 3. 再更新 CSS 变量
  root.style.setProperty('--font-family', resolveFontFamily(theme.fontFamily, 'Inter'))
  root.style.setProperty('--font-display', resolveFontFamily(theme.fontDisplay, "'Noto Serif SC'"))
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
  root.style.setProperty('--border-radius', (theme.borderRadius || '0') + 'px')

  // 动态加载 Google Fonts
  const bodyFont = theme.fontFamily ? findFont(theme.fontFamily) : null
  if (bodyFont) loadGoogleFont(theme.fontFamily!)
  const displayFont = theme.fontDisplay ? findFont(theme.fontDisplay) : null
  if (displayFont && displayFont.id !== bodyFont?.id) loadGoogleFont(theme.fontDisplay!)
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
      return cachedConfig || ({} as SiteConfigData)
    }
  })()
  const result = await pendingPromise
  pendingPromise = null
  return result
}
