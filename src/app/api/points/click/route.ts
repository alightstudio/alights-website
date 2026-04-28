import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'


const DAILY_LIMIT = 100 // 每日积分上限
const CLICK_POINTS = 2 // 每次点击作品获得积分

// POST /api/points/click - 记录作品点击获得积分
export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) {
    // 未登录用户也可以记录点击但不加分
    return NextResponse.json({ points: 0 })
  }

  const { workId } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  // P1 #7 修复：原子事务 — 积分记录与用户积分更新在同一事务中
  const result = await prisma.$transaction(async (tx) => {
    // 检查今日已获得积分
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
