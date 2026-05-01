import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'
import { isCronAuthorized } from '@/lib/cron-auth'
import { FAMOUS_PAINTINGS, TEMPLATE_SIZE } from '@/lib/famous-paintings'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'

// GET/POST /api/cron/daily-settle — Vercel Cron 每日 00:00 触发 / 管理员手动触发 / cron-job.org 外部调用
export async function GET(req: NextRequest) {
  return handleDailySettle(req)
}

export async function POST(req: NextRequest) {
  return handleDailySettle(req)
}

async function handleDailySettle(req: NextRequest) {
  // M-5 修复：独立密钥 CRON_SECRET_DAILY_SETTLE，回退 CRON_SECRET
  const isCron = isCronAuthorized(req, 'daily-settle')
  const isAdmin = await verifyAdminSession()

  if (!isCron && !isAdmin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const now = new Date()

    const expiredCanvases = await prisma.canvas.findMany({
      where: {
        status: 'ACTIVE',
      },
    })

    const results = []

    for (const canvas of expiredCanvases) {
      // 1. 计算各用户像素数，找出所有者（排除 SYSTEM 自动填充）
      const leaderboard = await prisma.pixel.groupBy({
        by: ['userId'],
        where: { canvasId: canvas.id, userId: { not: 'SYSTEM' } },
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

      // 3. 扩展画布（每个像素拆分为 4 个小方块：2×2）
      // 上限：80×80，达到后不再扩展，让玩家继续在 80×80 画布上玩
      const MAX_CANVAS_SIZE = 80
      if (canvas.width >= MAX_CANVAS_SIZE) {
        results.push({
          canvasId: canvas.id,
          size: canvas.width + 'x' + canvas.height,
          ownerId,
          bonus: ownerId ? Math.max(10, Math.floor(leaderboard[0]._count.id * 0.5)) : 0,
          pixelCount: leaderboard.reduce((s, r) => s + r._count.id, 0),
          topUsers: leaderboard.slice(0, 5).map(r => ({ userId: r.userId, count: r._count.id })),
          note: `已达最大尺寸 ${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE}，保持不变`,
        })
        continue
      }
      const newSize = canvas.width * 2 // 40→80
      const oldSize = canvas.width
      
      // 读取旧画布所有像素
      const oldPixels = await prisma.pixel.findMany({
        where: { canvasId: canvas.id }
      })
      
      // 创建新画布
      const newCanvas = await prisma.canvas.create({
        data: {
          width: newSize,
          height: newSize,
          status: 'ACTIVE',
        },
      })
      
      // 每个旧像素拆分为 4 个小方块（2×2）
      const newPixels = []
      for (const px of oldPixels) {
        const x = px.x
        const y = px.y
        // (x,y) → (2x,2y), (2x+1,2y), (2x,2y+1), (2x+1,2y+1)
        const newPositions = [
          { x: x * 2, y: y * 2 },
          { x: x * 2 + 1, y: y * 2 },
          { x: x * 2, y: y * 2 + 1 },
          { x: x * 2 + 1, y: y * 2 + 1 },
        ]
        for (const pos of newPositions) {
          newPixels.push({
            canvasId: newCanvas.id,
            userId: px.userId, // 用户保留
            x: pos.x,
            y: pos.y,
            color: px.color, // 颜色复制
          })
        }
      }
      
      // 批量写入
      if (newPixels.length > 0) {
        await prisma.pixel.createMany({
          data: newPixels,
        })
      }

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

    // 5. 自动轮换底稿（周期结束时切换）
    const nextTemplate = FAMOUS_PAINTINGS[Math.floor(Math.random() * FAMOUS_PAINTINGS.length)]
    await prisma.siteConfig.upsert({
      where: { key: 'canvas_template' },
      update: { value: nextTemplate.id },
      create: { key: 'canvas_template', value: nextTemplate.id }
    })

    return NextResponse.json({
      success: true,
      settled: results.length,
      canvases: results,
      nextTemplate: {
        id: nextTemplate.id,
        title: nextTemplate.title,
        artist: nextTemplate.artist
      }
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ success: false, error: '结算失败' }, { status: 500 })
  }
}
