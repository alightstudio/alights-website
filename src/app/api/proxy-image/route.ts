import { NextRequest, NextResponse } from 'next/server'

// 允许代理的域名白名单
const ALLOWED_HOSTS = [
  'us-xpc5.xpccdn.com',
  'oss-xpc0.xpccdn.com',
  'img.xpccdn.com',
]

// 缓存 24 小时
const CACHE_MAX_AGE = 86400

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // 安全校验：只允许白名单域名
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 })
  }

  // 只允许 HTTPS
  if (parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTPS allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        // 不发 Referer，xpccdn 无 Referer 时返回 200
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status }
      )
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const body = await res.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, immutable`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[proxy-image] Fetch error:', err)
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 })
  }
}
