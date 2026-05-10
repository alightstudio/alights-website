import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

// GET /api/user/posts — 获取当前用户的帖子列表
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const posts = await prisma.forumPost.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, icon: true } },
      _count: { select: { comments: true } },
    },
  })

  return NextResponse.json({ posts })
}

// GET /api/user/posts?authorId=xxx — 获取指定用户的帖子（公开）
