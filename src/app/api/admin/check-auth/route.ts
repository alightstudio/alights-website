import { NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function GET() {
  const authenticated = await verifyAdminSession()
  if (authenticated) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}
