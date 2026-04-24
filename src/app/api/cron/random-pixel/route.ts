import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COLORS = ['#000000', '#FF0000', '#00FF00', '#FFFF00', '#0000FF', '#800080', '#808080', '#A52A2A', '#D2B48C', '#00FFFF']

// GET /api/cron/random-pixel — Vercel Cron 每10分钟触发
// 在活跃画布的随机空位放置一个新像素
export async function GET() {
  try {
    // 1. 找活跃画布
    const canvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    })
    if (!canvas) {
      return NextResponse.json({ error: '没有活跃画布' }, { status: 404 })
    }

    // 2. 防重：9分钟内已填充过则跳过
    if (canvas.lastRandomChangeAt) {
      const elapsed = Date.now() - new Date(canvas.lastRandomChangeAt).getTime()
      if (elapsed < 9 * 60 * 1000) {
        return NextResponse.json({ message: '跳过（9分钟内已填充过）' })
      }
    }

    const totalCells = canvas.width * canvas.height

    // 3. 获取已放置像素坐标
    const existing = await prisma.pixel.findMany({
      where: { canvasId: canvas.id },
      select: { x: true, y: true },
    })

    if (existing.length >= totalCells) {
      return NextResponse.json({ message: '画布已满，无空位可填充' })
    }

    // 4. 将已占格映射为 Set 快速查重
    const occupied = new Set(existing.map(p => `${p.x},${p.y}`))

    // 5. 随机选一个空位（采样法：随机试直到命中空位）
    let x: number, y: number
    let attempts = 0
    const maxAttempts = totalCells  // 理论上最大尝试次数
    do {
      x = Math.floor(Math.random() * canvas.width)
      y = Math.floor(Math.random() * canvas.height)
      attempts++
      if (attempts > maxAttempts) {
        return NextResponse.json({ message: '无法找到空位（尝试次数超限）' })
      }
    } while (occupied.has(`${x},${y}`))

    // 6. 随机选颜色
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]

    // 7. 写入新像素
    await prisma.pixel.create({
      data: {
        canvasId: canvas.id,
        x,
        y,
        color,
        userId: 'SYSTEM',
      },
    })

    // 8. 更新时间戳
    await prisma.canvas.update({
      where: { id: canvas.id },
      data: { lastRandomChangeAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      pixel: { x, y, color },
      placed: existing.length + 1,
      total: totalCells,
    })
  } catch (error) {
    console.error('随机像素填充失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
