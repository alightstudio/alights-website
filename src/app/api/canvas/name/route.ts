// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'

// POST /api/canvas/name - 为已归档画布命名（仅所有者）
export async function POST(req: NextRequest) {
  try {
    const userId = getVerifiedUserId(req)
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { canvasId, name } = await req.json()
    if (!canvasId || !name || name.length > 50) {
      return NextResponse.json({ error: '参数无效（名称最多50字）' }, { status: 400 })
    }

    // 查找画布
    const canvas = await prisma.canvas.findUnique({ where: { id: canvasId } })
    if (!canvas) {
      return NextResponse.json({ error: '画布不存在' }, { status: 404 })
    }
    if (canvas.status !== 'ARCHIVED') {
      return NextResponse.json({ error: '只能为已归档画布命名' }, { status: 400 })
    }
    if (canvas.ownerId !== userId) {
      return NextResponse.json({ error: '你不是此画布的所有者' }, { status: 403 })
    }

    await prisma.canvas.update({
      where: { id: canvasId },
      data: { name },
    })

    return NextResponse.json({ success: true, name })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
