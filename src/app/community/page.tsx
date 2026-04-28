'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

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
  author: { id: string; name: string }
  category: { id: string; name: string; icon: string }
  _count: { comments: number }
}

interface PostDetail extends Post {
  comments: Array<{
    id: string
    content: string
    createdAt: string
    author: { id: string; name: string }
  }>
}

export default function CommunityPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // New post form
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newVideo, setNewVideo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Comment form
  const [newComment, setNewComment] = useState('')
  const [commenting, setCommenting] = useState(false)

  // Load user session
  useEffect(() => {
    // 先从 localStorage 读取（登录时保存），兼容 httpOnly cookie
    const localUid = localStorage.getItem('userId')
    if (localUid) {
      setUserId(localUid)
    } else {
      const cookies = document.cookie.split(';')
      const uid = cookies.find(c => c.trim().startsWith('userId='))
      setUserId(uid ? uid.split('=')[1] : null)
    }
  }, [])

  // Load categories
  useEffect(() => {
    fetch('/api/forum/categories')
      .then(r => r.json())
      .then(data => {
        setCategories(data)
        if (data.length > 0 && !activeCategory) setActiveCategory(data[0].id)
      })
  }, [])

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true)
    const url = activeCategory
      ? `/api/forum/posts?categoryId=${activeCategory}`
      : '/api/forum/posts'
    const res = await fetch(url)
    const data = await res.json()
    setPosts(data.posts || [])
    setLoading(false)
  }, [activeCategory])

  useEffect(() => { if (activeCategory) loadPosts() }, [activeCategory])

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
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setShowCreate(false)
      setNewTitle(''); setNewContent(''); setNewCategory(''); setNewVideo('')
      loadPosts()
    } else {
      const err = await res.json()
      alert(err.error || '发布失败')
    }
  }

  // Load post detail
  const openPost = async (id: string) => {
    const res = await fetch(`/api/forum/posts/${id}`)
    if (res.ok) setSelectedPost(await res.json())
  }

  // Add comment
  const handleComment = async () => {
    if (!newComment.trim() || !selectedPost) return
    setCommenting(true)
    const res = await fetch(`/api/forum/posts/${selectedPost.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content: newComment }),
    })
    setCommenting(false)
    if (res.ok) {
      setNewComment('')
      openPost(selectedPost.id) // refresh
    }
  }

  // Delete post
  const handleDeletePost = async (id: string) => {
    if (!confirm('确定删除此帖子？')) return
    const res = await fetch(`/api/forum/posts/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      setSelectedPost(null)
      loadPosts()
    }
  }

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedPost) return
    if (!confirm('确定删除此评论？')) return
    const res = await fetch(`/api/forum/posts/${selectedPost.id}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) openPost(selectedPost.id)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric'
  })

  return (
    <main className="min-h-screen bg-dark-900 pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-display tracking-widest mb-2">社区</h1>
            <p className="text-gray-500 text-sm">行业交流 · 灵感碰撞</p>
          </div>
          {userId ? (
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-accent-gold text-dark-900 text-sm font-medium rounded-none hover:bg-white transition-colors"
            >
              + 发布帖子
            </button>
          ) : (
            <Link href="/login" className="px-5 py-2.5 border border-accent-gold text-accent-gold text-sm hover:bg-accent-gold hover:text-dark-900 transition-colors">
              登录后发布
            </Link>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory('')}
            className={`px-4 py-2 text-sm border transition-colors ${
              !activeCategory
                ? 'bg-accent-gold text-dark-900 border-accent-gold'
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 text-sm border transition-colors ${
                activeCategory === cat.id
                  ? 'bg-accent-gold text-dark-900 border-accent-gold'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Post List */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-4">暂无帖子</p>
            {userId && (
              <button onClick={() => setShowCreate(true)} className="text-accent-gold hover:underline text-sm">
                成为第一个发帖的人 →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => openPost(post.id)}
                className="group p-6 border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {post.coverUrl && (
                    <div className="w-24 h-16 flex-shrink-0 overflow-hidden">
                      <img src={post.coverUrl} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500">{post.category.icon} {post.category.name}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500">{formatDate(post.createdAt)}</span>
                      {post._count.comments > 0 && (
                        <>
                          <span className="text-xs text-gray-600">·</span>
                          <span className="text-xs text-gray-500">💬 {post._count.comments}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-white font-medium mb-1 group-hover:text-accent-gold transition-colors truncate">
                      {post.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{post.content}</p>
                    <p className="text-gray-600 text-xs mt-2">by {post.author.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              className="bg-dark-800 border border-gray-700 w-full max-w-xl p-8"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-display tracking-wider mb-6">发布帖子</h2>

              <div className="space-y-4">
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

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">内容</label>
                  <textarea
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    placeholder="分享你的想法、项目或灵感..."
                    rows={5}
                    className="w-full bg-dark-900 border border-gray-700 text-white text-sm px-4 py-3 focus:border-accent-gold outline-none resize-none placeholder-gray-600"
                  />
                </div>

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

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 overflow-y-auto"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="max-w-3xl mx-auto bg-dark-900 border border-gray-800 my-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8 md:p-12">
                {/* Post Header */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <span>{selectedPost.category.icon} {selectedPost.category.name}</span>
                  <span>·</span>
                  <span>{formatDate(selectedPost.createdAt)}</span>
                  <span>·</span>
                  <span>by {selectedPost.author.name}</span>
                  {(userId === selectedPost.author.id || userId) && (
                    <>
                      <span>·</span>
                      <button
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </>
                  )}
                </div>

                <h1 className="text-2xl font-display tracking-wide mb-6">{selectedPost.title}</h1>

                {selectedPost.coverUrl && (
                  <div className="mb-6">
                    <img src={selectedPost.coverUrl} alt="" referrerPolicy="no-referrer" className="w-full max-h-96 object-cover" />
                  </div>
                )}

                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-8">
                  {selectedPost.content}
                </div>

                {selectedPost.videoUrl && (
                  <div className="mb-8 border border-gray-800">
                    <a href={selectedPost.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="block text-center py-4 text-sm text-accent-gold hover:underline">
                      ▶ 观看视频：{selectedPost.videoUrl}
                    </a>
                  </div>
                )}

                {/* Comments */}
                <div className="border-t border-gray-800 pt-8">
                  <h3 className="text-sm text-gray-400 mb-6">评论 {selectedPost.comments.length}</h3>

                  <div className="space-y-6 mb-8">
                    {selectedPost.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-dark-700 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                          {comment.author.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-white">{comment.author.name}</span>
                            <span className="text-xs text-gray-600">{formatDate(comment.createdAt)}</span>
                            {userId === comment.author.id && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-xs text-red-500 hover:underline ml-2"
                              >
                                删除
                              </button>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comment Input */}
                  {userId ? (
                    <div className="flex gap-3">
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="写下你的评论..."
                        rows={2}
                        className="flex-1 bg-dark-800 border border-gray-700 text-white text-sm px-4 py-3 focus:border-accent-gold outline-none resize-none placeholder-gray-600"
                      />
                      <button
                        onClick={handleComment}
                        disabled={commenting || !newComment.trim()}
                        className="px-5 py-2.5 bg-accent-gold text-dark-900 text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors self-end"
                      >
                        {commenting ? '...' : '发送'}
                      </button>
                    </div>
                  ) : (
                    <Link href="/login" className="text-sm text-accent-gold hover:underline">
                      登录后参与评论 →
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
