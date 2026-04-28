import { NextRequest, NextResponse } from 'next/server'

// P2 #13: 简单 CSRF 防护 — 验证 Origin/Referer 头匹配站点域名
const ALLOWED_ORIGINS = [
  'https://alights.cn',
  'https://www.alights.cn',
  'http://localhost:3000',
]

export function middleware(request: NextRequest) {
  const method = request.method
  const pathname = request.nextUrl.pathname

  // 所有响应都加安全头
  const addHeaders = (res: NextResponse) => { addSecurityHeaders(res); return res }

  // 非修改性方法：仅安全头
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE' && method !== 'PATCH') {
    return addHeaders(NextResponse.next())
  }

  // API 路由中 cron/auth 类路径豁免（它们有自己的鉴权），但仍加安全头
  if (pathname.startsWith('/api/cron/') || pathname.startsWith('/api/auth/')) {
    return addHeaders(NextResponse.next())
  }

  // 非 API 路由的 POST（如表单提交）：仅安全头，不做 CSRF 检查
  if (!pathname.startsWith('/api/')) {
    return addHeaders(NextResponse.next())
  }

  // 以下仅对 API 的修改性请求做 CSRF 验证
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // C-1 修复：无 origin/referer 的 POST/PUT/DELETE/PATCH 请求拒绝
  if (!origin && !referer) {
    return addHeaders(NextResponse.json({ error: 'CSRF check failed: missing Origin/Referer' }, { status: 403 }))
  }

  // 检查 origin 或 referer 是否匹配允许的域名
  if (origin) {
    const originHost = origin.toLowerCase()
    if (ALLOWED_ORIGINS.some(allowed => originHost === allowed)) {
      return addHeaders(NextResponse.next())
    }
    return addHeaders(NextResponse.json({ error: 'CSRF check failed' }, { status: 403 }))
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`
      if (ALLOWED_ORIGINS.some(allowed => refererOrigin.toLowerCase() === allowed)) {
        return addHeaders(NextResponse.next())
      }
    } catch {
      // URL 解析失败
    }
    return addHeaders(NextResponse.json({ error: 'CSRF check failed' }, { status: 403 }))
  }

  return addHeaders(NextResponse.next())
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
  // H-6 / L-1 修复：所有路由都经过 middleware，统一安全头
  matcher: [
    '/((?!_next/static|_next/image|favicon\.ico|public/).*)',
  ],
}
