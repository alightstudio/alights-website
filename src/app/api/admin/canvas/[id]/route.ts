import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 删除已结算画布（仅允许删除 ARCHIVED 状态的画布）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // 查找画布
  const canvas = await prisma.canvas.findUnique({ where: { id } })
  if (!canvas) {
    return NextResponse.json({ error: '画布不存在' }, { status: 404 })
  }

  // 仅允许删除已归档/结算的画布，不可删除当前活跃画布
  if (canvas.status === 'ACTIVE') {
    return NextResponse.json({ error: '不能删除当前活跃画布' }, { status: 400 })
  }

  // 删除关联的像素计数
  await prisma.canvasPixelCount.deleteMany({ where: { canvasId: id } })
  // 删除画布（关联的 Pixel 和 CanvasExpansion 自动级联删除）
  await prisma.canvas.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
