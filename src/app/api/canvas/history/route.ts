import { NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
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

    const result = await Promise.all(
      canvases.map(async (c) => {
        // 获取像素贡献排行（排除 SYSTEM 自动填充）
        const leaderboard = await prisma.pixel.groupBy({
          by: ['userId'],
          where: { canvasId: c.id, userId: { not: 'SYSTEM' } },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 3,
        })

        // 获取像素数据用于缩略图预览（最多 576 个，防止响应过大导致页面崩溃）
        const pixels = await prisma.pixel.findMany({
          where: { canvasId: c.id },
          select: { x: true, y: true, color: true },
          orderBy: { placedAt: 'desc' },
          take: 576,
        })

        // 获取用户放置的像素数（排除 SYSTEM）
        const userPixelCount = await prisma.pixel.count({
          where: { canvasId: c.id, userId: { not: 'SYSTEM' } },
        })

        return {
          id: c.id,
          width: c.width,
          height: c.height,
          name: c.name,
          endTime: c.endTime,
          pixelCount: userPixelCount,
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
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
