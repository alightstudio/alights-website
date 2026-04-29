'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import SpotlightText, { resolveSpotlightConfig, SpotlightConfig } from '@/components/SpotlightText'
import topInspirations from '@/data/top-inspirations.json'
import { COMPANY_NAME, SLOGAN } from '@/lib/site-constants'

// 禁用 SSR 以避免水合不匹配（Canvas 组件在服务端无 DOM）
const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false })

const DEFAULT_HERO = {
  title: '栖光',
  titleEn: 'ALIGHTS',
  subtitle: SLOGAN,
  subtitleEn: 'Where Alights·There Essence',
  tags: ['TVC广告', '产品动画', 'AIGC', '发布会', '影视剧'],
}

const DEFAULT_COMPANY = {
  name: COMPANY_NAME,
  nameEn: "Xi'an Alights Culture Communication Co., Ltd.",
  shortName: '栖光',
  shortNameEn: 'ALIGHTS',
  slogan: SLOGAN,
  sloganEn: 'Where Alights·There Essence',
  description: `${COMPANY_NAME}，专注于高端视效制作领域`,
  descriptionEn: "Xi'an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production. ",
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

const DEFAULT_WORKS_PLACEHOLDER = [
  { title: '灯语 LIST', titleEn: 'DENGYU LIST', image: 'https://us-xpc5.xpccdn.com/b9c708b9-6207-41ce-a59a-b9d6ee88ae7b/c9de12f5-c71f-4aeb-bad9-f67154f88084.jpg', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL' },
  { title: '想象 LIST', titleEn: 'Xiangxiang LIST', image: 'https://us-xpc5.xpccdn.com/2c1ed4da-92ea-4c0e-9d40-58d1c09b3c5c/6db3c289-f6c1-440d-bc1e-c83671cae8d8.jpg', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL' },
  { title: '稳座 LIST', titleEn: 'Wenzuo LIST', image: 'https://us-xpc5.xpccdn.com/4448bed8-579a-4bb2-9b6d-d8defbabd26a/edc0041e-f0e9-4f07-9623-517d7301aba7.jpg', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL' },
  { title: '费翔 X D19', titleEn: 'LEAPMOTOR D19', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/12/29/e4c586d43e41944b1d8b58476da7549c', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL' },
  { title: '张天爱 | 雅娜薇图', titleEn: 'ZHANG TIANAI', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/12/11/03e3d4b574519e1720d84581c1d2e331', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL' },
  { title: '自然堂 × 上海芭蕾舞团', titleEn: 'NATURAKING × SHANGHAI BALLET', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/11/19/8da797222568e63a917063af9df6c14f', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL' },
]

const NoiseBg = () => (
  <div className="absolute inset-0 opacity-[0.03]" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  }} />
)

interface HomeClientProps {
  initialConfig: any
  initialWorks: any[]
}

export default function HomeClient({ initialConfig, initialWorks }: HomeClientProps) {
  const [config, setConfig] = useState<any>(initialConfig)
  const [works, setWorks] = useState<any[]>(initialWorks)



  const company = config?.company || DEFAULT_COMPANY
  const hero = config?.hero || DEFAULT_HERO
  const services = (config?.services?.length ? config.services : DEFAULT_SERVICES)
  const brands = (config?.brands?.length ? config.brands : DEFAULT_BRANDS)
  const bd = config?.brandDisplay || { opacity: 0.75, opacityHover: 1, grayscale: true, grayscaleHover: true }
  const logo = config?.navigation?.logo || '栖光'
  const particleConfig = config?.particle
  const spotlightConfig: SpotlightConfig = resolveSpotlightConfig(config?.spotlight)

  const hasBrandSlug = (brand: any): brand is { name: string; logo?: string; slug: string } =>
    typeof brand.slug === 'string'

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-dark-900"><NoiseBg /></div>
        {particleConfig && <ParticleBackground config={particleConfig} />}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/50 via-dark-800/80 to-dark-900" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-accent-gold/10 to-transparent" />
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div>
            <p className="text-xs md:text-sm text-accent-gold/60 tracking-[0.4em] uppercase mb-4">Visual Effects Studio</p>
            <div className="mb-2">
              <h1 className="font-hero text-6xl md:text-8xl font-black tracking-wider text-gray-300">
                {hero.title}
              </h1>
            </div>
            <p className="text-xl md:text-3xl font-display font-light tracking-[0.3em] text-gray-500">
              {hero.titleEn}
            </p>
          </div>
          <div className="mt-12 flex flex-col items-center">
            <SpotlightText
              text={hero.subtitle}
              config={spotlightConfig}
              className="text-lg md:text-xl font-light leading-relaxed text-center"
              glowClassName="text-lg md:text-xl font-light leading-relaxed"
            />
            <div className="mt-2">
              <SpotlightText
                text={hero.subtitleEn}
                config={spotlightConfig}
                className="text-sm tracking-wide text-center"
                glowClassName="text-sm tracking-wide"
              />
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-600 tracking-wider">
              {(Array.isArray(hero.tags) ? hero.tags : []).map((tag: string, i: number) => (
                <span key={tag}>{tag}{i < hero.tags.length - 1 && <span className="text-gray-700 ml-4">·</span>}</span>
              ))}
            </div>
          </div>
          <div className="mt-16">
            <Link href="#works" className="inline-block border border-accent-gold/40 text-accent-gold px-12 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500">
             浏览作品 · Explore Works
            </Link>
          </div>
        </div>
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2"><div className="w-px h-16 bg-gradient-to-b from-transparent via-gray-600 to-transparent" /></div>
      </section>

      {/* About Preview */}
      <section className="py-32 px-6 md:px-12 lg:px-24 relative">
        <NoiseBg />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">About Us</p>
              <h2 className="font-display text-4xl md:text-5xl font-light mb-2">关于{company.shortName || logo}</h2>
              <p className="text-sm text-gray-500 tracking-wider mb-2">ABOUT {(company.nameEn || 'ALIGHTS').toUpperCase()}</p>
                <p className="text-gray-400 leading-relaxed mb-2">{company.description}</p>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{company.descriptionEn}</p>
                <p className="text-gray-600 text-xs leading-relaxed mb-8">{company.detail}</p>
              <Link href="/about" className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors">
              了解更多 · Learn More →
              </Link>
            </div>
            <div className="relative aspect-[4/3] bg-dark-800 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-dark-700 to-dark-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-6xl text-accent-gold/20 mb-2">{(company.shortName || '栖')[0]}</p>
                  <p className="text-gray-600 text-xs tracking-[0.5em]">{(company.shortNameEn || logo).toUpperCase()}</p>
                </div>
              </div>
              <div className="absolute inset-0 border border-accent-gold/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800 relative">
        <NoiseBg />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Services</p>
            <h2 className="font-display text-4xl md:text-5xl font-light mb-2">服务领域</h2>
            <p className="text-sm text-gray-500 tracking-wider mb-4">OUR EXPERTISE</p>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service: any) => (
              <div key={service.title} className="group p-8 border border-dark-500 hover:border-accent-gold/30 transition-all duration-500 bg-dark-900/50">
                <p className="text-[10px] text-gray-600 tracking-[0.2em] mb-2">{service.titleEn}</p>
                <h3 className="text-xl font-light mb-3 tracking-wide">{service.title}</h3>
                <p className="text-gray-500 text-sm mb-1">{service.desc}</p>
                <p className="text-gray-600 text-xs">{service.descEn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Creative Inspiration — Top 9 Hot Videos */}
      <section className="py-32 px-6 md:px-12 lg:px-24 relative">
        <NoiseBg />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Inspiration</p>
            <h2 className="font-display text-4xl md:text-5xl font-light mb-2">创意灵感</h2>
            <p className="text-sm text-gray-500 tracking-wider mb-6">CREATIVE SPARK · 热门灵感</p>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topInspirations.map((work: any, i: number) => (
              <Link key={work.id} href="/gallery"
                className="group cursor-pointer block">
                <div className="relative aspect-video bg-dark-800 border border-dark-700 overflow-hidden mb-3">
                  <img
                    src={work.thumbnail}
                    alt={work.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  <div className="absolute inset-0 border border-accent-gold/0 group-hover:border-accent-gold/20 transition-colors duration-500" />
                  <div className="absolute top-2 right-2 bg-black/70 text-xs text-gray-400 px-2 py-0.5">
                    {Math.floor(work.duration / 60)}:{String(work.duration % 60).padStart(2, '0')}
                  </div>
                  <div className="absolute top-2 left-2 bg-accent-gold/90 text-dark-900 text-xs font-medium px-2 py-0.5">
                    🔥 {work.views.toLocaleString()}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-2xl text-accent-gold">查看详情</span>
                  </div>
                </div>
                <h3 className="text-sm font-light mb-1 group-hover:text-accent-gold/80 transition-colors leading-snug">{work.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{work.categories}</span>
                  <span>·</span>
                  <span>{work.views.toLocaleString()} 播放</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-16">
            <Link href="/gallery" className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors">
              查看全部灵感 · View All Inspiration →
            </Link>
          </div>
        </div>
      </section>

      {/* Partners / Brands */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800/50 relative overflow-hidden">
        <NoiseBg />
        <div className="max-w-[1400px] mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Trusted By</p>
            <h2 className="font-display text-3xl md:text-4xl font-light mb-2">合作品牌</h2>
            <p className="text-xs text-gray-600 tracking-wider">PARTNER BRANDS · 值得信赖</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6 md:gap-8">
            {brands.map((brand: any) => {
              const imgSrc = hasBrandSlug(brand) ? `/brands/${brand.slug}.svg` : (brand.logo || '')
              if (!imgSrc) return <div key={brand.name} className="text-gray-600 text-xs text-center py-4">{brand.name}</div>
              return (
                <div key={brand.name} className="group flex items-center justify-center aspect-[3/2] px-2" title={brand.name}>
                  <Image src={imgSrc} alt={brand.name} width={100} height={50}
                    className="w-full h-auto max-h-8 object-contain transition-all duration-500"
                    style={{ opacity: bd.opacity ?? 0.75, filter: bd.grayscale !== false ? 'grayscale(100%)' : 'none' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLImageElement; el.style.opacity = String(bd.opacityHover ?? 0.8); if (bd.grayscaleHover !== false) el.style.filter = 'grayscale(0%)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLImageElement; el.style.opacity = String(bd.opacity ?? 0.75); if (bd.grayscale !== false) el.style.filter = 'grayscale(100%)' }}
                  />
                </div>
              )
            })}
          </div>
          <div className="mt-20 h-px bg-gradient-to-r from-transparent via-dark-500 to-transparent" />
        </div>
      </section>

      {/* Featured Works */}
      <section id="works" className="py-32 px-6 md:px-12 lg:px-24 relative">
        <NoiseBg />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Portfolio</p>
            <h2 className="font-display text-4xl md:text-5xl font-light mb-2">代表作品</h2>
            <p className="text-sm text-gray-500 tracking-wider mb-6">SELECTED WORKS · 精选项目</p>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.length > 0 ? works.map((work: any) => (
              <Link key={work.id} href="/works" className="group relative aspect-[4/3] bg-dark-800 overflow-hidden cursor-pointer block">
                <Image src={work.coverUrl || ''} alt={work.title} referrerPolicy="no-referrer" fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute inset-0 border border-accent-gold/0 group-hover:border-accent-gold/20 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[10px] text-accent-gold/70 tracking-[0.2em] mb-1">{work.titleEn || ''}</p>
                  <h3 className="text-lg font-light mb-2 tracking-wide">{work.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{work.category}</span><span className="text-gray-700">·</span><span className="text-gray-600">{work.categoryEn || ''}</span>
                  </div>
                </div>
              </Link>
            )) : DEFAULT_WORKS_PLACEHOLDER.map((work, i) => (
              <Link key={i} href="/works" className="group relative aspect-[4/3] bg-dark-800 overflow-hidden cursor-pointer block">
                <Image src={work.image} alt={work.title} referrerPolicy="no-referrer" fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute inset-0 border border-accent-gold/0 group-hover:border-accent-gold/20 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[10px] text-accent-gold/70 tracking-[0.2em] mb-1">{work.titleEn}</p>
                  <h3 className="text-lg font-light mb-2 tracking-wide">{work.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500"><span>{work.category}</span><span className="text-gray-700">·</span><span className="text-gray-600">{work.categoryEn}</span></div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-16">
            <Link href="/works" className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors">
              查看全部作品 · View All Works →
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800 relative">
        <NoiseBg />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Contact</p>
          <h2 className="font-display text-4xl md:text-5xl font-light mb-2">开启合作</h2>
          <p className="text-sm text-gray-500 tracking-wider mb-8">LET&apos;S CREATE TOGETHER</p>
          <p className="text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">无论您的项目规模大小,我们都将用心对待。期待与您一起,用光影创造不凡。</p>
          <p className="text-gray-600 text-sm mb-12 max-w-2xl mx-auto leading-relaxed">No matter the scale of your project, we approach it with dedication. Let&apos;s create something extraordinary together with light and shadow.</p>
          <Link href="/contact" className="inline-block border border-accent-gold/40 text-accent-gold px-12 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500">
            联系合作 · Get In Touch
          </Link>
        </div>
      </section>
    </div>
  )
}
