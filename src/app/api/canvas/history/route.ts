import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/canvas/history — 获取已归档画布列表
export async function GET() {
  try {
    const canvases = await prisma.canvas.findMany({
      where: { status: 'ARCHIVED' },
      orderBy: { endTime: 'desc' },
      take: 50,
      include: {
        _count: { select: { pixels: true } },
      },
    })

    // 获取每个画布的像素贡献排行
    const result = await Promise.all(
      canvases.map(async (c) => {
        const leaderboard = await prisma.pixel.groupBy({
          by: ['userId'],
          where: { canvasId: c.id },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        })

        // 获取像素数据用于缩略图预览（最多 576 个，24×24 画布）
        const pixels = await prisma.pixel.findMany({
          where: { canvasId: c.id },
          select: { x: true, y: true, color: true },
          orderBy: { placedAt: 'desc' },
        })

        return {
          id: c.id,
          width: c.width,
          height: c.height,
          name: c.name,
          endTime: c.endTime,
          pixelCount: c._count.pixels,
          totalPixels: c.width * c.height,
          fillRate: Math.round((c._count.pixels / (c.width * c.height)) * 100),
          ownerId: c.ownerId,
          topUsers: leaderboard.map(l => ({
            userId: l.userId,
            count: l._count.id,
          })),
          pixels: pixels,
        }
      })
    )

    return NextResponse.json({ canvases: result })
  } catch (error) {
    console.error('获取历史画布失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}