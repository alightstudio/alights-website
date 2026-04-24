import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 记录访问
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

    // upsert: 累加 PV，检查 visitorId 是否已访问过来决定 UV
    // PostgreSQL JSON/array 配合 prisma 做唯一性检查较复杂，这里用两步法
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

// 获取访问统计（admin专用）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // 按日期聚合
    const dailyStats = await prisma.siteAnalytics.findMany({
      where: { date: { gte: startDateStr } },
      orderBy: { date: 'asc' },
    })

    // 按页面聚合
    const pageStats = await prisma.siteAnalytics.groupBy({
      by: ['path'],
      where: { date: { gte: startDateStr } },
      _sum: { pv: true },
      orderBy: { _sum: { pv: 'desc' } },
    })

    // 总览
    const totalPv = dailyStats.reduce((sum, d) => sum + d.pv, 0)
    const totalUv = dailyStats.reduce((sum, d) => sum + d.uv, 0)
    const avgDailyPv = dailyStats.length > 0 ? Math.round(totalPv / dailyStats.length) : 0

    // 按日期合并（同一日期多页面合并）
    const byDate: Record<string, { pv: number; uv: number }> = {}
    for (const s of dailyStats) {
      if (!byDate[s.date]) byDate[s.date] = { pv: 0, uv: 0 }
      byDate[s.date].pv += s.pv
      byDate[s.date].uv += s.uv
    }

    const dateList = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { pv, uv }]) => ({ date, pv, uv }))

    return NextResponse.json({
      totalPv,
      totalUv,
      avgDailyPv,
      dateList,
      pageStats: pageStats.map(p => ({
        path: p.path,
        pv: p._sum.pv || 0,
      })),
      days,
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
