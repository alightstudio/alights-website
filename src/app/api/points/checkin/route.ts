import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'
import { awardPoints } from '@/lib/points'

// GET /api/points/checkin — 查询签到状态
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]
  // 今天是否已签到
  const todayRecord = await prisma.pointsRecord.findFirst({
    where: { userId, reason: 'daily_checkin', date: today },
  })

  // 查连续签到天数 — 从最近一次开始往前推
  const allCheckins = await prisma.pointsRecord.findMany({
    where: { userId, reason: 'daily_checkin' },
    orderBy: { date: 'desc' },
    take: 365,
    select: { date: true },
  })
  let streak = 0
  const checkinDates = new Set(allCheckins.map(r => r.date))
  for (let i = 0; ; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    if (checkinDates.has(d)) streak++
    else break
  }

  // 下次签到奖励（与 POST 端保持一致）
  const nextBonus = (streak + 1) % 7 === 0 ? 15 : 3

  return NextResponse.json({
    checkedIn: !!todayRecord,
    streak,
    nextBonus,
  })
}

// POST /api/points/checkin — 执行签到
export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const today = new Date().toISOString().split('T')[0]

  // 避免重复签到
  const existing = await prisma.pointsRecord.findFirst({
    where: { userId, reason: 'daily_checkin', date: today },
  })
  if (existing) return NextResponse.json({ awarded: 0, message: '今日已签到' })

  // 计算连续天数
  const allCheckins = await prisma.pointsRecord.findMany({
    where: { userId, reason: 'daily_checkin' },
    orderBy: { date: 'desc' },
    take: 365,
    select: { date: true },
  })
  const checkinDates = new Set(allCheckins.map(r => r.date))
  let streak = 0
  for (let i = 0; ; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    if (checkinDates.has(d)) streak++
    else break
  }

  // 连续第7天给15分，平时3分
  const bonusPoints = (streak > 0 && (streak + 1) % 7 === 0) ? 15 : 3

  const result = await awardPoints(userId, bonusPoints, 'daily_checkin', 100)

  return NextResponse.json({
    ...result,
    streak: streak + 1,
    bonusType: bonusPoints === 15 ? 'weekly_bonus' : 'daily',
  })
}
