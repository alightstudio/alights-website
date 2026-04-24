// Shared types + cache for site config

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

// Apply theme CSS vars to document
export function applyTheme(theme: ThemeConfig) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--color-primary', theme.primaryColor || '#c9a962')
  root.style.setProperty('--color-bg', theme.bgColor || '#0a0a0a')
  root.style.setProperty('--color-text', theme.textColor || '#ffffff')
  root.style.setProperty('--font-family', theme.fontFamily || 'Inter')
  root.style.setProperty('--font-display', theme.fontDisplay || 'Playfair Display')
  root.style.setProperty('--border-radius', (theme.borderRadius || '0') + 'px')
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
