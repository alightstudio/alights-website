import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'

// ===== Session 管理 =====
// 使用内存存储 session token → 真实 secret 的映射
// 生产环境建议替换为 Redis，重启后 session 会失效（可接受）

const sessions = new Map<string, { secret: string; createdAt: number }>()
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000 // 7天
const SESSION_PREFIX = 'sess_'
const MAX_SESSIONS = 100

// 定期清理过期 session
function cleanExpiredSessions() {
  const now = Date.now()
  const toDelete: string[] = []
  sessions.forEach((data, key) => {
    if (now - data.createdAt > SESSION_TTL) {
      toDelete.push(key)
    }
  })
  toDelete.forEach(key => sessions.delete(key))
}

// 生成新 session token
export function createSessionToken(): string {
  cleanExpiredSessions()
  if (sessions.size >= MAX_SESSIONS) {
    // 移除最旧的 session
    let oldestKey: string | null = null
    let oldestTime = Infinity
    sessions.forEach((data, key) => {
      if (data.createdAt < oldestTime) {
        oldestTime = data.createdAt
        oldestKey = key
      }
    })
    if (oldestKey) sessions.delete(oldestKey)
  }
  const token = SESSION_PREFIX + randomBytes(32).toString('hex')
  const secret = randomBytes(16).toString('hex')
  sessions.set(token, { secret, createdAt: Date.now() })
  return token
}

// 验证 session
export function isValidSession(token: string | undefined): boolean {
  if (!token || !token.startsWith(SESSION_PREFIX)) return false
  const data = sessions.get(token)
  if (!data) return false
  if (Date.now() - data.createdAt > SESSION_TTL) {
    sessions.delete(token)
    return false
  }
  return true
}

// 撤销 session（登出）
export function revokeSession(token: string): void {
  sessions.delete(token)
}

// 兼容旧接口：从 cookie 读取并验证
export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return isValidSession(session?.value)
}
