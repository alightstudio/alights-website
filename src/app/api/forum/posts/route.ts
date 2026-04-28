import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

// P1-4 修复：论坛内容安全 — 长度限制 + HTML 过滤
const MAX_TITLE_LEN = 200
const MAX_CONTENT_LEN = 20000

// 简单的 XSS 防护：去除危险标签和事件处理器
function sanitizeForumContent(html: string): string {
  if (!html) return ''
  let clean = html
  // 去除 <script> 及内容
  clean = clean.replace(/<script[\s\S]*?<\/script\s*>/gi, '')
  // 去除内联事件处理器
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  // 去除 javascript: 协议
  clean = clean.replace(/(href|src)\s*=\s*(['"])?javascript:/gi, '$1=$2#')
  // 去除危险标签
  clean = clean.replace(/<(?:iframe|embed|object|applet|base|svg|math)[^>]*>/gi, '')
  clean = clean.replace(/<\/iframe>/gi, '')
  // 限制长度
  if (clean.length > MAX_CONTENT_LEN) clean = clean.slice(0, MAX_CONTENT_LEN)
  return clean.trim()
}

function sanitizeForumTitle(title: string): string {
  if (!title) return ''
  // 去除所有 HTML 标签
  let clean = title.replace(/<[^>]*>/g, '')
  // 去除内联事件
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  if (clean.length > MAX_TITLE_LEN) clean = clean.slice(0, MAX_TITLE_LEN)
  return clean.trim()
}

// GET /api/forum/posts — list posts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where = categoryId ? { categoryId } : {}
  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      include: {
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.forumPost.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, limit })
}

// POST /api/forum/posts — create post (requires login)
export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const { title, content, videoUrl, coverUrl, categoryId } = body

  // P1-4 修复：验证必填字段 + 长度限制
  const cleanTitle = sanitizeForumTitle(title)
  const cleanContent = sanitizeForumContent(content)
  if (!cleanTitle || !cleanContent || !categoryId) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }
  if (cleanTitle.length < 2) {
    return NextResponse.json({ error: '标题至少2个字符' }, { status: 400 })
  }

  const post = await prisma.forumPost.create({
    data: { title: cleanTitle, content: cleanContent, videoUrl, coverUrl, categoryId, authorId: userId },
    include: {
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true } },
    },
  })
  return NextResponse.json(post, { status: 201 })
}
