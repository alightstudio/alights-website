import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'


// GET /api/user/profile - 获取用户信息
export async function GET(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, phone: true, email: true,
      company: true, bio: true, avatar: true, points: true,
      referralCode: true, createdAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  // 如果没有邀请码则自动生成
  if (!user.referralCode) {
    // P1-2 修复：使用 crypto.randomBytes 替代 Math.random()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const bytes = randomBytes(6)
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length]
    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    })
    user.referralCode = code
  }

  // 获取今日已获得积分
  const today = new Date().toISOString().split('T')[0]
  const todayPoints = await prisma.pointsRecord.aggregate({
    where: { userId, date: today },
    _sum: { points: true },
  })

  return NextResponse.json({
    ...user,
    referralUrl: `https://alights.cn/register?ref=${user.referralCode}`,
    todayPoints: todayPoints._sum.points || 0,
  })
}

// PUT /api/user/profile - 更新用户信息
export async function PUT(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const { name, email, company, bio, avatar } = body

  const updateData: Record<string, any> = {}
  if (name?.trim()) updateData.name = name.trim()
  if (email !== undefined) updateData.email = email?.trim() || null
  if (company !== undefined) updateData.company = company?.trim() || null
  if (bio !== undefined) updateData.bio = bio?.trim() || null
  if (avatar !== undefined) updateData.avatar = avatar?.trim() || null

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, phone: true, email: true, company: true, bio: true, avatar: true },
  })

  return NextResponse.json(user)
}

// PATCH /api/user/profile - 修改密码
export async function PATCH(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) return NextResponse.json({ error: '当前密码错误' }, { status: 403 })

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  })

  return NextResponse.json({ success: true, message: '密码已修改' })
}
