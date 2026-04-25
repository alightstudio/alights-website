import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

export async function GET() {
  const authenticated = await verifyAdminSession()
  if (authenticated) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}
