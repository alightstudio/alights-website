import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'


// GET /api/forum/categories — list all
export async function GET() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { posts: true } } },
  })
  return NextResponse.json(categories)
}

// POST /api/forum/categories — create (admin only)
export async function POST(req: NextRequest) {
  // H-1 修复：仅管理员可创建分类
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const body = await req.json()
  const { name, nameEn, icon, description, sortOrder } = body

  const category = await prisma.forumCategory.create({
    data: { name, nameEn, icon, description, sortOrder: sortOrder ?? 0 },
  })
  return NextResponse.json(category, { status: 201 })
}
