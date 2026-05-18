'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { DISPLAY_FONTS, SANS_FONTS } from '@/lib/fonts'
import { changeFontsSafe } from '@/lib/siteConfig'
import {
  LayoutDashboard, Film, Users, Settings, BarChart3,
  MessageSquare, Palette, Image, LogOut, Menu, X,
  CheckCircle, Trash2, Edit3, Search, Globe, Phone,
  Mail, Type, Languages, Megaphone,
  Share2, Shield, Eye, ChevronRight, Award,
  Plus, ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus,
  FileText, Clock, Upload, Key
} from 'lucide-react'

/* ─── Types ─── */
interface Work { id: string; title: string; description: string | null; category: string; videoUrl: string | null; coverUrl: string | null; status: string; creatorName: string; creatorPhone: string; createdAt: string }
interface User { id: string; name: string; phone: string; email: string | null; company: string | null; avatar?: string | null; bio?: string; points?: number; createdAt: string; _count?: { works: number } }
interface Stats { totalWorks: number; pendingWorks: number; approvedWorks: number; totalUsers: number; recentWorks: Work[] }
interface ContactMsg { id: string; name: string; email: string; phone?: string; subject?: string; message: string; createdAt: string; read: boolean }
interface SiteConfig { [key: string]: any }
interface NavItem { id: string; label: string; href: string; visible: boolean; order: number }
interface BrandItem { name: string; logo: string; slug?: string }

type Tab = 'dashboard' | 'works' | 'users' | 'settings' | 'analytics' | 'contact' | 'canvas' | 'media'
type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

/* ─── Reusable field config for settings forms ─── */
interface FieldDef { label: string; path: string; type?: 'text' | 'textarea' | 'color' | 'toggle' | 'select'; placeholder?: string; toggleLabels?: [string, string]; options?: { value: string; label: string }[] }

const SETTINGS_FIELDS: Record<string, { icon: React.ElementType; label: string; fields: FieldDef[]; special?: 'navigation' | 'brands'; isAction?: boolean }> = {
  company: {
    icon: Globe, label: '公司信息',
    fields: [
      { label: '中文名称', path: 'company.name' },
      { label: '英文名称', path: 'company.nameEn' },
      { label: '中文简称', path: 'company.shortName' },
      { label: '英文简称', path: 'company.shortNameEn' },
      { label: '中文标语', path: 'company.slogan' },
      { label: '英文标语', path: 'company.sloganEn' },
      { label: '中文简介', path: 'company.description', type: 'textarea' },
      { label: '英文简介', path: 'company.descriptionEn', type: 'textarea' },
      { label: '中文详情', path: 'company.detail', type: 'textarea' },
    ],
  },
  contact: {
    icon: Phone, label: '联系方式',
    fields: [
      { label: '微信', path: 'contact.wechat', placeholder: '15091855505' },
      { label: '邮箱', path: 'contact.email', placeholder: 'example@qq.com' },
      { label: '地址', path: 'contact.address', placeholder: '陕西省西安市' },
      { label: '电话', path: 'contact.phone' },
      { label: '微博', path: 'contact.weibo' },
      { label: '小红书', path: 'contact.xiaohongshu' },
    ],
  },
  seo: {
    icon: Languages, label: 'SEO 设置',
    fields: [
      { label: '页面标题', path: 'seo.title' },
      { label: '页面描述', path: 'seo.description', type: 'textarea' },
      { label: '关键词', path: 'seo.keywords' },
    ],
  },
  hero: {
    icon: Type, label: '首屏内容',
    fields: [
      { label: '主标题(中文)', path: 'hero.title' },
      { label: '主标题(英文)', path: 'hero.titleEn' },
      { label: '副标题(中文)', path: 'hero.subtitle' },
      { label: '副标题(英文)', path: 'hero.subtitleEn' },
      { label: '标签(逗号分隔)', path: 'hero.tags', placeholder: 'TVC广告,产品动画,发布会,影视剧' },
    ],
  },
  brands: {
    icon: Award, label: '合作品牌',
    fields: [
      { label: '品牌名称', path: 'brands.name' },
      { label: 'Logo 路径', path: 'brands.logo', placeholder: '/brands/xxx.svg 或图片URL' },
      { label: '文件别名', path: 'brands.slug', placeholder: '用于本地SVG文件引用' },
    ],
    special: 'brands',
  },
  brandDisplay: {
    icon: Eye, label: '品牌展示',
    fields: [
      { label: '默认透明度', path: 'brandDisplay.opacity', placeholder: '0.75' },
      { label: '悬停透明度', path: 'brandDisplay.opacityHover', placeholder: '1' },
      { label: '默认灰度', path: 'brandDisplay.grayscale', type: 'toggle', toggleLabels: ['彩色', '灰度'] },
      { label: '悬停灰度', path: 'brandDisplay.grayscaleHover', type: 'toggle', toggleLabels: ['彩色', '灰度'] },
    ],
  },
  theme: {
    icon: Palette, label: '主题样式',
    fields: [
      { label: '主题色', path: 'theme.primaryColor', type: 'color', placeholder: '#c9a962' },
      { label: '背景色', path: 'theme.bgColor', type: 'color', placeholder: '#0a0a0a' },
      { label: '文字色', path: 'theme.textColor', type: 'color', placeholder: '#ffffff' },
      { label: '正文字体', path: 'theme.fontFamily', type: 'select', options: SANS_FONTS.map(f => ({ value: f.id, label: `${f.name} ${f.chineseSupport ? '· 中文' : ''}` })) },
      { label: '展示字体', path: 'theme.fontDisplay', type: 'select', options: DISPLAY_FONTS.map(f => ({ value: f.id, label: `${f.name} ${f.category === 'serif' ? '· 衬线' : f.chineseSupport ? '· 中文' : ''}` })) },
      { label: '首页主标题字体', path: 'theme.fontHero', type: 'select', options: DISPLAY_FONTS.map(f => ({ value: f.id, label: `${f.name} ${f.category === 'serif' ? '· 衬线' : f.chineseSupport ? '· 中文' : ''}` })) },
      { label: '圆角大小', path: 'theme.borderRadius', placeholder: '0' },
      { label: '自定义 CSS', path: 'theme.customCSS', type: 'textarea', placeholder: '额外 CSS 样式...' },
    ],
  },
  particle: {
    icon: BarChart3, label: '粒子背景',
    fields: [
      { label: '粒子数量', path: 'particle.count', placeholder: '200' },
      { label: '粒子大小', path: 'particle.size', placeholder: '1.2' },
      { label: '连线距离', path: 'particle.connectDist', placeholder: '120' },
      { label: '鼠标半径', path: 'particle.mouseRadius', placeholder: '140' },
      { label: '移动速度', path: 'particle.speed', placeholder: '0.4' },
      { label: '粒子颜色', path: 'particle.color', type: 'color', placeholder: '#c9a962' },
      { label: '粒子透明度', path: 'particle.opacity', placeholder: '0.6' },
      { label: '连线透明度', path: 'particle.lineOpacity', placeholder: '0.25' },
      { label: '连线粗细', path: 'particle.lineWidth', placeholder: '0.3' },
      { label: '连线粗度增幅', path: 'particle.lineWidthBoost', placeholder: '0.8' },
      { label: '背景星光数', path: 'particle.starCount', placeholder: '60' },
      { label: '拖尾强度', path: 'particle.trailOpacity', placeholder: '0' },
    ],
  },
  spotlight: {
    icon: Eye, label: '聚光效果',
    fields: [
      { label: '启用', path: 'spotlight.enabled', type: 'toggle', toggleLabels: ['禁用', '启用'] },
      { label: '亮字颜色', path: 'spotlight.glowColor', type: 'color', placeholder: '#f5f0e8' },
      { label: '暗字颜色', path: 'spotlight.darkColor', type: 'color', placeholder: '#1a1a1a' },
      { label: '光圈半径(px)', path: 'spotlight.glowSize', placeholder: '220' },
      { label: '感应半径(px)', path: 'spotlight.detectRadius', placeholder: '500' },
      { label: '环境光', path: 'spotlight.accentGlow', type: 'toggle', toggleLabels: ['关闭', '开启'] },
      { label: '环境光颜色', path: 'spotlight.accentColor', type: 'color', placeholder: '#c9a962' },
    ],
  },
  navigation: {
    icon: Menu, label: '导航菜单',
    fields: [
      { label: 'Logo 文字', path: 'navigation.logo' },
    ],
    special: 'navigation',
  },
  footer: {
    icon: Globe, label: '页脚配置',
    fields: [
      { label: 'Logo', path: 'footer.logo' },
      { label: '标语', path: 'footer.tagline' },
      { label: '版权信息', path: 'footer.copyright' },
      { label: '底部文字', path: 'footer.bottomText' },
    ],
  },
  announcement: {
    icon: Megaphone, label: '公告设置',
    fields: [
      { label: '公告内容', path: 'announcement.text', type: 'textarea' },
      { label: '公告类型', path: 'announcement.type', placeholder: 'info / warning / success' },
      { label: '是否显示', path: 'announcement.visible', type: 'toggle', toggleLabels: ['隐藏', '显示'] },
    ],
  },
  social: {
    icon: Share2, label: '社交链接',
    fields: [
      { label: '微信链接', path: 'socialLinks.wechat' },
      { label: '微博链接', path: 'socialLinks.weibo' },
      { label: '小红书', path: 'socialLinks.xiaohongshu' },
      { label: '抖音', path: 'socialLinks.douyin' },
      { label: 'B站', path: 'socialLinks.bilibili' },
      { label: 'Behance', path: 'socialLinks.behance' },
      { label: '新片场', path: 'socialLinks.xinpianchang' },
    ],
  },
  security: {
    icon: Shield, label: '安全设置',
    fields: [
      { label: '维护模式', path: 'security.maintenanceMode', type: 'toggle', toggleLabels: ['关闭', '开启'] },
      { label: '允许注册', path: 'security.allowRegistration', type: 'toggle', toggleLabels: ['禁止', '允许'] },
      { label: '允许作品提交', path: 'security.allowSubmissions', type: 'toggle', toggleLabels: ['禁止', '允许'] },
    ],
  },
  /* ── 数据管理（按钮） ── */
  refreshStash: {
    icon: Upload, label: '数据管理',
    fields: [],
    isAction: true,
  },
}

