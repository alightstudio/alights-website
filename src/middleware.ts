import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const redirects: Record<string, string> = {
  '/lab/sonic': '/experiments/sonic/index.html',
  '/lab/touch': '/experiments/touch/index.html',
  '/lab/flow': '/experiments/sinuous/index.html',
  '/lab/tide': '/experiments/magnetic/index.html',
  '/lab/propagation': '/experiments/bacterium/index.html',
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 检查是否有匹配的重定向
  const destination = redirects[pathname]
  if (destination) {
    // 直接重定向到实验页面（全屏）
    return NextResponse.redirect(new URL(destination, request.url), 302)
  }
  
  // 继续处理其他请求
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/lab/sonic',
    '/lab/touch',
    '/lab/flow',
    '/lab/tide',
    '/lab/propagation',
  ],
}
