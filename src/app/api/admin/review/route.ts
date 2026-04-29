// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!(await verifyAdminSession())) {
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
    // P0-1: hidden
    return NextResponse.json(
      { error: '审核失败' },
      { status: 500 }
    )
  }
}
