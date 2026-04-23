'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { name: '首页', href: '/' },
  { name: '作品集', href: '/works' },
  { name: '作品赏析', href: '/gallery' },
  { name: '关于我们', href: '/about' },
  { name: '联系合作', href: '/contact' },
]

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="font-display text-2xl tracking-wider">
              栖光
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-12">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors tracking-wide"
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/login"
                className="text-sm text-accent-gold hover:text-white transition-colors tracking-wide"
              >
                登录
              </Link>
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
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="text-2xl text-gray-400 hover:text-white transition-colors tracking-wide"
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="text-2xl text-accent-gold hover:text-white transition-colors tracking-wide"
              >
                登录
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
