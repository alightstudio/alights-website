import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'



// GET /api/points - 获取积分概况和历史
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [user, todayTotal, weekRecords, totalRecords] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { points: true },
    }),
    prisma.pointsRecord.aggregate({
      where: { userId, date: today },
      _sum: { points: true },
    }),
    prisma.pointsRecord.findMany({
      where: { userId, date: { gte: weekAgo } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.pointsRecord.count({ where: { userId } }),
  ])

  return NextResponse.json({
    totalPoints: user?.points || 0,
    todayPoints: todayTotal._sum.points || 0,
    dailyLimit: 100,
    recentRecords: weekRecords.map(r => ({
      id: r.id,
      points: r.points,
      reason: r.reason,
      date: r.date,
      time: r.createdAt.toISOString(),
    })),
    totalRecords,
  })
}
