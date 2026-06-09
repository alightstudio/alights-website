import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'
import {
  COMPANY_NAME, BRAND_NAME, BRAND_NAME_EN, SLOGAN, CONTACT, COPYRIGHT, SERVICES,
} from '@/lib/site-constants'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'

// 默认配置（fallback）
const DEFAULT_CONFIG = {
  company: {
    name: COMPANY_NAME,
    nameEn: "Xi'an Alights Culture Communication Co., Ltd.",
    shortName: BRAND_NAME.slice(0, 2),
    shortNameEn: BRAND_NAME_EN,
    slogan: SLOGAN,
    sloganEn: "Where Alights There Essence",
    description: `${COMPANY_NAME}，专注于高端视效制作领域。以光影为笔，以创意为墨，为品牌讲述动人故事。`,
    descriptionEn: "Xi'an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production. Using light and shadow as our brush, creativity as our ink, we tell compelling stories for brands."
  },
  contact: {
    phone: CONTACT.phone,
    email: CONTACT.email,
    address: CONTACT.address,
    wechat: CONTACT.wechat,
    weibo: "",
    xiaohongshu: ""
  },
  seo: {
    title: `${BRAND_NAME} | ${BRAND_NAME_EN} - ${SLOGAN}`,
    description: `${COMPANY_NAME}，专注于高端视效制作领域。TVC广告、产品动画、发布会、影视剧。`,
    keywords: "栖光,视效,TVC广告,产品动画,发布会,影视剧,3D渲染,CG"
  },
  hero: {
    title: "栖光",
    titleEn: "ALIGHTS",
    subtitle: SLOGAN,
    subtitleEn: "Where Alights There Essence",
    tags: [...SERVICES, "发布会"]
  },
  featuredWorks: [],
  services: [
    { id: "1", title: "AIGC", titleEn: "AIGC", desc: "AI 生成式视效创作", descEn: "AI-Generated Visual Effects", order: 1 },
    { id: "2", title: "TVC广告", titleEn: "TVC COMMERCIAL", desc: "高端商业广告制作", descEn: "Premium Commercial Production", order: 2 },
    { id: "3", title: "产品动画", titleEn: "PRODUCT ANIMATION", desc: "三维产品可视化", descEn: "3D Product Visualization", order: 3 },
    { id: "4", title: "产品发布会", titleEn: "PRODUCT LAUNCH", desc: "发布会大屏视觉设计与制作", descEn: "Event Screen Visual Design", order: 4 },
    { id: "5", title: "影视剧", titleEn: "FILM & TV", desc: "电影级特效制作", descEn: "Cinematic VFX Production", order: 5 }
  ],
  brands: [],
  brandDisplay: {
    opacity: 0.75,
    opacityHover: 1,
    grayscale: false,
    grayscaleHover: false
  },
  navigation: {
    logo: '栖光',
    items: [
      { id: 'home', label: '首页', href: '/', visible: true, order: 0 },
      { id: 'works', label: '作品集', href: '/works', visible: true, order: 1 },
      { id: 'gallery', label: '创意灵感', href: '/gallery', visible: true, order: 2 },
      { id: 'canvas', label: '实验室', href: '/canvas', visible: true, order: 3 },
      { id: 'community', label: '社区', href: '/community', visible: true, order: 4 },
      { id: 'about', label: '关于我们', href: '/about', visible: true, order: 5 },
      { id: 'contact', label: '联系合作', href: '/contact', visible: true, order: 6 },
    ]
  },
  footer: {
    logo: '栖光',
    tagline: SLOGAN,
    columns: [
      { id: 'nav', title: '导航', type: 'links', links: [
        { label: '首页', href: '/', order: 0 },
        { label: '作品集', href: '/works', order: 1 },
        { label: '创意灵感', href: '/gallery', order: 2 },
        { label: '社区', href: '/community', order: 3 },
        { label: '关于我们', href: '/about', order: 4 },
        { label: '联系合作', href: '/contact', order: 5 },
      ]},
      { id: 'services', title: '服务', type: 'text', items: ['AIGC', 'TVC广告', '产品动画', '产品发布会', '影视剧'] },
      { id: 'contact', title: '联系', type: 'contact' }
    ],
    copyright: COPYRIGHT,
    bottomText: 'alights.cn'
  },
  particle: {
    count: 200,
    size: 1.2,
    connectDist: 120,
    mouseRadius: 140,
    speed: 0.4,
    color: '#c9a962',
    opacity: 0.6,
    lineOpacity: 0.25,
    starCount: 60,
    trailOpacity: 0,
  },
  theme: {
    primaryColor: '#c9a962',
    bgColor: '#0a0a0a',
    textColor: '#ffffff',
    fontFamily: 'inter',
    fontDisplay: 'inter',
    fontHero: 'playfair',
    borderRadius: '0',
    customCSS: ''
  },
  pages: {
    home: { label: '首页', path: '/', visible: true },
    works: { label: '作品集', path: '/works', visible: true },
    gallery: { label: '创意灵感', path: '/gallery', visible: true },
    community: { label: '社区', path: '/community', visible: true },
    about: { label: '关于我们', path: '/about', visible: true },
    contact: { label: '联系合作', path: '/contact', visible: true },
    login: { label: '登录', path: '/login', visible: true },
    register: { label: '注册', path: '/register', visible: true },
    profile: { label: '个人中心', path: '/profile', visible: true },
    dashboard: { label: '创作中心', path: '/dashboard', visible: true },
  },
  announcement: {
    enabled: false,
    text: '',
    type: 'info',
    dismissible: true,
    link: null
  },
  codeInjection: {
    headHTML: '',
    footerHTML: '',
    bodyStartHTML: ''
  },
  socialLinks: {
    wechat: '',
    weibo: '',
    xiaohongshu: '',
    bilibili: '',
    douyin: '',
    github: ''
  }
}

