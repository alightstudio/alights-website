import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // 验证管理员 session
    const cookieStore = await cookies()
    const session = cookieStore.get('admin_session')?.value
    if (session !== 'authenticated') {
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
    const envPassword = process.env.ADMIN_PASSWORD || 'admin123'

    if (stored) {
      // 数据库中有存储的凭据 - 验证当前密码
      const creds = JSON.parse(stored.value)
      const valid = creds.password === currentPassword // 直接比较（旧版）
      if (creds.password.startsWith('$2')) {
        // bcrypt hash
        const validBcrypt = await bcrypt.compare(currentPassword, creds.password)
        if (!validBcrypt) {
          return NextResponse.json({ error: '当前密码错误' }, { status: 403 })
        }
      } else if (!valid) {
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
      if (currentPassword !== envPassword) {
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
    console.error('修改密码失败:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
