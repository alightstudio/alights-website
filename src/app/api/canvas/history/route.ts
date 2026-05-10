import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

// GET /api/canvas/history — 获取已归档画布列表（含像素预览数据）
export async function GET() {
  try {
    // 取最近 30 个归档画布（显示所有历史）
    const canvases = await prisma.canvas.findMany({
      where: { status: 'ARCHIVED' },
      orderBy: { endTime: 'desc' },
      take: 30,
      include: { _count: { select: { pixels: true } } },
    })

    if (canvases.length === 0) {
      return NextResponse.json({ canvases: [] })
    }

    const canvasIds = canvases.map(c => c.id)

    // 批量获取所有画布的像素（用于生成缩略图）
    const allPixels = await prisma.pixel.findMany({
      where: { canvasId: { in: canvasIds } },
      select: { canvasId: true, x: true, y: true, color: true, userId: true },
    })

    // 批量获取所有画布的贡献数据
    const allCounts = await prisma.pixel.groupBy({
      by: ['canvasId', 'userId'],
      where: { canvasId: { in: canvasIds }, userId: { not: 'SYSTEM' } },
      _count: { id: true },
    })

    // 按 canvasId 分组
    const pixelsByCanvas = new Map<string, typeof allPixels>()
    for (const p of allPixels) {
      const list = pixelsByCanvas.get(p.canvasId) || []
      list.push(p)
      pixelsByCanvas.set(p.canvasId, list)
    }
    const byCanvas = new Map<string, typeof allCounts>()
    for (const r of allCounts) {
      const list = byCanvas.get(r.canvasId) || []
      list.push(r)
      byCanvas.set(r.canvasId, list)
    }

    const result = canvases.map(c => {
      const total = c.width * c.height
      const pixels = pixelsByCanvas.get(c.id) || []
      const entries = (byCanvas.get(c.id) || [])
        .sort((a, b) => b._count.id - a._count.id)
        .slice(0, 3)

      return {
        id: c.id,
        width: c.width,
        height: c.height,
        name: c.name,
        startTime: c.startTime,
        endTime: c.endTime,
        fillRate: Math.round((c._count.pixels / total) * 100),
        pixels: pixels.map(p => ({ x: p.x, y: p.y, color: p.color })),
        totalPixels: total,
        pixelCount: c._count.pixels,
        ownerId: c.ownerId,
        topUsers: entries.map(l => ({ userId: l.userId, count: l._count.id })),
      }
    })

    return NextResponse.json({ canvases: result })
  } catch (error: any) {
    return NextResponse.json({ error: '服务器错误', detail: error.message }, { status: 500 })
  }
}
