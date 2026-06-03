import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { title, videoUrl, videoName } = await req.json()

    if (!title || !videoUrl) {
      return NextResponse.json({ error: '缺少标题或视频链接' }, { status: 400 })
    }

    // 生成 4 位数字访问码
    const passcode = Math.floor(1000 + Math.random() * 9000).toString()

    const review = await prisma.videoReview.create({
      data: {
        title: title.trim(),
        videoUrl,
        videoName: videoName || title.trim(),
        passcode,
      },
    })

    return NextResponse.json({
      id: review.id,
      passcode: review.passcode,
      url: `${req.nextUrl.origin}/review/${review.id}`,
    })
  } catch (err: any) {
    console.error('Create review error:', err)
    return NextResponse.json({ error: '创建失败: ' + (err.message || '未知错误') }, { status: 500 })
  }
}
