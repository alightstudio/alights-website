import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const reviews = await prisma.videoReview.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json(reviews)
  } catch (err: any) {
    console.error('List reviews error:', err)
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 })
  }
}
