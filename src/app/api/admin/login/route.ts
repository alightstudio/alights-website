import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// 管理员用户名从环境变量读取
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ENV_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// 简单的频率限制（内存存储，生产环境建议用 Redis）
const loginAttempts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15分钟
const MAX_ATTEMPTS = 10 // 最多10次

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }
  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

async function verifyPassword(inputPwd: string): Promise<boolean> {
  // 优先检查数据库存储的密码
  try {
    const stored = await prisma.siteConfig.findUnique({ where: { key: 'admin_credentials' } })
    if (stored) {
      const creds = JSON.parse(stored.value)
      if (creds.password.startsWith('$2')) {
        // bcrypt hash
        return bcrypt.compare(inputPwd, creds.password)
      }
      // 明文存储（旧格式）
      return inputPwd === creds.password
    }
  } catch {
    // 数据库查询失败，回退到环境变量
  }
  return inputPwd === ENV_PASSWORD
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

    if (username !== ADMIN_USERNAME) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    // 登录成功
    loginAttempts.delete(ip)
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('登录失败:', error)
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
