// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createSessionToken } from '@/lib/admin-auth'
import { createRateLimiter } from '@/lib/rate-limit'

// 管理员用户名（从环境变量读取）
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || ''

// 数据库持久化速率限制：15分钟窗口，最多10次
const adminLoginRateLimiter = createRateLimiter('admin_login', 10, 15 * 60 * 1000)

/**
 * 恒定时间字符串比较（防 Timing Attack）
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const len = a.length
  let diff = 0
  for (let i = 0; i < len; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function verifyPassword(inputPwd: string): Promise<boolean> {
  // 优先检查数据库存储的密码
  try {
    const stored = await prisma.siteConfig.findUnique({ where: { key: 'admin_credentials' } })
    if (stored) {
      const creds = JSON.parse(stored.value)
      if (creds.password.startsWith('$2')) {
        return bcrypt.compare(inputPwd, creds.password)
      }
      // 明文密码 — 自动升级为 bcrypt
      if (inputPwd === creds.password) {
        const hashed = await bcrypt.hash(inputPwd, 10)
        await prisma.siteConfig.update({
          where: { key: 'admin_credentials' },
          data: { value: JSON.stringify({ ...creds, password: hashed }) },
        })
        return true
      }
      return false
    }
  } catch {
    // 数据库查询失败，回退到环境变量
  }
  // 环境变量密码（仅支持 bcrypt hash 或非空明文）
  const ENV_PASSWORD = process.env.ADMIN_PASSWORD || ''
  if (!ENV_PASSWORD) return false
  if (ENV_PASSWORD.startsWith('$2')) {
    return bcrypt.compare(inputPwd, ENV_PASSWORD)
  }
  return inputPwd === ENV_PASSWORD
}

export async function POST(request: NextRequest) {
  // 速率限制（数据库持久化，serverless 多实例共享有效）
  const rateCheck = await adminLoginRateLimiter.check(request, '')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: '登录尝试过于频繁，请15分钟后再试' },
      { status: 429 }
    )
  }

  try {
    const { username, password } = await request.json()

    // 恒定时间用户名比较（防 timing attack）
    if (!timingSafeCompare(username, ADMIN_USERNAME)) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    // 登录成功：清除限速记录
    await adminLoginRateLimiter.reset(request, '')

    const sessionToken = createSessionToken()
    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch {
    // P0-1 修复：不再输出错误堆栈，防止内部信息泄漏
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
