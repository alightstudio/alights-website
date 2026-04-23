import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  
  if (session?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { works: true }
        }
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    )
  }
}