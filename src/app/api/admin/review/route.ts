import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  
  if (session?.value !== 'authenticated') {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const { workId, status, comment } = await request.json()

    if (!workId || !status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      )
    }

    // 更新作品状态
    await prisma.work.update({
      where: { id: workId },
      data: { status }
    })

    // 创建审核记录
    await prisma.review.create({
      data: {
        workId,
        status,
        comment: comment || null,
        reviewer: 'admin'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review failed:', error)
    return NextResponse.json(
      { error: '审核失败' },
      { status: 500 }
    )
  }
}