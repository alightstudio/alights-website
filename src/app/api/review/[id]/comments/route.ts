import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 获取评论列表
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.reviewComment.findMany({
      where: { reviewId: params.id },
      orderBy: { timestamp: 'asc' },
    })

    return NextResponse.json(comments)
  } catch (err: any) {
    console.error('Get comments error:', err)
    return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
  }
}

// 添加评论
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { timestamp, comment, author } = await req.json()

    if (typeof timestamp !== 'number' || !comment?.trim()) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 })
    }

    const newComment = await prisma.reviewComment.create({
      data: {
        reviewId: params.id,
        timestamp: Math.max(0, timestamp),
        comment: comment.trim(),
        author: (author || '甲方').trim(),
      },
    })

    return NextResponse.json(newComment, { status: 201 })
  } catch (err: any) {
    console.error('Add comment error:', err)
    return NextResponse.json({ error: '添加评论失败' }, { status: 500 })
  }
}
