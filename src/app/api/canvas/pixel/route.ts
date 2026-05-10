// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'


// 合法 hex 颜色正则
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

// POST /api/canvas/pixel — 放置像素
export async function POST(req: NextRequest) {
  try {
    const userId = getVerifiedUserId(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { canvasId, x, y, color } = body

    // 参数校验
    if (typeof x !== 'number' || typeof y !== 'number' || !color) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // 验证颜色（六位 hex）
    if (!COLOR_RE.test(color)) {
      return NextResponse.json({ error: '颜色格式无效' }, { status: 400 })
    }

    // 获取当前画布
    const canvas = await prisma.canvas.findUnique({ where: { id: canvasId } })
    if (!canvas || canvas.status !== 'ACTIVE') {
      return NextResponse.json({ error: '画布不可用' }, { status: 400 })
    }

    // 验证坐标
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return NextResponse.json({ error: '坐标超出画布范围' }, { status: 400 })
    }

    // P2 #15 修复 + P0 #2 竞态修复：
    // $transaction 内用 SELECT FOR UPDATE 锁定用户行，防止并发双花
    const result = await prisma.$transaction(async (tx) => {
      // 锁定用户行（悲观锁），防止并发请求同时通过 points >= 1 检查
      const user = await tx.$queryRaw<{ id: string; points: number }[]>
        `SELECT id, points FROM "User" WHERE id = ${userId} FOR UPDATE`
      if (!user[0] || user[0].points < 1) {
        throw new Error('INSUFFICIENT_POINTS')
      }

      // 扣除积分
      const updated = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: 1 } },
      })

      // 记录交易
      await tx.transaction.create({
        data: {
          userId,
          type: 'pixel_place',
          amount: -1,
          balance: updated.points,
          refId: canvasId,
          note: `放置像素 (${x},${y})`,
        },
      })

      // 放置/更新像素（用户放置的标记为 RANDOM）
      const pixel = await tx.pixel.upsert({
        where: { canvasId_x_y: { canvasId, x, y } },
        update: { color, userId, source: 'RANDOM', placedAt: new Date() },
        create: { canvasId, x, y, color, userId, source: 'RANDOM' },
      })

      // 画布满时：原地扩展（不归档，只有 daily-settle 才归档）
      // 扩展逻辑由 random-pixel cron 在下次执行时处理
      // 这里只放置像素，不触发扩张

      return { pixel, pointsRemaining: updated.points }
    })

    const { pixel, pointsRemaining } = result

    return NextResponse.json({
      success: true,
      pixel: { x: pixel.x, y: pixel.y, color: pixel.color },
      pointsRemaining,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_POINTS') {
      return NextResponse.json({ error: '积分不足' }, { status: 402 })
    }
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
