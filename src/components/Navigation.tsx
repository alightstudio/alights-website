'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getSiteConfig, applyTheme } from '@/lib/siteConfig'
import type { NavItem } from '@/lib/siteConfig'

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首页', href: '/', visible: true, order: 0 },
  { id: 'works', label: '作品集', href: '/works', visible: true, order: 1 },
  { id: 'gallery', label: '佳片欣赏', href: '/gallery', visible: true, order: 2 },
  { id: 'canvas', label: '像素画布', href: '/canvas', visible: true, order: 3 },
  { id: 'community', label: '社区', href: '/community', visible: true, order: 4 },
  { id: 'about', label: '关于我们', href: '/about', visible: true, order: 5 },
  { id: 'contact', label: '联系合作', href: '/contact', visible: true, order: 6 },
]

const [navItems, setNavItems] = useState<NavItem[]>(DEFAULT_NAV_ITEMS)
  const [logo, setLogo] = useState('栖光')
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  useEffect(() => {
    const name = localStorage.getItem('userName')
    const id = localStorage.getItem('userId')
    if (id) {
      setLoggedIn(true)
      setUserName(name || '用户')
    }
  }, [])

  useEffect(() => {
    getSiteConfig().then(config => {
      if (config?.navigation) {
        setLogo(config.navigation.logo || '栖光')
        setNavItems(config.navigation.items?.filter(i => i.visible !== false) || [])
      }
      if (config?.theme) applyTheme(config.theme)
    })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userPhone')
    setLoggedIn(false)
    router.push('/')
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="font-display text-2xl tracking-wider" style={{ fontFamily: 'var(--font-display, unset)' }}>
              {logo}
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-12">
              {navItems.sort((a, b) => a.order - b.order).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`text-sm transition-colors tracking-wide ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {loggedIn ? (
                <div className="flex items-center space-x-6">
                  <Link
                    href="/profile"
                    className="text-sm text-accent-gold hover:text-white transition-colors tracking-wide"
                  >
                    {userName} · 个人中心
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-300 transition-colors tracking-wide"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm text-accent-gold hover:text-white transition-colors tracking-wide"
                >
                  登录
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden w-8 h-8 flex flex-col justify-center items-center space-y-1.5"
            >
              <span className={`w-6 h-px bg-white transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-6 h-px bg-white transition-all ${isOpen ? 'opacity-0' : ''}`} />
              <span className={`w-6 h-px bg-white transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-dark-900 pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col space-y-8">
              {navItems.sort((a, b) => a.order - b.order).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`text-2xl transition-colors tracking-wide ${
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {loggedIn ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="text-2xl text-accent-gold hover:text-white transition-colors tracking-wide"
                  >
                    个人中心
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsOpen(false) }}
                    className="text-2xl text-gray-500 hover:text-gray-300 transition-colors tracking-wide text-left"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="text-2xl text-accent-gold hover:text-white transition-colors tracking-wide"
                >
                  登录
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
