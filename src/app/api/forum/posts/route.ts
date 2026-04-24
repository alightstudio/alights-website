import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
  // 兼容两种方式：body.userId（localStorage）或 cookie（旧方式）
  const body = await req.json()
  let userId = body.userId
  if (!userId) {
    const cookie = req.headers.get('cookie') || ''
    userId = cookie.match(/userId=([^;]+)/)?.[1]
  }
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { title, content, videoUrl, coverUrl, categoryId } = body

  if (!title?.trim() || !content?.trim() || !categoryId) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }

  const post = await prisma.forumPost.create({
    data: { title, content, videoUrl, coverUrl, categoryId, authorId: userId },
    include: {
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, icon: true } },
    },
  })
  return NextResponse.json(post, { status: 201 })
}
