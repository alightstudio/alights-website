'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface UserProfile {
  id: string
  name: string
  phone: string
  email: string | null
  company: string | null
  bio: string | null
  avatar: string | null
  points: number
  createdAt: string
  todayPoints: number
}

interface CanvasStats {
  totalPixels: number
  contributedCanvases: number
  activeCanvas: {
    id: string
    pixels: number
    rank: number | null
    topCount: number
    totalPixels: number
    totalCells: number
    fillRate: number
    width: number
    height: number
  } | null
}

interface PointsRecord {
  id: string
  points: number
  reason: string
  date: string
  time: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 编辑个人信息
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  // 修改密码
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')

  // 画板统计
  const [canvasStats, setCanvasStats] = useState<CanvasStats | null>(null)
  const [loadingCanvas, setLoadingCanvas] = useState(true)

  // 积分记录
  const [recentRecords, setRecentRecords] = useState<PointsRecord[]>([])
  const [dailyLimit] = useState(100)

  // 邀请相关
  const [referralInfo, setReferralInfo] = useState<{
    referralCode: string
    referralUrl: string
    totalReferrals: number
    todayReward: number
    referrals: any[]
  } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      router.push('/login')
      return
    }
    fetchProfile()
    fetchPoints()
    fetchCanvasStats()
    fetchReferral()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (!res.ok) throw new Error('获取失败')
      const data = await res.json()
      setProfile(data)
      setName(data.name)
      setEmail(data.email || '')
      setCompany(data.company || '')
      setBio(data.bio || '')
    } catch {
      setError('获取用户信息失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchCanvasStats = async () => {
    try {
      const res = await fetch('/api/user/canvas-stats')
      if (res.ok) setCanvasStats(await res.json())
    } catch {}
    setLoadingCanvas(false)
  }

  const fetchReferral = async () => {
    try {
      const res = await fetch('/api/user/referral')
      if (res.ok) setReferralInfo(await res.json())
    } catch {}
  }

  const fetchPoints = async () => {
    try {
      const res = await fetch('/api/points')
      if (res.ok) {
        const data = await res.json()
        if (data.recentRecords) setRecentRecords(data.recentRecords)
      }
    } catch {}
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, bio }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '保存失败')
      }
      const data = await res.json()
      localStorage.setItem('userName', data.name)
      setProfile(prev => prev ? { ...prev, ...data } : null)
      setSuccess('个人信息已更新')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwdError('')
    setPwdSuccess('')
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('请填写所有密码字段')
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdError('两次密码不一致')
      return
    }
    if (newPwd.length < 6) {
      setPwdError('新密码至少6位')
      return
    }
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '修改失败')
      setPwdSuccess('密码已修改成功')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setShowPasswordForm(false)
    } catch (err: any) {
      setPwdError(err.message)
    }
  }

  const reasonMap: Record<string, string> = {
    click_work: '浏览作品',
    login: '每日登录',
    post: '发布帖子',
    comment: '发表评论',
    referral_signup: '邀请注册',
    referral_invite: '邀请奖励',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 pt-24 pb-16 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-32 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* 页面标题 */}
          <h1 className="font-display text-4xl font-light mb-2">个人中心</h1>
          <p className="text-gray-500 text-sm mb-10">管理您的个人信息和积分</p>

          {/* 积分总览 */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-dark-800 border border-dark-600 p-6 text-center">
              <div className="text-3xl text-accent-gold font-display mb-1">{profile?.points || 0}</div>
              <div className="text-gray-500 text-xs tracking-widest uppercase">总积分</div>
            </div>
            <div className="bg-dark-800 border border-dark-600 p-6 text-center">
              <div className="text-3xl text-accent-gold font-display mb-1">{profile?.todayPoints || 0}</div>
              <div className="text-gray-500 text-xs tracking-widest uppercase">今日获得</div>
            </div>
            <div className="bg-dark-800 border border-dark-600 p-6 text-center">
              <div className="text-3xl text-gray-400 font-display mb-1">{dailyLimit}</div>
              <div className="text-gray-500 text-xs tracking-widest uppercase">每日上限</div>
            </div>
          </div>

          {/* 画板统计 */}
          <div className="bg-dark-800 border border-dark-600 p-8 mb-6">
            <h2 className="text-lg font-light mb-6 text-white/80">画板统计</h2>
            {loadingCanvas ? (
              <div className="text-gray-600 text-sm animate-pulse">加载中...</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-dark-900/50 border border-dark-700 p-5 text-center">
                    <div className="text-2xl text-accent-gold font-display mb-1">{canvasStats?.totalPixels || 0}</div>
                    <div className="text-gray-500 text-xs tracking-widest uppercase">历史像素</div>
                  </div>
                  <div className="bg-dark-900/50 border border-dark-700 p-5 text-center">
                    <div className="text-2xl text-accent-gold font-display mb-1">{canvasStats?.contributedCanvases || 0}</div>
                    <div className="text-gray-500 text-xs tracking-widest uppercase">参与画布</div>
                  </div>
                  <div className="bg-dark-900/50 border border-dark-700 p-5 text-center">
                    <div className="text-2xl text-accent-gold font-display mb-1">
                      {canvasStats?.activeCanvas?.rank ? '#' + canvasStats.activeCanvas.rank : '--'}
                    </div>
                    <div className="text-gray-500 text-xs tracking-widest uppercase">当前排名</div>
                  </div>
                </div>

                {canvasStats?.activeCanvas && (
                  <div className="bg-dark-900/30 border border-dark-700 rounded-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">
                        活跃画布 &middot; {canvasStats.activeCanvas.width}&times;{canvasStats.activeCanvas.height}
                      </span>
                      <span className="text-xs text-gray-600">
                        {canvasStats.activeCanvas.pixels} 像素
                      </span>
                    </div>

                    {/* 填充进度条 */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>填充进度</span>
                        <span>{canvasStats.activeCanvas.fillRate}%</span>
                      </div>
                      <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-gold/60 transition-all duration-500 rounded-full"
                          style={{ width: canvasStats.activeCanvas.fillRate + '%' }}
                        />
                      </div>
                    </div>

                    {/* 排名对比 */}
                    {canvasStats.activeCanvas.rank && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          你的排名：<span className="text-accent-gold/80">#{canvasStats.activeCanvas.rank}</span>
                        </span>
                        <span className="text-gray-600">
                          领先者 {canvasStats.activeCanvas.topCount}px
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!canvasStats?.activeCanvas && (
                  <div className="text-center py-6 text-gray-600 text-sm border border-dark-700/50 rounded-sm">
                    暂无活跃画布
                  </div>
                )}
              </>
            )}
          </div>

          {/* 邀请有奖 */}
          <div className="bg-dark-800 border border-dark-600 p-8 mb-6">
            <h2 className="text-lg font-light mb-6 text-white/80">邀请好友</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-dark-900/50 border border-dark-700 p-5 text-center">
                <div className="text-2xl text-accent-gold font-display mb-1">{referralInfo?.totalReferrals || 0}</div>
                <div className="text-gray-500 text-xs tracking-widest uppercase">已邀请</div>
              </div>
              <div className="bg-dark-900/50 border border-dark-700 p-5 text-center">
                <div className="text-2xl text-accent-gold font-display mb-1">+{referralInfo?.todayReward || 0}</div>
                <div className="text-gray-500 text-xs tracking-widest uppercase">今日奖励</div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-4 leading-relaxed">
              每邀请一位好友注册，双方各得 <span className="text-accent-gold">10 积分</span>。
              分享专属链接或邀请码给好友即可。
            </div>

            {referralInfo && (
              <>
                {/* 邀请码 */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-dark-900 border border-dark-600 px-6 py-3 text-center flex-1">
                    <span className="text-2xl tracking-[0.3em] text-white font-mono">{referralInfo.referralCode}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralInfo.referralCode)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-5 py-3 text-xs tracking-widest hover:bg-accent-gold/30 transition-all"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>

                {/* 邀请链接 */}
                <div className="bg-dark-900/50 border border-dark-700 rounded-sm p-3 text-xs text-gray-500 break-all mb-4">
                  {referralInfo.referralUrl}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralInfo.referralUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="ml-2 text-accent-gold/60 hover:text-accent-gold transition-colors"
                  >
                    [复制链接]
                  </button>
                </div>
              </>
            )}

            {!referralInfo && (
              <div className="text-gray-600 text-sm animate-pulse">加载中...</div>
            )}

            {/* 已邀请列表 */}
            {referralInfo && referralInfo.referrals.length > 0 && (
              <>
                <div className="border-t border-dark-700 pt-4 mt-2">
                  <div className="text-xs text-gray-500 mb-3 tracking-wider uppercase">邀请记录</div>
                  <div className="space-y-2">
                    {referralInfo.referrals.slice(0, 10).map((ref: any) => (
                      <div key={ref.id} className="flex justify-between items-center py-1.5 text-sm">
                        <span className="text-white/70">{ref.referee.name}</span>
                        <span className="text-xs text-gray-600">
                          {new Date(ref.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 积分进度条 */}
          <div className="mb-10">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>今日进度</span>
              <span>{profile?.todayPoints || 0} / {dailyLimit}</span>
            </div>
            <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-gold transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(((profile?.todayPoints || 0) / dailyLimit) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* 成功/错误提示 */}
          {error && <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 mb-6 text-sm">{error}</div>}
          {success && <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-3 mb-6 text-sm">{success}</div>}

          {/* 个人信息编辑 */}
          <div className="bg-dark-800 border border-dark-600 p-8 mb-6">
            <h2 className="text-lg font-light mb-6 text-white/80">个人信息</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-gray-500 mb-2 tracking-wide">手机号（不可修改）</label>
                <input
                  value={profile?.phone || ''}
                  disabled
                  className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 tracking-wide">昵称</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 tracking-wide">邮箱</label>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  placeholder="选填"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 tracking-wide">公司</label>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  placeholder="选填"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2 tracking-wide">个人简介</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors resize-none"
                  placeholder="介绍一下自己..."
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-8 py-3 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all duration-500 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>

          {/* 修改密码 */}
          <div className="bg-dark-800 border border-dark-600 p-8 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-light text-white/80">密码</h2>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-xs text-gray-500 hover:text-accent-gold transition-colors"
              >
                {showPasswordForm ? '取消' : '修改密码'}
              </button>
            </div>
            {showPasswordForm && (
              <div className="space-y-5">
                {pwdError && <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-2 text-sm">{pwdError}</div>}
                {pwdSuccess && <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-2 text-sm">{pwdSuccess}</div>}
                <div>
                  <label className="block text-xs text-gray-500 mb-2 tracking-wide">当前密码</label>
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={e => setCurrentPwd(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 tracking-wide">新密码</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2 tracking-wide">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={e => setConfirmPwd(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-600 px-4 py-3 text-white focus:border-accent-gold/50 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  className="bg-accent-gold/20 border border-accent-gold/40 text-accent-gold px-8 py-3 text-sm tracking-widest uppercase hover:bg-accent-gold/30 transition-all duration-500"
                >
                  确认修改
                </button>
              </div>
            )}
          </div>

          {/* 积分记录 */}
          <div className="bg-dark-800 border border-dark-600 p-8">
            <h2 className="text-lg font-light mb-6 text-white/80">积分记录（近7天）</h2>
            {recentRecords.length === 0 ? (
              <p className="text-gray-600 text-sm">暂无积分记录，浏览作品可获得积分</p>
            ) : (
              <div className="space-y-1">
                {recentRecords.map((r) => (
                  <div key={r.id} className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
                    <div>
                      <span className="text-sm text-white/70">{reasonMap[r.reason] || r.reason}</span>
                      <span className="text-xs text-gray-600 ml-3">{r.date}</span>
                    </div>
                    <span className="text-sm text-accent-gold">+{r.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 返回导航 */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              ← 返回首页
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
