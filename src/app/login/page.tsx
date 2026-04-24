'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const justRegistered = searchParams.get('registered') === 'true'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '登录失败')
      }

      // 登录成功，保存用户信息到 localStorage（cookie httpOnly 前端无法读取）
      localStorage.setItem('userId', data.user.id)
      localStorage.setItem('userName', data.user.name)
      localStorage.setItem('userPhone', data.user.phone)
      // 跳转到用户中心
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-24 pb-16">
      <div className="max-w-xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Link href="/" className="font-display text-2xl tracking-wider mb-16 block">
            栖光
          </Link>

          <h1 className="font-display text-4xl font-light mb-4">用户登录</h1>
          <p className="text-gray-400 mb-8">登录后可以上传作品、管理提交记录</p>

          {justRegistered && (
            <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 mb-6 text-sm">
              注册成功，请登录
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                手机号
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                placeholder="注册时的手机号"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-2 tracking-wide">
                密码
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-dark-800 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                placeholder="您的密码"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-8 py-4 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all duration-500 disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-8">
            还没有账号？<Link href="/register" className="text-accent-gold hover:underline">立即注册</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dark-900 pt-24" />}>
      <LoginForm />
    </Suspense>
  )
}
