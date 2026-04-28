import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'


// GET /api/user/referral — 获取我的邀请信息
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, referralCode: true, points: true },
  })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  // 如果没有邀请码则生成一个
  if (!user.referralCode) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let attempt = 0; attempt < 20; attempt++) {
      code = ''
      for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const existing = await prisma.user.findUnique({ where: { referralCode: code } })
      if (!existing) break
    }
    user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { id: true, name: true, referralCode: true, points: true },
    })
  }

  // 统计邀请数据
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: { select: { id: true, name: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // 今日邀请奖励积分
  const today = new Date().toISOString().split('T')[0]
  const todayReward = await prisma.pointsRecord.aggregate({
    where: { userId, reason: 'referral_invite', date: today },
    _sum: { points: true },
  })

  return NextResponse.json({
    referralCode: user.referralCode,
    referralUrl: `https://alights.cn/register?ref=${user.referralCode}`,
    totalReferrals: referrals.length,
    todayReward: todayReward._sum.points || 0,
    referrals,
  })
}
