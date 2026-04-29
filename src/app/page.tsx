import { prisma } from '@/lib/prisma'
import HomeClient from './HomeClient'
import { COMPANY_NAME, SLOGAN } from '@/lib/site-constants'

export const dynamic = 'force-dynamic'

const DEFAULT_HERO = { title: '栖光', titleEn: 'ALIGHTS', subtitle: SLOGAN, subtitleEn: 'Where Alights There Essence', tags: ['TVC广告', '产品动画', 'AIGC', '发布会', '影视剧'] }
const DEFAULT_BRAND_DISPLAY = { opacity: 0.75, opacityHover: 1, grayscale: true, grayscaleHover: true }

const DEFAULT_COMPANY = {
  name: COMPANY_NAME,
  nameEn: "Xi'an Alights Culture Communication Co., Ltd.",
  shortName: '栖光',
  shortNameEn: 'ALIGHTS',
  slogan: SLOGAN,
  sloganEn: 'Where Alights There Essence',
  description: `${COMPANY_NAME}，专注于高端视效制作领域`,
  descriptionEn: "Xi'an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production. ",
  detail: '深耕 TVC 广告、产品动画、发布会大屏、影视剧制作，为客户提供从创意到成片的完整视觉解决方案。',
}

const DEFAULT_SERVICES = [
  { title: 'TVC广告', titleEn: 'TVC COMMERCIAL', desc: '高端商业广告制作', descEn: 'Premium Commercial Production' },
  { title: '产品动画', titleEn: 'PRODUCT ANIMATION', desc: '三维产品可视化', descEn: '3D Product Visualization' },
  { title: '发布会', titleEn: 'EVENT SCREEN', desc: '沉浸式视觉体验', descEn: 'Immersive Visual Experience' },
  { title: '影视剧', titleEn: 'FILM & TV', desc: '电影级特效制作', descEn: 'Cinematic VFX Production' },
]

const DEFAULT_BRANDS = [
  { name: 'Mercedes-Benz', slug: 'mercedes' }, { name: 'BMW', slug: 'bmw' },
  { name: 'Audi', slug: 'audi' }, { name: 'Porsche', slug: 'porsche' },
  { name: 'Tesla', slug: 'tesla' }, { name: 'BYD', slug: 'byd' },
  { name: 'NIO', slug: 'nio' }, { name: 'Apple', slug: 'apple' },
  { name: 'Huawei', slug: 'huawei' }, { name: 'Xiaomi', slug: 'xiaomi' },
  { name: 'OPPO', slug: 'oppo' }, { name: 'vivo', slug: 'vivo' },
  { name: 'Samsung', slug: 'samsung' }, { name: 'Sony', slug: 'sony' },
  { name: 'DJI', slug: 'dji' }, { name: 'Dyson', slug: 'dyson' },
  { name: 'Bose', slug: 'bose' }, { name: 'Rolex', slug: 'rolex' },
  { name: 'Omega', slug: 'omega' }, { name: 'Cartier', slug: 'cartier' },
  { name: 'Tiffany & Co.', slug: 'tiffany' }, { name: 'Chanel', slug: 'chanel' },
  { name: 'Dior', slug: 'dior' }, { name: 'Gucci', slug: 'gucci' },
  { name: 'Hermès', slug: 'hermes' }, { name: 'Louis Vuitton', slug: 'louisvuitton' },
  { name: 'Prada', slug: 'prada' }, { name: 'Nike', slug: 'nike' },
  { name: 'Adidas', slug: 'adidas' }, { name: 'FILA', slug: 'fila' },
  { name: 'Anta', slug: 'anta' }, { name: 'Li-Ning', slug: 'lining' },
  { name: 'Estée Lauder', slug: 'esteelauder' }, { name: 'Shiseido', slug: 'shiseido' },
]

/** 服务端读取完整网站配置 */
async function getInitialConfig() {
  try {
    const configs = await prisma.siteConfig.findMany()
    const configMap: Record<string, any> = {}
    for (const c of configs) {
      try { configMap[c.key] = JSON.parse(c.value) } catch { configMap[c.key] = c.value }
    }
    const hero = (() => {
      const h = configMap.hero || DEFAULT_HERO
      if (h && typeof h.tags === 'string') h.tags = h.tags.split(',').map((t: string) => t.trim())
      return h
    })()
    return {
      hero,
      company: configMap.company || DEFAULT_COMPANY,
      services: configMap.services || DEFAULT_SERVICES,
      brands: configMap.brands || DEFAULT_BRANDS,
      brandDisplay: configMap.brandDisplay || DEFAULT_BRAND_DISPLAY,
      navigation: configMap.navigation || null,
      particle: configMap.particle || null,
      spotlight: configMap.spotlight || null,
    }
  } catch {
    return {
      hero: DEFAULT_HERO,
      company: DEFAULT_COMPANY,
      services: DEFAULT_SERVICES,
      brands: DEFAULT_BRANDS,
      brandDisplay: DEFAULT_BRAND_DISPLAY,
      navigation: null,
      particle: null,
      spotlight: null,
    }
  }
}

/** 服务端读取精选作品（从数据库 featuredWorks 配置按热度排序） */
async function getInitialWorks() {
  try {
    const config = await prisma.siteConfig.findUnique({ where: { key: 'featuredWorks' } })
    if (!config?.value) return []
    const works = JSON.parse(config.value) as any[]
    // 按热度(views)降序，取前6
    works.sort((a, b) => (b.views || 0) - (a.views || 0))
    return works.slice(0, 6).map(w => ({
      id: w.id,
      title: w.title,
      titleEn: w.titleEn || '',
      coverUrl: w.image || '',
      thumbnail: w.image || '', // 兼容 HomeClient 中同时使用 coverUrl 和 thumbnail
      category: w.category || '',
      categoryEn: w.categoryEn || '',
      views: w.views || 0,
      videoUrl: w.videoUrl || '',
      heat: w.views || 0,
    }))
  } catch {
    return []
  }
}

export default async function HomePage() {
  const [initialConfig, initialWorks] = await Promise.all([
    getInitialConfig(),
    getInitialWorks(),
  ])

  return <HomeClient initialConfig={initialConfig} initialWorks={initialWorks} />
}
