'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Film,
  Image,
  Globe,
  Phone,
  Settings as SettingsIcon,
  LogOut,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  Search,
  Menu,
  X,
  Plus,
  Edit3,
  Save,
  Upload,
  ChevronDown,
  ChevronUp,
  Star,
  StarOff,
  GripVertical,
  ExternalLink,
  AlertCircle,
  Info,
  Type,
  Mail,
  MapPin,
  Smartphone,
  Languages,
  Palette,
  Shield,
  Key,
  BarChart2,
  MessageSquare,
} from 'lucide-react'

interface Work {
  id: string
  title: string
  description: string | null
  category: string
  videoUrl: string | null
  coverUrl: string | null
  status: string
  creatorName: string
  creatorPhone: string
  createdAt: string
  userId: string | null
}

interface User {
  id: string
  name: string
  phone: string
  email: string | null
  company: string | null
  bio?: string
  points?: number
  createdAt: string
  _count?: { works: number }
}

interface Stats {
  totalWorks: number
  pendingWorks: number
  approvedWorks: number
  totalUsers: number
  recentWorks: Work[]
}

interface SiteConfig {
  brandDisplay?: {
    opacity: number
    opacityHover: number
    grayscale: boolean
    grayscaleHover: boolean
  }
  company: {
    name: string; nameEn: string; shortName: string; shortNameEn: string
    slogan: string; sloganEn: string; description: string; descriptionEn: string
  }
  contact: { phone: string; email: string; address: string; wechat: string; weibo: string; xiaohongshu: string }
  seo: { title: string; description: string; keywords: string }
  hero: { title: string; titleEn: string; subtitle: string; subtitleEn: string; tags: string[] }
  featuredWorks: Array<{ id: string; title: string; titleEn: string; category: string; categoryEn: string; image: string; homepageOrder: number | null; videoUrl?: string; views?: number; duration?: number }>
  services: Array<{ id: string; title: string; titleEn: string; desc: string; descEn: string; order: number }>
  brands: Array<{ id: string; name: string; slug: string; order: number }>
  navigation?: { logo: string; items: Array<{ id: string; label: string; href: string; visible: boolean; order: number }> }
  footer?: { logo: string; tagline: string; columns: any[]; copyright: string; bottomText: string }
  theme?: { primaryColor: string; bgColor: string; textColor: string; fontFamily: string; fontDisplay: string; borderRadius: string; customCSS: string }
  pages?: Record<string, { label: string; path: string; visible: boolean }>
  announcement?: { enabled: boolean; text: string; type: string; dismissible: boolean; link: string | null }
  codeInjection?: { headHTML: string; footerHTML: string; bodyStartHTML: string }
  socialLinks?: Record<string, string>
}

interface AnalyticsData {
  totalPv: number
  totalUv: number
  avgDailyPv: number
  dateList: Array<{ date: string; pv: number; uv: number }>
  pageStats: Array<{ path: string; pv: number }>
  days: number
}

type Tab = 'dashboard' | 'works' | 'users' | 'settings' | 'analytics' | 'contact' | 'canvas'

