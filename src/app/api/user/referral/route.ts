import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

import { randomBytes } from 'crypto'


// GET /api/user/referral — 获取我的邀请信息
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, referralCode: true, points: true },
  })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  // 如果没有邀请码则生成一个（P3 #18 修复：使用 crypto.randomBytes 替代 Math.random）
  if (!user.referralCode) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let attempt = 0; attempt < 20; attempt++) {
      // 用 randomBytes 生成 4 字节随机数，映射到 chars
      const buf = randomBytes(4)
      code = ''
      for (let i = 0; i < 6; i++) {
        const idx = buf.readUInt8(i % 4) % chars.length
        code += chars[idx]
      }
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
