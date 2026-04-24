import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/cron/daily-settle — Vercel Cron 每日 00:00 触发
// 检查所有超过24h的活跃画布，归档并创建新画布
export async function POST() {
  try {
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const expiredCanvases = await prisma.canvas.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { lte: twentyFourHoursAgo },
      },
    })

    const results = []

    for (const canvas of expiredCanvases) {
      // 1. 计算各用户像素数，找出所有者
      const leaderboard = await prisma.pixel.groupBy({
        by: ['userId'],
        where: { canvasId: canvas.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      const ownerId = leaderboard.length > 0 ? leaderboard[0].userId : null

      // 2. 归档
      await prisma.canvas.update({
        where: { id: canvas.id },
        data: {
          status: 'ARCHIVED',
          endTime: now,
          ownerId,
        },
      })

      // 3. 创建新画布
      await prisma.canvas.create({
        data: {
          width: canvas.width,
          height: canvas.height,
          status: 'ACTIVE',
        },
      })

      results.push({
        canvasId: canvas.id,
        size: canvas.width + 'x' + canvas.height,
        ownerId,
        pixelCount: leaderboard.reduce((s, r) => s + r._count.id, 0),
        topUsers: leaderboard.slice(0, 5).map(r => ({ userId: r.userId, count: r._count.id })),
      })
    }

    return NextResponse.json({
      success: true,
      settled: results.length,
      canvases: results,
    })
  } catch (error) {
    console.error('Daily settle error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
