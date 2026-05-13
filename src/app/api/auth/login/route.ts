// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { setUserCookie } from '@/lib/user-auth'
import { createRateLimiter } from '@/lib/rate-limit'

// 数据库持久化速率限制：15分钟窗口，最多20次
const userLoginRateLimiter = createRateLimiter('user_login', 20, 15 * 60 * 1000)

export async function POST(request: Request) {
  // 速率限制（数据库持久化，serverless 多实例共享有效）
  const req = request as unknown as NextRequest
  const rateCheck = await userLoginRateLimiter.check(req, '')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: '登录尝试过于频繁，请15分钟后再试' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { phone, password } = body

    // 查找用户
    const user = await prisma.user.findUnique({ where: { phone } })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 })
    }

    // 登录成功：清除限速记录
    await userLoginRateLimiter.reset(req, '')

    // 设置签名 session cookie
    await setUserCookie(user.id)

    return NextResponse.json({
      message: '登录成功',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    })
  } catch {
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
