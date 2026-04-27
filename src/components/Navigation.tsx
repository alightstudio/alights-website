'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface NavItem {
  id: string
  label: string
  labelEn?: string
  href: string
  visible?: boolean
  order: number
}

interface NavigationProps {
  initialLogo?: string
  initialNavItems?: NavItem[]
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首页', href: '/', visible: true, order: 0 },
  { id: 'works', label: '作品集', href: '/works', visible: true, order: 1 },
  { id: 'gallery', label: '创意灵感', href: '/gallery', visible: true, order: 2 },
  { id: 'canvas', label: '像素画布', href: '/canvas', visible: true, order: 3 },
  { id: 'community', label: '社区', href: '/community', visible: true, order: 4 },
  { id: 'about', label: '关于我们', href: '/about', visible: true, order: 5 },
  { id: 'contact', label: '联系合作', href: '/contact', visible: true, order: 6 },
]

export default function Navigation({ initialLogo, initialNavItems }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [mounted, setMounted] = useState(false)

  // Use static items from server - no client-side state needed
  const navItems = initialNavItems && initialNavItems.length > 0 ? initialNavItems : DEFAULT_NAV_ITEMS
  const logo = initialLogo || '栖光'

  useEffect(() => {
    setMounted(true)
    const name = localStorage.getItem('userName')
    const id = localStorage.getItem('userId')
    if (id) {
      setLoggedIn(true)
      setUserName(name || '用户')
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('userId')
    localStorage.removeItem('userName')
    localStorage.removeItem('userPhone')
    setLoggedIn(false)
    window.location.href = '/'
  }

  const sortedItems = navItems.filter(i => i.visible !== false).sort((a, b) => a.order - b.order)

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image src="/logo.png" alt={logo} width={2718} height={401} className="h-6 w-auto" />
              <span className="font-display text-xl tracking-wider ml-2">{logo}</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-12">
              {sortedItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="text-sm transition-colors tracking-wide text-gray-400 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              {mounted && loggedIn ? (
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
              ) : mounted ? (
                <Link
                  href="/login"
                  className="text-sm text-accent-gold hover:text-white transition-colors tracking-wide"
                >
                  登录
                </Link>
              ) : null}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden w-8 h-8 flex flex-col justify-center items-center space-y-1.5"
              aria-label="Toggle menu"
            >
              <span className={`w-6 h-px bg-white transition-all ${isOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-6 h-px bg-white transition-all ${isOpen ? 'opacity-0' : ''}`} />
              <span className={`w-6 h-px bg-white transition-all ${isOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-dark-900 pt-24 px-6 md:hidden">
          <div className="flex flex-col space-y-8">
            {sortedItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="text-2xl transition-colors tracking-wide text-gray-400 hover:text-white"
              >
                {item.label}
                {item.labelEn && (
                  <span className="block text-xs tracking-[0.2em] text-gray-600 mt-0.5">
                    {item.labelEn}
                  </span>
                )}
              </Link>
            ))}
            {mounted && loggedIn ? (
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
            ) : mounted ? (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-2xl text-accent-gold hover:text-white transition-colors tracking-wide"
              >
                登录
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}