import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FAMOUS_PAINTINGS, TEMPLATE_SIZE } from '@/lib/famous-paintings'

// 默认底稿：星月夜
const DEFAULT_TEMPLATE_ID = 'starry-night'

// 从数据库读取当前底稿配置
async function getCurrentTemplate() {
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'canvas_template' }
    })
    const templateId = config?.value || DEFAULT_TEMPLATE_ID
    return FAMOUS_PAINTINGS.find(p => p.id === templateId) || FAMOUS_PAINTINGS[0]
  } catch {
    return FAMOUS_PAINTINGS[0] // 降级到星月夜
  }
}

// 禁止 Vercel CDN 缓存
export const dynamic = 'force-dynamic'

// 每次执行填充的像素数量
const PIXELS_PER_RUN = 10

// GET /api/cron/random-pixel — cron-job.org 每 10 分钟调用一次，每次填 10 个像素
// 公开端点：内置 8 分钟节流防止重复调用，无需鉴权
function getRandomPixel(width: number, height: number, occupied: Set<string>) {
  let x: number, y: number
  let attempts = 0
  const maxAttempts = width * height
  do {
    x = Math.floor(Math.random() * width)
    y = Math.floor(Math.random() * height)
    attempts++
    if (attempts > maxAttempts) return null
  } while (occupied.has(`${x},${y}`))
  return { x, y }
}

export async function GET() {
  try {
    const canvas = await prisma.canvas.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    })
    if (!canvas) {
      return NextResponse.json({ error: '没有活跃画布' }, { status: 404 })
    }

    // 8 分钟节流（cron 每 10 分钟一次，留余量防重复触发）
    if (canvas.lastRandomChangeAt) {
      const elapsed = Date.now() - new Date(canvas.lastRandomChangeAt).getTime()
      if (elapsed < 8 * 60 * 1000) {
        return NextResponse.json({ message: '跳过（8分钟内已填充过）' })
      }
    }

    const totalCells = canvas.width * canvas.height

    const existing = await prisma.pixel.findMany({
      where: { canvasId: canvas.id },
      select: { x: true, y: true },
    })

    const occupied = new Set(existing.map(p => `${p.x},${p.y}`))

    // 取色来源：底稿
    const template = await getCurrentTemplate()

    // 生成 10 个像素数据
    const pixelsToCreate: { x: number; y: number; color: string }[] = []

    for (let i = 0; i < PIXELS_PER_RUN; i++) {
      // 从底稿随机取色
      const ty = Math.floor(Math.random() * TEMPLATE_SIZE)
      const tx = Math.floor(Math.random() * TEMPLATE_SIZE)
      const color = template.pixelData[ty][tx]

      const currentFillCount = existing.length + pixelsToCreate.length

      let x: number, y: number

      if (currentFillCount < totalCells) {
        // 画布未满：找空位
        const result = getRandomPixel(canvas.width, canvas.height, occupied)
        if (!result) break // 空位不足 10 个，填完能填的
        x = result.x
        y = result.y
      } else {
        // 画布已满：随机覆盖已有格子，继续玩
        x = Math.floor(Math.random() * canvas.width)
        y = Math.floor(Math.random() * canvas.height)
      }

      pixelsToCreate.push({ x, y, color })
      occupied.add(`${x},${y}`)
    }

    if (pixelsToCreate.length === 0) {
      return NextResponse.json({
        message: existing.length >= totalCells
          ? '画布已满，无空位可填充'
          : '无法找到空位',
      })
    }

    // 批量写入（事务保证原子性）
    await prisma.$transaction([
      prisma.pixel.createMany({
        data: pixelsToCreate.map(p => ({
          canvasId: canvas.id,
          x: p.x,
          y: p.y,
          color: p.color,
          userId: 'SYSTEM',
        })),
      }),
      prisma.canvas.update({
        where: { id: canvas.id },
        data: { lastRandomChangeAt: new Date() },
      }),
    ])

    return NextResponse.json({
      success: true,
      pixelsPlaced: pixelsToCreate.length,
      totalPlaced: existing.length + pixelsToCreate.length,
      totalCells,
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
