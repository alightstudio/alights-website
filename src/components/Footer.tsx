'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSiteConfig } from '@/lib/siteConfig'
import type { FooterConfig } from '@/lib/siteConfig'

const DEFAULT_FOOTER: FooterConfig = {
  logo: '栖光',
  tagline: '专业视效制作 · 光影叙事艺术',
  columns: [
    { id: 'nav', title: '导航', type: 'links', links: [
      { label: '作品集', href: '/works', order: 0 },
      { label: '佳片欣赏', href: '/gallery', order: 1 },
      { label: '像素画布', href: '/canvas', order: 2 },
      { label: '社区', href: '/community', order: 3 },
      { label: '关于我们', href: '/about', order: 4 },
      { label: '联系方式', href: '/contact', order: 5 },
    ]},
    { id: 'services', title: '服务', type: 'text', items: ['TVC广告', '产品动画', '发布会', '影视剧'] },
    { id: 'contact', title: '联系', type: 'contact', items: ['电话：15091855505', '邮箱：184436962@qq.com', '地址：西安市'] },
  ],
  copyright: '© 2024-2026 西安栖光文化传播有限公司. All rights reserved.',
  bottomText: 'alights.cn',
}

export default function Footer() {
  const [cfg, setCfg] = useState<FooterConfig>(DEFAULT_FOOTER)

  useEffect(() => {
    getSiteConfig().then(c => {
      if (c?.footer) setCfg(c.footer)
    })
  }, [])

  return (
    <footer className="bg-dark-900 border-t border-dark-700 py-16 px-6 md:px-12 lg:px-24" style={{ fontFamily: 'var(--font-family, unset)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <h3 className="font-display text-2xl tracking-wider mb-6" style={{ fontFamily: 'var(--font-display, unset)' }}>{cfg.logo}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{cfg.tagline}</p>
          </div>

          {/* Columns */}
          {cfg.columns?.map(col => (
            <div key={col.id}>
              <h4 className="text-sm tracking-widest uppercase mb-6">{col.title}</h4>
              {col.type === 'links' && (
                <ul className="space-y-3">
                  {(col.links || []).sort((a, b) => a.order - b.order).map((link, i) => (
                    <li key={i}>
                      <Link href={link.href} className="text-gray-500 text-sm hover:text-white transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {(col.type === 'text' || col.type === 'contact') && (
                <ul className="space-y-3 text-gray-500 text-sm">
                  {(col.items || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-dark-700 flex flex-col md:flex-row justify-between items-center text-gray-600 text-xs">
          <p>{cfg.copyright}</p>
          <p className="mt-4 md:mt-0">{cfg.bottomText}</p>
        </div>
      </div>
    </footer>
  )
}
