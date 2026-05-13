/**
 * 数据库持久化速率限制工具（解决 serverless 内存不共享问题）
 *
 * 用法：
 *   const rl = createRateLimiter('admin_login', 10, 15 * 60 * 1000)
 *   const check = await rl.check(req, 'ip')          // 验 key-by-IP
 *   const check2 = await rl.check(req, `user:${u}`)  // 验 key-by-IP+用户名
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number // 剩余窗口时间(ms)
}

/**
 * 创建一个速率限制器
 * @param type 限速类型（对应 RateLimitEntry.type）
 * @param maxAttempts 窗口内最大允许次数
 * @param windowMs 窗口时长（毫秒）
 */
export function createRateLimiter(
  type: string,
  maxAttempts: number,
  windowMs: number,
) {
  function getClientIP(req: NextRequest): string {
    const fwd = req.headers.get('x-forwarded-for')
    if (fwd) return fwd.split(',')[0].trim()
    return req.headers.get('x-real-ip') || 'unknown'
  }

  /**
   * 检查并记录一次请求
   * @param req NextRequest 对象
   * @param keySuffix 限速 key 的后缀（如 'ip' 或 'ip:username'）
   */
  async function check(req: NextRequest, keySuffix: string): Promise<RateLimitResult> {
    const ip = getClientIP(req)
    // 构造完整的限速 key：type:ip:suffix
    const fullKey = `${type}:${ip}${keySuffix ? ':' + keySuffix : ''}`
    const now = new Date()
    const expiresAt = new Date(now.getTime() + windowMs)

    try {
      // 查找现有记录
      const record = await prisma.rateLimitEntry.findUnique({
        where: { id: fullKey }, // 用 fullKey 直接做 id，避免重复查询
      })

      if (!record || now > record.expiresAt) {
        // 无记录或已过期：创建新记录
        await prisma.rateLimitEntry.upsert({
          where: { id: fullKey },
          update: { count: 1, expiresAt },
          create: { id: fullKey, key: fullKey, type, count: 1, expiresAt },
        })
        return { allowed: true, remaining: maxAttempts - 1, resetMs: windowMs }
      }

      // 还在窗口期内
      if (record.count >= maxAttempts) {
        const resetMs = record.expiresAt.getTime() - now.getTime()
        return { allowed: false, remaining: 0, resetMs }
      }

      // 计数+1
      await prisma.rateLimitEntry.update({
        where: { id: fullKey },
        data: { count: { increment: 1 } },
      })

      const remaining = maxAttempts - record.count - 1
      const resetMs = record.expiresAt.getTime() - now.getTime()
      return { allowed: true, remaining, resetMs }
    } catch {
      // 数据库故障时：fail open（允许请求），防止网站完全不可用
      console.error('[rate-limit] DB error, allowing request')
      return { allowed: true, remaining: maxAttempts, resetMs: 0 }
    }
  }

  /**
   * 重置指定 key 的限速记录（登录成功后调用）
   */
  async function reset(req: NextRequest, keySuffix: string): Promise<void> {
    const ip = getClientIP(req)
    const fullKey = `${type}:${ip}${keySuffix ? ':' + keySuffix : ''}`
    try {
      await prisma.rateLimitEntry.deleteMany({ where: { key: fullKey } })
    } catch {
      // ignore
    }
  }

  return { check, reset }
}
