import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  return handleDailySettle()
}

export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  return handleDailySettle()
}

function verifyCronSecret(request: Request): boolean {
  const url = new URL(request.url)
  return url.searchParams.get('secret') === process.env.CRON_SECRET
}

async function handleDailySettle() {

  try {
    const now = new Date()

    // 获取当前活跃画布
    const activeCanvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
    })

    if (!activeCanvas) {
      return NextResponse.json({ success: true, action: 'NO_ACTIVE_CANVAS' })
    }

    const totalCells = activeCanvas.width * activeCanvas.height

    // 获取像素数量和排行榜（一次查询，减少 Neon 连接数）
    const [pixelCount, leaderboard] = await Promise.all([
      prisma.pixel.count({ where: { canvasId: activeCanvas.id } }),
      prisma.pixel.groupBy({
        by: ['userId'],
        where: { canvasId: activeCanvas.id, userId: { not: 'SYSTEM' } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      }),
    ])

    // 画布所有者 = 贡献最多像素的用户
    const ownerId = leaderboard.length > 0 ? leaderboard[0].userId : null
    const userPixelCount = leaderboard.reduce((s, r) => s + r._count.id, 0)

    // ============================================================
    // 逻辑 1：每天 00:00 强制归档 + 新建空白 40×40
    // （扩展逻辑独立存在于 random-pixel 中，填满时触发）
    // ============================================================
    await prisma.canvas.update({
      where: { id: activeCanvas.id },
      data: {
        status: 'ARCHIVED',
        endTime: now,
        ownerId,
      },
    })

    await prisma.canvas.create({
      data: { width: 40, height: 40, status: 'ACTIVE' },
    })

    // 给画布所有者发放积分奖励（50% × 贡献像素数）
    if (ownerId && userPixelCount > 0) {
      const bonus = Math.max(10, Math.floor(userPixelCount * 0.5))
      await prisma.user.update({
        where: { id: ownerId },
        data: { points: { increment: bonus } },
      })
    }

    // 自动轮换底稿模板
    const { FAMOUS_PAINTINGS } = await import('@/data/painting-pixels')
    const nextTemplate = FAMOUS_PAINTINGS[Math.floor(Math.random() * FAMOUS_PAINTINGS.length)]
    await prisma.siteConfig.upsert({
      where: { key: 'canvas_template' },
      update: { value: nextTemplate.id },
      create: { key: 'canvas_template', value: nextTemplate.id },
    })

    return NextResponse.json({
      success: true,
      settled: {
        canvasId: activeCanvas.id,
        size: `${activeCanvas.width}×${activeCanvas.height}`,
        pixelCount,
        fillRate: Math.round((pixelCount / totalCells) * 100) + '%',
        ownerId,
        action: 'DAILY_RESET',
      },
      nextTemplate: { id: nextTemplate.id, title: nextTemplate.title },
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: '结算失败' }, { status: 500 })
  }
}
