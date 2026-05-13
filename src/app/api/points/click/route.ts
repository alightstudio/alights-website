// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'
import { createRateLimiter } from '@/lib/rate-limit'

const DAILY_LIMIT = 100
const CLICK_POINTS = 2

// P3 安全修复：使用数据库持久化速率限制替代内存 Map（serverless 多实例共享）
const clickRateLimiter = createRateLimiter('points_click', 30, 60 * 1000) // 1分钟最多30次

// POST /api/points/click — 记录作品点击获得积分
export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ points: 0 })

  // P3: 数据库持久化速率限制（以 userId 为标识）
  const rateCheck = await clickRateLimiter.check(req, `u:${userId}`)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: '操作过于频繁，请稍后再试' }, { status: 429 })
  }

  const { workId } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  const result = await prisma.$transaction(async (tx) => {
    const todayTotal = await tx.pointsRecord.aggregate({
      where: { userId, date: today },
      _sum: { points: true },
    })

    const earned = todayTotal._sum.points || 0
    if (earned >= DAILY_LIMIT) {
      return { points: 0, message: '今日积分已达上限', todayTotal: earned }
    }

    const award = Math.min(CLICK_POINTS, DAILY_LIMIT - earned)

    await tx.pointsRecord.create({
      data: {
        userId,
        points: award,
        reason: 'click_work',
        workId: workId || null,
        date: today,
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: award } },
    })

    return { points: award, todayTotal: earned + award, dailyLimit: DAILY_LIMIT }
  })

  return NextResponse.json(result)
}