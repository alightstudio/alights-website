import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/works/[id]/view — 记录作品浏览（同一 visitorId 只计一次）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { visitorId } = await request.json()

    if (!visitorId) {
      return NextResponse.json({ error: 'Missing visitorId' }, { status: 400 })
    }

    // 先检查是否已存在（同一访客只计一次）
    const existing = await prisma.workView.findUnique({
      where: { workId_visitorId: { workId: id, visitorId } }
    })

    if (!existing) {
      // 新访客：创建记录 + 递增 viewCount（使用事务保证一致性）
      await prisma.$transaction([
        prisma.workView.create({ data: { workId: id, visitorId } }),
        prisma.work.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Work view error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
