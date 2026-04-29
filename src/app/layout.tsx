import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { prisma } from '@/lib/prisma'
import { findFont, googleFontUrl } from '@/lib/fonts'
import type { FontOption } from '@/lib/fonts'
import { BRAND_NAME, BRAND_NAME_EN, COMPANY_NAME, SLOGAN } from '@/lib/site-constants'

const DEFAULT_SEO = {
  title: `${BRAND_NAME} | ${BRAND_NAME_EN} `,
  description: `${COMPANY_NAME}，专注于高端视效制作领域。TVC广告、产品动画、AIGC、发布会大屏、影视剧。`,
  keywords: '栖光,视效,TVC广告,AIGC,产品动画,发布会大屏,影视剧,3D渲染,CG',
}

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await prisma.siteConfig.findFirst({ where: { key: 'seo' } })
    if (!config) return DEFAULT_SEO
    const seo = JSON.parse(config.value)
    return {
      title: seo.title || DEFAULT_SEO.title,
      description: seo.description || DEFAULT_SEO.description,
      keywords: seo.keywords || DEFAULT_SEO.keywords,
    }
  } catch {
    return DEFAULT_SEO
  }
}

async function getThemeConfig(): Promise<{ fonts: FontOption[]; cssVars: Record<string, string> }> {
  try {
    const config = await prisma.siteConfig.findFirst({ where: { key: 'theme' } })
    if (!config) {
      const inter = findFont('inter')
      if (inter) return { fonts: [inter], cssVars: { '--font-family': inter.family } }
      return { fonts: [], cssVars: {} }
    }
    const theme = JSON.parse(config.value)
    const fonts: FontOption[] = []
    const cssVars: Record<string, string> = {}

    if (theme.fontFamily) {
      const font = findFont(theme.fontFamily)
      if (font) { fonts.push(font); cssVars['--font-family'] = font.family }
    }
    if (!cssVars['--font-family']) cssVars['--font-family'] = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

    if (theme.fontDisplay) {
      const font = findFont(theme.fontDisplay)
      if (font && font.id !== findFont(theme.fontFamily)?.id) fonts.push(font)
      if (font) cssVars['--font-display'] = font.family
    }
    if (!cssVars['--font-display']) cssVars['--font-display'] = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

    if (theme.fontHero) {
      const heroFont = findFont(theme.fontHero)
      if (heroFont) {
        if (heroFont.id !== findFont(theme.fontFamily)?.id && heroFont.id !== findFont(theme.fontDisplay)?.id) fonts.push(heroFont)
        cssVars['--font-hero'] = heroFont.family
      }
    }
    if (!cssVars['--font-hero']) cssVars['--font-hero'] = cssVars['--font-display']

    cssVars['--color-primary'] = theme.primaryColor || '#c9a962'
    cssVars['--color-bg'] = theme.bgColor || '#0a0a0a'
    cssVars['--color-text'] = theme.textColor || '#ffffff'
    cssVars['--border-radius'] = (theme.borderRadius || '0') + 'px'

    return { fonts, cssVars }
  } catch {
    const inter = findFont('inter')
    if (inter) return { fonts: [inter], cssVars: { '--font-family': inter.family } }
    return { fonts: [], cssVars: {} }
  }
}

/** 本地可用的字体列表（自托管，无需 Google Fonts） */
/** 自托管字体 CSS 内容（本地 @font-face 声明，无需请求 Google Fonts） */
const INTER_CSS = `@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:300;src:url(/fonts/inter/inter-latin-300-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:400;src:url(/fonts/inter/inter-latin-400-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:500;src:url(/fonts/inter/inter-latin-500-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:600;src:url(/fonts/inter/inter-latin-600-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:700;src:url(/fonts/inter/inter-latin-700-normal.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`

const LOCAL_FONTS: Record<string, { cssContent: string; fileUrls: string[] }> = {
  inter: {
    cssContent: INTER_CSS,
    fileUrls: ['/fonts/inter/inter-latin-300-normal.woff2','/fonts/inter/inter-latin-400-normal.woff2','/fonts/inter/inter-latin-500-normal.woff2','/fonts/inter/inter-latin-600-normal.woff2','/fonts/inter/inter-latin-700-normal.woff2'],
  },
}

