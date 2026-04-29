import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { FAMOUS_PAINTINGS, TEMPLATE_SIZE, getSortedPixelsByBrightness } from '@/lib/famous-paintings'

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

// 将模板坐标缩放到画布尺寸
function scaleToCanvas(templateX: number, templateY: number, canvasW: number, canvasH: number): { x: number; y: number } {
  return {
    x: Math.floor(templateX / TEMPLATE_SIZE * canvasW),
    y: Math.floor(templateY / TEMPLATE_SIZE * canvasH),
  }
}

// 禁止 Vercel CDN 缓存此动态端点（cron-job.org 每 60 秒调用，必须每次实时执行）
export const dynamic = 'force-dynamic'

// 混合比例：100% 底稿引导（位置+颜色都来自底稿）
// 纯随机色已移除——原来 30% 纯随机用的硬编码调色板与底稿不搭，破坏画面协调性
const TEMPLATE_RATIO = 1.0

// GET /api/cron/random-pixel — 前端每60秒轮询 + Vercel Cron 双触发
// 公开端点：内置50秒节流（lastRandomChangeAt），无需鉴权
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

export async function GET(req: NextRequest) {
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

    let x: number, y: number, color: string
    const useTemplate = Math.random() < TEMPLATE_RATIO

    if (useTemplate) {
      // 70% 底稿引导：按亮度从高到低选择未被占用的像素
      const template = await getCurrentTemplate()
      const sortedPixels = getSortedPixelsByBrightness(template)
      
      // 关键修复：将模板坐标缩放到实际画布尺寸
      const scaledAvailable = sortedPixels
        .map(p => ({ ...p, ...scaleToCanvas(p.x, p.y, canvas.width, canvas.height) }))
        .filter(p => p.x >= 0 && p.x < canvas.width && p.y >= 0 && p.y < canvas.height && !occupied.has(`${p.x},${p.y}`))
      
      if (scaledAvailable.length > 0) {
        // 从最亮的 30% 像素中随机选一个（避免每次都是同一个最亮像素）
        const topCount = Math.max(1, Math.floor(scaledAvailable.length * 0.3))
        const selected = scaledAvailable[Math.floor(Math.random() * topCount)]
        x = selected.x
        y = selected.y
        color = selected.color
      } else {
        // 底稿像素全部被占，降级到随机位置 + 底稿色
        const template = await getCurrentTemplate()
        const ty = Math.floor(Math.random() * TEMPLATE_SIZE)
        const tx = Math.floor(Math.random() * TEMPLATE_SIZE)
        color = template.pixelData[ty][tx]
        const result = getRandomPixel(canvas.width, canvas.height, occupied)
        if (!result) return NextResponse.json({ message: '无法找到空位' })
        x = result.x
        y = result.y
      }
    } else {
      // 纯随机位置但仍从底稿取色：随机选一个底稿像素的颜色
      const template = await getCurrentTemplate()
      const ty = Math.floor(Math.random() * TEMPLATE_SIZE)
      const tx = Math.floor(Math.random() * TEMPLATE_SIZE)
      color = template.pixelData[ty][tx]
      const result = getRandomPixel(canvas.width, canvas.height, occupied)
      if (!result) return NextResponse.json({ message: '无法找到空位' })
      x = result.x
      y = result.y
    }

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
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
