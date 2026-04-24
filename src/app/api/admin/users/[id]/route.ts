import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/users/[id] — 更新用户信息和积分
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { name, phone, email, company, bio, points } = body

    const data: any = {}
    if (name !== undefined) data.name = name
    if (phone !== undefined) data.phone = phone
    if (email !== undefined) data.email = email
    if (company !== undefined) data.company = company
    if (bio !== undefined) data.bio = bio
    if (points !== undefined) data.points = typeof points === 'number' ? points : parseInt(points)

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true, name: true, phone: true, email: true,
        company: true, bio: true, points: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('更新用户失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

// GET /api/admin/users/[id] — 获取用户详细信息
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, phone: true, email: true,
        company: true, bio: true, avatar: true, points: true,
        createdAt: true, updatedAt: true,
        _count: { select: { works: true, posts: true, comments: true } },
      },
    })
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch (error) {
    console.error('获取用户失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
