// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'
import { createRateLimiter } from '@/lib/rate-limit'

// P3 安全修复：使用数据库持久化速率限制（两档：分钟级 + 小时级）
const analyticsRateLimiterMinute = createRateLimiter('analytics_minute', 60, 60 * 1000)   // 1分钟60次
const analyticsRateLimiterHourly = createRateLimiter('analytics_hourly', 2000, 60 * 60 * 1000) // 1小时2000次

function sanitizeAnalyticsPath(path: string): string | null {
  if (!path || typeof path !== 'string') return null
  try {
    const decoded = decodeURIComponent(path)
    if (!/^[\w\-.~:@!$&'()*+,;=/%\u4e00-\u9fa5]{1,512}$/.test(decoded)) return null
    if (/<[a-zA-Z][^>]*>/i.test(decoded)) return null
    return decoded.slice(0, 512)
  } catch {
    return null
  }
}

function sanitizeVisitorId(visitorId: string): string | null {
  if (!visitorId || typeof visitorId !== 'string') return null
  if (!/^[a-z0-9]{8,64}$/i.test(visitorId)) return null
  return visitorId
}

export async function POST(request: Request) {
  const req = request as unknown as NextRequest

  // P3: 数据库持久化双档速率限制
  const [minCheck, hrCheck] = await Promise.all([
    analyticsRateLimiterMinute.check(req, ''),
    analyticsRateLimiterHourly.check(req, ''),
  ])
  if (!minCheck.allowed || !hrCheck.allowed) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const path = sanitizeAnalyticsPath(body?.path)
    const visitorId = sanitizeVisitorId(body?.visitorId)

    if (!path || !visitorId) {
      return NextResponse.json({ error: '无效的访问路径或访客标识' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const MAX_VISITOR_IDS = 1000

    const existing = await prisma.siteAnalytics.findUnique({
      where: { path_date: { path, date: today } },
    })

    const isNewVisitor = existing
      ? !existing.visitorIds.includes(visitorId)
      : true

    if (existing) {
      const updateData: Record<string, unknown> = { pv: { increment: 1 } }
      if (isNewVisitor) {
        updateData.uv = { increment: 1 }
        if (existing.visitorIds.length >= MAX_VISITOR_IDS) {
          const uniqueIds = Array.from(new Set([...existing.visitorIds.slice(-MAX_VISITOR_IDS + 1), visitorId]))
          updateData.visitorIds = uniqueIds
        } else {
          updateData.visitorIds = { push: visitorId }
        }
      }
      await prisma.siteAnalytics.update({
        where: { path_date: { path, date: today } },
        data: updateData,
      })
    } else {
      await prisma.siteAnalytics.create({
        data: { path, date: today, pv: 1, uv: 1, visitorIds: [visitorId] },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET /api/analytics — 管理员统计分析
export async function GET(request: Request) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    const dailyStats = await prisma.siteAnalytics.findMany({
      where: { date: { gte: startDateStr } },
      orderBy: { date: 'asc' },
    })

    const pageStats = await prisma.siteAnalytics.groupBy({
      by: ['path'],
      where: { date: { gte: startDateStr } },
      _sum: { pv: true, uv: true },
      orderBy: { _sum: { pv: 'desc' } },
    })

    const totalPv = dailyStats.reduce((sum, d) => sum + d.pv, 0)
    const allVisitorIds = new Set<string>()
    for (const d of dailyStats) {
      for (const id of d.visitorIds) allVisitorIds.add(id)
    }
    const totalUv = allVisitorIds.size
    const avgDailyPv = dailyStats.length > 0 ? Math.round(totalPv / dailyStats.length) : 0

    const byDate: Record<string, { pv: number; uv: number }> = {}
    for (const s of dailyStats) {
      if (!byDate[s.date]) byDate[s.date] = { pv: 0, uv: 0 }
      byDate[s.date].pv += s.pv
      byDate[s.date].uv += s.uv
    }

    const dateList = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { pv, uv }]) => ({ date, pv, uv }))

    const weeklyStats: { week: string; pv: number; uv: number }[] = []
    const weekMap: Record<string, { pv: number; uv: number }> = {}
    for (const d of dailyStats) {
      const dt = new Date(d.date)
      const weekStart = new Date(dt)
      weekStart.setDate(dt.getDate() - dt.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      if (!weekMap[weekKey]) weekMap[weekKey] = { pv: 0, uv: 0 }
      weekMap[weekKey].pv += d.pv
      weekMap[weekKey].uv += d.uv
    }
    for (const [week, data] of Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b))) {
      weeklyStats.push({ week, ...data })
    }

    const recentDays = dailyStats.filter(d => {
      const diff = (Date.now() - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 7
    })
    const dayOfWeekStats = [0, 1, 2, 3, 4, 5, 6].map(dow => {
      const dayRecords = recentDays.filter(r => new Date(r.date).getDay() === dow)
      return {
        day: dow,
        label: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dow],
        labelEn: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow],
        pv: dayRecords.reduce((s, r) => s + r.pv, 0),
        uv: dayRecords.reduce((s, r) => s + r.uv, 0),
      }
    })

    return NextResponse.json({
      totalPv, totalUv, avgDailyPv, dateList, weeklyStats, dayOfWeekStats,
      pageStats: pageStats.map(p => ({ path: p.path, pv: p._sum.pv || 0, uv: p._sum.uv || 0 })),
      days,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}