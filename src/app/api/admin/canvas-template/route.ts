import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getPaintingsList } from '@/lib/famous-paintings'

// 获取当前底稿配置 + 画作列表
export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 从数据库读取，或使用默认值
  const config = await prisma.siteConfig.findUnique({
    where: { key: 'canvas_template' }
  })

  return NextResponse.json({
    current: config?.value || 'starry-night',
    updatedAt: config?.updatedAt || null,
    paintings: getPaintingsList()
  })
}

// 更新底稿配置
export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { templateId } = await req.json()

  if (!templateId) {
    return NextResponse.json({ error: 'templateId required' }, { status: 400 })
  }

  await prisma.siteConfig.upsert({
    where: { key: 'canvas_template' },
    update: { value: templateId },
    create: { key: 'canvas_template', value: templateId }
  })

  return NextResponse.json({ success: true, templateId })
}

export const dynamic = 'force-dynamic'
