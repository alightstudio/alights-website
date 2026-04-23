import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

// 获取当前用户
async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } })
}

// 提交作品
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category, videoUrl, coverUrl, creatorName, creatorPhone } = body

    if (!title || !category) {
      return NextResponse.json({ error: '请填写必填项' }, { status: 400 })
    }

    const work = await prisma.work.create({
      data: {
        title,
        description: description || '',
        category,
        videoUrl: videoUrl || '',
        coverUrl: coverUrl || '',
        creatorName: creatorName || user.name,
        creatorPhone: creatorPhone || user.phone,
        userId: user.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      message: '作品提交成功，等待审核',
      work,
    })
  } catch (error) {
    console.error('提交作品错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 获取用户作品列表
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const works = await prisma.work.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(works)
  } catch (error) {
    console.error('获取作品错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
