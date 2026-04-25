import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

// Vercel Cron 鉴权：验证 CRON_SECRET header
function isCronAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // 未配置 CRON_SECRET 时允许本地开发调用
    return process.env.NODE_ENV !== 'production'
  }
  return authHeader === `Bearer ${cronSecret}`
}

// POST /api/cron/daily-settle — Vercel Cron 每日 00:00 触发 / 管理员手动触发
export async function POST(req: NextRequest) {
  // 两种鉴权方式：1) CRON_SECRET  2) 管理员 session（用于后台手动结算）
  const isCron = isCronAuthorized(req)
  const isAdmin = await verifyAdminSession()

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

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

      // 4. 给画布拥有者发放积分奖励
      if (ownerId) {
        const topCount = leaderboard[0]._count.id
        const bonus = Math.max(10, Math.floor(topCount * 0.5))
        await prisma.user.update({
          where: { id: ownerId },
          data: { points: { increment: bonus } },
        })
        await prisma.transaction.create({
          data: {
            userId: ownerId,
            type: 'canvas_own',
            amount: bonus,
            balance: 0, // 简化处理，不精确追踪
            refId: canvas.id,
            note: `画布所有权奖励 (${canvas.width}x${canvas.height}, ${topCount}像素)`,
          },
        })
      }

      results.push({
        canvasId: canvas.id,
        size: canvas.width + 'x' + canvas.height,
        ownerId,
        bonus: ownerId ? Math.max(10, Math.floor(leaderboard[0]._count.id * 0.5)) : 0,
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
