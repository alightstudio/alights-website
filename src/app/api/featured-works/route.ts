import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/featured-works — 首页展示作品（无需登录）
export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '6'), 12)
  try {
    const works = await prisma.work.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        coverUrl: true,
        createdAt: true,
      },
    })
    return NextResponse.json(works)
  } catch {
    return NextResponse.json([])
  }
}
