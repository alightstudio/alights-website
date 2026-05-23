'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface Category {
  id: string
  name: string
  icon: string
  description: string | null
  sortOrder: number
  _count: { posts: number }
}

interface Post {
  id: string
  title: string
  content: string
  videoUrl: string | null
  coverUrl: string | null
  createdAt: string
  author: { id: string; name: string; avatar: string | null }
  category: { id: string; name: string; icon: string }
  tags?: Array<{ tag: { id: string; name: string } }>
  _count: { comments: number }
  views?: number
  likes?: number
  favorites?: number
}

// 头像颜色算法：根据名字生成稳定配色
function getAvatarColor(name: string): string {
  const colors = [
    '#c9a962','#8b9dc3','#d4a5a5','#9dc3c1','#c1a5d4',
    '#a5c1d4','#d4c1a5','#a5d4c1','#c18b9d','#9dc18b',
    '#8bc19d','#c19d8b','#9d8bc1','#c1d49d','#d49d8b',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// 排序方式
type SortKey = 'latest' | 'popular' | 'discussed'
const SORT_LABELS: Record<SortKey, string> = {
  latest: '最新',
  popular: '最热',
  discussed: '讨论',
}

export default function CommunityPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [searchQuery, setSearchQuery] = useState('')

  // New post form
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newVideo, setNewVideo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Comment form (removed - now handled on detail page)

  // Markdown + Image + Tags
  const [previewMode, setPreviewMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newTags, setNewTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<{ id: string; name: string; _count: { posts: number } }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tag suggestion search
  useEffect(() => {
    if (tagInput.length < 1) { setTagSuggestions([]); return }
    fetch(`/api/forum/tags?q=${encodeURIComponent(tagInput)}`)
      .then(r => r.json())
      .then(setTagSuggestions)
      .catch(() => setTagSuggestions([]))
  }, [tagInput])

  // Load user session
  useEffect(() => {
    const localUid = localStorage.getItem('userId')
    if (localUid) setUserId(localUid)
    else {
      const cookies = document.cookie.split(';')
      const uid = cookies.find(c => c.trim().startsWith('userId='))
      setUserId(uid ? uid.split('=')[1] : null)
    }
  }, [])

  // Load categories
  useEffect(() => {
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(data => setCategories(data))
  }, [])

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true)
    const url = activeCategory
      ? `/api/forum/posts?categoryId=${activeCategory}`
      : '/api/forum/posts'
    const res = await fetch(url)
    const data = await res.json()
    const raw = data.posts || []
    // 客户端排序
    const sorted = [...raw].sort((a: Post, b: Post) => {
      if (sortKey === 'latest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortKey === 'popular') return ((b.views ?? 0) + (b._count.comments * 3)) - ((a.views ?? 0) + (a._count.comments * 3))
      if (sortKey === 'discussed') return b._count.comments - a._count.comments
      return 0
    })
    setPosts(sorted)
    setLoading(false)
  }, [activeCategory, sortKey])

  useEffect(() => { loadPosts() }, [activeCategory, sortKey])

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    setUploading(false)
    // Reset file input so re-selecting same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (res.ok) {
      const { url } = await res.json()
      setNewContent(prev => prev + `\n![图片](${url})\n`)
    } else {
      const err = await res.json()
      alert(err.error || '上传失败')
    }
  }

  // Tag handlers
  const handleTagAdd = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !newTags.includes(tag) && newTags.length < 5) {
      setNewTags(prev => [...prev, tag])
      setTagInput('')
      setTagSuggestions([])
    }
  }
  const handleTagRemove = (tag: string) => setNewTags(prev => prev.filter(t => t !== tag))

  // Toolbar insert helpers
  const insertFormat = (before: string, after: string, placeholder?: string) => {
    setNewContent(prev => prev + `${before}${placeholder || ''}${after}`)
  }
  const handleToolbar = (action: string) => {
    switch (action) {
      case 'bold': insertFormat('**', '**', '粗体文字'); break
      case 'italic': insertFormat('*', '*', '斜体文字'); break
      case 'heading': insertFormat('\n## ', '', '章节标题'); break
      case 'link': insertFormat('[', '](url)', '链接文字'); break
      case 'code': insertFormat('\n```\n', '\n```\n'); break
      case 'image': fileInputRef.current?.click(); break
    }
  }

  // Create post
  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim() || !newCategory) return
    setSubmitting(true)
    const res = await fetch('/api/forum/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: newTitle,
        content: newContent,
        categoryId: newCategory,
        videoUrl: newVideo || undefined,
        tags: newTags.length > 0 ? newTags : undefined,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setShowCreate(false)
      setNewTitle(''); setNewContent(''); setNewCategory(''); setNewVideo('')
      setNewTags([]); setTagInput('')
      loadPosts()
    } else {
      const err = await res.json()
      alert(err.error || '发布失败')
    }
  }

  // Load post detail - check login first
  const openPost = (id: string) => {
    if (!userId) {
      // 未登录 → 跳转登录页，带上 redirect 参数
      window.location.href = `/login?redirect=${encodeURIComponent(`/community/post/${id}`)}`
      return
    }
    // 已登录 → 正常跳转详情页
    window.location.href = `/community/post/${id}`
  }

  // Toggle like (for hot posts in sidebar)
  const handleToggleLike = async (postId: string) => {
    if (!userId) return
    const res = await fetch(`/api/forum/posts/${postId}/like`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      // Update posts list
      setPosts(posts.map(p => p.id === postId ? { ...p, likes: data.likes } : p))
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  // Filter posts by search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const q = searchQuery.toLowerCase()
    return posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
  }, [posts, searchQuery])

  // Hot posts (top 5 by views + comments)
  const hotPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => ((b.views ?? 0) + b._count.comments * 5) - ((a.views ?? 0) + a._count.comments * 5))
      .slice(0, 5)
  }, [posts])

  // Active users (by post count)
  const activeUsers = useMemo(() => {
    const userMap = new Map<string, { name: string; avatar: string | null; count: number }>()
    posts.forEach(p => {
      const existing = userMap.get(p.author.id)
      if (existing) existing.count++
      else userMap.set(p.author.id, { name: p.author.name, avatar: p.author.avatar, count: 1 })
    })
    return Array.from(userMap.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [posts])

  return (
    <main className="min-h-screen bg-dark-900 pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display tracking-widest mb-2">社区</h1>
            <p className="text-gray-500 text-sm">行业交流 · 灵感碰撞</p>
          </div>
          {userId ? (
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-accent-gold text-dark-900 text-sm font-medium hover:bg-white transition-colors"
            >
              + 发布帖子
            </button>
          ) : (
            <Link href="/login" className="px-5 py-2.5 border border-accent-gold text-accent-gold text-sm hover:bg-accent-gold hover:text-dark-900 transition-colors">
              登录后发布
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索帖子标题或内容..."
            className="w-full md:w-96 bg-dark-800 border border-gray-700 text-white text-sm px-4 py-2.5 focus:border-accent-gold outline-none placeholder-gray-600"
          />
        </div>

        {/* Two Column Layout */}
        <div className="flex gap-8">
          {/* Left Column - Post List (70%) */}
          <div className="flex-1 min-w-0">
            {/* Sort + Category Navigation */}
            <div className="mb-8">
              {/* Sort — minimal inline */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[11px] uppercase tracking-[2px] text-gray-600">排序</span>
                <div className="flex items-center gap-0">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key, i) => (
                    <span key={key}>
                      <button
                        onClick={() => setSortKey(key)}
                        className={`text-xs transition-colors ${
                          sortKey === key
                            ? 'text-accent-gold'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {SORT_LABELS[key]}
                      </button>
                      {i < Object.keys(SORT_LABELS).length - 1 && (
                        <span className="mx-2 text-gray-700">·</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Categories — underline style */}
              <div className="flex items-center gap-0 overflow-x-auto scrollbar-none border-b border-gray-800">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`relative px-4 py-3 text-xs tracking-wider whitespace-nowrap transition-colors ${
                    !activeCategory
                      ? 'text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  全部
                  {!activeCategory && (
                    <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-accent-gold" />
                  )}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`relative px-4 py-3 text-xs tracking-wider whitespace-nowrap transition-colors ${
                      activeCategory === cat.id
                        ? 'text-white'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {cat.icon}
                    <span className="ml-1.5">{cat.name}</span>
                    <span className="ml-1 text-[10px] opacity-40">{cat._count.posts}</span>
                    {activeCategory === cat.id && (
                      <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-accent-gold" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Post List */}
            {loading ? (
              <div className="text-center py-20 text-gray-600">加载中...</div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-600 mb-4">{searchQuery ? '未找到相关帖子' : '暂无帖子'}</p>
                {userId && !searchQuery && (
                  <button onClick={() => setShowCreate(true)} className="text-accent-gold hover:underline text-sm">
                    成为第一个发帖的人 →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post, idx) => {
                  const avatarBg = getAvatarColor(post.author.name)
                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.4), duration: 0.3 }}
                      onClick={() => openPost(post.id)}
                      className="group cursor-pointer"
                    >
                      <div className="flex gap-4 p-5 border border-gray-800 hover:border-gray-600 hover:bg-gray-900/30 transition-all duration-300">
                        {/* Author Avatar */}
                        {post.author.avatar ? (
                          <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-700">
                            <img src={post.author.avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-sm font-medium rounded-full"
                            style={{ backgroundColor: avatarBg + '22', border: `1px solid ${avatarBg}44`, color: avatarBg }}
                          >
                            {post.author.name[0].toUpperCase()}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs text-gray-500">{post.category.icon} {post.category.name}</span>
                            <span className="text-xs text-gray-700">·</span>
                            <span className="text-xs text-gray-600">{post.author.name}</span>
                            <span className="text-xs text-gray-700">·</span>
                            <span className="text-xs text-gray-600">{formatDate(post.createdAt)}</span>
                          </div>

                          <h3 className="text-white text-sm font-medium mb-1.5 group-hover:text-accent-gold transition-colors leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{post.content}</p>

                          {/* Tags */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {post.tags.slice(0, 3).map(t => (
                                <span key={t.tag.id} className="px-1.5 py-0.5 bg-dark-800 border border-gray-800 text-[10px] text-gray-500">
                                  #{t.tag.name}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-[10px] text-gray-700">+{post.tags.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* Stats Bar */}
                          <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <span>👁</span>
                              <span>{post.views ?? 0}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <span>💬</span>
                              <span>{post._count.comments}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <span>♥</span>
                              <span>{post.likes ?? 0}</span>
                            </span>
                          </div>
                        </div>

                        {/* Cover thumbnail */}
                        {post.coverUrl && (
                          <div className="w-20 h-14 flex-shrink-0 overflow-hidden">
                            <img src={post.coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column - Sidebar (30%) */}
          <aside className="w-72 flex-shrink-0 hidden md:block">
            {/* Community Stats */}
            <div className="border border-gray-800 p-5 mb-6">
              <h3 className="text-sm font-medium text-white mb-4">社区统计</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">帖子总数</span>
                  <span className="text-white">{posts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">板块数量</span>
                  <span className="text-white">{categories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">活跃用户</span>
                  <span className="text-white">{activeUsers.length}</span>
                </div>
              </div>
            </div>

            {/* Hot Posts */}
            <div className="border border-gray-800 p-5 mb-6">
              <h3 className="text-sm font-medium text-white mb-4">🔥 热门帖子</h3>
              {hotPosts.length === 0 ? (
                <p className="text-xs text-gray-600">暂无数据</p>
              ) : (
                <div className="space-y-3">
                  {hotPosts.map((post, idx) => (
                    <div
                      key={post.id}
                      onClick={() => openPost(post.id)}
                      className="cursor-pointer group"
                    >
                      <div className="flex gap-2">
                        <span className="text-xs text-gray-600 w-4 flex-shrink-0">{idx + 1}</span>
                        <p className="text-xs text-gray-400 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                          {post.title}
                        </p>
                      </div>
                      <div className="flex gap-3 mt-1 ml-6">
                        <span className="text-xs text-gray-600">👁 {post.views ?? 0}</span>
                        <span className="text-xs text-gray-600">💬 {post._count.comments}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Users */}
            <div className="border border-gray-800 p-5 mb-6">
              <h3 className="text-sm font-medium text-white mb-4">⭐ 活跃用户</h3>
              {activeUsers.length === 0 ? (
                <p className="text-xs text-gray-600">暂无数据</p>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((user, idx) => {
                    const avatarBg = getAvatarColor(user.name)
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        {user.avatar ? (
                          <div className="w-6 h-6 flex-shrink-0 rounded-full overflow-hidden border border-gray-700">
                            <img src={user.avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div
                            className="w-6 h-6 flex items-center justify-center text-xs rounded-full"
                            style={{ backgroundColor: avatarBg + '22', border: `1px solid ${avatarBg}44`, color: avatarBg }}
                          >
                            {user.name[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs text-gray-400">{user.name}</span>
                        <span className="text-xs text-gray-600 ml-auto">{user.count} 帖</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Announcement */}
            <div className="border border-accent-gold/30 bg-accent-gold/5 p-5">
              <h3 className="text-sm font-medium text-accent-gold mb-3">📢 社区公告</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                欢迎来到栖光社区！这里汇聚行业精英，分享创意灵感。发布高质量内容可获得积分奖励。
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="bg-dark-800 border border-gray-700 w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-display tracking-wider mb-6">发布帖子</h2>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">板块</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-dark-900 border border-gray-700 text-white text-sm px-4 py-3 focus:border-accent-gold outline-none"
                  >
                    <option value="">选择板块</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">标题</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="帖子标题"
                    className="w-full bg-dark-900 border border-gray-700 text-white text-sm px-4 py-3 focus:border-accent-gold outline-none placeholder-gray-600"
                  />
                </div>

                {/* Markdown Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400">内容（支持 Markdown）</label>
                    <button
                      onClick={() => setPreviewMode(!previewMode)}
                      className={`text-xs px-2 py-1 border transition-colors ${
                        previewMode
                          ? 'border-accent-gold text-accent-gold'
                          : 'border-gray-700 text-gray-500 hover:border-gray-500'
                      }`}
                    >
                      {previewMode ? '编辑' : '预览'}
                    </button>
                  </div>

                  {previewMode ? (
                    <div className="w-full min-h-[200px] bg-dark-900 border border-gray-700 text-gray-300 text-sm p-4 overflow-auto prose prose-invert prose-sm max-w-none">
                      {newContent.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                          {newContent}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-gray-600 italic">暂无内容</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Toolbar */}
                      <div className="flex items-center gap-0.5 mb-0.5 bg-dark-900 border border-gray-700 border-b-0 px-2 py-1.5">
                        <button onClick={() => handleToolbar('bold')} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="粗体"><strong>B</strong></button>
                        <button onClick={() => handleToolbar('italic')} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="斜体"><em>I</em></button>
                        <button onClick={() => handleToolbar('heading')} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="标题">H</button>
                        <span className="w-px h-4 bg-gray-700 mx-1" />
                        <button onClick={() => handleToolbar('link')} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="链接">🔗</button>
                        <button onClick={() => handleToolbar('image')} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="插入图片">🖼</button>
                        <button onClick={() => handleToolbar('code')} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" title="代码块">💻</button>
                        {uploading && <span className="ml-2 text-xs text-accent-gold">上传中...</span>}
                      </div>
                      <textarea
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        placeholder="支持 Markdown 语法，可以使用工具栏插入格式"
                        rows={8}
                        className="w-full bg-dark-900 border border-gray-700 text-white text-sm px-4 py-3 focus:border-accent-gold outline-none resize-none placeholder-gray-600"
                      />
                    </>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">标签（最多5个，回车添加）</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-900 border border-gray-700 text-xs text-gray-300">
                        #{tag}
                        <button onClick={() => handleTagRemove(tag)} className="text-gray-600 hover:text-red-400 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTagAdd() } }}
                      placeholder={newTags.length >= 5 ? '已达上限' : '输入标签后按回车'}
                      disabled={newTags.length >= 5}
                      className="w-full bg-dark-900 border border-gray-700 text-white text-sm px-4 py-2.5 focus:border-accent-gold outline-none placeholder-gray-600 disabled:opacity-40"
                    />
                    {/* Tag suggestions */}
                    {tagSuggestions.length > 0 && tagInput && (
                      <div className="absolute top-full left-0 right-0 bg-dark-800 border border-gray-700 mt-0.5 z-10 max-h-32 overflow-y-auto">
                        {tagSuggestions.map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setTagInput(s.name)
                              handleTagAdd()
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 flex justify-between"
                          >
                            <span>#{s.name}</span>
                            <span className="text-gray-600">{s._count.posts}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Video URL */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">视频链接（可选）</label>
                  <input
                    type="url"
                    value={newVideo}
                    onChange={e => setNewVideo(e.target.value)}
                    placeholder="新片场或其他视频链接"
                    className="w-full bg-dark-900 border border-gray-700 text-white text-sm px-4 py-3 focus:border-accent-gold outline-none placeholder-gray-600"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-accent-gold text-dark-900 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '发布中...' : '发布'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="px-6 py-2.5 border border-gray-700 text-gray-400 text-sm hover:text-white hover:border-gray-500 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
