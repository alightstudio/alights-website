'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const works = [
    { title: '灯语 LIST', titleEn: 'DENGYU LIST', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: '/works/work-1-dengyu.jpg' },
    { title: '想象 LIST', titleEn: 'Xiangxiang LIST', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: '/works/work-2-xiangxiang.jpg' },
    { title: '稳座 LIST', titleEn: 'Wenzuo LIST', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: '/works/work-3-wenzuo.jpg' },
    { title: '零跑 D19 上市TVC', titleEn: 'LEAPMOTOR D19 LAUNCH', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: '/works/work-4-lingpao.jpg' },
    { title: '张天爱 | 雅娜薇图', titleEn: 'ZHANG TIANAI', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: '/works/work-5-zhangtianai.jpg' },
    { title: '自然堂×上海芭蕾舞团', titleEn: 'NATURAKING × SGP', category: 'TVC广告', categoryEn: 'TVC COMMERCIAL', image: '/works/work-6-zirantang.jpg' },
  ]

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* 纹理背景 */}
        <div className="absolute inset-0 bg-dark-900">
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* 渐变叠加 */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/50 via-dark-800/80 to-dark-900" />

        {/* 装饰线条 */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
        <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-accent-gold/10 to-transparent" />

        {/* 主内容 */}
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <div>
            <p className="text-xs md:text-sm text-accent-gold/60 tracking-[0.4em] uppercase mb-4">
              Visual Effects Studio
            </p>
            <h1 className="font-display text-6xl md:text-8xl font-light tracking-wider mb-2">
              栖光
            </h1>
            <p className="text-xl md:text-3xl text-gray-500 font-light tracking-[0.3em] mb-6">
              ALIGHTS
            </p>
          </div>

          <div className="mt-12">
            <p className="text-lg md:text-xl text-gray-300 font-light leading-relaxed max-w-2xl mx-auto">
              专业视效制作 · 光影叙事艺术
            </p>
            <p className="text-sm text-gray-500 mt-2 tracking-wide">
              Professional Visual Effects · Cinematic Storytelling
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6 text-xs text-gray-600 tracking-wider">
              <span>TVC广告</span>
              <span className="text-gray-700">·</span>
              <span>产品动画</span>
              <span className="text-gray-700">·</span>
              <span>发布会大屏</span>
              <span className="text-gray-700">·</span>
              <span>影视剧</span>
            </div>
          </div>

          <div className="mt-16">
            <Link
              href="#works"
              className="inline-block border border-accent-gold/40 text-accent-gold px-12 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500"
            >
              Explore Works
            </Link>
          </div>
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
        </div>
      </section>

      {/* About Preview */}
      <section className="py-32 px-6 md:px-12 lg:px-24 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">About Us</p>
              <h2 className="font-display text-4xl md:text-5xl font-light mb-2">
                关于栖光
              </h2>
              <p className="text-sm text-gray-500 tracking-wider mb-8">ABOUT ALIGHTS</p>

              <p className="text-gray-400 leading-relaxed mb-6">
                西安栖光文化传播有限公司,专注于高端视效制作领域。
                以光影为笔,以创意为墨,为品牌讲述动人故事。
              </p>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Xi&apos;an Alights Culture Communication Co., Ltd. specializes in high-end visual effects production.
                Using light and shadow as our brush, creativity as our ink, we tell compelling stories for brands.
              </p>
              <p className="text-gray-600 text-xs leading-relaxed mb-8">
                深耕 TVC 广告、产品动画、发布会大屏、影视剧制作,
                为客户提供从创意到成片的完整视觉解决方案。
              </p>
              <Link
                href="/about"
                className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors"
              >
                Learn More →
              </Link>
            </div>

            <div className="relative aspect-[4/3] bg-dark-800 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-dark-700 to-dark-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="font-display text-6xl text-accent-gold/20 mb-2">栖</p>
                  <p className="text-gray-600 text-xs tracking-[0.5em]">ALIGHTS</p>
                </div>
              </div>
              <div className="absolute inset-0 border border-accent-gold/10" />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Services</p>
            <h2 className="font-display text-4xl md:text-5xl font-light mb-2">
              服务领域
            </h2>
            <p className="text-sm text-gray-500 tracking-wider mb-6">OUR EXPERTISE</p>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'TVC广告', titleEn: 'TVC COMMERCIAL', desc: '高端商业广告制作', descEn: 'Premium Commercial Production' },
              { title: '产品动画', titleEn: 'PRODUCT ANIMATION', desc: '三维产品可视化', descEn: '3D Product Visualization' },
              { title: '发布会大屏', titleEn: 'EVENT SCREEN', desc: '沉浸式视觉体验', descEn: 'Immersive Visual Experience' },
              { title: '影视剧', titleEn: 'FILM & TV', desc: '电影级特效制作', descEn: 'Cinematic VFX Production' },
            ].map((service) => (
              <div
                key={service.title}
                className="group p-8 border border-dark-500 hover:border-accent-gold/30 transition-all duration-500 bg-dark-900/50"
              >
                <p className="text-[10px] text-gray-600 tracking-[0.2em] mb-2">{service.titleEn}</p>
                <h3 className="text-xl font-light mb-3 tracking-wide">
                  {service.title}
                </h3>
                <p className="text-gray-500 text-sm mb-1">
                  {service.desc}
                </p>
                <p className="text-gray-600 text-xs">
                  {service.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners / Brands */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800/50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-[1400px] mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Trusted By</p>
            <h2 className="font-display text-3xl md:text-4xl font-light mb-2">
              合作品牌
            </h2>
            <p className="text-xs text-gray-600 tracking-wider">PARTNER BRANDS</p>
          </div>

          {/* 品牌墙 - Logo 网格 */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6 md:gap-8">
            {[
              // 汽车
              { name: 'Mercedes-Benz', slug: 'mercedes' },
              { name: 'BMW', slug: 'bmw' },
              { name: 'Audi', slug: 'audi' },
              { name: 'Porsche', slug: 'porsche' },
              { name: 'Tesla', slug: 'tesla' },
              { name: 'BYD', slug: 'byd' },
              { name: 'NIO', slug: 'nio' },
              { name: 'XPeng', slug: 'xpeng' },
              // 科技
              { name: 'Apple', slug: 'apple' },
              { name: 'Huawei', slug: 'huawei' },
              { name: 'Xiaomi', slug: 'xiaomi' },
              { name: 'OPPO', slug: 'oppo' },
              { name: 'vivo', slug: 'vivo' },
              { name: 'Samsung', slug: 'samsung' },
              { name: 'Sony', slug: 'sony' },
              { name: 'DJI', slug: 'dji' },
              { name: 'Dyson', slug: 'dyson' },
              { name: 'Bose', slug: 'bose' },
              // 奢侈品
              { name: 'Rolex', slug: 'rolex' },
              { name: 'Omega', slug: 'omega' },
              { name: 'Cartier', slug: 'cartier' },
              { name: 'Tiffany & Co.', slug: 'tiffany' },
              { name: 'Chanel', slug: 'chanel' },
              { name: 'Dior', slug: 'dior' },
              { name: 'Gucci', slug: 'gucci' },
              { name: 'Hermès', slug: 'hermes' },
              { name: 'Louis Vuitton', slug: 'louisvuitton' },
              { name: 'Prada', slug: 'prada' },
              // 运动
              { name: 'Nike', slug: 'nike' },
              { name: 'Adidas', slug: 'adidas' },
              { name: 'FILA', slug: 'fila' },
              { name: 'Anta', slug: 'anta' },
              { name: 'Li-Ning', slug: 'lining' },
              { name: 'Under Armour', slug: 'underarmour' },
              { name: 'New Balance', slug: 'newbalance' },
              { name: 'Converse', slug: 'converse' },
              { name: 'Vans', slug: 'vans' },
              // 美妆
              { name: 'Estée Lauder', slug: 'esteelauder' },
              { name: 'Shiseido', slug: 'shiseido' },
              { name: 'Kiehl\'s', slug: 'kiehls' },
            ].map((brand) => (
              <div
                key={brand.slug}
                className="group flex items-center justify-center aspect-[3/2] px-2"
                title={brand.name}
              >
                <Image
                  src={`/brands/${brand.slug}.svg`}
                  alt={brand.name}
                  width={100}
                  height={50}
                  className="w-full h-auto max-h-8 object-contain opacity-40 grayscale group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
            ))}
          </div>

          {/* 底部分隔线 */}
          <div className="mt-20 h-px bg-gradient-to-r from-transparent via-dark-500 to-transparent" />
        </div>
      </section>

      {/* Featured Works */}
      <section id="works" className="py-32 px-6 md:px-12 lg:px-24 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Portfolio</p>
            <h2 className="font-display text-4xl md:text-5xl font-light mb-2">
              代表作品
            </h2>
            <p className="text-sm text-gray-500 tracking-wider mb-6">SELECTED WORKS</p>
            <div className="w-24 h-px bg-accent-gold/40 mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.map((work) => (
              <div
                key={work.title}
                className="group relative aspect-[4/3] bg-dark-800 overflow-hidden cursor-pointer"
              >
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                <div className="absolute inset-0 border border-accent-gold/0 group-hover:border-accent-gold/20 transition-colors duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[10px] text-accent-gold/70 tracking-[0.2em] mb-1">{work.titleEn}</p>
                  <h3 className="text-lg font-light mb-2 tracking-wide">{work.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{work.category}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-gray-600">{work.categoryEn}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Link
              href="/works"
              className="inline-block text-accent-gold text-sm tracking-wide hover:text-accent-silver transition-colors"
            >
              View All Works →
            </Link>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-32 px-6 md:px-12 lg:px-24 bg-dark-800 relative">
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <p className="text-xs text-accent-gold/60 tracking-[0.3em] uppercase mb-4">Contact</p>
          <h2 className="font-display text-4xl md:text-5xl font-light mb-2">
            开启合作
          </h2>
          <p className="text-sm text-gray-500 tracking-wider mb-8">LET&apos;S CREATE TOGETHER</p>
          <p className="text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">
            无论您的项目规模大小,我们都将用心对待。
            期待与您一起,用光影创造不凡。
          </p>
          <p className="text-gray-600 text-sm mb-12 max-w-2xl mx-auto leading-relaxed">
            No matter the scale of your project, we approach it with dedication.
            Let&apos;s create something extraordinary together with light and shadow.
          </p>
          <Link
            href="/contact"
            className="inline-block border border-accent-gold/40 text-accent-gold px-12 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/10 transition-all duration-500"
          >
            Get In Touch
          </Link>
        </div>
      </section>
    </div>
  )
}
