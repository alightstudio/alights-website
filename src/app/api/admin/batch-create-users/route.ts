import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { verifyAdminSession } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// POST /api/admin/batch-create-users — 批量建号（管理员）
export async function POST(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { users } = body as { users: { name: string; phone: string; password: string; bio?: string }[] }

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: '请提供用户列表' }, { status: 400 })
    }

    const results: { name: string; phone: string; success: boolean; error?: string }[] = []

    for (const u of users) {
      try {
        // 检查手机号是否已存在
        const existing = await prisma.user.findUnique({ where: { phone: u.phone } })
        if (existing) {
          results.push({ name: u.name, phone: u.phone, success: false, error: '手机号已存在' })
          continue
        }

        const hashedPassword = await bcrypt.hash(u.password, 10)

        // 生成邀请码
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const bytes = randomBytes(6)
        let code = ''
        for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length]

        await prisma.user.create({
          data: {
            name: u.name,
            phone: u.phone,
            password: hashedPassword,
            bio: u.bio || '',
            referralCode: code,
          },
        })

        results.push({ name: u.name, phone: u.phone, success: true })
      } catch (err) {
        results.push({ name: u.name, phone: u.phone, success: false, error: String(err) })
      }
    }

    return NextResponse.json({
      message: `创建完成: ${results.filter(r => r.success).length}/${results.length} 成功`,
      results,
    })
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
