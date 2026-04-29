import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { getVerifiedUserId } from '@/lib/user-auth'
import { prisma } from '@/lib/prisma'



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

    // 统计各用户像素数（用于显示领导者，不统计 SYSTEM 自动填充）
    const userCounts: Record<string, number> = {}
    for (const p of pixels) {
      if (p.userId === 'SYSTEM') continue
      userCounts[p.userId] = (userCounts[p.userId] || 0) + 1
    }
    const leader = Object.entries(userCounts).sort((a, b) => b[1] - a[1])[0]

    // 计算距离下次 00:00 的剩余时间
    const isActive = canvas.status === 'ACTIVE'
    const now = new Date()
    const nextMidnight = new Date(now)
    nextMidnight.setHours(24, 0, 0, 0)
    const remaining = isActive ? Math.max(0, nextMidnight.getTime() - now.getTime()) : 0
    const totalPixels = canvas.width * canvas.height
    const userPixels = pixels.filter(p => p.userId !== 'SYSTEM').length
    const placedPixels = pixels.length // 包含 SYSTEM，用于填充率
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
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}