import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/forum/posts/[id] — get single post with comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      category: true,
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })
  return NextResponse.json(post)
}

// DELETE /api/forum/posts/[id] — delete post (author or admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}) as any)
  let userId = (body as any).userId
  if (!userId) {
    const cookie = req.headers.get('cookie') || ''
    userId = cookie.match(/userId=([^;]+)/)?.[1]
  }
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id } = await params
  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })

  // Check if user is author or admin
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (post.authorId !== userId && user?.phone !== '15091855505') {
    return NextResponse.json({ error: '无权限删除' }, { status: 403 })
  }

  await prisma.forumPost.delete({ where: { id } })
  return NextResponse.json({ message: '删除成功' })
}
