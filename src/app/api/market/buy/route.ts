import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

const BURN_RATE = 0.05 // 5% 交易燃烧

export const dynamic = 'force-dynamic'

// POST /api/market/buy — 购买画布（含 5% 交易燃烧）
export async function POST(request: NextRequest) {
  try {
    const cookieUserId = getVerifiedUserId(request)
    if (!cookieUserId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { listingId } = await request.json()
    if (!listingId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }
    const userId = cookieUserId

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    })
    if (!listing) return NextResponse.json({ error: '上架不存在' }, { status: 404 })
    if (listing.status !== 'ACTIVE') return NextResponse.json({ error: '该画布已售出或已取消' }, { status: 400 })
    if (listing.sellerId === userId) return NextResponse.json({ error: '不能购买自己的画布' }, { status: 400 })

    if (new Date() > listing.endTime) {
      await prisma.marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'CANCELLED' },
      })
      return NextResponse.json({ error: '竞拍已过期' }, { status: 400 })
    }

    const buyer = await prisma.user.findUnique({ where: { id: userId } })
    if (!buyer) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const price = listing.currentBid || listing.startPrice
    if (buyer.points < price) {
      return NextResponse.json({ error: `积分不足，需要 ${price} 积分，当前 ${buyer.points}` }, { status: 400 })
    }

    // 5% 燃烧，95% 给卖家
    const burnAmount = Math.floor(price * BURN_RATE)
    const sellerGets = price - burnAmount

    // 获取当前烧毁总量
    const currentBurned = await prisma.siteConfig.findUnique({ where: { key: 'total_burned' } })
    const newTotalBurned = (currentBurned ? parseInt(currentBurned.value) : 0) + burnAmount

    const [updatedListing] = await prisma.$transaction([
      prisma.marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'SOLD' },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { points: { decrement: price } },
      }),
      prisma.user.update({
        where: { id: listing.sellerId },
        data: { points: { increment: sellerGets } },
      }),
      prisma.canvas.update({
        where: { id: listing.canvasId },
        data: { ownerId: userId },
      }),
      // 买家支出记录
      prisma.transaction.create({
        data: {
          userId,
          type: 'trade',
          amount: -price,
          balance: Math.max(0, buyer.points - price),
          refId: listing.canvasId,
          note: `购买画布，燃烧 ${burnAmount}`,
        },
      }),
      // 卖家收入记录
      prisma.transaction.create({
        data: {
          userId: listing.sellerId,
          type: 'trade',
          amount: sellerGets,
          balance: 0,
          refId: listing.canvasId,
          note: `售出画布（扣 ${BURN_RATE*100}% 燃烧）`,
        },
      }),
      // 燃烧记录
      prisma.transaction.create({
        data: {
          userId: 'SYSTEM',
          type: 'burn',
          amount: -burnAmount,
          balance: -newTotalBurned,
          refId: listing.canvasId,
          note: `5% 交易燃烧，来自 ${listing.canvasId}`,
        },
      }),
      // 更新全局燃烧计数
      prisma.siteConfig.upsert({
        where: { key: 'total_burned' },
        update: { value: String(newTotalBurned) },
        create: { key: 'total_burned', value: String(newTotalBurned) },
      }),
    ])

    return NextResponse.json({
      success: true,
      listing: updatedListing,
      burn: { rate: `${BURN_RATE*100}%`, amount: burnAmount, totalBurned: newTotalBurned },
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/market/buy — 取消上架
export async function DELETE(request: NextRequest) {
  try {
    const cookieUserId = getVerifiedUserId(request)
    if (!cookieUserId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { listingId } = await request.json()

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    })
    if (!listing) return NextResponse.json({ error: '上架不存在' }, { status: 404 })
    if (listing.sellerId !== cookieUserId) return NextResponse.json({ error: '只能取消自己的上架' }, { status: 403 })

    await prisma.marketplaceListing.update({
      where: { id: listingId },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
