import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const redirects: Record<string, string> = {
  '/lab/sonic': '/experiments/sinuous/index.html',
  '/lab/touch': '/experiments/touch/index.html',
  '/lab/flow': '/experiments/sinuous/index.html',
  '/lab/tide': '/experiments/magnetic/index.html',
  '/lab/propagation': '/experiments/bacterium/index.html',
}

const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || ''
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
    const [sigHex, payloadHex] = cookieSession.split('.')
    if (!sigHex || !payloadHex) return false

    const payload = JSON.parse(Buffer.from(payloadHex, 'base64url').toString())
    if (!payload || !payload.exp || Date.now() > payload.exp) return false

    // 验证 HMAC 签名（使用 Web Crypto API，与 admin-auth.ts 保持一致）
    const encoder = new TextEncoder()
    const keyData = encoder.encode(ADMIN_SECRET)
    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign']
    )
    const sigBytes = Buffer.from(sigHex, 'hex')
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadHex))
    const expectedSigHex = Buffer.from(expectedSig).toString('hex')

    // 恒定时间比较（防止 timing attack）
    if (sigBytes.length !== expectedSigHex.length) return false
    let diff = 0
    for (let i = 0; i < sigBytes.length; i++) {
      diff |= sigBytes[i] ^ expectedSigHex.charCodeAt(i)
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
