import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  COMPANY_NAME, BRAND_NAME, BRAND_NAME_EN, SLOGAN, CONTACT, COPYRIGHT, SERVICES,
} from '@/lib/site-constants'

// P0-3 修复：使用 sanitize-html 库替代正则，防御所有 XSS 向量
import sanitize from 'sanitize-html'

function sanitizeHTML(html: string): string {
  if (!html) return ''
  return sanitize(html, {
    allowedTags: ['h1','h2','h3','h4','h5','h6','p','br','hr','div','span','ul','ol','li','strong','em','b','i','u','s','a','blockquote','code','pre','img','section','article','aside'],
    allowedAttributes: {
      a: ['href','title','target','rel'],
      img: ['src','alt','width','height','loading','class'],
      div: ['class','id'],
      section: ['class','id'],
      article: ['class','id'],
      aside: ['class','id'],
      span: ['class'],
      p: ['class'],
    },
    allowedSchemes: ['http','https','mailto'],
    disallowedTagsMode: 'discard',
    enforceHtmlBoundary: true,
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === '_blank') attribs.rel = (attribs.rel||'') + ' noopener noreferrer'
        return { tagName, attribs }
      },
    },
  })
}

// 强制动态渲染（每次请求都从数据库读取最新数据）
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ===== Default Config Fallbacks =====
const DEFAULT_COMPANY = {
  name: COMPANY_NAME,
  nameEn: "Xi'an Alights Culture Communication Co., Ltd.",
  shortName: BRAND_NAME.slice(0, 2),
  shortNameEn: BRAND_NAME_EN,
  slogan: SLOGAN,
  sloganEn: "Where light alights · Truth resides",
  description: `${COMPANY_NAME}，专注于高端视效制作领域。以光影为笔，以创意为墨，为品牌讲述动人故事。`,
  descriptionEn: "Xi'an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production."
}

const DEFAULT_CONTACT = { phone: CONTACT.phone, email: CONTACT.email, address: CONTACT.address, wechat: CONTACT.wechat }
const DEFAULT_SEO = { title: `${BRAND_NAME} | ${BRAND_NAME_EN} - ${SLOGAN}`, description: `${COMPANY_NAME}，专注于高端视效制作领域。TVC广告、产品动画、发布会、影视剧。`, keywords: "栖光,视效,TVC广告" }
const DEFAULT_HERO = { title: "栖光", titleEn: "ALIGHTS", subtitle: SLOGAN, subtitleEn: "Where light alights · Truth resides", tags: [...SERVICES, "产品发布会"] }

const DEFAULT_NAVIGATION = {
  logo: "栖光",
  items: [
    { id: "home", label: "首页", href: "/", visible: true, order: 0 },
    { id: "works", label: "作品集", href: "/works", visible: true, order: 1 },
    { id: "gallery", label: "创意灵感", href: "/gallery", visible: true, order: 2 },
    { id: "canvas", label: "像素画布", href: "/canvas", visible: true, order: 3 },
    { id: "community", label: "社区", href: "/community", visible: true, order: 4 },
    { id: "about", label: "关于我们", href: "/about", visible: true, order: 5 },
    { id: "contact", label: "联系合作", href: "/contact", visible: true, order: 6 },
    { id: "login", label: "登录", href: "/login", visible: false, order: 7 },
    { id: "register", label: "注册", href: "/register", visible: false, order: 8 },
    { id: "profile", label: "个人中心", href: "/profile", visible: false, order: 9 },
    { id: "dashboard", label: "创作中心", href: "/dashboard", visible: false, order: 10 },
  ]
}

const DEFAULT_FOOTER = {
  logo: "栖光",
  tagline: SLOGAN,
  columns: [
    {
      id: "nav", title: "导航", type: "links",
      links: [
        { label: "作品集", href: "/works", order: 0 },
        { label: "创意灵感", href: "/gallery", order: 1 },
        { label: "像素画布", href: "/canvas", order: 2 },
        { label: "社区", href: "/community", order: 3 },
        { label: "关于我们", href: "/about", order: 4 },
        { label: "联系方式", href: "/contact", order: 5 },
      ]
    },
    {
      id: "services", title: "服务", type: "text",
      items: ["TVC广告", "产品动画", "发布会", "影视剧"]
    },
    {
      id: "contact", title: "联系", type: "contact"
    }
  ],
  copyright: COPYRIGHT,
  bottomText: "alights.cn"
}

