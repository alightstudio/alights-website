import { cookies } from 'next/headers'
import { createHmac, randomBytes } from 'crypto'

// ===== 无状态 Session（HMAC 签名，不依赖内存，适配 Vercel 无服务器）=====
// Token 格式: base64url({admin,exp}) . base64url(hmac)
// 所有 Lambda 实例共享同一 SECRET，无需内存 Map

// P1 #8 修复：强制要求设置 ADMIN_JWT_SECRET，未设置时仅在非生产环境可用
const getSecret = (): string => {
  const env = process.env.ADMIN_JWT_SECRET
  if (env && env.length > 0) return env
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') {
    console.error('[FATAL] ADMIN_JWT_SECRET not set in production — all admin auth will fail')
    return '' // 空 secret 导致所有签名不匹配 → 登录失败
  }
  return 'dev-only-admin-secret-do-not-use-in-prod'
}
const SECRET = getSecret()

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7 天

function b64url(str: string): string {
  return Buffer.from(str).toString('base64url')
}

function b64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString()
}

// 生成一个带 HMAC 签名的 session token（无状态）
export function createSessionToken(): string {
  if (!SECRET) throw new Error('ADMIN_JWT_SECRET not configured')
  const payload = JSON.stringify({ 
    admin: true, 
    exp: Date.now() + SESSION_TTL,
    nonce: randomBytes(8).toString('hex')
  })
  const enc = b64url(payload)
  const sig = createHmac('sha256', SECRET).update(enc).digest('base64url')
  return enc + '.' + sig
}

// 验证 session token（纯函数，无副作用）
export function isValidSession(token: string | undefined): boolean {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot < 1) return false
  const enc = token.substring(0, dot)
  const sig = token.substring(dot + 1)

  // 验证签名（HMAC + 恒定时间比较）
  const expected = createHmac('sha256', SECRET).update(enc).digest('base64url')
  if (sig.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  if (diff !== 0) return false

  // 验证过期
  try {
    const payload = JSON.parse(b64urlDecode(enc))
    if (!payload.admin || Date.now() > payload.exp) return false
    return true
  } catch {
    return false
  }
}

// 撤销 session（无状态 JWT 无法真正撤销，登出只需清除 cookie）
export function revokeSession(token: string): void {
  // 无状态：什么都不做，清除 cookie 即可
}

// 从 cookie 读取并验证（主入口）
export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return isValidSession(session?.value)
}
