import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

// 获取已通过审核的作品（公开）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: any = { status: 'APPROVED' }
    if (category && category !== '全部') {
      where.category = category
    }

    const works = await prisma.work.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(works)
  } catch (error) {
    console.error('获取作品错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
