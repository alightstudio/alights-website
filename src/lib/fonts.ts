// ===== 字体预设 =====

export interface FontOption {
  id: string
  name: string
  family: string           // CSS font-family value (e.g. "'Inter'")
  googleFontName: string   // URL-encoded name for Google Fonts (e.g. "Inter")
  weights: string          // weight list (e.g. "300;400;500;600;700")
  category: 'sans-serif' | 'serif' | 'display'
  chineseSupport: boolean
}

/** 正文字体选项（无衬线） */
export const SANS_FONTS: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    family: "'Inter'",
    googleFontName: 'Inter',
    weights: '300;400;500;600;700',
    category: 'sans-serif',
    chineseSupport: false,
  },
  {
    id: 'manrope',
    name: 'Manrope',
    family: "'Manrope'",
    googleFontName: 'Manrope',
    weights: '300;400;500;600;700',
    category: 'sans-serif',
    chineseSupport: false,
  },
  {
    id: 'noto-sans-sc',
    name: 'Noto Sans SC',
    family: "'Noto Sans SC'",
    googleFontName: 'Noto+Sans+SC',
    weights: '300;400;500;700',
    category: 'sans-serif',
    chineseSupport: true,
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: "'Outfit'",
    googleFontName: 'Outfit',
    weights: '300;400;500;600;700',
    category: 'sans-serif',
    chineseSupport: false,
  },
]

/** 展示/标题字体选项 */
export const DISPLAY_FONTS: FontOption[] = [
  {
    id: 'playfair',
    name: 'Playfair Display',
    family: "'Playfair Display'",
    googleFontName: 'Playfair+Display',
    weights: '400;500;600;700',
    category: 'serif',
    chineseSupport: false,
  },
  {
    id: 'noto-serif-sc',
    name: 'Noto Serif SC',
    family: "'Noto Serif SC'",
    googleFontName: 'Noto+Serif+SC',
    weights: '300;400;500;600;700;900',
    category: 'serif',
    chineseSupport: true,
  },
  ...SANS_FONTS,
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans'",
    googleFontName: 'Plus+Jakarta+Sans',
    weights: '300;400;500;600;700',
    category: 'sans-serif',
    chineseSupport: false,
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    family: "'DM Sans'",
    googleFontName: 'DM+Sans',
    weights: '300;400;500;600;700',
    category: 'sans-serif',
    chineseSupport: false,
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: "'Space Grotesk'",
    googleFontName: 'Space+Grotesk',
    weights: '300;400;500;600;700',
    category: 'sans-serif',
    chineseSupport: false,
  },
]

/** 按 ID 查找字体 */
export function findFont(id: string): FontOption | undefined {
  return DISPLAY_FONTS.find(f => f.id === id)
}

/** 生成 Google Fonts URL */
export function googleFontUrl(font: FontOption, text?: string): string {
  let url = `https://fonts.googleapis.com/css2?family=${font.googleFontName}:wght@${font.weights}&display=swap`
  if (text) url += `&text=${encodeURIComponent(text)}`
  return url
}

/** 动态加载 Google Font（注入 <link>） */
export function loadGoogleFont(fontId: string) {
  if (typeof document === 'undefined') return
  const font = findFont(fontId)
  if (!font) return

  const linkId = `gf-${font.id}`
  if (document.getElementById(linkId)) return // 已加载

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = googleFontUrl(font)
  document.head.appendChild(link)
}
