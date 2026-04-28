import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

// GET /api/forum/posts/[id]/comments — list comments for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await prisma.forumComment.findMany({
    where: { postId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

// POST /api/forum/posts/[id]/comments — add comment (requires login)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const { id: postId } = await params
  const post = await prisma.forumPost.findUnique({ where: { id: postId } })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })

  const { content } = body
  if (!content?.trim()) return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })

  const comment = await prisma.forumComment.create({
    data: { content, postId, authorId: userId },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json(comment, { status: 201 })
}

// DELETE /api/forum/posts/[id]/comments — delete comment (author or admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id: commentId } = await params
  const comment = await prisma.forumComment.findUnique({ where: { id: commentId } })
  if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 })

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (comment.authorId !== userId && user?.phone !== '15091855505') {
    return NextResponse.json({ error: '无权限删除' }, { status: 403 })
  }

  await prisma.forumComment.delete({ where: { id: commentId } })
  return NextResponse.json({ message: '删除成功' })
}