/* ─── Toggle Switch Component ─── */
function ToggleSwitch({ checked, onChange, labels }: { checked: boolean; onChange: (v: boolean) => void; labels?: [string, string] }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-gold/30 ${
        checked ? 'bg-accent-gold' : 'bg-white/10'
      }`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
      {labels && (
        <span className={`absolute text-[10px] font-medium ${
          checked ? 'left-1.5 text-dark-900' : 'right-1.5 text-gray-400'
        }`}>
          {checked ? labels[1] : labels[0]}
        </span>
      )}
    </button>
  )
}

/* ─── Toast Component ─── */
function Toast({ show, message, type }: { show: boolean; message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
    } ${type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}

/* ─── Font Select with Preview ─── */
function FontSelect({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find(o => o.value === value)
  const allFontDefs = React.useMemo(() => {
    const map: Record<string, { name: string; id: string; category: string }> = {}
    for (const f of [...DISPLAY_FONTS, ...SANS_FONTS]) map[f.id] = f
    return map
  }, [])

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-left flex items-center justify-between gap-2 hover:border-accent-gold/30 transition-colors">
        <span className="truncate">{selected?.label || '请选择...'}</span>
        <ChevronDown className={"w-3.5 h-3.5 text-gray-500 transition-transform " + (open ? 'rotate-180' : '')} />
      </button>
      {open && <>
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-dark-800 border border-white/10 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
          {options.map(o => {
            const fd = allFontDefs[o.value]
            const family = fd?.name || o.value
            return (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                className={"w-full text-left px-4 py-3 text-sm transition-colors border-b border-white/5 last:border-0 hover:bg-white/5 " + (value === o.value ? 'bg-accent-gold/10 text-accent-gold' : 'text-gray-300')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 w-16 shrink-0 truncate">{o.label}</span>
                  <span style={{ fontFamily: `'${family}', serif` }} className="text-base truncate">栖光 ALIGHTS</span>
                </div>
              </button>
            )
          })}
        </div>
      </>}
    </div>
  )
}

/* ─── Main Component ─── */
export default function AdminPage() {
  /* ── State ── */
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<string>('company')

  // Toast
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' })
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [refreshMsg, setRefreshMsg] = useState('')

  // Data
  const [stats, setStats] = useState<Stats | null>(null)
  const [works, setWorks] = useState<Work[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [config, setConfig] = useState<SiteConfig | null>(null)
  const [editConfig, setEditConfig] = useState<SiteConfig | null>(null)
  const [contacts, setContacts] = useState<ContactMsg[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsDays, setAnalyticsDays] = useState(30)

  // Filters
  const [workFilter, setWorkFilter] = useState<StatusFilter>('ALL')
  const [workSearch, setWorkSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // User edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({ name: '', phone: '', email: '', company: '', bio: '', points: 0 })

  // Password change
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '' })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')

  const changePassword = async () => {
    setPwdError('')
    if (!pwdForm.current || !pwdForm.newPwd) { setPwdError('请输入当前密码和新密码'); return }
    if (pwdForm.newPwd.length < 6) { setPwdError('新密码至少6位'); return }
    setPwdLoading(true)
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.newPwd }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast('密码修改成功')
        setShowPwdModal(false)
        setPwdForm({ current: '', newPwd: '' })
      } else {
        setPwdError(data.error || '修改失败')
      }
    } catch {
      setPwdError('网络错误')
    } finally {
      setPwdLoading(false)
    }
  }

  /* ── Helpers ── */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000)
  }

  /* ── Auth ── */
  useEffect(() => {
    fetch('/api/admin/check-auth').then(r => {
      if (r.ok) { setAuthed(true); setLoading(false) }
      else { window.location.href = '/admin/login' }
    }).catch(() => { window.location.href = '/admin/login' })
  }, [])

  /* ── Data fetching ── */
  useEffect(() => {
    if (!authed) return
    Promise.all([
      fetch('/api/admin/stats').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/admin/works').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/admin/users').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/admin/settings').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, w, u, c]) => {
      if (s) setStats(s)
      setWorks(w); setUsers(u)
      if (c) {
        // 兼容旧数据：将 CSS 字体名转为字体 ID（大小写不敏感）
        const theme = c.theme || {}
        const allFonts = [...SANS_FONTS, ...DISPLAY_FONTS]
        const normalizeFont = (v: string) => {
          if (!v) return v
          const match = allFonts.find(f => f.name.toLowerCase() === v.toLowerCase() || f.id === v)
          return match?.id || v
        }
        if (theme.fontFamily) theme.fontFamily = normalizeFont(theme.fontFamily)
        if (theme.fontDisplay) theme.fontDisplay = normalizeFont(theme.fontDisplay)
        setConfig(c); setEditConfig(c)
      }
    })
  }, [authed])

  useEffect(() => {
    if (!authed || activeTab !== 'contact') return
    fetch('/api/admin/contacts').then(r => r.ok ? r.json() : []).catch(() => []).then(setContacts)
  }, [authed, activeTab])

  useEffect(() => {
    if (!authed || activeTab !== 'analytics') return
    fetch('/api/analytics?days=30').then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
      setAnalyticsData(d)
      setAnalyticsDays(30)
    })
  }, [authed, activeTab])

  const refreshAnalytics = (days: number) => {
    fetch(`/api/analytics?days=${days}`).then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
      setAnalyticsData(d)
      setAnalyticsDays(days)
    })
  }

  /* ── Actions ── */
  const saveSection = async (section: string, data: any) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data }),
      })
      if (res.ok) {
        setSaveStatus('saved'); setConfig(prev => prev ? { ...prev, [section]: data } : prev)
        showToast('保存成功')
        setTimeout(() => setSaveStatus('idle'), 2000)
        // 保存字体时预加载 Google Fonts，避免切换页面时闪烁
        if (section === 'theme' && data?.fontFamily) {
          changeFontsSafe(data).catch(() => {})
        }
      } else {
        showToast('保存失败', 'error')
      }
    } catch {
      showToast('网络错误', 'error')
    }
  }

  const reviewWork = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await fetch(`/api/admin/works/${id}/review`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    })
    fetchWorks(); fetchStats()
  }

  const deleteWork = async (id: string) => {
    if (!confirm('确定删除此作品？')) return
    await fetch(`/api/admin/works/${id}`, { method: 'DELETE' })
    fetchWorks(); fetchStats()
  }

  const deleteContact = async (id: string) => {
    if (!confirm('确定删除此留言？')) return
    await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' })
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const logout = async () => {
    try { await fetch('/api/admin/logout', { method: 'POST' }) } catch {}
    window.location.href = '/admin/login'
  }

  const doRefresh = async () => {
    setRefreshStatus('loading')
    setRefreshMsg('')
    try {
      const res = await fetch('/api/admin/refresh-stash', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        setRefreshStatus('done')
        setRefreshMsg(data.message || '刷新任务已触发')
      } else {
        setRefreshStatus('error')
        setRefreshMsg(data.error || data.message || '刷新失败')
      }
    } catch {
      setRefreshStatus('error')
      setRefreshMsg('网络错误')
    }
  }

  const fetchWorks = () => fetch('/api/admin/works').then(r => r.ok ? r.json() : []).then(setWorks).catch(() => {})
  const fetchStats = () => fetch('/api/admin/stats').then(r => r.ok ? r.json() : null).then(setStats).catch(() => {})

  const openUserEdit = (u: User) => {
    setUserForm({ name: u.name, phone: u.phone, email: u.email || '', company: u.company || '', bio: u.bio || '', points: u.points || 0 })
    setEditingUser(u)
  }

  const saveUserEdit = async () => {
    if (!editingUser) return
    await fetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm),
    })
    setEditingUser(null)
    const res = await fetch('/api/admin/users'); if (res.ok) setUsers(await res.json())
    showToast('用户信息已更新')
  }

  /* ── Derived state ── */
  const filteredWorks = works.filter(w =>
    (workFilter === 'ALL' || w.status === workFilter) &&
    w.title.toLowerCase().includes(workSearch.toLowerCase())
  )
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.phone.includes(userSearch)
  )

  /* ── Config field helper ── */
  const getConfigValue = useCallback((path: string): string => {
    if (!editConfig) return ''
    return String(path.split('.').reduce((o: any, k) => o?.[k], editConfig) ?? '')
  }, [editConfig])

  const getConfigBoolValue = useCallback((path: string): boolean => {
    if (!editConfig) return false
    const val = path.split('.').reduce((o: any, k) => o?.[k], editConfig)
    return val === true || val === 'true'
  }, [editConfig])

  const updateConfigValue = useCallback((path: string, value: string) => {
    if (!editConfig) return
    const keys = path.split('.')
    setEditConfig(prev => {
      if (!prev) return prev
      const n = { ...prev }; let ref: any = n
      keys.forEach((k, i) => {
        if (i < keys.length - 1) { ref[k] = { ...ref[k] }; ref = ref[k] }
        else ref[k] = value
      })
      return n
    })
  }, [editConfig])

  const updateConfigBool = useCallback((path: string, value: boolean) => {
    if (!editConfig) return
    const keys = path.split('.')
    setEditConfig(prev => {
      if (!prev) return prev
      const n = { ...prev }; let ref: any = n
      keys.forEach((k, i) => {
        if (i < keys.length - 1) { ref[k] = { ...ref[k] }; ref = ref[k] }
        else ref[k] = value
      })
      return n
    })
  }, [editConfig])

  const renderField = (f: FieldDef) => {
    if (f.type === 'toggle') {
      const val = getConfigBoolValue(f.path)
      return (
        <div key={f.path} className="flex items-center justify-between gap-4 py-1">
          <span className="text-sm text-gray-300">{val ? f.toggleLabels?.[1] || '开启' : f.toggleLabels?.[0] || '关闭'}</span>
          <ToggleSwitch checked={val} onChange={v => updateConfigBool(f.path, v)} labels={f.toggleLabels} />
        </div>
      )
    }
    const val = getConfigValue(f.path)
    if (f.type === 'textarea') {
      return <textarea key={f.path} value={val} onChange={e => updateConfigValue(f.path, e.target.value)}
        placeholder={f.placeholder || ''}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none min-h-[80px] resize-y" />
    }
    if (f.type === 'color') {
      return <div key={f.path} className="flex gap-2">
        <input type="color" value={val || f.placeholder || '#000000'} onChange={e => updateConfigValue(f.path, e.target.value)}
          className="w-10 h-10 rounded cursor-pointer bg-transparent border border-white/10" />
        <input type="text" value={val} onChange={e => updateConfigValue(f.path, e.target.value)} placeholder={f.placeholder || ''}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none font-mono" />
      </div>
    }
    if (f.type === 'select' && f.options) {
      const isFontSelect = f.path.includes('font') || f.path.includes('Font')
      if (isFontSelect) {
        return <FontSelect key={f.path} value={val} options={f.options} onChange={v => updateConfigValue(f.path, v)} />
      }
      return <select key={f.path} value={val || ''} onChange={e => updateConfigValue(f.path, e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none cursor-pointer">
        {!f.options.some(o => o.value === val) && <option value="" disabled className="bg-dark-900">请选择...</option>}
        {f.options.map(o => <option key={o.value} value={o.value} className="bg-dark-900">{o.label}</option>)}
      </select>
    }
    return <input key={f.path} type={f.type || 'text'} value={val} onChange={e => updateConfigValue(f.path, e.target.value)}
      placeholder={f.placeholder || ''}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
  }

  /* ── Tabs definition ── */
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: '概览', icon: LayoutDashboard },
    { id: 'works', label: '作品管理', icon: Film },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'settings', label: '网站配置', icon: Settings },
    { id: 'analytics', label: '数据分析', icon: BarChart3 },
    { id: 'contact', label: '留言管理', icon: MessageSquare },
    { id: 'canvas', label: '像素画布', icon: Palette },
    { id: 'media', label: '媒体管理', icon: Image },
  ]

  /* ── Loading / Unauthenticated ── */
  if (loading) return <div className="min-h-screen bg-dark-900 flex items-center justify-center"><span className="text-accent-gold text-xl">加载中...</span></div>
  if (!authed) return null

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden font-sans">

      {/* ── Toast ── */}
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col bg-black/40 border-r border-white/5">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-lg font-semibold text-white tracking-tight">栖光文化</h1>
          <p className="text-xs text-gray-500 mt-0.5">管理后台</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                activeTab === id
                  ? 'bg-accent-gold/90 text-dark-900 font-medium shadow-md shadow-accent-gold/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/5">
          <button onClick={() => setShowPwdModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Key className="w-4 h-4" />修改密码
          </button>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-colors mt-1">
            <LogOut className="w-4 h-4" />退出登录
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-white/5 bg-black/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-gray-400 hover:text-white"><Menu className="w-5 h-5" /></button>
            <h2 className="text-base font-medium text-white">{tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {saveStatus === 'saving' && <span className="text-accent-gold animate-pulse">保存中...</span>}
            {saveStatus === 'saved' && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/>已保存</span>}
          </div>
        </header>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-4 pb-20 lg:pb-6 lg:p-6 scroll-smooth">

          {/* ===== DASHBOARD ===== */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: '总作品数', value: stats.totalWorks, color: 'text-blue-400', bg: 'bg-blue-400/8', border: 'border-blue-400/15' },
                  { label: '待审核', value: stats.pendingWorks, color: 'text-yellow-400', bg: 'bg-yellow-400/8', border: 'border-yellow-400/15' },
                  { label: '已通过', value: stats.approvedWorks, color: 'text-green-400', bg: 'bg-green-400/8', border: 'border-green-400/15' },
                  { label: '总用户数', value: stats.totalUsers, color: 'text-purple-400', bg: 'bg-purple-400/8', border: 'border-purple-400/15' },
                ].map(s => (
                  <div key={s.label} className={`p-4 rounded-xl ${s.bg} ${s.border} border`}>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent works */}
              <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Film className="w-4 h-4 text-accent-gold/60"/>最近提交的作品</h3>
                {stats.recentWorks?.length > 0 ? (
                  <div className="space-y-1.5">
                    {stats.recentWorks.map((w: Work) => (
                      <div key={w.id} className="flex items-center justify-between py-2.5 px-3 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{w.title}</p>
                          <p className="text-[11px] text-gray-500">{w.creatorName} · {w.category}</p>
                        </div>
                        <span className={`ml-3 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                          w.status === 'PENDING' ? 'bg-yellow-400/10 text-yellow-400' :
                          w.status === 'APPROVED' ? 'bg-green-400/10 text-green-400' :
                          'bg-red-400/10 text-red-400'
                        }`}>
                          {w.status === 'PENDING' ? '待审核' : w.status === 'APPROVED' ? '已通过' : '已拒绝'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500 py-8 text-center">暂无作品</p>}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: '审核作品', desc: `${stats.pendingWorks} 条待处理`, icon: Eye, action: () => setActiveTab('works'), color: 'text-yellow-400' },
                  { label: '查看留言', desc: `${contacts.length} 条消息`, icon: MessageSquare, action: () => setActiveTab('contact'), color: 'text-blue-400' },
                  { label: '网站配置', desc: '修改信息', icon: Settings, action: () => setActiveTab('settings'), color: 'text-accent-gold' },
                  { label: '数据分析', desc: '访问统计', icon: BarChart3, action: () => setActiveTab('analytics'), color: 'text-green-400' },
                ].map(q => (
                  <button key={q.label} onClick={q.action}
                    className="p-4 rounded-xl bg-black/30 border border-white/5 text-left hover:border-white/15 hover:bg-white/[0.03] transition-all group">
                    <q.icon className={`w-5 h-5 ${q.color} mb-2 group-hover:scale-110 transition-transform`} />
                    <p className="text-sm font-medium text-white">{q.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{q.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ===== WORKS ===== */}
          {activeTab === 'works' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/5">
                  {(Object.keys({ ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 }) as StatusFilter[]).map(f => (
                    <button key={f} onClick={() => setWorkFilter(f)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        workFilter === f ? 'bg-accent-gold text-dark-900 shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}>
                      {f === 'ALL' ? '全部' : f === 'PENDING' ? '待审核' : f === 'APPROVED' ? '已通过' : '已拒绝'}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={workSearch} onChange={e => setWorkSearch(e.target.value)} placeholder="搜索作品..."
                    className="w-full pl-9 pr-3 py-1.5 bg-black/30 border border-white/5 rounded-lg text-sm text-white placeholder-gray-500 focus:border-accent-gold focus:outline-none" />
                </div>
                <span className="text-xs text-gray-500">共 {filteredWorks.length} 条</span>
              </div>

              {/* Table */}
              <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium">作品</th>
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium hidden md:table-cell">作者</th>
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium">状态</th>
                    <th className="px-4 py-3 text-right text-[11px] text-gray-500 uppercase tracking-wider font-medium">操作</th>
                  </tr></thead>
                  <tbody>
                    {filteredWorks.map((w: Work) => (
                      <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-white font-medium">{w.title}</p>
                          <p className="text-[11px] text-gray-500">{w.category}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm hidden md:table-cell">
                          {w.creatorName}<br/><span className="text-[11px] text-gray-600">{w.creatorPhone}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            w.status === 'PENDING' ? 'bg-yellow-400/10 text-yellow-400' :
                            w.status === 'APPROVED' ? 'bg-green-400/10 text-green-400' :
                            'bg-red-400/10 text-red-400'
                          }`}>
                            {w.status === 'PENDING' ? '待审核' : w.status === 'APPROVED' ? '已通过' : '已拒绝'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {w.status === 'PENDING' && (
                              <>
                                <button onClick={() => reviewWork(w.id, 'APPROVED')} title="通过"
                                  className="p-1.5 rounded-lg bg-green-400/8 text-green-400 hover:bg-green-400/15 transition-colors"><CheckCircle className="w-4 h-4"/></button>
                                <button onClick={() => reviewWork(w.id, 'REJECTED')} title="拒绝"
                                  className="p-1.5 rounded-lg bg-red-400/8 text-red-400 hover:bg-red-400/15 transition-colors"><X className="w-4 h-4"/></button>
                              </>
                            )}
                            <button onClick={() => deleteWork(w.id)} title="删除"
                              className="p-1.5 rounded-lg bg-red-400/8 text-red-400 hover:bg-red-400/15 transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredWorks.length && (
                  <div className="py-16 text-center"><Film className="w-12 h-12 mx-auto mb-3 opacity-20"/><p className="text-sm text-gray-500">暂无数据</p></div>
                )}
              </div>
            </div>
          )}

          {/* ===== USERS ===== */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="搜索用户..."
                    className="w-full pl-9 pr-3 py-1.5 bg-black/30 border border-white/5 rounded-lg text-sm text-white placeholder-gray-500 focus:border-accent-gold focus:outline-none" />
                </div>
                <span className="text-xs text-gray-500">共 {filteredUsers.length} 人</span>
              </div>

              <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/5">
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium">用户</th>
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium">头像</th>
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium hidden md:table-cell">联系方式</th>
                    <th className="px-4 py-3 text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium hidden lg:table-cell">公司</th>
                    <th className="px-4 py-3 text-center text-[11px] text-gray-500 uppercase tracking-wider font-medium">作品</th>
                    <th className="px-4 py-3 text-right text-[11px] text-gray-500 uppercase tracking-wider font-medium">操作</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u: User) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                                <img src={u.avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-gray-500 font-medium">{u.name[0]?.toUpperCase()}</span>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-white font-medium">{u.name}</p>
                              <p className="text-[11px] text-gray-500">{u.createdAt?.substring(0, 10)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm hidden md:table-cell">
                          {u.phone}<br/><span className="text-[11px] text-gray-600">{u.email || '-'}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm hidden lg:table-cell">{u.company || '-'}</td>
                        <td className="px-4 py-3 text-center text-gray-300 text-sm">{u._count?.works || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openUserEdit(u)} title="编辑"
                            className="p-1.5 rounded-lg bg-blue-400/8 text-blue-400 hover:bg-blue-400/15 transition-colors"><Edit3 className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredUsers.length && (
                  <div className="py-16 text-center"><Users className="w-12 h-12 mx-auto mb-3 opacity-20"/><p className="text-sm text-gray-500">暂无用户</p></div>
                )}
              </div>
            </div>
          )}

          {/* ===== SETTINGS ===== */}
          {activeTab === 'settings' && config && editConfig && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Section tabs */}
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(SETTINGS_FIELDS).map(([key, { label, icon: Icon }]) => (
                  <button key={key} onClick={() => setSettingsSection(key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      settingsSection === key
                        ? 'bg-accent-gold text-dark-900 shadow-sm'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/8'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>

              {/* Active section form */}
              {(() => {
                const sectionDef = SETTINGS_FIELDS[settingsSection]
                if (!sectionDef) return null
                const Icon = sectionDef.icon
                const sectionData = settingsSection.includes('.')
                  ? settingsSection.split('.').reduce((o: any, k) => o?.[k], editConfig)
                  : editConfig[settingsSection]

                /* ── Special: Brands ── */
                if (sectionDef.special === 'brands') {
                  const brands: BrandItem[] = editConfig.brands || []
                  const addBrand = () => {
                    setEditConfig(prev => prev ? { ...prev, brands: [...(prev.brands || []), { name: '', logo: '', slug: '' }] } : prev)
                  }
                  const removeBrand = (idx: number) => {
                    setEditConfig(prev => prev ? { ...prev, brands: (prev.brands || []).filter((_: any, i: number) => i !== idx) } : prev)
                  }
                  const updateBrand = (idx: number, field: keyof BrandItem, value: string) => {
                    setEditConfig(prev => {
                      if (!prev) return prev
                      const b = [...(prev.brands || [])]
                      b[idx] = { ...b[idx], [field]: value }
                      return { ...prev, brands: b }
                    })
                  }
                  return (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5 animate-in fade-in duration-200">
                      <h3 className="text-base font-medium text-white mb-5 flex items-center gap-2">
                        <Award className="w-5 h-5 text-accent-gold" />合作品牌
                      </h3>
                      <div className="space-y-3">
                        {brands.map((b: BrandItem, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                            <div className="flex-1 space-y-2">
                              <input type="text" value={b.name} onChange={e => updateBrand(idx, 'name', e.target.value)} placeholder="品牌名称"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
                              <input type="text" value={b.logo} onChange={e => updateBrand(idx, 'logo', e.target.value)} placeholder="Logo URL（图片链接）"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
                              {b.logo && <img src={b.logo} alt={b.name} className="h-8 object-contain opacity-75 mt-1" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
                              <input type="text" value={(b as any).slug || ''} onChange={e => updateBrand(idx, 'slug', e.target.value)} placeholder="文件名别名（如 mercedes）"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
                            </div>
                            <button onClick={() => removeBrand(idx)} title="删除"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/8 transition-colors mt-1">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        ))}
                        <button onClick={addBrand}
                          className="w-full py-2.5 border border-dashed border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-accent-gold/30 transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4"/>添加品牌
                        </button>
                      </div>
                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-600">共 {brands.length} 个合作品牌</span>
                        <button onClick={() => saveSection('brands', editConfig.brands || [])}
                          disabled={saveStatus === 'saving'}
                          className="px-5 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 disabled:opacity-50 transition-colors">
                          {saveStatus === 'saving' ? '保存中...' : '保存修改'}
                        </button>
                      </div>
                    </div>
                  )
                }

                /* ── Special: Navigation ── */
                if (sectionDef.special === 'navigation') {
                  const navItems: NavItem[] = editConfig.navigation?.items || []
                  const updateNavItem = (idx: number, field: keyof NavItem, value: any) => {
                    setEditConfig(prev => {
                      if (!prev) return prev
                      const items = [...(prev.navigation?.items || [])]
                      items[idx] = { ...items[idx], [field]: value }
                      return { ...prev, navigation: { ...prev.navigation, items } }
                    })
                  }
                  const addNavItem = () => {
                    setEditConfig(prev => {
                      if (!prev) return prev
                      const items = [...(prev.navigation?.items || [])]
                      items.push({ id: `nav-${Date.now()}`, label: '新菜单', href: '/', visible: true, order: items.length })
                      return { ...prev, navigation: { ...prev.navigation, items } }
                    })
                  }
                  const removeNavItem = (idx: number) => {
                    setEditConfig(prev => {
                      if (!prev) return prev
                      const items = (prev.navigation?.items || []).filter((_: any, i: number) => i !== idx)
                      return { ...prev, navigation: { ...prev.navigation, items } }
                    })
                  }
                  const moveNavItem = (idx: number, dir: -1 | 1) => {
                    setEditConfig(prev => {
                      if (!prev) return prev
                      const items = [...(prev.navigation?.items || [])]
                      const target = idx + dir
                      if (target < 0 || target >= items.length) return prev
                      ;[items[idx], items[target]] = [items[target], items[idx]]
                      // Update order values
                      items.forEach((item: NavItem, i: number) => { item.order = i })
                      return { ...prev, navigation: { ...prev.navigation, items } }
                    })
                  }
                  return (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5 animate-in fade-in duration-200">
                      <h3 className="text-base font-medium text-white mb-5 flex items-center gap-2">
                        <Menu className="w-5 h-5 text-accent-gold" />导航菜单
                      </h3>
                      {/* Logo field */}
                      <div className="mb-5">
                        <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">Logo 文字</label>
                        <input type="text" value={getConfigValue('navigation.logo')} onChange={e => updateConfigValue('navigation.logo', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
                      </div>

                      {/* Nav items */}
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">菜单项</p>
                        {navItems.map((item: NavItem, idx: number) => (
                          <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            item.visible ? 'bg-white/[0.02] border-white/5' : 'bg-white/[0.01] border-white/5 opacity-50'
                          }`}>
                            {/* Order controls */}
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveNavItem(idx, -1)} className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20" disabled={idx === 0}>
                                <ChevronUp className="w-3.5 h-3.5"/>
                              </button>
                              <button onClick={() => moveNavItem(idx, 1)} className="p-0.5 text-gray-500 hover:text-white disabled:opacity-20" disabled={idx === navItems.length - 1}>
                                <ChevronDown className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                            {/* Visible toggle */}
                            <ToggleSwitch checked={item.visible} onChange={v => updateNavItem(idx, 'visible', v)} />
                            {/* Fields */}
                            <div className="flex-1 flex gap-2">
                              <input type="text" value={item.label} onChange={e => updateNavItem(idx, 'label', e.target.value)} placeholder="菜单名称"
                                className="w-32 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
                              <input type="text" value={item.href} onChange={e => updateNavItem(idx, 'href', e.target.value)} placeholder="链接路径"
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none font-mono text-xs" />
                            </div>
                            {/* Remove */}
                            <button onClick={() => removeNavItem(idx)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                        ))}
                        <button onClick={addNavItem}
                          className="w-full py-2 border border-dashed border-white/10 rounded-lg text-sm text-gray-400 hover:text-white hover:border-accent-gold/30 transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-4 h-4"/>添加菜单项
                        </button>
                      </div>

                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[11px] text-gray-600">共 {navItems.length} 个菜单项</span>
                        <button onClick={() => saveSection('navigation', editConfig.navigation)}
                          disabled={saveStatus === 'saving'}
                          className="px-5 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 disabled:opacity-50 transition-colors">
                          {saveStatus === 'saving' ? '保存中...' : '保存修改'}
                        </button>
                      </div>
                    </div>
                  )
                }

                /* ── Action section (e.g. refresh stash) ── */
                if ((sectionDef as any).isAction) {
                  return (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5 animate-in fade-in duration-200">
                      <h3 className="text-base font-medium text-white mb-5 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-accent-gold" />数据管理
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1">刷新新片场人气值数据</p>
                          <p className="text-xs text-gray-600">从新片场重新拉取所有作品的播放量/点赞/收藏数据，更新主页和作品集的排序。需要本地 Chrome CDP（端口 9222）。</p>
                        </div>
                        <button onClick={doRefresh} disabled={refreshStatus === 'loading'}
                          className="px-6 py-3 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                          <Upload className={"w-4 h-4 " + (refreshStatus === 'loading' ? 'animate-spin' : '')} />
                          {refreshStatus === 'loading' ? '刷新中...' : '同步新片场数据'}
                        </button>
                        {refreshMsg && (
                          <pre className="text-xs text-gray-400 bg-white/5 p-3 rounded-lg whitespace-pre-wrap font-sans">{refreshMsg}</pre>
                        )}
                      </div>
                    </div>
                  )
                }

                /* ── Default section form ── */
                return (
                  <div className="bg-black/30 rounded-xl border border-white/5 p-5 animate-in fade-in duration-200">
                    <h3 className="text-base font-medium text-white mb-5 flex items-center gap-2">
                      <Icon className="w-5 h-5 text-accent-gold" />{sectionDef.label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sectionDef.fields.map(f => (
                        <div key={f.path} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">{f.label}</label>
                          {renderField(f)}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-gray-600">修改 {sectionDef.label} 配置</span>
                      <button onClick={() => saveSection(settingsSection, sectionData ?? editConfig[settingsSection])}
                        disabled={saveStatus === 'saving'}
                        className="px-5 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 disabled:opacity-50 transition-colors">
                        {saveStatus === 'saving' ? '保存中...' : '保存修改'}
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ===== ANALYTICS ===== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Time Period Selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500">时间范围：</span>
                {[{ label: '7天', days: 7 }, { label: '30天', days: 30 }, { label: '90天', days: 90 }, { label: '180天', days: 180 }, { label: '365天', days: 365 }].map(p => (
                  <button key={p.days} onClick={() => refreshAnalytics(p.days)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      analyticsDays === p.days ? 'bg-accent-gold text-dark-900 shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/8'
                    }`}>
                    {p.label}
                  </button>
                ))}
                <span className="text-[10px] text-gray-600 ml-auto">统计周期：最近 {analyticsDays} 天</span>
              </div>

              {analyticsData ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: '总浏览量(PV)', value: analyticsData.totalPv ?? 0, color: 'text-blue-400', bg: 'bg-blue-400/8', border: 'border-blue-400/15' },
                      { label: '独立访客(UV)', value: analyticsData.totalUv ?? 0, color: 'text-green-400', bg: 'bg-green-400/8', border: 'border-green-400/15' },
                      { label: '日均 PV', value: analyticsData.avgDailyPv ?? 0, color: 'text-purple-400', bg: 'bg-purple-400/8', border: 'border-purple-400/15' },
                      { label: '统计天数', value: analyticsData.days ?? 30, color: 'text-accent-gold', bg: 'bg-accent-gold/8', border: 'border-accent-gold/15' },
                    ].map(s => (
                      <div key={s.label} className={`p-4 rounded-xl ${s.bg} ${s.border} border`}>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${s.color}`}>{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Extended metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                      const dl = analyticsData.dateList || []
                      const ps = analyticsData.pageStats || []
                      const peakDay = dl.reduce((max: any, d: any) => d.pv > (max?.pv || 0) ? d : max, null)
                      const avgUv = dl.length > 0 ? Math.round(dl.reduce((s: number, d: any) => s + d.uv, 0) / dl.length) : 0
                      const uvRatio = analyticsData.totalPv > 0 ? (analyticsData.totalUv / analyticsData.totalPv * 100).toFixed(1) : '0'
                      const bounceEst = analyticsData.totalPv > 0 ? Math.max(0, (1 - analyticsData.totalUv / analyticsData.totalPv) * 100).toFixed(0) : '0'
                      return [
                        { label: '峰值日 PV', value: peakDay ? `${peakDay.pv.toLocaleString()}` : '-', sub: peakDay?.date || '', color: 'text-orange-400', icon: TrendingUp },
                        { label: '日均 UV', value: avgUv.toLocaleString(), sub: '独立访客/天', color: 'text-cyan-400', icon: Users },
                        { label: 'UV/PV 比', value: `${uvRatio}%`, sub: '访客深度', color: 'text-pink-400', icon: Eye },
                        { label: '跳出率估算', value: `${bounceEst}%`, sub: '单页访问比例', color: 'text-red-400', icon: TrendingDown },
                      ]
                    })().map(m => (
                      <div key={m.label} className="p-4 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider">{m.label}</p>
                          <m.icon className="w-4 h-4 opacity-30"/>
                        </div>
                        <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Daily trend chart */}
                  {analyticsData.dateList?.length > 0 && (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                      <h3 className="text-sm font-medium text-white mb-4">每日访问趋势</h3>
                      {(() => {
                        const dl = analyticsData.dateList
                        const maxPv = Math.max(...dl.map((d: any) => d.pv), 1)
                        return (
                          <div className="space-y-2">
                            {/* PV bars */}
                            <div className="flex items-end gap-[2px] h-40">
                              {dl.map((d: any) => {
                                const h = (d.pv / maxPv) * 100
                                return (
                                  <div key={d.date} className="flex-1 flex flex-col items-center group relative min-w-0">
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-800 border border-white/10 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                      {d.date}<br/>PV: {d.pv} / UV: {d.uv}
                                    </div>
                                    <div className="w-full rounded-t bg-blue-400/70 hover:bg-blue-400 transition-all duration-150"
                                      style={{ height: `${Math.max(h, 2)}%`, minHeight: '2px' }} />
                                  </div>
                                )
                              })}
                            </div>
                            {/* UV bars */}
                            <div className="flex items-end gap-[2px] h-20">
                              {dl.map((d: any) => {
                                const h = (d.uv / maxPv) * 100
                                return (
                                  <div key={d.date} className="flex-1 min-w-0">
                                    <div className="w-full rounded-t bg-green-400/50"
                                      style={{ height: `${Math.max(h, 1)}%`, minHeight: '1px' }} />
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-gray-500">
                              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-400/70"/>PV 浏览量</span>
                              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-400/50"/>UV 独立访客</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Page stats table */}
                  {analyticsData.pageStats?.length > 0 && (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                      <h3 className="text-sm font-medium text-white mb-3">页面访问排行</h3>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/5">
                          <th className="px-4 py-2 text-left text-[11px] text-gray-500 w-8">#</th>
                          <th className="px-4 py-2 text-left text-[11px] text-gray-500">页面</th>
                          <th className="px-4 py-2 text-right text-[11px] text-gray-500">PV</th>
                          <th className="px-4 py-2 text-right text-[11px] text-gray-500 hidden md:table-cell">UV</th>
                          <th className="px-4 py-2 text-right text-[11px] text-gray-500 hidden md:table-cell">占比</th>
                        </tr></thead>
                        <tbody>
                          {analyticsData.pageStats.map((ps: { path: string; pv: number; uv: number }, i: number) => {
                            const pct = analyticsData.totalPv > 0 ? (ps.pv / analyticsData.totalPv * 100).toFixed(1) : '0'
                            return (
                              <tr key={ps.path} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 text-gray-600 text-xs">{i + 1}</td>
                                <td className="px-4 py-2.5 text-sm text-white">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-gray-600"/>
                                    <span className="font-mono text-xs">{ps.path}</span>
                                  </div>
                                  <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent-gold/40 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm text-gray-300 font-mono">{ps.pv.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-sm text-gray-400 font-mono hidden md:table-cell">{(ps.uv || 0).toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-xs text-gray-500 hidden md:table-cell">{pct}%</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Weekly summary */}
                  {analyticsData.weeklyStats?.length > 1 && (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-accent-gold/60"/>周度趋势</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-white/5">
                            <th className="px-4 py-2 text-left text-[11px] text-gray-500">周起始</th>
                            <th className="px-4 py-2 text-right text-[11px] text-gray-500">PV</th>
                            <th className="px-4 py-2 text-right text-[11px] text-gray-500">UV</th>
                            <th className="px-4 py-2 text-right text-[11px] text-gray-500">日均PV</th>
                          </tr></thead>
                          <tbody>
                            {analyticsData.weeklyStats.map((w: { week: string; pv: number; uv: number }, i: number) => (
                              <tr key={w.week} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="px-4 py-2.5 text-sm text-white">{w.week}</td>
                                <td className="px-4 py-2.5 text-right text-sm text-blue-400 font-mono">{w.pv.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-sm text-green-400 font-mono">{w.uv.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right text-xs text-gray-400">{Math.round(w.pv / 7).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Day of week analysis */}
                  {analyticsData.dayOfWeekStats && (
                    <div className="bg-black/30 rounded-xl border border-white/5 p-5">
                      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-accent-gold/60"/>星期分布（近7天）</h3>
                      <div className="grid grid-cols-7 gap-2">
                        {analyticsData.dayOfWeekStats.map((d: { day: number; label: string; labelEn: string; pv: number; uv: number }) => {
                          const maxPv = Math.max(...analyticsData.dayOfWeekStats.map((x: any) => x.pv), 1)
                          const barH = (d.pv / maxPv) * 100
                          const isToday = new Date().getDay() === d.day
                          return (
                            <div key={d.day} className={`text-center p-2 rounded-lg ${isToday ? 'bg-accent-gold/10 border border-accent-gold/20' : 'bg-white/[0.02]'}`}>
                              <p className={`text-[10px] ${isToday ? 'text-accent-gold font-medium' : 'text-gray-500'}`}>{d.labelEn}</p>
                              <div className="h-16 flex items-end justify-center mt-2">
                                <div className="w-full max-w-[20px] rounded-t bg-blue-400/50" style={{ height: `${Math.max(barH, 4)}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{d.label}</p>
                              <p className="text-xs text-gray-300 font-mono mt-0.5">{d.pv}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500">
                  <BarChart3 className="w-12 h-12 mb-3 opacity-20"/>
                  <p className="text-sm">暂无分析数据</p>
                  <p className="text-xs text-gray-600 mt-1">数据将在有访问记录后自动生成</p>
                </div>
              )}
            </div>
          )}

          {/* ===== CONTACT MESSAGES ===== */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">留言列表</h3>
                <span className="text-xs text-gray-500">共 {contacts.length} 条</span>
              </div>
              {contacts.length > 0 ? (
                <div className="space-y-2">
                  {contacts.map((msg: ContactMsg) => (
                    <div key={msg.id} className={`p-4 rounded-xl border transition-colors ${!msg.read ? 'bg-accent-gold/5 border-accent-gold/15' : 'bg-black/30 border-white/5'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">{msg.name}</span>
                            {!msg.read && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-gold/20 text-accent-gold font-medium">新</span>}
                            <span className="text-[11px] text-gray-500">{new Date(msg.createdAt).toLocaleString('zh-CN')}</span>
                          </div>
                          {msg.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3"/>{msg.email}</p>}
                          {msg.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3"/>{msg.phone}</p>}
                          {msg.subject && <p className="text-xs text-gray-300 mt-1 font-medium">{msg.subject}</p>}
                          <p className="text-sm text-gray-400 mt-2 line-clamp-2">{msg.message}</p>
                        </div>
                        <button onClick={() => deleteContact(msg.id)} title="删除"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/8 transition-colors flex-shrink-0">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-20"/>
                  <p className="text-sm">暂无留言</p>
                </div>
              )}
            </div>
          )}

          {/* ===== CANVAS ===== */}
          {activeTab === 'canvas' && (
            <CanvasAdmin />
          )}

          {/* ===== MEDIA ===== */}
          {activeTab === 'media' && (
            <MediaAdmin />
          )}

        </div>{/* end content area */}
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-md border-t border-white/10" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
                activeTab === id ? 'text-accent-gold' : 'text-gray-500'
              }`}>
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[10px] leading-tight">{label.length > 4 ? label.slice(0, 4) : label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── Mobile Sidebar Overlay (More menu) ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="w-56 bg-black/95 border-r border-white/5 p-4 animate-in slide-in-from-left duration-200" onClick={e => e.stopPropagation()}>
            <div className="mb-4 pb-4 border-b border-white/10">
              <h1 className="text-lg font-semibold text-white">栖光文化</h1>
              <p className="text-[11px] text-gray-500">管理后台</p>
            </div>
            <nav className="space-y-0.5">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => { setActiveTab(id); setMobileOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                    activeTab === id ? 'bg-accent-gold text-dark-900 font-medium' : 'text-gray-400'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-white/10">
              <button onClick={() => { setShowPwdModal(true); setMobileOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400"><Key className="w-4 h-4" />修改密码</button>
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400"><LogOut className="w-4 h-4"/>退出登录</button>
            </div>
          </div>
        </div>
      )}

      {/* ── User Edit Modal ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <div className="bg-dark-800 rounded-2xl border border-white/10 p-6 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-medium text-white">编辑用户</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-3">
              {[['姓名','name'],['电话','phone'],['邮箱','email'],['公司','company'],['简介','bio'],['积分','points']].map(([label,key]) => (
                <div key={key}>
                  <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
                  <input type={key==='phone'?'tel':key==='email'?'email':'text'}
                    value={(userForm as any)[key]}
                    onChange={e => setUserForm((p:any)=>({...p,[key]:e.target.value}))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-accent-gold focus:outline-none"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-colors">取消</button>
              <button onClick={saveUserEdit} className="flex-1 px-4 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Change Modal ── */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowPwdModal(false); setPwdError(''); setPwdForm({ current: '', newPwd: '' }) }}>
          <div className="bg-dark-800 rounded-2xl border border-white/10 p-6 w-full max-w-md mx-4 shadow-2xl animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-medium text-white flex items-center gap-2"><Key className="w-5 h-5 text-accent-gold" />修改管理员密码</h3>
              <button onClick={() => { setShowPwdModal(false); setPwdError(''); setPwdForm({ current: '', newPwd: '' }) }} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">当前密码</label>
                <input type="password" value={pwdForm.current}
                  onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="输入当前密码"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-wider">新密码</label>
                <input type="password" value={pwdForm.newPwd}
                  onChange={e => setPwdForm(p => ({ ...p, newPwd: e.target.value }))}
                  placeholder="输入新密码（至少6位）"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
              </div>
              {pwdError && <p className="text-xs text-red-400 bg-red-400/5 rounded-lg px-3 py-2">{pwdError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowPwdModal(false); setPwdError(''); setPwdForm({ current: '', newPwd: '' }) }}
                className="flex-1 px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-colors">取消</button>
              <button onClick={changePassword} disabled={pwdLoading}
                className="flex-1 px-4 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 disabled:opacity-50 transition-colors">
                {pwdLoading ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* ─── Pixel Preview Component ─── */
function PixelPreview({ pixels, width, height }: { pixels: { x: number; y: number; color: string }[]; width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    const pw = w / width
    const ph = h / height
    ctx.fillStyle = '#050505'
    ctx.fillRect(0, 0, w, h)
    for (const p of pixels) {
      ctx.fillStyle = p.color
      ctx.fillRect(p.x * pw, p.y * ph, Math.ceil(pw), Math.ceil(ph))
    }
  }, [pixels, width, height])
  return <canvas ref={canvasRef} width={48} height={48} className="w-full h-full" />
}

/* ─── Canvas Admin Component ─── */
function CanvasAdmin() {
  const [activeCanvas, setActiveCanvas] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/canvas/current').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/canvas/history').then(r => r.ok ? r.json() : { canvases: [] }).catch(() => ({ canvases: [] })),
    ]).then(([cur, hist]) => {
      setActiveCanvas(cur?.canvas || null)
      setHistory(hist.canvases || [])
      setLoading(false)
    })
  }

  useEffect(() => { fetchData() }, [])

  const manualSettle = async () => {
    if (!confirm('确定手动结算？将归档24小时以上的画布并创建新画布。')) return
    setSettling(true)
    try {
      const res = await fetch('/api/cron/daily-settle', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        alert(`成功结算 ${data.settled} 张画布`)
        fetchData()
      } else {
        alert('结算失败: ' + (data.error || '未知错误'))
      }
    } catch {
      alert('网络错误')
    } finally {
      setSettling(false)
    }
  }

  const deleteCanvas = async (id: string) => {
    if (!confirm('确定删除此画布？此操作不可撤销！')) return
    setDeletingId(id)
    try {
      const res = await fetch("/api/admin/canvas/" + id, { method: 'DELETE' })
      if (res.ok) {
        setHistory(prev => prev.filter(c => c.id !== id))
      } else {
        const data = await res.json()
        alert('删除失败: ' + (data.error || '未知错误'))
      }
    } catch {
      alert('网络错误')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>

  const totalPixels = history.reduce((s: number, c: any) => s + (c.pixelCount || 0), 0)
  const totalCanvases = history.length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '总画布数', value: totalCanvases, color: 'text-blue-400', bg: 'bg-blue-400/8', border: 'border-blue-400/15' },
          { label: '总像素数', value: totalPixels.toLocaleString(), color: 'text-purple-400', bg: 'bg-purple-400/8', border: 'border-purple-400/15' },
          { label: '当前大小', value: activeCanvas ? `${activeCanvas.width}×${activeCanvas.height}` : '-', color: 'text-green-400', bg: 'bg-green-400/8', border: 'border-green-400/15' },
          { label: '填充率', value: activeCanvas ? `${activeCanvas.fillRate}%` : '-', color: 'text-accent-gold', bg: 'bg-accent-gold/8', border: 'border-accent-gold/15' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-xl ${s.bg} ${s.border} border`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Manual Settle */}
      <div className="flex items-center justify-between p-4 bg-accent-gold/5 border border-accent-gold/15 rounded-xl">
        <div>
          <p className="text-sm text-white font-medium">手动结算</p>
          <p className="text-xs text-gray-500 mt-0.5">系统每天 00:00 自动结算。若未正常执行，可手动触发。</p>
        </div>
        <button onClick={manualSettle} disabled={settling}
          className="px-4 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 disabled:opacity-50 transition-colors shrink-0">
          {settling ? '结算中...' : '立即结算'}
        </button>
      </div>

      {/* Template Management */}
      <a href="/admin/canvas-template"
        className="flex items-center justify-between p-4 bg-purple-500/5 border border-purple-500/15 rounded-xl hover:bg-purple-500/10 transition-colors group">
        <div>
          <p className="text-sm text-white font-medium">管理画布底稿</p>
          <p className="text-xs text-gray-500 mt-0.5">选择画布自动填充时使用的名画底稿（当前 20+ 幅）</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
      </a>

      {/* Active Canvas */}
      {activeCanvas && (
        <div className="bg-black/30 rounded-xl border border-white/5 p-5">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Palette className="w-4 h-4 text-accent-gold/60"/>当前活跃画布</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500 text-xs">画布 ID</p><p className="text-white font-mono text-xs mt-1">{activeCanvas.id.slice(0, 12)}...</p></div>
            <div><p className="text-gray-500 text-xs">尺寸</p><p className="text-white mt-1">{activeCanvas.width} × {activeCanvas.height}</p></div>
            <div><p className="text-gray-500 text-xs">像素数</p><p className="text-white mt-1">{activeCanvas.placedPixels} / {activeCanvas.totalPixels}</p></div>
            <div><p className="text-gray-500 text-xs">领先者</p><p className="text-accent-gold mt-1">{activeCanvas.leader ? `${activeCanvas.leader.count}px` : '-'}</p></div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>填充进度</span><span>{activeCanvas.fillRate}%</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div className="h-full bg-accent-gold/50 rounded-full transition-all" style={{ width: activeCanvas.fillRate + '%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Canvas History */}
      <div className="bg-black/30 rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-accent-gold/60"/>画布历史（最近 20 张）</h3>
        {history.length > 0 ? (
          <div className="space-y-2">
            {history.slice(-20).reverse().map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 py-2 px-3 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] text-sm">
                {/* Pixel Preview */}
                <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-dark-950 border border-white/5">
                  <PixelPreview pixels={c.pixels || []} width={c.width} height={c.height} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white truncate">{c.name || `画布 #${c.id.slice(0, 8)}`}</span>
                    <span className="text-gray-600 text-xs">{c.pixelCount || 0}px / {c.totalPixels}px</span>
                    <span className="text-accent-gold/60 text-xs">{c.fillRate}%</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-500 text-xs">{c.endTime ? new Date(c.endTime).toLocaleDateString('zh-CN') : '-'}</span>
                    <span className="text-xs text-gray-600">
                      {c.ownerId ? `🏆 ${c.ownerId.slice(0, 8)}` : '⚪ 无主'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteCanvas(c.id)}
                  disabled={deletingId === c.id}
                  className="shrink-0 p-1.5 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30 transition-colors"
                  title="删除已结算画布"
                >
                  {deletingId === c.id ? (
                    <span className="block w-4 h-4 border-2 border-red-400/50 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 py-8 text-center">暂无画布数据</p>
        )}
      </div>

      {/* Settlement Info */}
      <div className="bg-black/30 rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-accent-gold/60"/>结算规则</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p>• 每日 <span className="text-accent-gold/70">00:00</span> 自动结算</p>
          <p>• 画布生命周期 24 小时</p>
          <p>• 结算时像素数最多的用户获得画布所有权</p>
          <p>• 画布最大尺寸 80×80（填满时自动扩张 2 倍）</p>
          <p>• 每 10 分钟系统自动在随机空位放置彩色像素</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Media Admin Component ─── */
function MediaAdmin() {
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadUrl, setUploadUrl] = useState('')

  useEffect(() => {
    fetch('/api/admin/works')
      .then(r => r.ok ? r.json() : [])
      .then((works: any[]) => {
        const items = works
          .filter((w: any) => w.coverUrl)
          .map((w: any) => ({
            id: w.id,
            title: w.title,
            url: w.coverUrl,
            type: 'image',
            createdAt: w.createdAt,
          }))
        setMedia(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="bg-black/30 rounded-xl border border-white/5 p-5">
        <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2"><Upload className="w-4 h-4 text-accent-gold/60"/>添加媒体资源</h3>
        <div className="flex gap-2">
          <input type="text" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)}
            placeholder="输入图片 URL 或从作品封面引入..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent-gold focus:outline-none" />
          <button onClick={() => { if (uploadUrl) { setMedia(prev => [{ id: 'upload-' + Date.now(), title: '手动添加', url: uploadUrl, type: 'image', createdAt: new Date().toISOString() }, ...prev]); setUploadUrl('') } }}
            className="px-4 py-2 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 transition-colors">添加</button>
        </div>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : media.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {media.map((item: any) => (
            <div key={item.id} className="group bg-black/30 border border-white/5 rounded-lg overflow-hidden hover:border-white/15 transition-colors">
              <div className="aspect-[4/3] bg-dark-900 relative overflow-hidden">
                <img src={item.url} alt={item.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-300 truncate">{item.title}</p>
                <p className="text-[10px] text-gray-600 mt-1">{new Date(item.createdAt).toLocaleDateString('zh-CN')}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-500 bg-black/20 rounded-xl border border-dashed border-white/10">
          <Image className="w-12 h-12 mb-3 opacity-20"/>
          <p className="text-sm font-medium">暂无媒体文件</p>
          <p className="text-xs text-gray-600 mt-1">上传图片后媒体库会自动更新</p>
        </div>
      )}
    </div>
  )
}
