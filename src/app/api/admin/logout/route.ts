// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revokeSession, isValidSession } from '@/lib/admin-auth'

export async function POST() {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  if (session?.value) {
    revokeSession(session.value)
  }
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_session')
  return response
}
