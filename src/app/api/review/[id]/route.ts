import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const passcode = req.nextUrl.searchParams.get('code')

    const review = await prisma.videoReview.findUnique({
      where: { id },
      include: {
        comments: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            timestamp: true,
            comment: true,
            author: true,
            createdAt: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: '审片记录不存在' }, { status: 404 })
    }

    // 如果没有访问码，只返回基本信息
    if (!passcode || passcode !== review.passcode) {
      return NextResponse.json({
        id: review.id,
        title: review.title,
        videoName: review.videoName,
        locked: !passcode || passcode !== review.passcode,
        commentCount: review.comments.length,
      })
    }

    return NextResponse.json({
      id: review.id,
      title: review.title,
      videoUrl: review.videoUrl,
      videoName: review.videoName,
      status: review.status,
      passcode: review.passcode,
      locked: false,
      createdAt: review.createdAt,
      comments: review.comments,
    })
  } catch (err: any) {
    console.error('Get review error:', err)
    return NextResponse.json({ error: '获取失败: ' + err.message }, { status: 500 })
  }
}
