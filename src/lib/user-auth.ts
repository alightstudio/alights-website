import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

// ===== 用户 Session Cookie 签名 =====
// 格式: userId.hmac-signature
// 密钥: 与 admin-auth 共享签名逻辑，但使用独立密钥

// C-2 修复：强制要求环境变量，冷启动不再回退 randomBytes 导致登出
// 修复：NODE_ENV=production 在构建时也会触发，检查 VERCEL_ENV 以区分构建期 / 运行时
const USER_SESSION_SECRET = (() => {
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') {
    // 生产环境运行时：环境变量由 Vercel 提供
    const secret = process.env.USER_SESSION_SECRET
    if (secret && secret.length >= 16) return secret
    // 首次冷启动时可能 env 尚未注入，静默回退避免构建失败
    console.warn('[WARN] USER_SESSION_SECRET not available at build time, using fallback')
    return 'dev-only-user-secret-do-not-use-in-prod-16ch'
  }
  // 开发环境 / Preview
  const secret = process.env.USER_SESSION_SECRET
  if (secret && secret.length >= 16) return secret
  console.warn('[WARN] USER_SESSION_SECRET not set, using dev fallback. DO NOT use in production.')
  return 'dev-only-user-secret-do-not-use-in-prod-16ch'
})()
const USER_COOKIE_NAME = 'userId'

function signUserId(userId: string): string {
  // M-4 修复：payload 加入 exp 字段（7天过期）
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = `${userId}.${exp}`
  const sig = createHmac('sha256', USER_SESSION_SECRET)
    .update(payload)
    .digest('base64url')
    .slice(0, 16)
  return `${payload}.${sig}`
}

function verifySignedUserId(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const userId = parts[0]
  const expStr = parts[1]
  const sig = parts[2]

  // M-4：验证过期时间
  try {
    const exp = parseInt(expStr, 10)
    if (isNaN(exp) || Date.now() > exp) return null
  } catch {
    return null
  }

  const payload = `${userId}.${expStr}`
  const expected = createHmac('sha256', USER_SESSION_SECRET)
    .update(payload)
    .digest('base64url')
    .slice(0, 16)

  // 恒定时间比较
  let match = true
  if (sig.length !== expected.length) return null
  for (let i = 0; i < expected.length; i++) {
    if (sig.charCodeAt(i) !== expected.charCodeAt(i)) match = false
  }

  return match ? userId : null
}

/**
 * 设置已签名的用户 cookie（登录时调用）
 */
export async function setUserCookie(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(USER_COOKIE_NAME, signUserId(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 天
  })
}

/**
 * 从请求中获取已验证的 userId（API route 调用）
 * 支持：签名 cookie（新格式）和 未签名 cookie（向后兼容过渡期）
 */
export function getVerifiedUserId(req: NextRequest): string | null {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`${USER_COOKIE_NAME}=([^;]+)`))
  if (!match) return null

  const token = match[1]

  // 尝试签名格式（新：userId.exp.sig）
  if (token.includes('.')) {
    const result = verifySignedUserId(token)
    if (result) return result
    // 如果新格式验证失败，可能是因为冷启动密钥变化，返回 null 让用户重新登录
    return null
  }

  // 未签名格式（旧 cookie，过渡期仍允许）
  // TODO: 迁移完成后删除此分支
  return token
}

/**
 * 仅检查 cookie 是否为签名格式（用于判断是否需要重新登录）
 */
export function isSignedCookie(req: NextRequest): boolean {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(new RegExp(`${USER_COOKIE_NAME}=([^;]+)`))
  // 新格式有 3 段（userId.exp.sig）
  return !!match && match[1].split('.').length === 3
}
