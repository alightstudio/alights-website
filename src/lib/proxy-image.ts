/**
 * 将 xpccdn 图片 URL 转换为代理 URL，绕过防盗链
 *
 * xpccdn CDN 服务端检查 Referer，仅允许 xinpianchang.com 域名。
 * 通过 Vercel API route 代理请求（服务端无 Referer），返回 200。
 */

const XPCCDN_HOSTS = [
  'us-xpc5.xpccdn.com',
  'oss-xpc0.xpccdn.com',
  'img.xpccdn.com',
]

export function proxyImageUrl(url: string | undefined | null): string {
  if (!url) return ''

  try {
    const parsed = new URL(url)
    if (XPCCDN_HOSTS.includes(parsed.hostname)) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`
    }
  } catch {
    // 不是合法 URL，原样返回
  }

  return url
}
