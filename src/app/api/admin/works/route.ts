import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

// 获取所有作品
export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  
  if (session?.value !== 'authenticated') {
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
        creatorPhone: true,
        createdAt: true,
        videoUrl: true,
        coverUrl: true,
        userId: true
      }
    })

    return NextResponse.json(works)
  } catch (error) {
    console.error('Failed to fetch works:', error)
    return NextResponse.json(
      { error: '获取作品列表失败' },
      { status: 500 }
    )
  }
}