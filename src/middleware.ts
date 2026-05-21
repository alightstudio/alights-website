import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const redirects: Record<string, string> = {
  '/lab/sonic': '/experiments/sinuous/index.html',
  '/lab/touch': '/experiments/touch/index.html',
  '/lab/flow': '/experiments/sinuous/index.html',
  '/lab/tide': '/experiments/magnetic/index.html',
  '/lab/propagation': '/experiments/bacterium/index.html',
}

const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || ''
const SESSION_EXPIRE = 7 * 24 * 60 * 60 * 1000 // 7天

/**
 * Edge Runtime 兼容的 admin session 验证（直接使用 Web Crypto API）
 * 不再依赖 dynamic import，避免 Edge 环境下模块加载失败导致验证失效
 */
async function verifyAdminEdge(req: NextRequest): Promise<boolean> {
  if (!ADMIN_SECRET) return false

  const cookieSession = req.cookies.get('admin_session')?.value
  if (!cookieSession) return false

  try {
    // token 格式: base64url(payload).base64url(hmac)  与 admin-auth.ts 一致
    const dot = cookieSession.lastIndexOf('.')
    if (dot < 1) return false
    const payloadB64 = cookieSession.substring(0, dot)
    const sigB64 = cookieSession.substring(dot + 1)

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    if (!payload || !payload.exp || Date.now() > payload.exp) return false

    // 验证 HMAC 签名（base64url 编码，与 admin-auth.ts createSessionToken 一致）
    const encoder = new TextEncoder()
    const keyData = encoder.encode(ADMIN_SECRET)
    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
    const expectedSigB64 = Buffer.from(expectedSig).toString('base64url')

    // 恒定时间比较（防止 timing attack）
    if (sigB64.length !== expectedSigB64.length) return false
    let diff = 0
    for (let i = 0; i < sigB64.length; i++) {
      diff |= sigB64.charCodeAt(i) ^ expectedSigB64.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin 路径需 session 校验（Edge Runtime 兼容实现）
  // ⚠️ 排除 /admin/login 路径（登录页无需认证）
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const isAdmin = await verifyAdminEdge(request)
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/admin/login', request.url), 302)
    }
    return NextResponse.next()
  }

  // 实验页面重定向
  const destination = redirects[pathname]
  if (destination) {
    return NextResponse.redirect(new URL(destination, request.url), 302)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/lab/sonic',
    '/lab/touch',
    '/lab/flow',
    '/lab/tide',
    '/lab/propagation',
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).)*/',
  ],
}
