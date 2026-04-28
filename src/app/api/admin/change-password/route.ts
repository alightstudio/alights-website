import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员 session
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
    }

    // 从数据库读取管理员凭据
    const stored = await prisma.siteConfig.findUnique({ where: { key: 'admin_credentials' } })
    // C-3 修复：移除默认密码回退
    const envPassword = process.env.ADMIN_PASSWORD || ''

    if (stored) {
      const creds = JSON.parse(stored.value)
      let passwordValid = false
      if (creds.password.startsWith('$2')) {
        passwordValid = await bcrypt.compare(currentPassword, creds.password)
      } else {
        passwordValid = currentPassword === creds.password
      }
      if (!passwordValid) {
        return NextResponse.json({ error: '当前密码错误' }, { status: 403 })
      }

      // 更新密码
      const hashed = await bcrypt.hash(newPassword, 10)
      await prisma.siteConfig.upsert({
        where: { key: 'admin_credentials' },
        update: { value: JSON.stringify({ password: hashed, updatedAt: new Date().toISOString() }) },
        create: { key: 'admin_credentials', value: JSON.stringify({ password: hashed, updatedAt: new Date().toISOString() }) },
      })
    } else {
      // 首次设置 - 验证环境变量密码
      if (!envPassword || currentPassword !== envPassword) {
        return NextResponse.json({ error: '当前密码错误' }, { status: 403 })
      }
      // 迁移到数据库存储
      const hashed = await bcrypt.hash(newPassword, 10)
      await prisma.siteConfig.create({
        data: { key: 'admin_credentials', value: JSON.stringify({ password: hashed, updatedAt: new Date().toISOString() }) },
      })
    }

    return NextResponse.json({ success: true, message: '密码已修改' })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
