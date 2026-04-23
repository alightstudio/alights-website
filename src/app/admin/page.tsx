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
  company: {
    name: string; nameEn: string; shortName: string; shortNameEn: string
    slogan: string; sloganEn: string; description: string; descriptionEn: string
  }
  contact: { phone: string; email: string; address: string; wechat: string; weibo: string; xiaohongshu: string }
  seo: { title: string; description: string; keywords: string }
  hero: { title: string; titleEn: string; subtitle: string; subtitleEn: string; tags: string[] }
  featuredWorks: Array<{ id: string; title: string; titleEn: string; category: string; categoryEn: string; image: string; order: number }>
  services: Array<{ id: string; title: string; titleEn: string; desc: string; descEn: string; order: number }>
  brands: Array<{ id: string; name: string; slug: string; order: number }>
}

type Tab = 'dashboard' | 'works' | 'users' | 'settings'

// ===== SETTINGS SECTIONS =====
type SettingsSection = 'company' | 'contact' | 'seo' | 'hero' | 'works' | 'services' | 'brands' | 'security'

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
  const [works, setWorks] = useState<Work[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedWork, setSelectedWork] = useState<Work | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  // Settings config state
  const [config, setConfig] = useState<SiteConfig | null>(null)

  // Filter states
  const [workFilter, setWorkFilter] = useState('ALL')
  const [workSearch, setWorkSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

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
              {activeTab === 'settings' && '网站配置'}
            </h2>

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'works' && renderWorks()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </main>
      </div>

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
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">注册时间</th>
                  <th className="text-left p-4 text-gray-400 font-medium text-sm">作品数</th>
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
                    <td className="p-4 text-gray-400 text-sm">{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-dark-700 rounded text-sm text-gray-300">{user._count?.works || 0}</span></td>
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
  const works = [...(config.featuredWorks || [])].sort((a, b) => a.order - b.order)
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
                  </div>
                  <div className="w-12 h-8 rounded overflow-hidden bg-dark-600 relative">
                    {work.image && <img src={work.image} alt="" className="w-full h-full object-cover" />}
                  </div>
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
                  onClick={() => {
                    if (!currentPassword || !newPassword || !confirmPassword) {
                      setMsg({ type: 'error', text: '请填写所有字段' }); return
                    }
                    if (newPassword !== confirmPassword) {
                      setMsg({ type: 'error', text: '两次密码不一致' }); return
                    }
                    if (newPassword.length < 6) {
                      setMsg({ type: 'error', text: '密码至少6位' }); return
                    }
                    setMsg({ type: 'success', text: '密码修改功能演示模式：实际需通过环境变量 ADMIN_PASSWORD 或数据库更新' })
                  }}
                  className="px-6 py-2.5 bg-accent-gold text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-gold/90 transition-colors">
                  修改密码
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
