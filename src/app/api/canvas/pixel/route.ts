import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'


// 合法 hex 颜色正则
const COLOR_RE = /^#[0-9a-fA-F]{6}$/

// 检查画布是否已满，若满则触发扩张
async function checkAndExpand(canvasId: string) {
  // 用事务保证原子性：先标记 ARCHIVED，只有第一个能成功
  await prisma.$transaction(async (tx) => {
    const canvas = await tx.canvas.findUnique({ where: { id: canvasId } })
    if (!canvas || canvas.status !== 'ACTIVE') return

    const totalPixels = canvas.width * canvas.height
    const placedPixels = await tx.pixel.count({ where: { canvasId } })
    if (placedPixels < totalPixels) return

    // 原子归档：只有 status=ACTIVE 的才能被更新
    const archived = await tx.canvas.updateMany({
      where: { id: canvasId, status: 'ACTIVE' },
      data: { status: 'ARCHIVED', endTime: new Date() },
    })
    if (archived.count === 0) return // 已被其他事务归档

    const newSize = Math.min(canvas.width * 2, 480)

    // 创建新画布
    const newCanvas = await tx.canvas.create({
      data: { width: newSize, height: newSize, status: 'ACTIVE' },
    })

    // 记录扩张
    await tx.canvasExpansion.create({
      data: {
        oldCanvasId: canvasId,
        canvasId: newCanvas.id,
        oldSize: canvas.width,
        newSize,
      },
    })

    // 映射旧像素到 2×2
    const oldPixels = await tx.pixel.findMany({ where: { canvasId } })
    const scale = newSize / canvas.width
    if (scale === 2) {
      const batch: any[] = []
      for (const p of oldPixels) {
        for (let dx = 0; dx < 2; dx++) {
          for (let dy = 0; dy < 2; dy++) {
            batch.push({
              canvasId: newCanvas.id,
              x: p.x * 2 + dx,
              y: p.y * 2 + dy,
              color: p.color,
              userId: p.userId,
            })
          }
        }
      }
      // 批量插入
      if (batch.length > 0) {
        await tx.pixel.createMany({ data: batch, skipDuplicates: true })
      }
    }
  })
}

// POST /api/canvas/pixel — 放置像素
export async function POST(req: NextRequest) {
  try {
    const userId = getVerifiedUserId(req)
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await req.json()
    const { canvasId, x, y, color } = body

    // 参数校验
    if (typeof x !== 'number' || typeof y !== 'number' || !color) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }

    // 验证颜色（六位 hex）
    if (!COLOR_RE.test(color)) {
      return NextResponse.json({ error: '颜色格式无效' }, { status: 400 })
    }

    // 获取当前画布
    const canvas = await prisma.canvas.findUnique({ where: { id: canvasId } })
    if (!canvas || canvas.status !== 'ACTIVE') {
      return NextResponse.json({ error: '画布不可用' }, { status: 400 })
    }

    // 验证坐标
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
      return NextResponse.json({ error: '坐标超出画布范围' }, { status: 400 })
    }

    // P1 #6 修复：原子操作 — 积分扣除与像素放置在同一事务中
    const result = await prisma.$transaction(async (tx) => {
      // 检查积分（1像素 = 1积分）
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user || user.points < 1) {
        throw new Error('INSUFFICIENT_POINTS')
      }

      // 扣除积分
      const updated = await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: 1 } },
      })

      // 记录交易
      await tx.transaction.create({
        data: {
          userId,
          type: 'pixel_place',
          amount: -1,
          balance: updated.points,
          refId: canvasId,
          note: `放置像素 (${x},${y})`,
        },
      })

      // 放置/更新像素
      const pixel = await tx.pixel.upsert({
        where: { canvasId_x_y: { canvasId, x, y } },
        update: { color, userId, placedAt: new Date() },
        create: { canvasId, x, y, color, userId },
      })

      return { pixel, pointsRemaining: updated.points }
    })

    const { pixel, pointsRemaining } = result

    // 异步检查是否满
    checkAndExpand(canvasId).catch(e => console.error('扩张检查失败:', e))

    return NextResponse.json({
      success: true,
      pixel: { x: pixel.x, y: pixel.y, color: pixel.color },
      pointsRemaining,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_POINTS') {
      return NextResponse.json({ error: '积分不足' }, { status: 402 })
    }
    console.error('放置像素失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}