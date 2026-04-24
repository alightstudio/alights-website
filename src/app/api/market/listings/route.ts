import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/market/listings — 获取在售画布列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'ACTIVE'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.marketplaceListing.count({ where: { status } }),
    ])

    // 获取画布信息
    const canvasIds = Array.from(new Set(listings.map(l => l.canvasId)))
    const canvases = await prisma.canvas.findMany({
      where: { id: { in: canvasIds } },
      select: { id: true, width: true, height: true, name: true, status: true },
    })
    const canvasMap = new Map(canvases.map(c => [c.id, c]))

    // 获取卖家信息
    const sellerIds = Array.from(new Set(listings.map(l => l.sellerId)))
    const sellers = await prisma.user.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, name: true },
    })
    const sellerMap = new Map(sellers.map(s => [s.id, s.name || '匿名']))

    const enriched = listings.map(l => ({
      ...l,
      canvas: canvasMap.get(l.canvasId) || null,
      sellerName: sellerMap.get(l.sellerId) || '匿名',
    }))

    return NextResponse.json({ listings: enriched, total, page, limit })
  } catch (error) {
    console.error('GET /market/listings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/market/listings — 上架画布
export async function POST(request: NextRequest) {
  try {
    const { userId, canvasId, startPrice, endTime } = await request.json()

    if (!userId || !canvasId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 验证画布存在且已归档
    const canvas = await prisma.canvas.findUnique({ where: { id: canvasId } })
    if (!canvas) {
      return NextResponse.json({ error: '画布不存在' }, { status: 404 })
    }
    if (canvas.status !== 'ARCHIVED') {
      return NextResponse.json({ error: '只能上架已归档画布' }, { status: 400 })
    }

    // 验证用户是画布所有者（周期结束时像素最多者）
    if (canvas.ownerId !== userId) {
      return NextResponse.json({ error: '你不是该画布的所有者' }, { status: 403 })
    }

    // 检查是否已上架
    const existing = await prisma.marketplaceListing.findUnique({
      where: { canvasId },
    })
    if (existing && existing.status === 'ACTIVE') {
      return NextResponse.json({ error: '该画布已在售卖中' }, { status: 400 })
    }

    const price = startPrice || 10
    const endAt = endTime ? new Date(endTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 默认7天

    const listing = await prisma.marketplaceListing.upsert({
      where: { canvasId },
      update: {
        status: 'ACTIVE',
        startPrice: price,
        currentBid: null,
        bidderId: null,
        endTime: endAt,
      },
      create: {
        canvasId,
        sellerId: userId,
        status: 'ACTIVE',
        startPrice: price,
        endTime: endAt,
      },
    })

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('POST /market/listings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
