'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSiteConfig } from '@/lib/siteConfig'
import type { FooterConfig } from '@/lib/siteConfig'

export default function Footer() {
  const [cfg, setCfg] = useState<FooterConfig | null>(null)

  useEffect(() => {
    getSiteConfig().then(c => {
      if (c?.footer) setCfg(c.footer)
    })
  }, [])

  if (!cfg) return null

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
