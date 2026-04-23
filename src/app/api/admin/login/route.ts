import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// 管理员账号从环境变量读取
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// 简单的频率限制（内存存储，生产环境建议用 Redis）
const loginAttempts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15分钟
const MAX_ATTEMPTS = 10 // 最多10次

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)

  // 如果记录不存在或已过期，创建新记录
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  // 如果超过限制
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  // 增加计数
  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const rateCheck = checkRateLimit(ip)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: '登录尝试过于频繁，请15分钟后再试' },
        { status: 429 }
      )
    }

    const { username, password } = await request.json()

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      )
    }

    // 登录成功，清除频率限制记录
    loginAttempts.delete(ip)

    // 设置登录 cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: '/'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    )
  }
}
