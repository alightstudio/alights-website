import { NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'


// 获取所有作品
export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const works = await prisma.work.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        creatorName: true,
        creatorPhone: false,  // 隐藏手机号防泄露
        createdAt: true,
        videoUrl: true,
        coverUrl: true,
        userId: true
      }
    })

    return NextResponse.json(works)
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json(
      { error: '获取作品列表失败' },
      { status: 500 }
    )
  }
}