import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getUserId(req: NextRequest): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/userId=([^;]+)/)
  return match ? match[1] : null
}

// GET /api/canvas/current — 获取当前活跃画布 + 所有像素
// GET /api/canvas/current?id=xxx — 获取指定画布（含已归档）
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')

    let canvas
    if (id) {
      canvas = await prisma.canvas.findUnique({ where: { id } })
    } else {
      canvas = await prisma.canvas.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { startTime: 'desc' },
      })
    }

    if (!canvas) {
      return NextResponse.json({ error: '没有活跃画布' }, { status: 404 })
    }

    const pixels = await prisma.pixel.findMany({
      where: { canvasId: canvas.id },
      select: { x: true, y: true, color: true, userId: true, placedAt: true },
    })

    // 统计各用户像素数（用于显示领导者）
    const userCounts: Record<string, number> = {}
    for (const p of pixels) {
      userCounts[p.userId] = (userCounts[p.userId] || 0) + 1
    }
    const leader = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]

    // 计算剩余时间和填充率（归档画布不显示倒计时）
    const isActive = canvas.status === 'ACTIVE'
    const elapsed = isActive ? Date.now() - new Date(canvas.startTime).getTime() : 0
    const remaining = isActive ? Math.max(0, 24 * 60 * 60 * 1000 - elapsed) : 0
    const totalPixels = canvas.width * canvas.height
    const placedPixels = pixels.length
    const fillRate = Math.round((placedPixels / totalPixels) * 100)

    return NextResponse.json({
      canvas: {
        id: canvas.id,
        width: canvas.width,
        height: canvas.height,
        name: canvas.name,
        status: canvas.status,
        startTime: canvas.startTime,
        endTime: canvas.endTime,
        remainingMs: remaining,
        fillRate,
        totalPixels,
        placedPixels,
        leader: leader ? { userId: leader[0], count: leader[1] } : null,
        ownerId: canvas.ownerId,
        lastRandomChangeAt: canvas.lastRandomChangeAt,
        pixelCount: pixels.length,
      },
      pixels: pixels.map(p => ({
        x: p.x, y: p.y, color: p.color, userId: p.userId, placedAt: p.placedAt,
      })),
    })
  } catch (error) {
    console.error('获取画布失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}