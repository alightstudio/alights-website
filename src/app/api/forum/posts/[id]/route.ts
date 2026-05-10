import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

import { verifyAdminSession } from '@/lib/admin-auth'

// GET /api/forum/posts/[id] — get single post with comments
// Also increments view count (fire-and-forget, won't block response)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // fire-and-forget view increment — non-blocking
  prisma.forumPost.update({ where: { id }, data: { views: { increment: 1 } } }).catch(() => {})

  const post = await prisma.forumPost.findUnique({
    where: { id },
    select: {
      id: true, title: true, content: true, videoUrl: true, coverUrl: true,
      createdAt: true, views: true, likes: true, favorites: true,
      author: { select: { id: true, name: true, avatar: true } },
      category: true,
      tags: { select: { tag: { select: { id: true, name: true } } } },
      comments: {
        include: { author: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
  return NextResponse.json(post)
}

// DELETE /api/forum/posts/[id] — delete post (author or admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })

  // P2 #12 修复：通过 admin session 判断管理员，不再依赖硬编码手机号
  const isAdmin = await verifyAdminSession()
  if (post.authorId !== userId && !isAdmin) {
    return NextResponse.json({ error: '无权限删除' }, { status: 403 })
  }

  await prisma.forumPost.delete({ where: { id } })
  return NextResponse.json({ message: '删除成功' })
}

// PATCH /api/forum/posts/[id] — edit post (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: '需要管理权限' }, { status: 401 })
  }

  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })

  try {
    const body = await req.json()
    const { title, content, videoUrl } = body

    const data: Record<string, string> = {}
    if (typeof title === 'string' && title.trim()) data.title = title.trim()
    if (typeof content === 'string' && content.trim()) data.content = content.trim()
    if (typeof videoUrl === 'string') data.videoUrl = videoUrl || ''

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
    }

    const updated = await prisma.forumPost.update({
      where: { id },
      data,
    })

    return NextResponse.json({ message: '更新成功', post: updated })
  } catch (error) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
