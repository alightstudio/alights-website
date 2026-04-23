import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // 验证管理员权限
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  
  if (session?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    // 获取统计数据
    const [
      totalWorks,
      pendingWorks,
      approvedWorks,
      totalUsers,
      recentWorks
    ] = await Promise.all([
      prisma.work.count(),
      prisma.work.count({ where: { status: 'PENDING' } }),
      prisma.work.count({ where: { status: 'APPROVED' } }),
      prisma.user.count(),
      prisma.work.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          creatorName: true,
          creatorPhone: true,
          createdAt: true,
          videoUrl: true,
          coverUrl: true
        }
      })
    ])

    return NextResponse.json({
      totalWorks,
      pendingWorks,
      approvedWorks,
      totalUsers,
      recentWorks
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json(
      { error: '获取统计数据失败' },
      { status: 500 }
    )
  }
}