import { NextRequest, NextResponse } from 'next/server'

// P2 #13: 简单 CSRF 防护 — 验证 Origin/Referer 头匹配站点域名
const ALLOWED_ORIGINS = [
  'https://alights.cn',
  'https://www.alights.cn',
  'http://localhost:3000',
]

export function middleware(request: NextRequest) {
  // 只对修改性方法检查 CSRF
  const method = request.method
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE' && method !== 'PATCH') {
    // 对非修改性请求也加安全头
    const response = NextResponse.next()
    addSecurityHeaders(response)
    return response
  }

  // API 路由中 cron/auth 类路径豁免（它们有自己的鉴权）
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/cron/') || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // 只对 API 路由检查
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // 无 origin/referer 的请求（如 curl、服务端调用）放行
  // 在 serverless 环境中，cron-job.org 等外部服务不发送 origin
  if (!origin && !referer) {
    return NextResponse.next()
  }

  // 检查 origin 或 referer 是否匹配允许的域名
  if (origin) {
    const originHost = origin.toLowerCase()
    if (ALLOWED_ORIGINS.some(allowed => originHost === allowed)) {
      return NextResponse.next()
    }
    // 不匹配则拒绝
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`
      if (ALLOWED_ORIGINS.some(allowed => refererOrigin.toLowerCase() === allowed)) {
        return NextResponse.next()
      }
    } catch {
      // URL 解析失败
    }
    return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 })
  }

  const response = NextResponse.next()
  addSecurityHeaders(response)
  return response
}

// P2 #19: 安全响应头
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

export const config = {
  matcher: '/api/:path*',
}
