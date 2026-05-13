import { NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'


export async function GET() {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: false,   // 隐藏手机号防泄露
        email: true,
        company: true,
        bio: true,
        avatar: true,
        points: true,
        referralCode: true,
        createdAt: true,
        _count: { select: { works: true } },
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}