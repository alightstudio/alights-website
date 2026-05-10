import { prisma } from './prisma'

export type PointsReason = 'daily_checkin' | 'post_create' | 'comment_create' | 'like_received' | 'referral_signup' | 'referral_invite' | 'click_work'

/**
 * 前端调用：记录作品点击（用于积分）
 */
export async function trackWorkClick(workId: string) {
  try {
    await fetch('/api/points/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workId }),
    })
  } catch {
    // silently fail
  }
}

/**
 * 给用户添加积分（含每日上限检查），返回实际获得的积分
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: PointsReason,
  dailyLimit: number
): Promise<{ awarded: number; dailyTotal: number; limit: number; message?: string }> {
  const today = new Date().toISOString().split('T')[0]

  const result = await prisma.$transaction(async (tx) => {
    const todayTotal = await tx.pointsRecord.aggregate({
      where: { userId, date: today },
      _sum: { points: true },
    })
    const earned = todayTotal._sum.points || 0

    if (earned >= dailyLimit) {
      return { awarded: 0, dailyTotal: earned, limit: dailyLimit, message: '今日积分已达上限' }
    }

    const award = Math.min(points, dailyLimit - earned)

    await tx.pointsRecord.create({
      data: {
        userId,
        points: award,
        reason,
        date: today,
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: { points: { increment: award } },
    })

    return { awarded: award, dailyTotal: earned + award, limit: dailyLimit }
  })

  return result
}