async function fetchFontCSS(fonts: FontOption[], text?: string): Promise<{ fontCSS: string; fontUrls: string[] }> {
  const results = await Promise.allSettled(fonts.map(async (font) => {
    // 检查是否有本地版本
    const local = LOCAL_FONTS[font.id]
    if (local) {
      return local.cssContent
    }
    const url = googleFontUrl(font, text)
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    })
    if (!res.ok) return ''
    return await res.text()
  }))
  const allCSS = results.map(r => r.status === 'fulfilled' ? r.value : '').filter(Boolean).join('\n')
  // 收集所有字体文件 URL（包括本地和 Google）
  const fontUrls: string[] = []
  for (const font of fonts) {
    const local = LOCAL_FONTS[font.id]
    if (local) {
      fontUrls.push(...local.fileUrls)
    }
  }
  // 也提取 CSS 中的远程 font URL（其他非本地字体）
  const urlRegex = /url\(['"]?([^)'"]+)['"]?\)/g
  let match
  while ((match = urlRegex.exec(allCSS)) !== null) {
    const href = match[1]
    if (href && !fontUrls.includes(href)) fontUrls.push(href)
  }
  return { fontCSS: allCSS, fontUrls }
}

function extractSubsetChars(...objects: any[]): string {
  const chars = new Set<string>()
  const add = (v: unknown) => {
    if (typeof v === 'string') for (const c of v) if (c !== ' ') chars.add(c)
    else if (typeof v === 'object' && v) for (const val of Object.values(v as any)) add(val)
  }
  for (const obj of objects) add(obj)
  return Array.from(chars).join('')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { fonts, cssVars } = await getThemeConfig()

  const [heroCfg, companyCfg, servicesCfg, navCfg, footerCfg, contactCfg] = await Promise.all([
    prisma.siteConfig.findFirst({ where: { key: 'hero' } }),
    prisma.siteConfig.findFirst({ where: { key: 'company' } }),
    prisma.siteConfig.findFirst({ where: { key: 'services' } }),
    prisma.siteConfig.findFirst({ where: { key: 'navigation' } }),
    prisma.siteConfig.findFirst({ where: { key: 'footer' } }),
    prisma.siteConfig.findFirst({ where: { key: 'contact' } }),
  ])

  const heroVal = heroCfg ? JSON.parse(heroCfg.value) : {}
  const companyVal = companyCfg ? JSON.parse(companyCfg.value) : {}
  const servicesVal = servicesCfg ? JSON.parse(servicesCfg.value) : {}
  const navVal = navCfg ? JSON.parse(navCfg.value) : {}
  const footerVal = footerCfg ? JSON.parse(footerCfg.value) : {}
  const contactVal = contactCfg ? JSON.parse(contactCfg.value) : null

  const basicChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.·:：!？，。、；（）—&©'
  const pageChars = extractSubsetChars(heroVal, companyVal, servicesVal, navVal, footerVal)
  const fontSubsetText = basicChars + pageChars

  const { fontCSS, fontUrls } = fonts.length > 0 ? await fetchFontCSS(fonts, fontSubsetText) : { fontCSS: '', fontUrls: [] }
  const styleContent = fontCSS
    ? `${fontCSS}\n:root{${Object.entries(cssVars).map(([k, v]) => `${k}:${v}`).join(';')}}`
    : `:root{${Object.entries(cssVars).map(([k, v]) => `${k}:${v}`).join(';')}}`

  const navSite = navVal?.navigation || navVal || {}
  const logo = navSite?.logo || '栖光'
  const EN_LABELS: Record<string, string> = {
    home: 'Home',
    works: 'Works',
    gallery: 'Inspiration',
    community: 'Community',
    about: 'About',
    contact: 'Contact',
    lab: 'Lab',
  }
  let items = navSite?.items?.filter((i: any) => i.visible !== false && i.href !== '/canvas') || []
  // 添加英文和实验室入口（放在联系合作后面）
  if (!items.find((i: any) => i.href === '/lab')) {
    items.push({ id: 'lab', label: '实验室', labelEn: 'Lab', href: '/lab', visible: true, order: items.length })
  }
  // 补上英文标签
  items = items.map((i: any) => ({ ...i, labelEn: i.labelEn || EN_LABELS[i.id] || '' }))
  const footer = footerVal || null

  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {fontUrls.map((url, i) => (
          <link key={i} rel="preload" as="font" crossOrigin="anonymous" href={url} />
        ))}
        <style dangerouslySetInnerHTML={{ __html: styleContent }} />
      </head>
      <body className="bg-dark-900 text-white antialiased" suppressHydrationWarning>
        <Navigation initialLogo={logo} initialNavItems={items} />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer initialFooter={footer} initialContact={contactVal} />
      </body>
    </html>
  )
}
