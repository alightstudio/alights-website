import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/forum/tags - list all tags (optionally search by query)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    const where = query
      ? { name: { contains: query } }
      : {}

    const tags = await prisma.forumTag.findMany({
      where,
      select: {
        id: true,
        name: true,
        _count: { select: { posts: true } },
      },
      orderBy: { posts: { _count: 'desc' } },
      take: 20,
    })

    return NextResponse.json(tags)
  } catch {
    return NextResponse.json(
      { error: '服务暂不可用，请稍后再试' },
      { status: 500 }
    )
  }
}
