import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/stats — 全局统计数据
export async function GET() {
  try {
    const totalBurnedConfig = await prisma.siteConfig.findUnique({
      where: { key: 'total_burned' },
    })
    const totalBurned = totalBurnedConfig ? parseInt(totalBurnedConfig.value) : 0

    const totalUsers = await prisma.user.count()
    const totalTransactions = await prisma.transaction.count()
    const totalCanvas = await prisma.canvas.count()

    const response = NextResponse.json({
      totalBurned,
      totalUsers,
      totalTransactions,
      totalCanvas,
    })
    // L-6 修复：加缓存头，减少被频繁探测
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
