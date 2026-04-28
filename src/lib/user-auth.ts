import { cookies } from 'next/headers'
import { createHmac, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'

// ===== 用户 Session Cookie 签名 =====
// 格式: userId.hmac-signature
// 密钥: 与 admin-auth 共享签名逻辑，但使用独立密钥

const USER_SESSION_SECRET = process.env.USER_SESSION_SECRET || randomBytes(32).toString('hex')
const USER_COOKIE_NAME = 'userId'

function signUserId(userId: string): string {
  const sig = createHmac('sha256', USER_SESSION_SECRET)
    .update(userId)
    .digest('base64url')
    .slice(0, 16) // 16 字符签名足够防伪造
  return `${userId}.${sig}`
}

function verifySignedUserId(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null

  const userId = token.substring(0, dot)
  const sig = token.substring(dot + 1)

  const expected = createHmac('sha256', USER_SESSION_SECRET)
    .update(userId)
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

  // 尝试签名格式（新）
  if (token.includes('.')) {
    return verifySignedUserId(token)
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
  return !!match && match[1].includes('.')
}
