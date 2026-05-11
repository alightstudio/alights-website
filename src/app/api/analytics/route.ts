import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// P0-2 修复：analytics POST 速率限制（基于 IP 的内存 Map，不依赖外部存储）
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>()
const POST_RATE_LIMIT_WINDOW = 60 * 1000   // 1 分钟
const POST_MAX_REQUESTS = 60               // 最多 60 次/分钟（约 1 次/秒，允许连续刷新页面）
const POST_RATE_LIMIT_WINDOW_HOURLY = 60 * 60 * 1000  // 1 小时
const POST_MAX_REQUESTS_HOURLY = 2000                       // 最多 2000 次/小时（防滥用）

function checkPostRateLimit(ip: string): boolean {
  const now = Date.now()
  // 分钟级限制
  const minuteRec = ipRequestCounts.get(ip + ':minute')
  if (!minuteRec || now > minuteRec.resetTime) {
    ipRequestCounts.set(ip + ':minute', { count: 1, resetTime: now + POST_RATE_LIMIT_WINDOW })
  } else {
    if (minuteRec.count >= POST_MAX_REQUESTS) return false
    minuteRec.count++
  }
  // 小时级限制（兜底）
  const hourRec = ipRequestCounts.get(ip + ':hour')
  if (!hourRec || now > hourRec.resetTime) {
    ipRequestCounts.set(ip + ':hour', { count: 1, resetTime: now + POST_RATE_LIMIT_WINDOW_HOURLY })
  } else {
    if (hourRec.count >= POST_MAX_REQUESTS_HOURLY) return false
    hourRec.count++
  }
  return true
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

// P0-2 修复：严格的 XSS 防护——仅允许安全的路径格式
function sanitizeAnalyticsPath(path: string): string | null {
  if (!path || typeof path !== 'string') return null
  // 仅允许：字母数字 / - _ . ~ : @ ! $ & ' ( ) * + , ; = %20 以及中文
  // 解码后再次验证（防止双重编码绕过）
  try {
    const decoded = decodeURIComponent(path)
    // 允许：/path/subpath 格式，去掉多余斜杠，限制长度
    if (!/^[\w\-.~:@!$&'()*+,;=/%\u4e00-\u9fa5]{1,512}$/.test(decoded)) return null
    // 不允许含 HTML 标签语法
    if (/<[a-zA-Z][^>]*>/i.test(decoded)) return null
    return decoded.slice(0, 512)
  } catch {
    return null
  }
}

// P0-2 修复：验证 visitorId（应为由前端生成的随机字符串）
function sanitizeVisitorId(visitorId: string): string | null {
  if (!visitorId || typeof visitorId !== 'string') return null
  // 应为 8-64 位字母数字字符串（由 Math.random().toString(36) 生成）
  if (!/^[a-z0-9]{8,64}$/i.test(visitorId)) return null
  return visitorId
}

export async function POST(request: Request) {
  const ip = getClientIP(request)

  // P0-2 修复：速率限制
  if (!checkPostRateLimit(ip)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const rawPath = body?.path
    const rawVisitorId = body?.visitorId

    // P0-2 修复：严格验证 path 和 visitorId 格式
    const path = sanitizeAnalyticsPath(rawPath)
    const visitorId = sanitizeVisitorId(rawVisitorId)

    if (!path || !visitorId) {
      return NextResponse.json({ error: '无效的访问路径或访客标识' }, { status: 400 })
    }

    const today = getToday()

    // P2 #11: 限制 visitorIds 数组大小，超过1000个时重置（用 Set 去重后只保留最新1000个）
    const MAX_VISITOR_IDS = 1000

    const existing = await prisma.siteAnalytics.findUnique({
      where: { path_date: { path, date: today } }
    })

    const isNewVisitor = existing
      ? !existing.visitorIds.includes(visitorId)
      : true

    if (existing) {
      const updateData: Record<string, unknown> = {
        pv: { increment: 1 },
      }
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
  } catch {
    // P0-1：隐藏错误详情
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET /api/analytics?days=N — 管理员统计分析
export async function GET(request: Request) {
  // C-5 修复：仅管理员可查看运营数据
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
    
    // 修复 UV 计算：跨时间段对 visitorIds 去重，而非简单相加
    const allVisitorIds = new Set<string>()
    for (const d of dailyStats) {
      for (const id of d.visitorIds) {
        allVisitorIds.add(id)
      }
    }
    const totalUv = allVisitorIds.size
    
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
    // P0-1: hidden
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