async function isAuthenticated(): Promise<boolean> {
  return verifyAdminSession()
}

// 从数据库读取完整配置
async function readConfig(): Promise<Record<string, any>> {
  const configs = await prisma.siteConfig.findMany()
  const result: Record<string, any> = { ...DEFAULT_CONFIG }
  
  for (const c of configs) {
    try {
      result[c.key] = JSON.parse(c.value)
    } catch {
      result[c.key] = c.value
    }
  }
  
  return result
}

// 保存单个 section 到数据库
async function saveSection(key: string, data: any): Promise<void> {
  const value = JSON.stringify(data)
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
}

// GET /api/admin/settings - 获取完整配置
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const config = await readConfig()
    return NextResponse.json(config)
  } catch (error) {
    // P0-1: hidden
    // 如果数据库失败，返回默认配置
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

// PUT /api/admin/settings - 更新某个 section
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { section, data } = body

    if (!section || data === undefined) {
      return NextResponse.json({ error: '缺少 section 或 data 参数' }, { status: 400 })
    }
    // 安全修复：限制单次写入数据大小（防止数据库被恶意塞满）
    const serialized = JSON.stringify(data)
    if (serialized.length > 500_000) { // 500KB 上限
      return NextResponse.json({ error: '数据过大，最大允许 500KB' }, { status: 400 })
    }

    await saveSection(section, data)

    return NextResponse.json({ success: true, section, data })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 })
  }
}

// PATCH /api/admin/settings - 部分更新
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { section, data } = body

    if (!section || data === undefined) {
      return NextResponse.json({ error: '缺少 section 或 data 参数' }, { status: 400 })
    }
    // 安全修复：限制单次写入数据大小（防止数据库被恶意塞满）
    const serialized = JSON.stringify(data)
    if (serialized.length > 500_000) { // 500KB 上限
      return NextResponse.json({ error: '数据过大，最大允许 500KB' }, { status: 400 })
    }

    // 读取现有配置
    const config = await readConfig()
    const merged = { ...config[section], ...data }

    await saveSection(section, merged)

    return NextResponse.json({ success: true, section, data: merged })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 })
  }
}