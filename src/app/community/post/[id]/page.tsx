'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface Post {
  id: string
  title: string
  content: string
  videoUrl: string | null
  coverUrl: string | null
  createdAt: string
  views: number
  likes: number
  favorites: number
  author: { id: string; name: string; avatar: string | null }
  category: { id: string; name: string; icon: string }
  tags?: Array<{ tag: { id: string; name: string } }>
  comments: Array<{
    id: string
    content: string
    createdAt: string
    author: { id: string; name: string; avatar: string | null }
  }>
}

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

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function PostPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    fetch(`/api/forum/posts/${params.id}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        return res.json()
      })
      .then(data => {
        setPost(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })

    // Check if user liked this post
    fetch(`/api/forum/posts/${params.id}/like`)
      .then(res => res.json())
      .then(data => setLiked(data.liked ?? false))
      .catch(() => {})
  }, [params.id])

  async function handleLike() {
    const res = await fetch(`/api/forum/posts/${params.id}/like`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setLiked(data.liked)
      setPost(prev => prev ? { ...prev, likes: data.likes } : prev)
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-dark-900 pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 border border-red-800 bg-red-900/10">
            <h2 className="text-red-400 text-lg mb-4">加载失败</h2>
            <pre className="text-sm text-red-300 whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-dark-900 pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center py-20 text-gray-500">加载中...</div>
      </main>
    )
  }

  if (!post) return notFound()

  const avatarBg = getAvatarColor(post.author.name)

  return (
    <main className="min-h-screen bg-dark-900 pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
          <Link href="/community" className="hover:text-accent-gold transition-colors">社区</Link>
          <span>/</span>
          <span className="text-gray-400">{post.category.icon} {post.category.name}</span>
        </nav>

        {/* Back Button */}
        <Link
          href="/community"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-accent-gold transition-colors mb-8"
        >
          <span>←</span>
          <span>返回列表</span>
        </Link>

        {/* Post Card */}
        <article className="border border-gray-800 bg-dark-900">
          {/* Header */}
          <div className="p-8 md:p-12 border-b border-gray-800">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {post.author.avatar ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-700">
                    <img src={post.author.avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className="w-12 h-12 flex items-center justify-center text-lg font-medium rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: avatarBg + '22',
                      border: `1px solid ${avatarBg}44`,
                      color: avatarBg,
                    }}
                  >
                    {post.author.name[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-base text-white font-medium">{post.author.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 bg-dark-800 border border-gray-700">
                      {post.category.icon} {post.category.name}
                    </span>
                    <span>·</span>
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-display tracking-wide mb-6 leading-snug">{post.title}</h1>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map(t => (
                  <span key={t.tag.id} className="px-2 py-0.5 bg-dark-800 border border-gray-700 text-xs text-gray-400">
                    #{t.tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Stats Bar */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="text-lg">👁</span>
                <span>{post.views}</span>
                <span className="text-xs text-gray-600">浏览</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-lg">💬</span>
                <span>{post.comments.length}</span>
                <span className="text-xs text-gray-600">评论</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-lg">♥</span>
                <span>{post.likes}</span>
                <span className="text-xs text-gray-600">点赞</span>
              </span>
            </div>
          </div>

          {/* Cover Image */}
          {post.coverUrl && (
            <div className="border-b border-gray-800">
              <img
                src={post.coverUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8 md:p-12 border-b border-gray-800">
            <div className="text-gray-300 leading-relaxed text-[15px] prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {post.content}
              </ReactMarkdown>
            </div>
          </div>

          {/* Video */}
          {post.videoUrl && (
            <div className="p-8 md:p-12 border-b border-gray-800">
              <a
                href={post.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-4 bg-dark-800 border border-gray-700 hover:border-accent-gold/50 transition-colors group"
              >
                <span className="text-2xl">▶</span>
                <div>
                  <div className="text-sm text-white group-hover:text-accent-gold transition-colors">观看视频</div>
                  <div className="text-xs text-gray-600 mt-0.5">{post.videoUrl}</div>
                </div>
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="p-6 md:p-8 flex items-center justify-between border-b border-gray-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-400 text-sm hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                <span>{liked ? '❤️' : '🤍'}</span>
                <span>{liked ? '已点赞' : '点赞'}</span>
                <span className="text-xs text-gray-600">({post.likes})</span>
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 border border-gray-700 text-gray-400 text-sm hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert('链接已复制')
                }}
              >
                <span>↗</span>
                <span>分享</span>
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="p-8 md:p-12">
            <h2 className="text-lg font-medium text-white mb-8">
              评论 <span className="text-gray-600">({post.comments.length})</span>
            </h2>

            {/* Comment Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const textarea = form.querySelector('textarea')!
                const content = textarea.value.trim()
                if (!content) return

                const res = await fetch(`/api/forum/posts/${params.id}/comments`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content }),
                })

                if (res.ok) {
                  window.location.reload()
                } else {
                  const err = await res.json()
                  alert(err.error || '评论失败')
                }
              }}
              className="mb-10"
            >
              <textarea
                placeholder="写下你的评论..."
                rows={3}
                className="w-full bg-dark-800 border border-gray-700 text-white text-sm px-4 py-4 focus:border-accent-gold outline-none resize-none placeholder-gray-600"
              />
              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-accent-gold text-dark-900 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
                >
                  发送评论
                </button>
              </div>
            </form>

            {/* Comments List */}
            {post.comments.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="text-sm">暂无评论</p>
                <p className="text-xs mt-1">成为第一个评论的人</p>
              </div>
            ) : (
              <div className="space-y-6">
                {post.comments.map((comment) => {
                  const commentAvatarBg = getAvatarColor(comment.author.name)
                  return (
                    <div key={comment.id} className="flex gap-4 p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                      {comment.author.avatar ? (<>
                        <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border border-gray-700">
                          <img src={comment.author.avatar} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                      </>) : (
                        <div
                          className="w-10 h-10 flex items-center justify-center text-sm font-medium rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: commentAvatarBg + '22',
                            border: `1px solid ${commentAvatarBg}44`,
                            color: commentAvatarBg,
                          }}
                        >
                          {comment.author.name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-white font-medium">{comment.author.name}</span>
                          <span className="text-xs text-gray-600">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">{comment.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            className="text-xs text-gray-600 hover:text-accent-gold transition-colors"
                            onClick={() => {
                              const textarea = document.querySelector('textarea')
                              if (textarea) {
                                textarea.value = `@${comment.author.name} `
                                textarea.focus()
                              }
                            }}
                          >
                            回复
                          </button>
                          <button
                            className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                            onClick={async () => {
                              if (!confirm('确定删除此评论？')) return
                              const res = await fetch(`/api/forum/posts/${params.id}/comments/${comment.id}`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({}),
                              })
                              if (res.ok) window.location.reload()
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  )
}
