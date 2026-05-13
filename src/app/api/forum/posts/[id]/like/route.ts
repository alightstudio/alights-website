import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'
import { awardPoints } from '@/lib/points'

// POST - 点赞/取消点赞
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getVerifiedUserId(req)
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const postId = params.id

  try {
    // 检查是否已点赞
    const existing = await prisma.forumPostLike.findUnique({
      where: {
        userId_postId: { userId, postId }
      }
    })

    if (existing) {
      // 取消点赞
      await prisma.$transaction([
        prisma.forumPostLike.delete({
          where: { id: existing.id }
        }),
        prisma.forumPost.update({
          where: { id: postId },
          data: { likes: { decrement: 1 } }
        })
      ])
      return NextResponse.json({ liked: false, likes: (await prisma.forumPost.findUnique({ where: { id: postId } }))?.likes ?? 0 })
    } else {
      // 点赞
      const post = await prisma.forumPost.findUnique({ where: { id: postId } })
      await prisma.$transaction([
        prisma.forumPostLike.create({
          data: { userId, postId }
        }),
        prisma.forumPost.update({
          where: { id: postId },
          data: { likes: { increment: 1 } }
        })
      ])
      // 交易成功后，再给帖子作者加积分（避免操作失败积分已发出）
      if (post?.authorId && post.authorId !== userId) {
        awardPoints(post.authorId, 1, 'like_received', 20).catch(console.error)
      }
      return NextResponse.json({ liked: true, likes: (await prisma.forumPost.findUnique({ where: { id: postId } }))?.likes ?? 1 })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}

// GET - 检查当前用户是否已点赞
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getVerifiedUserId(req)
  if (!userId) {
    return NextResponse.json({ liked: false })
  }

  const existing = await prisma.forumPostLike.findUnique({
    where: {
      userId_postId: { userId, postId: params.id }
    }
  })

  return NextResponse.json({ liked: !!existing })
}