// ===== SETTINGS SECTIONS =====
type SettingsSection = 'company' | 'contact' | 'seo' | 'hero' | 'works' | 'services' | 'brands' | 'display' | 'security' | 'navigation' | 'footer' | 'theme' | 'pages' | 'codeInjection' | 'announcement' | 'social'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('company')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeSettingTab, setActiveSettingTab] = useState<SettingsSection>('company')

  // Data states
  const [stats, setStats] = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [works, setWorks] = useState<Work[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [canvasStats, setCanvasStats] = useState<any>(null)
  const [settling, setSettling] = useState(false)
  const [settleResult, setSettleResult] = useState<string>('')
  const [selectedWork, setSelectedWork] = useState<Work | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  // Settings config state
  const [config, setConfig] = useState<SiteConfig | null>(null)

  // Filter states
  const [workFilter, setWorkFilter] = useState('ALL')
  const [workSearch, setWorkSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // User edit modal
  const [editUser, setEditUser] = useState<any | null>(null)
  const [showUserEdit, setShowUserEdit] = useState(false)
  const [userEditForm, setUserEditForm] = useState({ name: '', phone: '', email: '', company: '', bio: '', points: 0 })
  const [userEditSaving, setUserEditSaving] = useState(false)

  // Temp edit states for settings
  const [tempConfig, setTempConfig] = useState<SiteConfig | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData()
      fetchWorks()
      fetchUsers()
      fetchSiteConfig()
    }
  }, [isAuthenticated])

  // Refresh analytics when tab is selected
  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      fetchAnalyticsData(analyticsDays)
    }
  }, [isAuthenticated, activeTab])

  // Fetch contacts when tab selected
  useEffect(() => {
    if (isAuthenticated && activeTab === 'contact') {
      fetchContacts()
    }
  }, [isAuthenticated, activeTab])

  // Fetch canvas data when tab selected
  useEffect(() => {
    if (isAuthenticated && activeTab === 'canvas') {
      fetchCanvasStats()
    }
  }, [isAuthenticated, activeTab])

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/check-auth')
      if (res.ok) { setIsAuthenticated(true) }
      else { router.push('/admin/login') }
    } catch { router.push('/admin/login') }
    finally { setIsLoading(false) }
  }

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.ok) setStats(await res.json())
    } catch (e) { console.error('Failed to fetch stats:', e) }
  }

  const fetchWorks = async () => {
    try {
      const res = await fetch('/api/admin/works')
      if (res.ok) setWorks(await res.json())
    } catch (e) { console.error('Failed to fetch works:', e) }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) setUsers(await res.json())
    } catch (e) { console.error('Failed to fetch users:', e) }
  }

  const fetchSiteConfig = async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        setTempConfig(data)
      }
    } catch (e) { console.error('Failed to fetch config:', e) }
  }

  const fetchAnalyticsData = async (days: number = 30) => {
    try {
      const res = await fetch(`/api/analytics?days=${days}`)
      if (res.ok) setAnalytics(await res.json())
    } catch (e) { console.error('Failed to fetch analytics:', e) }
  }

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/admin/contacts')
      if (res.ok) setContacts(await res.json())
    } catch (e) { console.error('Failed to fetch contacts:', e) }
  }

  const fetchCanvasStats = async () => {
    try {
      const res = await fetch('/api/canvas/current')
      if (res.ok) {
        const data = await res.json()
        setCanvasStats(data.canvas)
      }
    } catch (e) { console.error('Failed to fetch canvas stats:', e) }
    try {
      const res = await fetch('/api/canvas/history')
      if (res.ok) {
        const history = await res.json()
        setCanvasStats((prev: any) => prev ? { ...prev, archiveCount: history.length, archives: history } : null)
      }
    } catch (e) { console.error('Failed to fetch canvas history:', e) }
  }

  const handleManualSettle = async () => {
    setSettling(true)
    setSettleResult('')
    try {
      const res = await fetch('/api/cron/daily-settle', { method: 'POST' })
      const data = await res.json()
      setSettleResult(data.settled > 0 ? '结算完成: ' + data.settled + ' 个画布已归档' : '当前无已过期画布')
      fetchCanvasStats()
    } catch (e) {
      setSettleResult('结算失败: ' + String(e))
    } finally {
      setSettling(false)
    }
  }

  const saveConfig = async (section: string, data: any) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data })
      })
      if (res.ok) {
        setSaveStatus('saved')
        setConfig((prev) => prev ? { ...prev, [section]: data } : prev)
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleReview = async (workId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, status, comment: reviewComment })
      })
      if (res.ok) {
        setSelectedWork(null); setReviewComment('')
        fetchWorks(); fetchDashboardData()
      }
    } catch (e) { console.error('Review failed:', e) }
  }

  const handleDeleteWork = async (workId: string) => {
    if (!confirm('确定要删除这个作品吗？此操作不可恢复。')) return
    try {
      const res = await fetch(`/api/admin/works/${workId}`, { method: 'DELETE' })
      if (res.ok) { fetchWorks(); fetchDashboardData() }
    } catch (e) { console.error('Delete failed:', e) }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const filteredWorks = works.filter(w =>
    (workFilter === 'ALL' || w.status === workFilter) &&
    (w.title.toLowerCase().includes(workSearch.toLowerCase()) || w.creatorName.toLowerCase().includes(workSearch.toLowerCase()))
  )
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.phone.includes(userSearch)
  )

  const openUserEdit = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/' + userId)
      const data = await res.json()
      if (data.user) {
        setUserEditForm({
          name: data.user.name,
          phone: data.user.phone,
          email: data.user.email || '',
          company: data.user.company || '',
          bio: data.user.bio || '',
          points: data.user.points,
        })
        setEditUser(data.user)
        setShowUserEdit(true)
      }
    } catch (e) {
      console.error('获取用户详情失败:', e)
    }
  }

  const saveUserEdit = async () => {
    if (!editUser) return
    setUserEditSaving(true)
    try {
      const res = await fetch('/api/admin/users/' + editUser.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userEditForm),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...userEditForm } : u))
        setShowUserEdit(false)
        setEditUser(null)
      }
    } catch (e) {
      console.error('保存用户信息失败:', e)
    } finally {
      setUserEditSaving(false)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-accent-gold text-xl">加载中...</div>
    </div>
  )
  if (!isAuthenticated) return null

  // ==============================
  // SETTINGS PANEL
  // ==============================
  const renderSettings = () => (
    <div className="flex gap-8">
      {/* Settings Sidebar */}
      <div className="w-56 flex-shrink-0">
        <div className="space-y-1">
          {[
            { id: 'company', label: '公司信息', icon: Globe },
            { id: 'contact', label: '联系方式', icon: Phone },
            { id: 'seo', label: 'SEO 设置', icon: Languages },
            { id: 'hero', label: '首屏内容', icon: Type },
            { id: 'works', label: '代表作品', icon: Image },
            { id: 'services', label: '服务领域', icon: SettingsIcon },
            { id: 'brands', label: '合作品牌', icon: Star },
            { id: 'display', label: '品牌显示', icon: Palette },
            { id: 'navigation', label: '导航菜单', icon: Menu },
            { id: 'footer', label: '页脚配置', icon: LayoutDashboard },
            { id: 'theme', label: '主题样式', icon: Palette },
            { id: 'pages', label: '页面管理', icon: Globe },
            { id: 'announcement', label: '通知公告', icon: Info },
            { id: 'codeInjection', label: '代码注入', icon: Type },
            { id: 'social', label: '社交链接', icon: MessageSquare },
            { id: 'security', label: '安全设置', icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSettingsSection(id as SettingsSection)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                settingsSection === id
                  ? 'bg-accent-gold text-dark-900'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Main */}
      <div className="flex-1 min-w-0">
        {saveStatus !== 'idle' && (
          <div className={`mb-6 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            saveStatus === 'saving' ? 'bg-accent-gold/10 text-accent-gold' :
            saveStatus === 'saved' ? 'bg-green-500/10 text-green-400' :
            'bg-red-500/10 text-red-400'
          }`}>
            {saveStatus === 'saving' && '⟳ 保存中...'}
            {saveStatus === 'saved' && '✓ 保存成功'}
            {saveStatus === 'error' && '✗ 保存失败，请重试'}
          </div>
        )}

        {settingsSection === 'company' && tempConfig && (
          <SettingsForm title="公司信息" onSave={() => saveConfig('company', tempConfig!.company)}>
            <Field label="公司名称（中文）" value={tempConfig.company.name}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, name: v } })} />
            <Field label="公司名称（英文）" value={tempConfig.company.nameEn}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, nameEn: v } })} />
            <Field label="简称（中文）" value={tempConfig.company.shortName}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, shortName: v } })} />
            <Field label="简称（英文）" value={tempConfig.company.shortNameEn}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, shortNameEn: v } })} />
            <Field label=" slogan（中文）" value={tempConfig.company.slogan}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, slogan: v } })} />
            <Field label="slogan（英文）" value={tempConfig.company.sloganEn}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, sloganEn: v } })} />
            <Field label="公司简介（中文）" value={tempConfig.company.description}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, description: v } })} multiline />
            <Field label="公司简介（英文）" value={tempConfig.company.descriptionEn}
              onChange={v => setTemp({ ...tempConfig, company: { ...tempConfig.company, descriptionEn: v } })} multiline />
          </SettingsForm>
        )}

        {settingsSection === 'contact' && tempConfig && (
          <SettingsForm title="联系方式" onSave={() => saveConfig('contact', tempConfig!.contact)}>
            <Field label="手机号" value={tempConfig.contact.phone} onChange={v => setTemp({ ...tempConfig, contact: { ...tempConfig.contact, phone: v } })} prefix={<Smartphone className="w-4 h-4 text-gray-500" />} />
            <Field label="邮箱" value={tempConfig.contact.email} onChange={v => setTemp({ ...tempConfig, contact: { ...tempConfig.contact, email: v } })} prefix={<Mail className="w-4 h-4 text-gray-500" />} />
            <Field label="地址" value={tempConfig.contact.address} onChange={v => setTemp({ ...tempConfig, contact: { ...tempConfig.contact, address: v } })} prefix={<MapPin className="w-4 h-4 text-gray-500" />} />
            <Field label="微信" value={tempConfig.contact.wechat} onChange={v => setTemp({ ...tempConfig, contact: { ...tempConfig.contact, wechat: v } })} />
            <Field label="微博" value={tempConfig.contact.weibo} onChange={v => setTemp({ ...tempConfig, contact: { ...tempConfig.contact, weibo: v } })} />
            <Field label="小红书" value={tempConfig.contact.xiaohongshu} onChange={v => setTemp({ ...tempConfig, contact: { ...tempConfig.contact, xiaohongshu: v } })} />
          </SettingsForm>
        )}

        {settingsSection === 'seo' && tempConfig && (
          <SettingsForm title="SEO 设置" onSave={() => saveConfig('seo', tempConfig!.seo)}>
            <Field label="网站标题" value={tempConfig.seo.title}
              onChange={v => setTemp({ ...tempConfig, seo: { ...tempConfig.seo, title: v } })} />
            <Field label="网站描述" value={tempConfig.seo.description}
              onChange={v => setTemp({ ...tempConfig, seo: { ...tempConfig.seo, description: v } })} multiline />
            <Field label="关键词（用逗号分隔）" value={tempConfig.seo.keywords}
              onChange={v => setTemp({ ...tempConfig, seo: { ...tempConfig.seo, keywords: v } })} multiline />
          </SettingsForm>
        )}

        {settingsSection === 'hero' && tempConfig && (
          <SettingsForm title="首屏内容" onSave={() => saveConfig('hero', tempConfig!.hero)}>
            <Field label="主标题" value={tempConfig.hero.title}
              onChange={v => setTemp({ ...tempConfig, hero: { ...tempConfig.hero, title: v } })} />
            <Field label="副标题（英文）" value={tempConfig.hero.titleEn}
              onChange={v => setTemp({ ...tempConfig, hero: { ...tempConfig.hero, titleEn: v } })} />
            <Field label="副标题（中文）" value={tempConfig.hero.subtitle}
              onChange={v => setTemp({ ...tempConfig, hero: { ...tempConfig.hero, subtitle: v } })} />
            <Field label="副标题（英文）" value={tempConfig.hero.subtitleEn}
              onChange={v => setTemp({ ...tempConfig, hero: { ...tempConfig.hero, subtitleEn: v } })} />
            <TagEditor label="关键词标签" tags={tempConfig.hero.tags}
              onChange={tags => setTemp({ ...tempConfig, hero: { ...tempConfig.hero, tags } })} />
          </SettingsForm>
        )}

        {settingsSection === 'works' && tempConfig && (
          <WorksEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('featuredWorks', tempConfig!.featuredWorks)} />
        )}

        {settingsSection === 'services' && tempConfig && (
          <ServicesEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('services', tempConfig!.services)} />
        )}

        {settingsSection === 'brands' && tempConfig && (
          <BrandsEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('brands', tempConfig!.brands)} />
        )}

        {settingsSection === 'navigation' && tempConfig && (
          <NavigationEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('navigation', tempConfig!.navigation)} />
        )}

        {settingsSection === 'footer' && tempConfig && (
          <FooterEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('footer', tempConfig!.footer)} />
        )}

        {settingsSection === 'theme' && tempConfig && (
          <ThemeEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('theme', tempConfig!.theme)} />
        )}

        {settingsSection === 'pages' && tempConfig && (
          <PageManager config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('pages', tempConfig!.pages)} />
        )}

        {settingsSection === 'announcement' && tempConfig && (
          <AnnouncementEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('announcement', { enabled: tempConfig!.announcement!.enabled, text: tempConfig!.announcement!.text, type: tempConfig!.announcement!.type, dismissible: tempConfig!.announcement!.dismissible, link: tempConfig!.announcement!.link })} />
        )}

        {settingsSection === 'codeInjection' && tempConfig && (
          <CodeInjectionEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('codeInjection', tempConfig!.codeInjection)} />
        )}

        {settingsSection === 'social' && tempConfig && (
          <SocialLinksEditor config={tempConfig} onChange={setTempConfig} onSave={() => saveConfig('socialLinks', tempConfig!.socialLinks)} />
        )}

        {settingsSection === 'display' && tempConfig && (
          <SettingsForm title="品牌显示" onSave={() => saveConfig('brandDisplay', tempConfig!.brandDisplay)}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">默认亮度</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={tempConfig.brandDisplay?.opacity ?? 0.75}
                    onChange={(e) => setTemp({
                      ...tempConfig,
                      brandDisplay: { ...tempConfig.brandDisplay, opacity: parseFloat(e.target.value) }
                    })}
                    className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-accent-gold"
                  />
                  <span className="text-sm text-white w-12 text-right">{Math.round((tempConfig.brandDisplay?.opacity ?? 0.75) * 100)}%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Hover 亮度</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={tempConfig.brandDisplay?.opacityHover ?? 1}
                    onChange={(e) => setTemp({
                      ...tempConfig,
                      brandDisplay: { ...tempConfig.brandDisplay, opacityHover: parseFloat(e.target.value) }
                    })}
                    className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-accent-gold"
                  />
                  <span className="text-sm text-white w-12 text-right">{Math.round((tempConfig.brandDisplay?.opacityHover ?? 1) * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div>
                  <p className="text-sm text-white">默认灰度</p>
                  <p className="text-xs text-gray-500">启用后品牌 logo 默认为黑白</p>
                </div>
                <button
                  onClick={() => setTemp({
                    ...tempConfig,
                    brandDisplay: { ...tempConfig.brandDisplay, grayscale: !tempConfig.brandDisplay?.grayscale }
                  })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    tempConfig.brandDisplay?.grayscale ? 'bg-accent-gold' : 'bg-dark-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    tempConfig.brandDisplay?.grayscale ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/5">
                <div>
                  <p className="text-sm text-white">Hover 灰度</p>
                  <p className="text-xs text-gray-500">启用后鼠标悬停时保持黑白</p>
                </div>
                <button
                  onClick={() => setTemp({
                    ...tempConfig,
                    brandDisplay: { ...tempConfig.brandDisplay, grayscaleHover: !tempConfig.brandDisplay?.grayscaleHover }
                  })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    tempConfig.brandDisplay?.grayscaleHover ? 'bg-accent-gold' : 'bg-dark-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                    tempConfig.brandDisplay?.grayscaleHover ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </SettingsForm>
        )}

        {settingsSection === 'security' && (
          <SecuritySettings />
        )}
      </div>
    </div>
  )

  const setTemp = ( updater: any ) => {
    if (typeof updater === 'function') {
      setTempConfig(updater(tempConfig))
    } else {
      setTempConfig(updater)
    }
  }

  // ==============================
  // ANALYTICS
  // ==============================
  function renderAnalytics() {
    if (!analytics) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent-gold" />
        </div>
      )
    }

    return (
      <div className="space-y-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: '总浏览量 (PV)', value: analytics.totalPv.toLocaleString(), icon: Eye },
            { label: '访问用户 (UV)', value: analytics.totalUv.toLocaleString(), icon: Users },
            { label: `日均访问 (${analytics.days}天)`, value: analytics.avgDailyPv.toFixed(0), icon: BarChart2 },
          ].map(({ label, value, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-dark-800 rounded-lg p-5 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{label}</span>
                <Icon className="w-5 h-5 text-accent-gold" />
              </div>
              <p className="text-3xl font-light text-white">{value}</p>
            </motion.div>
          ))}
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-400">统计周期：</span>
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => {
                setAnalyticsDays(d)
                fetchAnalyticsData(d)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                analyticsDays === d
                  ? 'bg-accent-gold text-dark-900'
                  : 'bg-dark-700 text-gray-400 hover:text-white'
              }`}
            >
              {d}天
            </button>
          ))}
        </div>

        {/* Daily Trend Chart */}
        <div className="bg-dark-800 rounded-lg p-6 border border-white/5">
          <h3 className="text-lg font-medium text-white mb-4">每日访问趋势</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-400 font-normal">日期</th>
                  <th className="text-right py-2 text-gray-400 font-normal">PV</th>
                  <th className="text-right py-2 text-gray-400 font-normal">UV</th>
                  <th className="hidden sm:table-cell text-right py-2 text-gray-400 font-normal">趋势</th>
                </tr>
              </thead>
              <tbody>
                {analytics.dateList.map((day) => {
                  const barWidth = analytics.totalPv > 0 ? (day.pv / analytics.totalPv) * 100 : 0
                  return (
                    <tr key={day.date} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 text-white/80">{day.date}</td>
                      <td className="py-3 text-right text-white">{day.pv.toLocaleString()}</td>
                      <td className="py-3 text-right text-white/80">{day.uv.toLocaleString()}</td>
                      <td className="hidden sm:table-cell py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-gold rounded-full transition-all"
                              style={{ width: `${Math.min(barWidth, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{barWidth.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page Statistics */}
        {analytics.pageStats && analytics.pageStats.length > 0 && (
          <div className="bg-dark-800 rounded-lg p-6 border border-white/5">
            <h3 className="text-lg font-medium text-white mb-4">页面访问排行</h3>
            <div className="space-y-2">
              {analytics.pageStats
                .sort((a, b) => b.pv - a.pv)
                .slice(0, 15)
                .map((page, i) => {
                  const maxPv = analytics.pageStats[0]?.pv || 1
                  return (
                    <div key={page.path} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6 text-right">{i + 1}</span>
                      <span className="text-xs text-gray-400 w-8 text-right">{page.pv}</span>
                      <div className="flex-1 h-5 bg-dark-700 rounded overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-accent-gold/40 to-accent-gold rounded transition-all"
                          style={{ width: `${(page.pv / maxPv) * 100}%` }}
                        />
                        <span className="absolute left-2 top-0.5 text-xs text-white/60 truncate max-w-full">
                          {page.path || '/'}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5">
        <span className="text-accent-gold font-display text-xl">栖光管理后台</span>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block w-64 bg-dark-800 min-h-screen border-r border-white/5 fixed lg:static z-50`}>
          <div className="p-6">
            <h1 className="text-accent-gold font-display text-xl hidden lg:block">栖光管理后台</h1>
          </div>
          <nav className="px-4 pb-4">
            {[
              { id: 'dashboard' as Tab, label: '概览', icon: LayoutDashboard },
              { id: 'works' as Tab, label: '作品审核', icon: Film },
              { id: 'users' as Tab, label: '用户管理', icon: Users },
              { id: 'analytics' as Tab, label: '统计', icon: BarChart2 },
              { id: 'canvas' as Tab, label: '像素画布', icon: Palette },
              { id: 'contact' as Tab, label: '客户联系人', icon: MessageSquare },
              { id: 'settings' as Tab, label: '网站配置', icon: Globe },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); setMobileMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-1 ${
                  activeTab === id ? 'bg-accent-gold text-dark-900' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="px-4 mt-auto">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 transition-colors">
              <LogOut className="w-5 h-5" />
              <span>退出登录</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 min-w-0">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-light text-white mb-8">
              {activeTab === 'dashboard' && '概览'}
              {activeTab === 'works' && '作品管理'}
              {activeTab === 'users' && '用户管理'}
              {activeTab === 'analytics' && '访问统计'}
              {activeTab === 'canvas' && '像素画布管理'}
              {activeTab === 'settings' && '网站配置'}
            </h2>

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'works' && renderWorks()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'canvas' && renderCanvasDashboard()}
            {activeTab === 'contact' && renderContacts()}
          </div>
        </main>
      </div>

      {/* User Edit Modal */}
      {showUserEdit && editUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-800 rounded-lg max-w-lg w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">编辑用户</h3>
              <button onClick={() => setShowUserEdit(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">用户名</label>
                <input value={userEditForm.name} onChange={e => setUserEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">手机号</label>
                <input value={userEditForm.phone} onChange={e => setUserEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">邮箱</label>
                <input value={userEditForm.email} onChange={e => setUserEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">公司</label>
                  <input value={userEditForm.company} onChange={e => setUserEditForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1.5">积分</label>
                  <input type="number" min={0} value={userEditForm.points} onChange={e => setUserEditForm(f => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1.5">简介</label>
                <textarea value={userEditForm.bio} onChange={e => setUserEditForm(f => ({ ...f, bio: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold resize-none h-20" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={saveUserEdit} disabled={userEditSaving}
                className="flex-1 py-2.5 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 transition-colors disabled:opacity-50">
                {userEditSaving ? '保存中...' : '保存修改'}
              </button>
              <button onClick={() => setShowUserEdit(false)}
                className="px-6 py-2.5 bg-dark-700 text-gray-400 rounded-lg text-sm hover:bg-dark-600 transition-colors">取消</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Review Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-800 rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-medium text-white mb-4">审核作品</h3>
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">作品名称</p>
              <p className="text-white">{selectedWork.title}</p>
            </div>
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">创作者</p>
              <p className="text-white">{selectedWork.creatorName}</p>
            </div>
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">审核意见（可选）</p>
              <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder="输入审核意见..."
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold resize-none h-24" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleReview(selectedWork.id, 'APPROVED')}
                className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">通过</button>
              <button onClick={() => handleReview(selectedWork.id, 'REJECTED')}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">拒绝</button>
              <button onClick={() => { setSelectedWork(null); setReviewComment('') }}
                className="px-6 py-3 bg-dark-700 text-gray-400 rounded-lg hover:bg-dark-600 transition-colors">取消</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )

  // ==============================
  // CONTACT SUBMISSIONS
  // ==============================
  function renderContacts() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">客户咨询记录</h3>
          <span className="text-sm text-gray-400">共 {contacts.length} 条</span>
        </div>
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-dark-800 rounded-lg border border-white/5">暂无咨询记录</div>
        ) : (
          <div className="space-y-3">
            {contacts.map((c: any) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-dark-800 rounded-lg border border-white/5 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-sm text-gray-400">
                      {c.phone && <span className="mr-4">📱 {c.phone}</span>}
                      {c.email && <span className="mr-4">✉️ {c.email}</span>}
                      {c.company && <span>🏢 {c.company}</span>}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    c.status === 'NEW' ? 'bg-yellow-400/20 text-yellow-400' :
                    c.status === 'READ' ? 'bg-blue-400/20 text-blue-400' :
                    'bg-green-400/20 text-green-400'
                  }`}>
                    {c.status === 'NEW' ? '新' : c.status === 'READ' ? '已读' : '已回复'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 bg-dark-900 rounded p-3 mb-3">{c.message}</p>
                <p className="text-xs text-gray-600">{new Date(c.createdAt).toLocaleString('zh-CN')}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ==============================
  // CANVAS MANAGEMENT
  // ==============================
  function renderCanvasDashboard() {
    return (
      <div className="space-y-8">
        {/* 当前画布状态 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '画布尺寸', value: canvasStats ? canvasStats.width + '×' + canvasStats.height : '--', icon: Palette, color: 'text-accent-gold' },
            { label: '已填充', value: canvasStats ? canvasStats.fillRate + '%' : '--', icon: CheckCircle, color: 'text-green-400' },
            { label: '像素总数', value: canvasStats ? canvasStats.placedPixels + '/' + canvasStats.totalPixels : '--', icon: LayoutDashboard, color: 'text-blue-400' },
            { label: '历史画布', value: canvasStats?.archiveCount || 0, icon: Clock, color: 'text-purple-400' },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-dark-800 rounded-lg p-5 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{label}</p>
                  <p className={'text-2xl font-light mt-1 ' + color}>{value}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center"><Icon className={'w-5 h-5 ' + color} /></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 手动结算 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-dark-800 rounded-lg border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-white">画布结算</h3>
              <p className="text-sm text-gray-400 mt-1">手动触发每日结算，将超过24小时的画布归档并创建新画布</p>
            </div>
            <button onClick={handleManualSettle} disabled={settling}
              className={'px-6 py-3 rounded-lg text-sm transition-colors ' + (settling ? 'bg-gray-700 text-gray-400' : 'bg-accent-gold text-dark-900 hover:bg-accent-gold/90')}>
              {settling ? '结算中...' : '手动结算'}
            </button>
          </div>
          {settleResult && (
            <div className={'text-sm px-4 py-2 rounded ' + (settleResult.includes('失败') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400')}>
              {settleResult}
            </div>
          )}
        </motion.div>

        {/* 领先者 */}
        {canvasStats && canvasStats.leader && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-dark-800 rounded-lg border border-white/5 p-5">
            <h3 className="text-lg font-medium text-white mb-3">当前领先</h3>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent-gold/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-accent-gold" />
              </div>
              <div>
                <p className="text-white font-medium">用户 {canvasStats.leader.userId.slice(-6)}</p>
                <p className="text-sm text-accent-gold/70">{canvasStats.leader.count} 像素</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 历史画布列表 */}
        {canvasStats?.archives && canvasStats.archives.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="bg-dark-800 rounded-lg border border-white/5">
            <div className="p-5 border-b border-white/5">
              <h3 className="text-lg font-medium text-white">历史画布</h3>
            </div>
            <div className="divide-y divide-white/5">
              {canvasStats.archives.map((c: any) => (
                <div key={c.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{c.name || '画布 #' + c.id.slice(-6)}</p>
                      <p className="text-sm text-gray-400">{c.width}×{c.height} · {c.pixelCount}/{c.totalPixels} 像素 · {c.fillRate}%</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {c.endTime ? new Date(c.endTime).toLocaleDateString('zh-CN') : '-'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  // ==============================
  // DASHBOARD
  // ==============================
  function renderDashboard() {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '总作品数', value: stats?.totalWorks || 0, icon: Film, color: 'text-accent-gold' },
            { label: '待审核', value: stats?.pendingWorks || 0, icon: Clock, color: 'text-yellow-400' },
            { label: '已通过', value: stats?.approvedWorks || 0, icon: CheckCircle, color: 'text-green-400' },
            { label: '注册用户', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400' },
          ].map(({ label, value, icon: Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-dark-800 rounded-lg p-5 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{label}</p>
                  <p className={`text-3xl font-light ${color} mt-1`}>{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center`}><Icon className={`w-5 h-5 ${color}`} /></div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-dark-800 rounded-lg border border-white/5">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-lg font-medium text-white">最新提交作品</h3>
          </div>
          <div className="divide-y divide-white/5">
            {stats?.recentWorks?.slice(0, 5).map((work) => (
              <div key={work.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center"><Film className="w-4 h-4 text-gray-400" /></div>
                  <div>
                    <p className="text-white font-medium">{work.title}</p>
                    <p className="text-sm text-gray-400">{work.creatorName} · {work.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    work.status === 'APPROVED' ? 'bg-green-400/20 text-green-400' :
                    work.status === 'REJECTED' ? 'bg-red-400/20 text-red-400' :
                    'bg-yellow-400/20 text-yellow-400'
                  }`}>{work.status === 'APPROVED' ? '已通过' : work.status === 'REJECTED' ? '已拒绝' : '待审核'}</span>
                  <button onClick={() => setSelectedWork(work)} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><Eye className="w-4 h-4 text-gray-400" /></button>
                </div>
              </div>
            ))}
            {(!stats?.recentWorks || stats.recentWorks.length === 0) && (
              <div className="p-8 text-center text-gray-400">暂无作品提交</div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // ==============================
  // WORKS MANAGEMENT
  // ==============================
  function renderWorks() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="搜索作品或创作者..." value={workSearch}
              onChange={e => setWorkSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-gold" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[['ALL','全部'],['PENDING','待审核'],['APPROVED','已通过'],['REJECTED','已拒绝']].map(([f, l]) => (
              <button key={f} onClick={() => setWorkFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${workFilter === f ? 'bg-accent-gold text-dark-900' : 'bg-dark-800 text-gray-400 hover:text-white'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWorks.map(work => (
            <motion.div key={work.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-dark-800 rounded-lg border border-white/5 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-white mb-1">{work.title}</h3>
                    <p className="text-sm text-gray-400">{work.creatorName} · {work.creatorPhone}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    work.status === 'APPROVED' ? 'bg-green-400/20 text-green-400' :
                    work.status === 'REJECTED' ? 'bg-red-400/20 text-red-400' :
                    'bg-yellow-400/20 text-yellow-400'
                  }`}>{work.status === 'APPROVED' ? '已通过' : work.status === 'REJECTED' ? '已拒绝' : '待审核'}</span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{work.description || '暂无描述'}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span className="px-2 py-1 bg-dark-700 rounded">{work.category}</span>
                  <span>·</span><span>{new Date(work.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                {work.videoUrl && <a href={work.videoUrl} target="_blank" rel="noopener noreferrer" className="text-accent-gold text-sm hover:underline mb-4 inline-block">查看视频 →</a>}
                <div className="flex gap-2 pt-4 border-t border-white/5">
                  {work.status === 'PENDING' && <>
                    <button onClick={() => handleReview(work.id, 'APPROVED')} className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm">通过</button>
                    <button onClick={() => setSelectedWork(work)} className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm">拒绝</button>
                  </>}
                  <button onClick={() => handleDeleteWork(work.id)} className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {filteredWorks.length === 0 && <div className="text-center py-12 text-gray-400">没有找到符合条件的作品</div>}
      </div>
    )
  }

  // ==============================
  // USERS MANAGEMENT
  // ==============================
  function renderUsers() {
    return (
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="搜索用户名或手机号..." value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-3 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-accent-gold" />
        </div>
        <div className="bg-dark-800 rounded-lg border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">用户</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">手机号</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">公司</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">积分</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">注册时间</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">作品数</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent-gold/20 flex items-center justify-center">
                          <span className="text-accent-gold text-sm font-medium">{user.name[0]}</span>
                        </div>
                        <span className="text-white text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{user.phone}</td>
                    <td className="p-4 text-gray-400 text-sm">{user.company || '-'}</td>
                    <td className="p-4"><span className="text-accent-gold/70 font-mono">{(user as any).points || 0}</span></td>
                    <td className="p-4 text-gray-400 text-sm">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-dark-700 rounded text-sm text-gray-300">{user._count?.works || 0}</span></td>
                    <td className="p-4">
                      <button onClick={() => openUserEdit(user.id)}
                        className="px-3 py-1.5 bg-accent-gold/10 text-accent-gold/80 rounded text-xs hover:bg-accent-gold/20 transition">
                        编辑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && <div className="text-center py-12 text-gray-400">没有找到符合条件的用户</div>}
        </div>
      </div>
    )
  }
}

// ==============================
// SHARED SETTINGS COMPONENTS
// ==============================

function SettingsForm({ title, onSave, children }: { title: string; onSave: () => void; children: React.ReactNode }) {
  return (
    <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <button onClick={onSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 transition-colors">
          <Save className="w-4 h-4" /> 保存更改
        </button>
      </div>
      <div className="bg-dark-800 rounded-lg border border-white/5 p-6 space-y-5">
        {children}
      </div>
    </motion.div>
  )
}

function Field({ label, value, onChange, multiline, prefix, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  multiline?: boolean; prefix?: React.ReactNode; type?: string
}) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-2 tracking-wide">{label}</label>
      <div className="relative">
        {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2">{prefix}</div>}
        {multiline ? (
          <textarea value={value} onChange={e => onChange(e.target.value)}
            className={`w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold resize-none h-24 ${prefix ? 'pl-10' : ''}`} />
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            className={`w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold ${prefix ? 'pl-10' : ''}`} />
        )}
      </div>
    </div>
  )
}

function TagEditor({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [newTag, setNewTag] = useState('')
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-2 tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 border border-white/10 rounded-full text-sm text-gray-300">
            {tag}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-400 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newTag} onChange={e => setNewTag(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTag.trim()) { onChange([...tags, newTag.trim()]); setNewTag('') } } }}
          placeholder="输入后按 Enter 添加" className="flex-1 px-4 py-2 bg-dark-700 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent-gold" />
        <button onClick={() => { if (newTag.trim()) { onChange([...tags, newTag.trim()]); setNewTag('') } }}
          className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:text-white hover:bg-white/10 text-sm transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ==============================
// WORKS EDITOR
// ==============================
function WorksEditor({ config, onChange, onSave }: { config: SiteConfig; onChange: (c: SiteConfig) => void; onSave: () => void }) {
  const works = [...(config.featuredWorks || [])].sort((a, b) => (a.homepageOrder || 999) - (b.homepageOrder || 999))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', titleEn: '', category: '', categoryEn: '', image: '' })

  const startEdit = (work: any) => {
    setEditingId(work.id)
    setEditForm({ title: work.title, titleEn: work.titleEn, category: work.category, categoryEn: work.categoryEn, image: work.image })
  }

  const saveEdit = () => {
    onChange({
      ...config,
      featuredWorks: config.featuredWorks.map(w => w.id === editingId ? { ...w, ...editForm } : w)
    })
    setEditingId(null)
  }

  const removeWork = (id: string) => {
    if (!confirm('删除这个作品？')) return
    onChange({ ...config, featuredWorks: config.featuredWorks.filter(w => w.id !== id) })
  }

  const toggleHomepage = (id: string) => {
    const work = config.featuredWorks.find(w => w.id === id)
    if (!work) return
    const maxOrder = Math.max(...config.featuredWorks.map(w => w.homepageOrder || 0), 0)
    onChange({
      ...config,
      featuredWorks: config.featuredWorks.map(w =>
        w.id === id
          ? { ...w, homepageOrder: w.homepageOrder === null ? maxOrder + 1 : null }
          : w
      )
    })
  }

  return (
    <SettingsForm title="代表作品管理" onSave={onSave}>
      <div className="space-y-4">
        {works.map((work, i) => (
          <div key={work.id} className="p-4 bg-dark-700 rounded-lg border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
              <span className="w-6 text-xs text-gray-600 text-center">#{i + 1}</span>
              {editingId === work.id ? (
                <div className="flex gap-2 flex-1">
                  <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="作品名称" className="flex-1 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
                  <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    placeholder="分类" className="w-28 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
                  <button onClick={saveEdit} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30">保存</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">取消</button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="text-white text-sm font-medium">{work.title}</span>
                    <span className="text-gray-500 text-xs ml-2">{work.category}</span>
                    <span className={`text-xs ml-2 ${work.homepageOrder != null ? 'text-accent-gold' : 'text-gray-600'}`}>
                      {work.homepageOrder != null ? '🏠首页' : ''}
                    </span>
                  </div>
                  <div className="w-12 h-8 rounded overflow-hidden bg-dark-600 relative">
                    {work.image && <img src={work.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <button onClick={() => toggleHomepage(work.id)}
                    className={`p-1.5 transition-colors ${work.homepageOrder != null ? 'text-accent-gold' : 'text-gray-600 hover:text-accent-gold'}`}>
                    <svg className="w-3.5 h-3.5" fill={work.homepageOrder != null ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </button>
                  <button onClick={() => startEdit(work)} className="p-1.5 text-gray-500 hover:text-accent-gold transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => removeWork(work.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
            {editingId === work.id && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <input value={editForm.titleEn} onChange={e => setEditForm({ ...editForm, titleEn: e.target.value })}
                  placeholder="英文名称" className="px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
                <input value={editForm.categoryEn} onChange={e => setEditForm({ ...editForm, categoryEn: e.target.value })}
                  placeholder="英文分类" className="px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
                <div className="col-span-2 flex gap-3">
                  <div className="relative flex-1">
                    <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input value={editForm.image} onChange={e => setEditForm({ ...editForm, image: e.target.value })}
                      placeholder="图片路径，如 /works/image1.jpg" className="w-full pl-9 pr-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
                  </div>
                  <a href={editForm.image} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 text-gray-400 hover:text-accent-gold text-sm flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />预览</a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </SettingsForm>
  )
}

// ==============================
// SERVICES EDITOR
// ==============================
function ServicesEditor({ config, onChange, onSave }: { config: SiteConfig; onChange: (c: SiteConfig) => void; onSave: () => void }) {
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  const updateService = (id: string, field: string, value: string) => {
    const updated = config.services.map(s => s.id === id ? { ...s, [field]: value } : s)
    onChange({ ...config, services: updated })
  }

  return (
    <SettingsForm title="服务领域管理" onSave={onSave}>
      <div className="space-y-4">
        {config.services.sort((a, b) => a.order - b.order).map((service) => (
          <div key={service.id} className="p-5 bg-dark-700 rounded-lg border border-white/5 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">中文名称</label>
              <input value={service.title} onChange={e => updateService(service.id, 'title', e.target.value)}
                className="w-full px-3 py-2 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">英文名称</label>
              <input value={service.titleEn} onChange={e => updateService(service.id, 'titleEn', e.target.value)}
                className="w-full px-3 py-2 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">中文描述</label>
              <input value={service.desc} onChange={e => updateService(service.id, 'desc', e.target.value)}
                className="w-full px-3 py-2 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
            </div>
            <div>
              <label className="block text-gray-500 text-xs mb-1.5">英文描述</label>
              <input value={service.descEn} onChange={e => updateService(service.id, 'descEn', e.target.value)}
                className="w-full px-3 py-2 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
            </div>
          </div>
        ))}
      </div>
    </SettingsForm>
  )
}

// ==============================
// BRANDS EDITOR
// ==============================
function BrandsEditor({ config, onChange, onSave }: { config: SiteConfig; onChange: (c: SiteConfig) => void; onSave: () => void }) {
  const [newBrand, setNewBrand] = useState({ name: '', slug: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  const addBrand = () => {
    if (!newBrand.name.trim()) return
    const id = Date.now().toString()
    onChange({ ...config, brands: [...config.brands, { id, ...newBrand, order: config.brands.length + 1 }] })
    setNewBrand({ name: '', slug: '' })
  }

  const removeBrand = (id: string) => {
    if (!confirm('移除此品牌？')) return
    onChange({ ...config, brands: config.brands.filter(b => b.id !== id) })
  }

  const updateBrand = (id: string, field: string, value: string) => {
    onChange({ ...config, brands: config.brands.map(b => b.id === id ? { ...b, [field]: value } : b) })
  }

  return (
    <SettingsForm title="合作品牌管理" onSave={onSave}>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {['汽车', '科技', '奢侈品', '运动', '美妆'].map(cat => (
          <span key={cat} className="px-3 py-1.5 bg-dark-700 border border-white/10 rounded text-gray-400 text-sm text-center">{cat}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
        {config.brands.sort((a, b) => a.order - b.order).map(brand => (
          <div key={brand.id} className="flex items-center gap-2 px-3 py-2.5 bg-dark-700 border border-white/5 rounded-lg group">
            {editingId === brand.id ? (
              <input value={brand.name} onChange={e => updateBrand(brand.id, 'name', e.target.value)}
                onBlur={() => setEditingId(null)} autoFocus
                className="flex-1 px-2 py-1 bg-dark-600 border border-white/20 rounded text-white text-xs focus:outline-none focus:border-accent-gold" />
            ) : (
              <span className="flex-1 text-sm text-gray-300 truncate">{brand.name}</span>
            )}
            <button onClick={() => setEditingId(brand.id)} className="text-gray-600 hover:text-accent-gold opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={() => removeBrand(brand.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-3 border-t border-white/5 pt-5">
        <input value={newBrand.name} onChange={e => setNewBrand({ ...newBrand, name: e.target.value })}
          placeholder="品牌名称" className="flex-1 px-4 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
        <input value={newBrand.slug} onChange={e => setNewBrand({ ...newBrand, slug: e.target.value })}
          placeholder="slug（用于logo路径）" className="w-48 px-4 py-2.5 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
        <button onClick={addBrand}
          className="px-5 py-2.5 bg-accent-gold/10 border border-accent-gold/30 text-accent-gold rounded-lg text-sm hover:bg-accent-gold/20 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> 添加品牌
        </button>
      </div>
    </SettingsForm>
  )
}

// ==============================
// SECURITY SETTINGS
// ==============================
function SecuritySettings() {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [changing, setChanging] = useState(false)

  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-lg border border-white/5 p-6">
        <h3 className="text-lg font-medium text-white mb-1 flex items-center gap-2"><Shield className="w-5 h-5 text-accent-gold" /> 安全设置</h3>
        <p className="text-gray-500 text-sm mb-6">管理管理员账号凭据</p>

        <div className="space-y-5">
          <div>
            <label className="block text-gray-400 text-xs mb-2 tracking-wide">当前管理员账号</label>
            <div className="px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-gray-400 text-sm">admin</div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <h4 className="text-white text-sm font-medium mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> 修改密码</h4>
            {msg && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {msg.text}
              </div>
            )}
            <div className="space-y-4 max-w-md">
              <Field label="当前密码" value={currentPassword} onChange={setCurrentPassword} type="password" />
              <Field label="新密码" value={newPassword} onChange={setNewPassword} type="password" />
              <Field label="确认新密码" value={confirmPassword} onChange={setConfirmPassword} type="password" />
              <div className="pt-2">
                {newPassword && newPassword !== confirmPassword && confirmPassword && (
                  <p className="text-red-400 text-xs mb-3">两次输入的密码不一致</p>
                )}
                <button
                  onClick={async () => {
                    if (!currentPassword || !newPassword || !confirmPassword) {
                      setMsg({ type: 'error', text: '请填写所有字段' }); return
                    }
                    if (newPassword !== confirmPassword) {
                      setMsg({ type: 'error', text: '两次密码不一致' }); return
                    }
                    if (newPassword.length < 6) {
                      setMsg({ type: 'error', text: '密码至少6位' }); return
                    }
                    setChanging(true)
                    setMsg(null)
                    try {
                      const res = await fetch('/api/admin/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentPassword, newPassword })
                      })
                      const data = await res.json()
                      if (!res.ok) throw new Error(data.error || '修改失败')
                      setMsg({ type: 'success', text: '密码已修改成功（下次登录生效）' })
                      setCurrentPassword('')
                      setNewPassword('')
                      setConfirmPassword('')
                      setShowPasswordForm(false)
                    } catch (err: any) {
                      setMsg({ type: 'error', text: err.message })
                    } finally {
                      setChanging(false)
                    }
                  }}
                  className="px-6 py-2.5 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 transition-colors">
                  {changing ? '修改中...' : '修改密码'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ==============================
}

// ==============================
// NAVIGATION EDITOR
// ==============================
function NavigationEditor({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const nav = config.navigation || { logo: '栖光', items: [] }

  const updateItems = (items: any[]) => {
    onChange({ ...config, navigation: { ...nav, items } })
  }

  const addItem = () => {
    const id = 'nav_' + Date.now()
    const items = [...(nav.items || [])]
    items.push({ id, label: '新页面', href: '/', visible: true, order: items.length })
    updateItems(items)
  }

  const removeItem = (id: string) => {
    const items = nav.items.filter((i: any) => i.id !== id)
    updateItems(items)
  }

  const updateItem = (id: string, field: string, value: any) => {
    const items = nav.items.map((i: any) => i.id === id ? { ...i, [field]: value } : i)
    updateItems(items)
  }

  const moveItem = (id: string, direction: -1 | 1) => {
    const items = [...(nav.items || [])].sort((a, b) => a.order - b.order)
    const idx = items.findIndex(i => i.id === id)
    if (idx < 0) return
    const target = idx + direction
    if (target < 0 || target >= items.length) return
    ;[items[idx].order, items[target].order] = [items[target].order, items[idx].order]
    updateItems(items)
  }

  return (
    <SettingsForm title="导航菜单" onSave={onSave}>
      <div className="mb-4">
        <label className="block text-gray-400 text-xs mb-2">Logo 文字</label>
        <input value={nav.logo || ''} onChange={e => onChange({ ...config, navigation: { ...nav, logo: e.target.value } })}
          className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
      </div>

      <div className="space-y-2">
        {[...(nav.items || [])].sort((a, b) => a.order - b.order).map((item: any, i: number) => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg border border-white/5">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveItem(item.id, -1)} disabled={i === 0} className="text-gray-500 hover:text-white disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
              <button onClick={() => moveItem(item.id, 1)} disabled={i === nav.items.length - 1} className="text-gray-500 hover:text-white disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
            </div>
            <input value={item.label} onChange={e => updateItem(item.id, 'label', e.target.value)}
              className="flex-1 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" placeholder="名称" />
            <input value={item.href} onChange={e => updateItem(item.id, 'href', e.target.value)}
              className="w-36 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" placeholder="/路径" />
            <button onClick={() => updateItem(item.id, 'visible', !item.visible)}
              className={`p-1.5 rounded ${item.visible ? 'text-green-400' : 'text-gray-600'}`}>
              {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => removeItem(item.id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      <button onClick={addItem} className="mt-3 w-full py-2.5 border-2 border-dashed border-white/10 rounded-lg text-gray-400 hover:border-accent-gold/50 hover:text-accent-gold transition-colors text-sm flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> 添加导航项
      </button>
    </SettingsForm>
  )
}

// ==============================
// FOOTER EDITOR
// ==============================
function FooterEditor({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const footer = config.footer || {}
  const setFooter = (updates: any) => onChange({ ...config, footer: { ...footer, ...updates } })

  const addColumn = () => {
    const cols = [...(footer.columns || [])]
    cols.push({ id: 'col_' + Date.now(), title: '新栏目', type: 'text', items: ['项目1'] })
    setFooter({ columns: cols })
  }

  const removeColumn = (id: string) => {
    setFooter({ columns: footer.columns.filter((c: any) => c.id !== id) })
  }

  const updateColumn = (id: string, field: string, value: any) => {
    const cols = footer.columns.map((c: any) => c.id === id ? { ...c, [field]: value } : c)
    setFooter({ columns: cols })
  }

  const addLink = (colId: string) => {
    const cols = footer.columns.map((c: any) => {
      if (c.id !== colId || c.type !== 'links') return c
      return { ...c, links: [...(c.links || []), { label: '新链接', href: '/', order: (c.links || []).length }] }
    })
    setFooter({ columns: cols })
  }

  const updateLink = (colId: string, linkIdx: number, field: string, value: string) => {
    const cols = footer.columns.map((c: any) => {
      if (c.id !== colId || c.type !== 'links') return c
      const links = [...(c.links || [])]
      links[linkIdx] = { ...links[linkIdx], [field]: value }
      return { ...c, links }
    })
    setFooter({ columns: cols })
  }

  const removeLink = (colId: string, linkIdx: number) => {
    const cols = footer.columns.map((c: any) => {
      if (c.id !== colId || c.type !== 'links') return c
      return { ...c, links: (c.links || []).filter((_: any, i: number) => i !== linkIdx) }
    })
    setFooter({ columns: cols })
  }

  const addItem = (colId: string) => {
    const cols = footer.columns.map((c: any) => {
      if (c.id !== colId || (c.type !== 'text' && c.type !== 'contact')) return c
      return { ...c, items: [...(c.items || []), '新项目'] }
    })
    setFooter({ columns: cols })
  }

  const updateItem = (colId: string, itemIdx: number, value: string) => {
    const cols = footer.columns.map((c: any) => {
      if (c.id !== colId || (c.type !== 'text' && c.type !== 'contact')) return c
      const items = [...(c.items || [])]
      items[itemIdx] = value
      return { ...c, items }
    })
    setFooter({ columns: cols })
  }

  const removeItem = (colId: string, itemIdx: number) => {
    const cols = footer.columns.map((c: any) => {
      if (c.id !== colId || (c.type !== 'text' && c.type !== 'contact')) return c
      return { ...c, items: (c.items || []).filter((_: any, i: number) => i !== itemIdx) }
    })
    setFooter({ columns: cols })
  }

  return (
    <SettingsForm title="页脚配置" onSave={onSave}>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Logo 文字" value={footer.logo || ''} onChange={v => setFooter({ logo: v })} />
        <Field label="副标题" value={footer.tagline || ''} onChange={v => setFooter({ tagline: v })} />
        <Field label="版权声明" value={footer.copyright || ''} onChange={v => setFooter({ copyright: v })} />
        <Field label="底部文字" value={footer.bottomText || ''} onChange={v => setFooter({ bottomText: v })} />
      </div>

      <div className="border-t border-white/5 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white">栏目</h4>
          <button onClick={addColumn} className="flex items-center gap-1 px-3 py-1.5 bg-accent-gold/10 border border-accent-gold/30 text-accent-gold rounded-lg text-xs hover:bg-accent-gold/20 transition-colors">
            <Plus className="w-3 h-3" /> 添加栏目
          </button>
        </div>
        <div className="space-y-4">
          {(footer.columns || []).map((col: any) => (
            <div key={col.id} className="p-4 bg-dark-700 rounded-lg border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <input value={col.title || ''} onChange={e => updateColumn(col.id, 'title', e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" placeholder="栏目标题" />
                <select value={col.type || 'text'} onChange={e => updateColumn(col.id, 'type', e.target.value)}
                  className="px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold">
                  <option value="links">链接列表</option>
                  <option value="text">纯文本</option>
                  <option value="contact">联系信息</option>
                </select>
                <button onClick={() => removeColumn(col.id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>

              {col.type === 'links' && (
                <div className="space-y-2">
                  {(col.links || []).map((link: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input value={link.label || ''} onChange={e => updateLink(col.id, i, 'label', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent-gold" placeholder="链接名称" />
                      <input value={link.href || ''} onChange={e => updateLink(col.id, i, 'href', e.target.value)}
                        className="w-32 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent-gold" placeholder="/路径" />
                      <button onClick={() => removeLink(col.id, i)} className="p-1.5 text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addLink(col.id)} className="text-xs text-accent-gold hover:text-white transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> 添加链接
                  </button>
                </div>
              )}

              {(col.type === 'text' || col.type === 'contact') && (
                <div className="space-y-2">
                  {(col.items || []).map((item: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input value={item} onChange={e => updateItem(col.id, i, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-xs focus:outline-none focus:border-accent-gold" placeholder="文本内容" />
                      <button onClick={() => removeItem(col.id, i)} className="p-1.5 text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => addItem(col.id)} className="text-xs text-accent-gold hover:text-white transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> 添加项目
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SettingsForm>
  )
}

// ==============================
// THEME EDITOR
// ==============================
function ThemeEditor({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const theme = config.theme || {}
  const setTheme = (updates: any) => onChange({ ...config, theme: { ...theme, ...updates } })

  return (
    <SettingsForm title="主题样式" onSave={onSave}>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 text-xs mb-2">主色调 / 金色</label>
          <div className="flex gap-3">
            <input type="color" value={theme.primaryColor || '#c9a962'} onChange={e => setTheme({ primaryColor: e.target.value })}
              className="w-12 h-12 rounded cursor-pointer bg-transparent border border-white/10" />
            <input value={theme.primaryColor || '#c9a962'} onChange={e => setTheme({ primaryColor: e.target.value })}
              className="flex-1 px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2">背景色</label>
          <div className="flex gap-3">
            <input type="color" value={theme.bgColor || '#0a0a0a'} onChange={e => setTheme({ bgColor: e.target.value })}
              className="w-12 h-12 rounded cursor-pointer bg-transparent border border-white/10" />
            <input value={theme.bgColor || '#0a0a0a'} onChange={e => setTheme({ bgColor: e.target.value })}
              className="flex-1 px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2">文字颜色</label>
          <div className="flex gap-3">
            <input type="color" value={theme.textColor || '#ffffff'} onChange={e => setTheme({ textColor: e.target.value })}
              className="w-12 h-12 rounded cursor-pointer bg-transparent border border-white/10" />
            <input value={theme.textColor || '#ffffff'} onChange={e => setTheme({ textColor: e.target.value })}
              className="flex-1 px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" />
          </div>
        </div>

        <div>
          <label className="block text-gray-400 text-xs mb-2">圆角 (px)</label>
          <div className="flex items-center gap-4">
            <input type="range" min="0" max="24" value={parseInt(theme.borderRadius || '0')}
              onChange={e => setTheme({ borderRadius: e.target.value })}
              className="flex-1 h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-accent-gold" />
            <span className="text-white text-sm w-10 text-right">{theme.borderRadius || '0'}px</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-400 text-xs mb-2">正文字体</label>
          <select value={theme.fontFamily || 'Inter'} onChange={e => setTheme({ fontFamily: e.target.value })}
            className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold">
            <option value="Inter">Inter (默认)</option>
            <option value="system-ui">System UI</option>
            <option value="sans-serif">Sans Serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-xs mb-2">展示字体</label>
          <select value={theme.fontDisplay || 'Playfair Display'} onChange={e => setTheme({ fontDisplay: e.target.value })}
            className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold">
            <option value="Playfair Display">Playfair Display (默认)</option>
            <option value="Georgia">Georgia</option>
            <option value="serif">Serif</option>
            <option value="sans-serif">Sans Serif</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-gray-400 text-xs mb-2">自定义 CSS</label>
        <div className="text-xs text-gray-500 mb-2">输入 CSS 代码，会注入到页面 &lt;head&gt; 中。例如：.my-class {'{'} color: red; {'}'}</div>
        <textarea value={theme.customCSS || ''} onChange={e => setTheme({ customCSS: e.target.value })}
          className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent-gold resize-none h-32"
          placeholder={'.some-element { color: #c9a962; }'} />
      </div>

      <div className="p-4 bg-dark-700 rounded-lg border border-dark-600">
        <h5 className="text-xs text-gray-400 mb-2">实时预览</h5>
        <div className="flex gap-3">
          <span className="px-3 py-1 text-xs rounded" style={{ backgroundColor: theme.primaryColor || '#c9a962', color: '#000' }}>主色调</span>
          <span className="px-3 py-1 text-xs rounded" style={{ backgroundColor: theme.bgColor || '#0a0a0a', border: '1px solid #333' }}>背景</span>
          <span className="px-3 py-1 text-xs rounded" style={{ backgroundColor: '#1a1a1a', color: theme.textColor || '#fff' }}>文字示例</span>
        </div>
      </div>
    </SettingsForm>
  )
}

// ==============================
// PAGE MANAGER
// ==============================
function PageManager({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const pages = config.pages || {}
  const pageKeys = Object.keys(pages)

  const updatePage = (key: string, field: string, value: any) => {
    onChange({ ...config, pages: { ...pages, [key]: { ...pages[key], [field]: value } } })
  }

  return (
    <SettingsForm title="页面管理" onSave={onSave}>
      <p className="text-gray-500 text-sm mb-4">控制网站各页面的可见性与名称</p>
      <div className="space-y-3">
        {pageKeys.map(key => {
          const page = pages[key]
          return (
            <div key={key} className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg border border-white/5">
              <div className={`w-2 h-2 rounded-full ${page.visible ? 'bg-green-400' : 'bg-gray-600'}`} />
              <span className="text-xs text-gray-500 w-16 font-mono">{key}</span>
              <input value={page.label || ''} onChange={e => updatePage(key, 'label', e.target.value)}
                className="flex-1 px-3 py-1.5 bg-dark-600 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-accent-gold" />
              <span className="text-xs text-gray-500 font-mono">{page.path}</span>
              <button onClick={() => updatePage(key, 'visible', !page.visible)}
                className={`px-3 py-1 rounded text-xs ${page.visible ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {page.visible ? '显示' : '隐藏'}
              </button>
            </div>
          )
        })}
      </div>
    </SettingsForm>
  )
}

// ==============================
// ANNOUNCEMENT EDITOR
// ==============================
function AnnouncementEditor({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const ann = config.announcement || {}
  const setAnn = (updates: any) => onChange({ ...config, announcement: { ...ann, ...updates } })

  return (
    <SettingsForm title="通知公告" onSave={onSave}>
      <div className="flex items-center justify-between mb-6 p-4 bg-dark-700 rounded-lg border border-white/5">
        <div>
          <p className="text-white text-sm font-medium">启用公告栏</p>
          <p className="text-gray-500 text-xs mt-0.5">在页面顶部显示通知横幅</p>
        </div>
        <button onClick={() => setAnn({ enabled: !ann.enabled })}
          className={`relative w-12 h-6 rounded-full transition-colors ${ann.enabled ? 'bg-accent-gold' : 'bg-dark-600'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ann.enabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {ann.enabled && (
        <>
          <div className="mb-4">
            <label className="block text-gray-400 text-xs mb-2">公告内容</label>
            <input value={ann.text || ''} onChange={e => setAnn({ text: e.target.value })}
              className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" placeholder="输入公告文字..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-2">样式类型</label>
              <select value={ann.type || 'info'} onChange={e => setAnn({ type: e.target.value })}
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold">
                <option value="info">信息 (蓝色)</option>
                <option value="warning">警告 (黄色)</option>
                <option value="success">成功 (绿色)</option>
                <option value="alert">紧急 (红色)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-2">链接（可选）</label>
              <input value={ann.link || ''} onChange={e => setAnn({ link: e.target.value })}
                className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold" placeholder="https://..." />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-700 rounded-lg border border-white/5 mt-4">
            <div>
              <p className="text-white text-sm">允许关闭</p>
              <p className="text-gray-500 text-xs">用户可点击关闭按钮隐藏</p>
            </div>
            <button onClick={() => setAnn({ dismissible: !ann.dismissible })}
              className={`relative w-12 h-6 rounded-full transition-colors ${ann.dismissible ? 'bg-accent-gold' : 'bg-dark-600'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${ann.dismissible ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className={`mt-4 p-3 rounded-lg text-sm ${
            ann.type === 'info' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
            ann.type === 'warning' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' :
            ann.type === 'success' ? 'bg-green-500/10 text-green-300 border border-green-500/20' :
            'bg-red-500/10 text-red-300 border border-red-500/20'
          }`}>
            <strong>预览：</strong> {ann.text || '（公告文字为空）'}
          </div>
        </>
      )}
    </SettingsForm>
  )
}

// ==============================
// CODE INJECTION EDITOR
// ==============================
function CodeInjectionEditor({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const code = config.codeInjection || {}
  const setCode = (updates: any) => onChange({ ...config, codeInjection: { ...code, ...updates } })

  return (
    <SettingsForm title="代码注入" onSave={onSave}>
      <p className="text-gray-500 text-sm mb-4">在页面中注入自定义 HTML / CSS / JS 代码。高级功能，谨慎使用。</p>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">&lt;head&gt;</span>
          <span className="text-gray-400 text-xs">注入到页面 &lt;head&gt; 标签末尾</span>
        </div>
        <textarea value={code.headHTML || ''} onChange={e => setCode({ headHTML: e.target.value })}
          className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent-gold resize-none h-24"
          placeholder={'<meta name="custom" content="..." />\n<style>/* custom styles */</style>'} />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">&lt;body&gt; 开头</span>
          <span className="text-gray-400 text-xs">注入到 &lt;body&gt; 标签开头</span>
        </div>
        <textarea value={code.bodyStartHTML || ''} onChange={e => setCode({ bodyStartHTML: e.target.value })}
          className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent-gold resize-none h-24"
          placeholder={'<div class="custom-banner">...</div>'} />
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">&lt;/body&gt; 结尾</span>
          <span className="text-gray-400 text-xs">注入到 &lt;/body&gt; 标签之前</span>
        </div>
        <textarea value={code.footerHTML || ''} onChange={e => setCode({ footerHTML: e.target.value })}
          className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-accent-gold resize-none h-24"
          placeholder={'<script>console.log(\"site loaded\")</script>'} />
      </div>
    </SettingsForm>
  )
}

// ==============================
// SOCIAL LINKS EDITOR
// ==============================
function SocialLinksEditor({ config, onChange, onSave }: { config: any; onChange: (c: any) => void; onSave: () => void }) {
  const links = config.socialLinks || {}
  const setLinks = (updates: any) => onChange({ ...config, socialLinks: { ...links, ...updates } })

  const platforms = [
    { key: 'wechat', label: '微信', placeholder: '微信号或二维码链接' },
    { key: 'weibo', label: '微博', placeholder: 'https://weibo.com/...' },
    { key: 'xiaohongshu', label: '小红书', placeholder: 'https://xiaohongshu.com/...' },
    { key: 'bilibili', label: 'B站', placeholder: 'https://space.bilibili.com/...' },
    { key: 'douyin', label: '抖音', placeholder: '抖音号或链接' },
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/...' },
  ]

  return (
    <SettingsForm title="社交链接" onSave={onSave}>
      <div className="space-y-3">
        {platforms.map(p => (
          <div key={p.key}>
            <label className="block text-gray-400 text-xs mb-1.5">{p.label}</label>
            <input value={links[p.key] || ''} onChange={e => setLinks({ [p.key]: e.target.value })}
              className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-accent-gold"
              placeholder={p.placeholder} />
          </div>
        ))}
      </div>
    </SettingsForm>
  )
}
