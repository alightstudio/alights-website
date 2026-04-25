import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getToday() {
  return new Date().toISOString().split('T')[0]
}

export async function POST(request: Request) {
  try {
    const { path, visitorId } = await request.json()
    if (!path || !visitorId) {
      return NextResponse.json({ error: 'Missing path or visitorId' }, { status: 400 })
    }

    const today = getToday()

    const existing = await prisma.siteAnalytics.findUnique({
      where: { path_date: { path, date: today } }
    })

    const isNewVisitor = existing
      ? !existing.visitorIds.includes(visitorId)
      : true

    if (existing) {
      await prisma.siteAnalytics.update({
        where: { path_date: { path, date: today } },
        data: {
          pv: { increment: 1 },
          uv: isNewVisitor ? { increment: 1 } : undefined,
          visitorIds: isNewVisitor ? { push: visitorId } : undefined,
        }
      })
    } else {
      await prisma.siteAnalytics.create({
        data: {
          path,
          date: today,
          pv: 1,
          uv: 1,
          visitorIds: [visitorId],
        }
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Analytics POST error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET /api/analytics?days=N — 管理员统计分析
export async function GET(request: Request) {
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
    const totalUv = dailyStats.reduce((sum, d) => sum + d.uv, 0)
    const avgDailyPv = dailyStats.length > 0 ? Math.round(totalPv / dailyStats.length) : 0

    // 按日期合并
    const byDate: Record<string, { pv: number; uv: number }> = {}
    for (const s of dailyStats) {
      if (!byDate[s.date]) byDate[s.date] = { pv: 0, uv: 0 }
      byDate[s.date].pv += s.pv
      byDate[s.date].uv += s.uv
    }

    const dateList = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { pv, uv }]) => ({ date, pv, uv }))

    // 详细统计：周汇总
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

    // 热门时段分析（最近7天的访问按星期几分布）
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
      totalPv,
      totalUv,
      avgDailyPv,
      dateList,
      weeklyStats,
      dayOfWeekStats,
      pageStats: pageStats.map(p => ({
        path: p.path,
        pv: p._sum.pv || 0,
        uv: p._sum.uv || 0,
      })),
      days,
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
