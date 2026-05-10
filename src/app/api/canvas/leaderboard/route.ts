import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/canvas/leaderboard
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    // ===== 全时段排行（排除 SYSTEM，SYSTEM 不计入归属）=====
    const allTimeRaw = await prisma.pixel.groupBy({
      by: ['userId'],
      where: { userId: { not: 'SYSTEM' } },
      _count: true,
      orderBy: { _count: { userId: 'desc' } },
      take: 50,
    })

    // 批量查用户名
    const userIds = allTimeRaw.map(r => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    })
    const userMap = new Map(users.map(u => [u.id, u.name || '匿名']))

    // 用户的贡献画布数（去重）
    const canvasPairs = await prisma.pixel.groupBy({
      by: ['userId', 'canvasId'],
      where: { userId: { in: userIds } },
    })
    const canvasCountMap = new Map<string, number>()
    for (const p of canvasPairs) {
      canvasCountMap.set(p.userId, (canvasCountMap.get(p.userId) || 0) + 1)
    }

    // 命名的画布所有者
    const namedCanvases = await prisma.canvas.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: userIds }, name: { not: null } },
      _count: true,
    })
    const namedMap = new Map(namedCanvases.map(r => [r.ownerId!, r._count]))

    const allTime = allTimeRaw.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      userName: userMap.get(r.userId) || '匿名',
      pixels: r._count,
      canvases: canvasCountMap.get(r.userId) || 0,
      namedCanvases: namedMap.get(r.userId) || 0,
    }))

    // ===== 活跃画布排行 =====
    const activeCanvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
      select: { id: true, width: true, height: true, name: true },
    })

    let activeData = null
    if (activeCanvas) {
      const activeRaw = await prisma.pixel.groupBy({
        by: ['userId'],
        where: { canvasId: activeCanvas.id, userId: { not: 'SYSTEM' } },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 20,
      })

      const totalActivePixels = activeRaw.reduce((sum, r) => sum + r._count, 0)
      const totalCells = activeCanvas.width * activeCanvas.height

      const topUsers = activeRaw.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        userName: userMap.get(r.userId) || '匿名',
        pixels: r._count,
      }))

      activeData = {
        id: activeCanvas.id,
        width: activeCanvas.width,
        height: activeCanvas.height,
        name: activeCanvas.name,
        fillRate: Math.round((totalActivePixels / totalCells) * 100),
        totalPixels: totalActivePixels,
        totalCells,
        topUsers,
      }
    }

    // ===== 全局统计 =====
    const totalUsers = await prisma.pixel.groupBy({ by: ['userId'], where: { userId: { not: 'SYSTEM' } } })
    const totalPixelsAll = await prisma.pixel.count() // 含 SYSTEM（统计用）

    return NextResponse.json({
      allTime,
      activeCanvas: activeData,
      stats: {
        totalUsers: totalUsers.length,
        totalPixels: totalPixelsAll,
        totalCanvases: await prisma.canvas.count(),
      },
    })
  } catch (error) {
    // P0-1: hidden error details
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
