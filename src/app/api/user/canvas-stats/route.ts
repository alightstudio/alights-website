import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'


// GET /api/user/canvas-stats
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  try {
    const totalPixels = await prisma.pixel.count({ where: { userId } })

    const canvasIds = await prisma.pixel.groupBy({
      by: ['canvasId'], where: { userId },
    })

    const activeCanvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
      select: { id: true, width: true, height: true },
    })

    let activeData = null
    if (activeCanvas) {
      const activePixels = await prisma.pixel.count({
        where: { canvasId: activeCanvas.id, userId },
      })

      const ranking = await prisma.pixel.groupBy({
        by: ['userId'],
        where: { canvasId: activeCanvas.id },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 20,
      })

      const rankIndex = ranking.findIndex(r => r.userId === userId)
      const totalActivePixels = ranking.reduce((sum, r) => sum + r._count, 0)
      const totalActiveCells = activeCanvas.width * activeCanvas.height

      activeData = {
        id: activeCanvas.id,
        pixels: activePixels,
        rank: rankIndex >= 0 ? rankIndex + 1 : null,
        topCount: ranking.length > 0 ? ranking[0]._count : 0,
        totalPixels: totalActivePixels,
        totalCells: totalActiveCells,
        fillRate: Math.round((totalActivePixels / totalActiveCells) * 100),
        width: activeCanvas.width,
        height: activeCanvas.height,
      }
    }

    return NextResponse.json({
      totalPixels,
      contributedCanvases: canvasIds.length,
      activeCanvas: activeData,
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
