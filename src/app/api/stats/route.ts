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

    return NextResponse.json({
      totalBurned,
      totalUsers,
      totalTransactions,
      totalCanvas,
    })
  } catch (error) {
    console.error('GET /api/stats error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
