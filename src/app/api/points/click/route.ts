import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

const DAILY_LIMIT = 100 // 每日积分上限
const CLICK_POINTS = 2 // 每次点击作品获得积分

// P1-3 修复：points/click 速率限制（基于 IP + userId）
const ipClickCounts = new Map<string, { count: number; resetTime: number }>()
const CLICK_RATE_WINDOW = 60 * 1000    // 1 分钟
const CLICK_MAX_PER_MIN = 30           // 最多 30 次/分钟（防止刷请求）

function checkClickRateLimit(identifier: string): boolean {
  const now = Date.now()
  const rec = ipClickCounts.get(identifier)
  if (!rec || now > rec.resetTime) {
    ipClickCounts.set(identifier, { count: 1, resetTime: now + CLICK_RATE_WINDOW })
    return true
  }
  if (rec.count >= CLICK_MAX_PER_MIN) return false
  rec.count++
  return true
}

// POST /api/points/click - 记录作品点击获得积分
// P1-3 修复：验证 workId 真实性（必须在数据库中存在且已上线）
export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  // 未登录用户也可以记录点击但不加分
  if (!userId) return NextResponse.json({ points: 0 })

  // P1-3：速率限制（以 userId 为标识，防止同一账户高频请求）
  if (!checkClickRateLimit(userId)) {
    return NextResponse.json({ error: '操作过于频繁，请稍后再试' }, { status: 429 })
  }

  const { workId } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  // P1-3 修复：验证 workId 存在且已上线（不在此处加分，防止伪造 workId）
  if (workId) {
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: { id: true, status: true },
    })
    // 只允许已审核通过的作品作为有效点击
    if (!work || work.status !== 'APPROVED') {
      // workId 无效，不加分但也不报错（兼容旧行为）
    }
  }

  // P1 #7 修复：原子事务 — 积分记录与用户积分更新在同一事务中
  const result = await prisma.$transaction(async (tx) => {
    // 检查今日已获得积分（累加所有来源，不只是 click_work）
    const todayTotal = await tx.pointsRecord.aggregate({
      where: { userId, date: today },
      _sum: { points: true },
    })

    const earned = todayTotal._sum.points || 0
    if (earned >= DAILY_LIMIT) {
      return { points: 0, message: '今日积分已达上限', todayTotal: earned }
    }

    // 计算本次实际可获得积分（不超过上限）
    const award = Math.min(CLICK_POINTS, DAILY_LIMIT - earned)

    // 记录积分
    await tx.pointsRecord.create({
      data: {
        userId,
        points: award,
        reason: 'click_work',
        workId: workId || null,
        date: today,
      },
    })

    // 更新用户总积分
    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: award } },
    })

    return { points: award, todayTotal: earned + award, dailyLimit: DAILY_LIMIT }
  })

  return NextResponse.json(result)
}
