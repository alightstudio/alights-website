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

    // 获取当前烧毁总量（事务外先读，避免锁竞争）
    const currentBurned = await prisma.siteConfig.findUnique({ where: { key: 'total_burned' } })
    const newTotalBurned = (currentBurned ? parseInt(currentBurned.value) : 0) + Math.floor(price * BURN_RATE)

    // 5% 燃烧，95% 给卖家
    const burnAmount = Math.floor(price * BURN_RATE)
    const sellerGets = price - burnAmount

    // 第一阶段：SELECT FOR UPDATE 锁定买家并检查余额（防止并发双花）
    let buyerPointsSnapshot: number
    try {
      buyerPointsSnapshot = await prisma.$transaction(async (tx) => {
        const [row] = await tx.$queryRaw<{ id: string; points: number }[]>
          `SELECT id, points FROM "User" WHERE id = ${userId} FOR UPDATE`
        if (!row || row.points < price) {
          throw new Error('INSUFFICIENT_POINTS')
        }
        return row.points
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'INSUFFICIENT_POINTS') {
        return NextResponse.json({ error: `积分不足，需要 ${price}，当前 ${buyer.points}` }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    // 第二阶段：执行购买（余额已在第一阶段保证，不会超支）
    const updatedListing = await prisma.$transaction(async (tx) => {
      // 标记已售
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: 'SOLD' },
      })
      // 扣买家积分
      await tx.user.update({
        where: { id: userId },
        data: { points: { decrement: price } },
      })
      // 给卖家打款
      await tx.user.update({
        where: { id: listing.sellerId },
        data: { points: { increment: sellerGets } },
      })
      // 转移画布所有权
      await tx.canvas.update({
        where: { id: listing.canvasId },
        data: { ownerId: userId },
      })
      // 买家支出流水
      await tx.transaction.create({
        data: {
          userId,
          type: 'trade',
          amount: -price,
          balance: buyerPointsSnapshot - price,
          refId: listing.canvasId,
          note: `购买画布，燃烧 ${burnAmount}`,
        },
      })
      // 卖家收入流水
      await tx.transaction.create({
        data: {
          userId: listing.sellerId,
          type: 'trade',
          amount: sellerGets,
          balance: 0,
          refId: listing.canvasId,
          note: `售出画布（扣 ${BURN_RATE * 100}% 燃烧）`,
        },
      })
      // 燃烧流水
      await tx.transaction.create({
        data: {
          userId: 'SYSTEM',
          type: 'burn',
          amount: -burnAmount,
          balance: -newTotalBurned,
          refId: listing.canvasId,
          note: `5% 交易燃烧，来自 ${listing.canvasId}`,
        },
      })
      // 更新全局燃烧计数
      await tx.siteConfig.upsert({
        where: { key: 'total_burned' },
        update: { value: String(newTotalBurned) },
        create: { key: 'total_burned', value: String(newTotalBurned) },
      })

      return tx.marketplaceListing.findUnique({ where: { id: listingId } })
    })

    return NextResponse.json({
      success: true,
      listing: updatedListing,
      burn: { rate: `${BURN_RATE * 100}%`, amount: burnAmount, totalBurned: newTotalBurned },
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