import { NextRequest } from 'next/server'

/**
 * Cron 鉴权工具模块
 * 
 * 支持两种模式：
 * 1. 独立密钥：每个 cron job 可配置 CRON_SECRET_<JOB_NAME>，如 CRON_SECRET_DAILY_SETTLE
 * 2. 通用密钥回退：使用 CRON_SECRET
 * 
 * M-5 修复：每个端点可独立配置密钥，互不影响
 */

function verifyBearer(req: NextRequest, secret: string): boolean {
  const authHeader = req.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

/**
 * 验证 cron 请求
 * @param req - NextRequest 对象
 * @param jobName - 任务名（用于查找独立密钥 CRON_SECRET_<JOB_NAME>）
 * @returns boolean
 */
export function isCronAuthorized(req: NextRequest, jobName: string): boolean {
  const envKey = `CRON_SECRET_${jobName.toUpperCase().replace(/-/g, '_')}`
  const jobSecret = process.env[envKey]
  const globalSecret = process.env.CRON_SECRET

  const secret = jobSecret || globalSecret

  if (!secret) {
    console.warn(`[WARN] ${envKey} and CRON_SECRET not configured. Cron endpoint "${jobName}" is disabled.`)
    return false
  }

  return verifyBearer(req, secret)
}
