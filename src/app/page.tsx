'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const DEFAULT_HERO = {
  title: '栖光',
  titleEn: 'ALIGHTS',
  subtitle: '专业视效制作 · 光影叙事艺术',
  subtitleEn: 'Professional Visual Effects · Cinematic Storytelling',
  tags: ['TVC广告', '产品动画', '发布会大屏', '影视剧'],
}

const DEFAULT_COMPANY = {
  name: '西安栖光文化传播有限公司',
  shortName: '栖光',
  description: '西安栖光文化传播有限公司,专注于高端视效制作领域。以光影为笔,以创意为墨,为品牌讲述动人故事。',
  descriptionEn: "Xi'an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production. Using light and shadow as our brush, creativity as our ink, we tell compelling stories for brands.",
  detail: '深耕 TVC 广告、产品动画、发布会大屏、影视剧制作,为客户提供从创意到成片的完整视觉解决方案。',
}

const DEFAULT_SERVICES = [
  { title: 'TVC广告', titleEn: 'TVC COMMERCIAL', desc: '高端商业广告制作', descEn: 'Premium Commercial Production' },
  { title: '产品动画', titleEn: 'PRODUCT ANIMATION', desc: '三维产品可视化', descEn: '3D Product Visualization' },
  { title: '发布会大屏', titleEn: 'EVENT SCREEN', desc: '沉浸式视觉体验', descEn: 'Immersive Visual Experience' },
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

const DEFAULT_BRAND_DISPLAY = { opacity: 0.4, opacityHover: 0.8, grayscale: true, grayscaleHover: true }

const NoiseBg = () => (
  <div className="absolute inset-0 opacity-[0.03]" style={{
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  }} />
)

export default function Home() {
  const [config, setConfig] = useState<any>(null)
  const [works, setWorks] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then(r => r.ok ? r.json() : {}).catch(() => ({})),
      fetch('/api/featured-works?limit=6').then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([cfg, ws]) => {
      setConfig(cfg)
      setWorks(Array.isArray(ws) ? ws.slice(0, 6) : [])
    })
  }, [])

  const company = config?.company || DEFAULT_COMPANY
  const hero = config?.hero || DEFAULT_HERO
  const services = (config?.services?.length ? config.services : DEFAULT_SERVICES)
  const brands = (config?.brands?.length ? config.brands : DEFAULT_BRANDS)
  const bd = config?.brandDisplay || DEFAULT_BRAND_DISPLAY
  const logo = config?.navigation?.logo || '栖光'

  const hasBrandSlug = (brand: any): brand is { name: string; logo?: string; slug: string } =>
    typeof brand.slug === 'string'

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-dark-900"><NoiseBg /></div>
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/50 via-dark-800/80 to-dark-900" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-accent-gold/10 to-transparent" />
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div>
            <p className="text-xs md:text-sm text-accent-gold/60 tracking-[0.4em] uppercase mb-4">Visual Effects Studio</p>
            <h1 className="font-display text-6xl md:text-8xl font-light tracking-wider mb-2">{hero.title}</h1>
            <p className="text-xl md:text-3xl text-gray-500 font-light tracking-[0.3em] mb-6">{hero.titleEn}</p>
          </div>
          <div className="mt-12">
            <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto">{hero.subtitle}</p>
            <p className="text-sm text-gray-500 mt-2 tracking-wide">{hero.subtitleEn}</p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-600 tracking-wider">
              {(Array.isArray(hero.tags) ? hero.tags : []).map((tag: string, i: number) => (
                <span key={tag}>{tag}{i < hero.tags.length - 1 && <span className="text-gray-700 ml-4">·</span>}</span>
              ))}
            </div>
          </div>
          <div className="mt-16">
            <Link href="#works" className="inline-block border border-accent-gold/40 text-accent-gold px-12 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500">Explore Works</Link>
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
              <p className="text-sm text-gray-500 tracking-wider mb-8">ABOUT {(company.nameEn || 'ALIGHTS').toUpperCase()}</p>
              <p className="text-gray-400 leading-relaxed mb-6">{company.description}</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{company.descriptionEn}</p>
              <p className="text-gray-600 text-xs leading-relaxed mb-8">{company.detail}</p>
              <Link href="/about" className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors">Learn More →</Link>
            </div>
            <div className="relative aspect-[4/3] bg-dark-800 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-dark-700 to-dark-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-6xl text-accent-gold/20 mb-2">{(company.shortName || '栖')[0]}</p>
                  <p className="text-gray-600 text-xs tracking-[0.5em]">{logo.toUpperCase()}</p>
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
            <p className="text-sm text-gray-500 tracking-wider mb-6">OUR EXPERTISE</p>
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

      {/* Partners / Brands */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800/50 relative overflow-hidden">
        <NoiseBg />
        <div className="max-w-[1400px] mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Trusted By</p>
            <h2 className="font-display text-3xl md:text-4xl font-light mb-2">合作品牌</h2>
            <p className="text-xs text-gray-600 tracking-wider">PARTNER BRANDS</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6 md:gap-8">
            {brands.map((brand: any) => {
              const imgSrc = hasBrandSlug(brand) ? `/brands/${brand.slug}.svg` : (brand.logo || '')
              if (!imgSrc) return <div key={brand.name} className="text-gray-600 text-xs text-center py-4">{brand.name}</div>
              return (
                <div key={brand.name} className="group flex items-center justify-center aspect-[3/2] px-2" title={brand.name}>
                  <Image src={imgSrc} alt={brand.name} width={100} height={50}
                    className="w-full h-auto max-h-8 object-contain transition-all duration-500"
                    style={{ opacity: bd.opacity ?? 0.4, filter: bd.grayscale !== false ? 'grayscale(100%)' : 'none' }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLImageElement; el.style.opacity = String(bd.opacityHover ?? 0.8); if (bd.grayscaleHover !== false) el.style.filter = 'grayscale(0%)' }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLImageElement; el.style.opacity = String(bd.opacity ?? 0.4); if (bd.grayscale !== false) el.style.filter = 'grayscale(100%)' }}
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
            <p className="text-sm text-gray-500 tracking-wider mb-6">SELECTED WORKS</p>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.length > 0 ? works.map((work: any) => (
              <div key={work.id} className="group relative aspect-[4/3] bg-dark-800 overflow-hidden cursor-pointer">
                <Image src={work.coverUrl || ''} alt={work.title} fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute inset-0 border border-accent-gold/0 group-hover:border-accent-gold/20 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[10px] text-accent-gold/70 tracking-[0.2em] mb-1">{work.titleEn || ''}</p>
                  <h3 className="text-lg font-light mb-2 tracking-wide">{work.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{work.category}</span><span className="text-gray-700">·</span><span className="text-gray-600">{work.categoryEn || ''}</span>
                  </div>
                </div>
              </div>
            )) : (
              <>
                {[
                  { title: '灯语 LIST', titleEn: 'DENGYU LIST', image: 'https://us-xpc5.xpccdn.com/b9c708b9-6207-41ce-a59a-b9d6ee88ae7b/c9de12f5-c71f-4aeb-bad9-f67154f88084.jpg' },
                  { title: '想象 LIST', titleEn: 'Xiangxiang LIST', image: 'https://us-xpc5.xpccdn.com/2c1ed4da-92ea-4c0e-9d40-58d1c09b3c5c/6db3c289-f6c1-440d-bc1e-c83671cae8d8.jpg' },
                  { title: '稳座 LIST', titleEn: 'Wenzuo LIST', image: 'https://us-xpc5.xpccdn.com/4448bed8-579a-4bb2-9b6d-d8defbabd26a/edc0041e-f0e9-4f07-9623-517d7301aba7.jpg' },
                  { title: '费翔 X D19', titleEn: 'LEAPMOTOR D19', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/12/29/e4c586d43e41944b1d8b58476da7549c' },
                  { title: '张天爱 | 雅娜薇图', titleEn: 'ZHANG TIANAI', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/12/11/03e3d4b574519e1720d84581c1d2e331' },
                  { title: '自然堂 × 上海芭蕾舞团', titleEn: 'NATURAKING × SHANGHAI BALLET', image: 'https://oss-xpc0.xpccdn.com/uploadfile/article/2025/11/19/8da797222568e63a917063af9df6c14f' },
                ].map((work, i) => (
                  <div key={i} className="group relative aspect-[4/3] bg-dark-800 overflow-hidden cursor-pointer">
                    <Image src={work.image} alt={work.title} fill className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                    <div className="absolute inset-0 border border-accent-gold/0 group-hover:border-accent-gold/20 transition-colors duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <p className="text-[10px] text-accent-gold/70 tracking-[0.2em] mb-1">{work.titleEn}</p>
                      <h3 className="text-lg font-light mb-2 tracking-wide">{work.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500"><span>TVC广告</span><span className="text-gray-700">·</span><span className="text-gray-600">TVC COMMERCIAL</span></div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="text-center mt-16">
            <Link href="/works" className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors">View All Works →</Link>
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
          <Link href="/contact" className="inline-block border border-accent-gold/40 text-accent-gold px-12 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500">Get In Touch</Link>
        </div>
      </section>
    </div>
  )
}
