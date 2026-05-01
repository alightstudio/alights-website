import Link from 'next/link'
import Image from 'next/image'
import type { FooterConfig } from '@/lib/siteConfig'
import { SLOGAN, COPYRIGHT } from '@/lib/site-constants'

const DEFAULT_FOOTER: FooterConfig = {
  logo: '栖光',
  tagline: SLOGAN,
  columns: [
    { id: 'nav', title: '导航', type: 'links', links: [
      { label: '作品集', href: '/works', order: 0 },
      { label: '创意灵感', href: '/gallery', order: 1 },
      { label: '社区', href: '/community', order: 2 },
      { label: '关于我们', href: '/about', order: 4 },
      { label: '联系方式', href: '/contact', order: 5 },
    ]},
    { id: 'services', title: '服务', type: 'text', items: ['TVC广告', '产品动画', '发布会', '影视剧'] },
    { id: 'contact', title: '联系', type: 'contact', items: [] },
  ],
  copyright: COPYRIGHT,
  bottomText: 'alights.cn',
}

interface FooterProps {
  initialFooter?: FooterConfig | null
  initialContact?: { wechat?: string; email?: string; address?: string; phone?: string } | null
}

/** 从 contact 配置动态生成联系栏 items（不填则整行不显示） */
function buildContactItems(contact: { wechat?: string; email?: string; address?: string } | null | undefined): string[] {
  if (!contact) return []
  const items: string[] = []
  if (contact.wechat) items.push(`微信：${contact.wechat}`)
  if (contact.email) items.push(`邮箱：${contact.email}`)
  if (contact.address) items.push(`地址：${contact.address}`)
  return items
}

export default function Footer({ initialFooter, initialContact }: FooterProps) {
  // 空对象 {} 是 truthy，需要检查 keys 长度来触发 fallback
  const cfg = (initialFooter && Object.keys(initialFooter).length > 0) ? initialFooter : DEFAULT_FOOTER

  // 动态覆盖联系栏：优先使用 contact 配置生成，否则用 footer 中的静态 items
  const dynamicContactItems = buildContactItems(initialContact)
  const columns = cfg.columns?.map(col => {
    if (col.type === 'contact' && dynamicContactItems.length > 0) {
      return { ...col, items: dynamicContactItems }
    }
    return col
  }) || []

  return (
    <footer className="bg-dark-900 border-t border-dark-700 py-16 px-6 md:px-12 lg:px-24 relative z-20" style={{ fontFamily: 'var(--font-family, unset)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div>
            <Image src="/logo.svg" alt="ALIGHTS" width={2810} height={450} className="h-[22px] w-auto mb-6" />
            <p className="text-gray-500 text-sm leading-relaxed">{cfg.tagline}</p>
          </div>

          {/* Columns */}
          {columns.map(col => {
            // 联系栏如果没有内容则不渲染
            if (col.type === 'contact' && (!col.items || col.items.length === 0)) return null
            return (
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
            )
          })}
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
