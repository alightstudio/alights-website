import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getUserId(req: NextRequest): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/userId=([^;]+)/)
  return match ? match[1] : null
}

const DAILY_LIMIT = 100 // 每日积分上限
const CLICK_POINTS = 2 // 每次点击作品获得积分

// POST /api/points/click - 记录作品点击获得积分
export async function POST(req: NextRequest) {
  const userId = getUserId(req)
  if (!userId) {
    // 未登录用户也可以记录点击但不加分
    return NextResponse.json({ points: 0 })
  }

  const { workId } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  // 检查今日已获得积分
  const todayTotal = await prisma.pointsRecord.aggregate({
    where: { userId, date: today },
    _sum: { points: true },
  })

  const earned = todayTotal._sum.points || 0
  if (earned >= DAILY_LIMIT) {
    return NextResponse.json({ points: 0, message: '今日积分已达上限' })
  }

  // 计算本次实际可获得积分（不超过上限）
  const award = Math.min(CLICK_POINTS, DAILY_LIMIT - earned)

  // 记录积分
  await prisma.pointsRecord.create({
    data: {
      userId,
      points: award,
      reason: 'click_work',
      workId: workId || null,
      date: today,
    },
  })

  // 更新用户总积分
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: award } },
  })

  return NextResponse.json({ points: award, todayTotal: earned + award, dailyLimit: DAILY_LIMIT })
}