const DEFAULT_THEME = {
  primaryColor: "#c9a962",
  bgColor: "#0a0a0a",
  textColor: "#ffffff",
  fontFamily: "inter",
  fontDisplay: "inter",
  fontHero: "playfair",
  borderRadius: "0",
  customCSS: ""
}

const DEFAULT_ANNOUNCEMENT = {
  enabled: false,
  text: "",
  type: "info",
  dismissible: true,
  link: null
}

const DEFAULT_PAGES = {
  home: { label: "首页", path: "/", visible: true },
  works: { label: "作品集", path: "/works", visible: true },
  gallery: { label: "创意灵感", path: "/gallery", visible: true },
  canvas: { label: "像素画布", path: "/canvas", visible: true },
  community: { label: "社区", path: "/community", visible: true },
  about: { label: "关于我们", path: "/about", visible: true },
  contact: { label: "联系合作", path: "/contact", visible: true },
  login: { label: "登录", path: "/login", visible: true },
  register: { label: "注册", path: "/register", visible: true },
  profile: { label: "个人中心", path: "/profile", visible: true },
  dashboard: { label: "创作中心", path: "/dashboard", visible: true },
}

const DEFAULT_CODE_INJECTION = {
  headHTML: "",
  footerHTML: "",
  bodyStartHTML: ""
}

const DEFAULT_SOCIAL_LINKS = {
  wechat: "",
  weibo: "",
  xiaohongshu: "",
  bilibili: "",
  douyin: "",
  github: ""
}

// GET /api/site - 公开的网站配置读取接口（无需认证）
export async function GET() {
  try {
    const configs = await prisma.siteConfig.findMany()
    const configMap: Record<string, any> = {}
    
    for (const c of configs) {
      try {
        configMap[c.key] = JSON.parse(c.value)
      } catch {
        configMap[c.key] = c.value
      }
    }

    return NextResponse.json({
      company: (() => { const c = configMap.company || DEFAULT_COMPANY; return c; })(),
      contact: { phone: configMap.contact?.phone || DEFAULT_CONTACT.phone, email: configMap.contact?.email || DEFAULT_CONTACT.email, address: configMap.contact?.address || DEFAULT_CONTACT.address, wechat: configMap.contact?.wechat || "" },
      seo: configMap.seo || DEFAULT_SEO,
      hero: (() => { const h = configMap.hero || DEFAULT_HERO; if (h && typeof h.tags === 'string') h.tags = h.tags.split(',').map((t: string) => t.trim()); return h; })(),
      featuredWorks: configMap.featuredWorks || [],
      services: configMap.services || [],
      brands: configMap.brands || [],
      brandDisplay: configMap.brandDisplay || { opacity: 0.75, opacityHover: 1, grayscale: true, grayscaleHover: true },
      navigation: configMap.navigation || DEFAULT_NAVIGATION,
      footer: configMap.footer || DEFAULT_FOOTER,
      theme: configMap.theme || DEFAULT_THEME,
      announcement: configMap.announcement || DEFAULT_ANNOUNCEMENT,
      pages: configMap.pages || DEFAULT_PAGES,
      codeInjection: (() => { 
        const ci = configMap.codeInjection || DEFAULT_CODE_INJECTION
        // C-4 修复：使用严格的 HTML sanitizer 替代简单正则
        return { headHTML: sanitizeHTML(ci.headHTML), footerHTML: sanitizeHTML(ci.footerHTML), bodyStartHTML: sanitizeHTML(ci.bodyStartHTML) }
      })(),
      socialLinks: configMap.socialLinks || DEFAULT_SOCIAL_LINKS,
      particle: configMap.particle || null,
      spotlight: configMap.spotlight || null,
      aboutTeamVideo: configMap.aboutTeamVideo || '',
    })
  } catch {
    // P0-1：隐藏错误详情
    return NextResponse.json({
      company: DEFAULT_COMPANY,
      contact: DEFAULT_CONTACT,
      seo: DEFAULT_SEO,
      hero: DEFAULT_HERO,
      featuredWorks: [],
      services: [],
      brands: [],
      brandDisplay: { opacity: 0.75, opacityHover: 1, grayscale: true, grayscaleHover: true },
      particle: null,
      spotlight: null,
      aboutTeamVideo: '',
    })
  }
}