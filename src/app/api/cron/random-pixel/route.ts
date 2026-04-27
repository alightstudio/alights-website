import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Vercel Cron 鉴权
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const querySecret = req.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production'
  }
  return authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret
}

const COLORS = ['#0A0A0A','#1A1A1A','#333333','#666666','#999999','#C9A962','#A0895C','#8B7355','#8B2500','#722F37','#2F4F4F','#4A766E','#1B3A5C','#1C3A5C','#4A3B5C','#A0895C','#C3A86C','#F5F0E0','#CC3333','#CC7733','#CCAA33','#33AA55','#33AAAA','#3366CC','#CC6699','#8844AA']

// GET /api/cron/random-pixel — Vercel Cron 每分钟触发
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const canvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    })
    if (!canvas) {
      return NextResponse.json({ error: '没有活跃画布' }, { status: 404 })
    }

    if (canvas.lastRandomChangeAt) {
      const elapsed = Date.now() - new Date(canvas.lastRandomChangeAt).getTime()
      if (elapsed < 50 * 1000) {
        return NextResponse.json({ message: '跳过（50秒内已填充过）' })
      }
    }

    const totalCells = canvas.width * canvas.height

    const existing = await prisma.pixel.findMany({
      where: { canvasId: canvas.id },
      select: { x: true, y: true },
    })

    if (existing.length >= totalCells) {
      return NextResponse.json({ message: '画布已满，无空位可填充' })
    }

    const occupied = new Set(existing.map(p => `${p.x},${p.y}`))

    let x: number, y: number
    let attempts = 0
    const maxAttempts = totalCells
    do {
      x = Math.floor(Math.random() * canvas.width)
      y = Math.floor(Math.random() * canvas.height)
      attempts++
      if (attempts > maxAttempts) {
        return NextResponse.json({ message: '无法找到空位（尝试次数超限）' })
      }
    } while (occupied.has(`${x},${y}`))

    const color = COLORS[Math.floor(Math.random() * COLORS.length)]

    await prisma.pixel.create({
      data: {
        canvasId: canvas.id,
        x,
        y,
        color,
        userId: 'SYSTEM',
      },
    })

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
