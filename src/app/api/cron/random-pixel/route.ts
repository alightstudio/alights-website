import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COLORS = ['#000000', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#800080', '#808080', '#A52A2A', '#D2B48C', '#00FFFF']

// POST /api/cron/random-pixel — 随机选择一个像素变色（Vercel Cron 每10分钟调用）
export async function POST() {
  try {
    // 验证 Vercel Cron secret（可选）
    const canvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    })
    if (!canvas) {
      return NextResponse.json({ error: '没有活跃画布' }, { status: 404 })
    }

    // 防重：10分钟内已变更过则跳过
    if (canvas.lastRandomChangeAt) {
      const elapsed = Date.now() - new Date(canvas.lastRandomChangeAt).getTime()
      if (elapsed < 9 * 60 * 1000) {
        return NextResponse.json({ message: '10分钟内已变更过，跳过' })
      }
    }

    // 随机选一个已放置的像素
    const pixels = await prisma.pixel.findMany({
      where: { canvasId: canvas.id },
    })
    if (pixels.length === 0) {
      return NextResponse.json({ message: '画布为空，无需变色' })
    }

    const chosen = pixels[Math.floor(Math.random() * pixels.length)]
    const newColor = COLORS.filter(c => c !== chosen.color)[Math.floor(Math.random() * (COLORS.length - 1))]

    await prisma.pixel.update({
      where: { id: chosen.id },
      data: { color: newColor },
    })

    await prisma.canvas.update({
      where: { id: canvas.id },
      data: { lastRandomChangeAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      pixel: { x: chosen.x, y: chosen.y, from: chosen.color, to: newColor },
    })
  } catch (error) {
    console.error('随机变色失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
