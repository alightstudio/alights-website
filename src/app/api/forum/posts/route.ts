import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'
import { awardPoints } from '@/lib/points'


// 安全审计修复：使用 sanitize-html（allowlist 方式）替代正则，正则可被绕过
import sanitizeHtml from 'sanitize-html'

const MAX_TITLE_LEN = 200
const MAX_CONTENT_LEN = 20000

// sanitize-html 配置：仅允许安全的基础格式标签和链接，禁止所有危险属性
const sanitizeHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'u', 's',
    'p', 'br', 'hr',
    'blockquote', 'pre', 'code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span',
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'target', 'rel'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'code': ['class'],
    'pre': ['class'],
    'div': ['class'],
    'span': ['class'],
    'td': ['align'],
    'th': ['align'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // 禁止所有数据 URI
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  // 禁止 javascript: 协议
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || ''
      if (href.startsWith('javascript:')) {
        return { tagName: 'span', attribs: {} }
      }
      // 给外链自动加 rel=noopener
      return {
        tagName,
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: attribs.target || '_blank',
        },
      }
    },
    img: (tagName, attribs) => {
      const src = attribs.src || ''
      if (src.startsWith('data:') || src.startsWith('javascript:')) {
        return { tagName: 'span', attribs: {} }
      }
      return { tagName, attribs }
    },
  },
  // 强制移除所有未列出的标签（而非转义）
  exclusiveFilter: (frame) => {
    return false
  },
}

function sanitizeForumContent(html: string): string {
  if (!html) return ''
  let clean = sanitizeHtml(html, sanitizeHtmlOptions)
  if (clean.length > MAX_CONTENT_LEN) clean = clean.slice(0, MAX_CONTENT_LEN)
  return clean.trim()
}

function sanitizeForumTitle(title: string): string {
  if (!title) return ''
  // 标题：允许的标签不适用，直接去除所有 HTML
  let clean = sanitizeHtml(title, {
    allowedTags: [],
    allowedAttributes: {},
  })
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
      select: {
        id: true, title: true, content: true, videoUrl: true, coverUrl: true,
        createdAt: true, views: true, likes: true, favorites: true,
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, icon: true } },
        tags: { select: { tag: { select: { id: true, name: true } } } },
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
  const { title, content, videoUrl, coverUrl, categoryId, tags } = body

  // P1-4 修复：验证必填字段 + 长度限制
  const cleanTitle = sanitizeForumTitle(title)
  const cleanContent = sanitizeForumContent(content)
  if (!cleanTitle || !cleanContent || !categoryId) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }
  if (cleanTitle.length < 2) {
    return NextResponse.json({ error: '标题至少2个字符' }, { status: 400 })
  }

  // Handle tags: create any new ones, connect existing
  let tagConnections: { tagId: string }[] = []
  if (Array.isArray(tags) && tags.length > 0) {
    for (const tagName of tags.slice(0, 5)) {
      const cleanName = tagName.trim().toLowerCase().slice(0, 20)
      if (!cleanName) continue
      // upsert: create if doesn't exist, get id either way
      const tag = await prisma.forumTag.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName },
      })
      tagConnections.push({ tagId: tag.id })
    }
  }

  const post = await prisma.forumPost.create({
    data: {
      title: cleanTitle,
      content: cleanContent,
      videoUrl,
      coverUrl,
      categoryId,
      authorId: userId,
      tags: tagConnections.length > 0 ? { create: tagConnections } : undefined,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      category: { select: { id: true, name: true, icon: true } },
      tags: { select: { tag: { select: { id: true, name: true } } } },
    },
  })

  // 发帖奖励积分（每日最多3次）
  awardPoints(userId, 5, 'post_create', 15).catch(console.error)

  return NextResponse.json(post, { status: 201 })
}
