import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTemplateColor, getTemplateColorNearest } from '@/lib/famous-paintings'

// 默认底稿：星月夜
const DEFAULT_TEMPLATE_ID = 'starry-night'

// 从数据库读取当前底稿配置
async function getCurrentTemplate() {
  const { FAMOUS_PAINTINGS } = await import('@/data/painting-pixels')
  try {
    const config = await prisma.siteConfig.findUnique({
      where: { key: 'canvas_template' }
    })
    const templateId = config?.value || DEFAULT_TEMPLATE_ID
    return FAMOUS_PAINTINGS.find(p => p.id === templateId) || FAMOUS_PAINTINGS[0]
  } catch {
    return FAMOUS_PAINTINGS[0]
  }
}

// 禁止 Vercel CDN 缓存
export const dynamic = 'force-dynamic'

// 每次执行填充的像素数量范围
const MIN_PIXELS_PER_RUN = 10
const MAX_PIXELS_PER_RUN = 100

// GET /api/cron/random-pixel — cron-job.org 每 10 分钟调用一次，每次填 10 个像素
// 公开端点：内置 8 分钟节流防止重复调用，无需鉴权

/**
 * 规则：
 * 1. 有空位 → SYSTEM 优先随机填空位（颜色来自底稿，source=TEMPLATE）
 * 2. 80×80 满 → SYSTEM 优先覆盖 source=RANDOM 的像素（用户随机放置的），
 *    不覆盖 source=TEMPLATE 的底稿引导像素
 * 3. SYSTEM 像素计入统计，但不计入画布归属
 */

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }


  // 每次执行随机填充 10~100 个像素
  const pixelsPerRun = Math.floor(Math.random() * (MAX_PIXELS_PER_RUN - MIN_PIXELS_PER_RUN + 1)) + MIN_PIXELS_PER_RUN

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

    // 查询现有像素
    const existing = await prisma.pixel.findMany({
      where: { canvasId: canvas.id },
      select: { x: true, y: true, source: true },
    })
    const occupied = new Set(existing.map(p => `${p.x},${p.y}`))

    // 取色来源：底稿（需在扩展判断前获取，扩展时也用得到）
    const template = await getCurrentTemplate()

    // 检查画布是否已满
    if (existing.length >= totalCells) {
      const MAX_CANVAS_SIZE = 80
      if (canvas.width < MAX_CANVAS_SIZE) {
        // 40×40 满 → 原地扩展为 80×80（不归档，只拆分像素）
        const newSize = canvas.width * 2
        const oldPixels = await prisma.pixel.findMany({ where: { canvasId: canvas.id } })

        // 删除旧像素
        await prisma.pixel.deleteMany({ where: { canvasId: canvas.id } })

        // 更新画布尺寸（保持 ACTIVE）
        await prisma.canvas.update({
          where: { id: canvas.id },
          data: { width: newSize, height: newSize },
        })

        // 每个旧像素拆分为 4 个小方块，使用双线性插值取色
        // 这样每个 2×2 块不是同一颜色，而是平滑渐变，更清晰
        const newPixels = []
        for (const px of oldPixels) {
          // 旧像素 (px.x, px.y) 对应新画布上的 2×2 区域
          const baseX = px.x * 2
          const baseY = px.y * 2
          const newPositions = [
            { x: baseX, y: baseY },
            { x: baseX + 1, y: baseY },
            { x: baseX, y: baseY + 1 },
            { x: baseX + 1, y: baseY + 1 },
          ]
          for (const pos of newPositions) {
            // 对新画布坐标做插值取色（而非直接复制旧颜色）
            const color = getTemplateColor(newSize, pos.x, pos.y, template)
            newPixels.push({
              canvasId: canvas.id,
              userId: px.userId,
              x: pos.x,
              y: pos.y,
              color,
              source: px.source || 'TEMPLATE',
            })
          }
        }

        if (newPixels.length > 0) {
          await prisma.pixel.createMany({ data: newPixels })
        }

        return NextResponse.json({
          message: '画布已扩展',
          canvasId: canvas.id,
          size: newSize + 'x' + newSize,
          pixelCount: newPixels.length,
        })
      }
      // 80×80 已满：不归档，不扩展，让用户继续玩
      // SYSTEM 像素优先覆盖 RANDOM 像素（见下方逻辑）
    }

    // 生成像素数据
    const pixelsToCreate: { x: number; y: number; color: string }[] = []
    const pixelsToDelete: { x: number; y: number }[] = []

    if (existing.length < totalCells) {
      // === 画布未满：优先填空位 ===
      for (let i = 0; i < pixelsPerRun; i++) {
        // 找空位
        let x: number, y: number
        let attempts = 0
        const maxAttempts = totalCells
        do {
          x = Math.floor(Math.random() * canvas.width)
          y = Math.floor(Math.random() * canvas.height)
          attempts++
          if (attempts > maxAttempts) break
        } while (occupied.has(`${x},${y}`))

        if (attempts > maxAttempts) break // 无空位可填

        // 40x40 阶段：最近邻采样 → 像素块风格
        // 80x80 阶段：双线性插值 → 平滑清晰
        const color = canvas.width === 40
          ? getTemplateColorNearest(canvas.width, x, y, template)
          : getTemplateColor(canvas.width, x, y, template)

        pixelsToCreate.push({ x, y, color })
        occupied.add(`${x},${y}`)
      }
    } else {
      // === 画布已满（80×80）：优先覆盖 RANDOM 像素 ===
      const randomPixels = existing.filter(p => p.source === 'RANDOM')
      const templatePixels = existing.filter(p => p.source !== 'RANDOM')

      // 候选覆盖池：优先用 RANDOM 像素
      let candidates: { x: number; y: number }[]

      if (randomPixels.length >= pixelsPerRun) {
        // RANDOM 像素够多，只从里面随机挑
        const shuffled = [...randomPixels].sort(() => Math.random() - 0.5)
        candidates = shuffled.slice(0, pixelsPerRun).map(p => ({ x: p.x, y: p.y }))
      } else {
        // RANDOM 像素不够，用完所有 RANDOM + 从 TEMPLATE 里补
        candidates = randomPixels.map(p => ({ x: p.x, y: p.y }))
        const remaining = pixelsPerRun - candidates.length
        const shuffledTemplate = [...templatePixels].sort(() => Math.random() - 0.5)
        candidates.push(...shuffledTemplate.slice(0, remaining).map(p => ({ x: p.x, y: p.y })))
      }

      for (const pos of candidates) {
        // 40x40 阶段：最近邻采样 → 像素块风格
        // 80x80 阶段：双线性插值 → 平滑清晰
        const color = canvas.width === 40
          ? getTemplateColorNearest(canvas.width, pos.x, pos.y, template)
          : getTemplateColor(canvas.width, pos.x, pos.y, template)

        pixelsToCreate.push({ x: pos.x, y: pos.y, color })
        pixelsToDelete.push({ x: pos.x, y: pos.y })
      }
    }

    if (pixelsToCreate.length === 0) {
      return NextResponse.json({ message: '无法放置像素' })
    }

    const isFull = existing.length >= totalCells

    if (isFull && pixelsToDelete.length > 0) {
      // 画布已满：先删后建（覆盖模式）
      await prisma.$transaction([
        prisma.pixel.deleteMany({
          where: {
            canvasId: canvas.id,
            OR: pixelsToDelete.map(p => ({ x: p.x, y: p.y })),
          },
        }),
        prisma.pixel.createMany({
          data: pixelsToCreate.map(p => ({
            canvasId: canvas.id,
            x: p.x,
            y: p.y,
            color: p.color,
            userId: 'SYSTEM',
            source: 'TEMPLATE', // SYSTEM 放的都标记为底稿引导
          })),
        }),
        prisma.canvas.update({
          where: { id: canvas.id },
          data: { lastRandomChangeAt: new Date() },
        }),
      ])
    } else {
      // 画布未满：正常写入
      await prisma.$transaction([
        prisma.pixel.createMany({
          data: pixelsToCreate.map(p => ({
            canvasId: canvas.id,
            x: p.x,
            y: p.y,
            color: p.color,
            userId: 'SYSTEM',
            source: 'TEMPLATE', // SYSTEM 自动填充的标记为底稿引导
          })),
        }),
        prisma.canvas.update({
          where: { id: canvas.id },
          data: { lastRandomChangeAt: new Date() },
        }),
      ])
    }

    return NextResponse.json({
      success: true,
      pixelsPlaced: pixelsToCreate.length,
      totalPlaced: existing.length + (isFull ? 0 : pixelsToCreate.length),
      totalCells,
      fillRate: isFull
        ? '100%'
        : ((existing.length + pixelsToCreate.length) / totalCells * 100).toFixed(1) + '%',
    })
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
