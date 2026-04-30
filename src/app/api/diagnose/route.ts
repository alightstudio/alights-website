import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const results: Record<string, any> = {}
  
  // Test 1: Raw connection
  try {
    await prisma.$connect()
    results.connect = 'ok'
  } catch (e: any) {
    results.connect = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  // Test 2: SiteConfig table
  try {
    const sc = await prisma.siteConfig.count()
    results.siteConfig = `ok (${sc} rows)`
  } catch (e: any) {
    results.siteConfig = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  // Test 3: Work table
  try {
    const wc = await prisma.work.count()
    results.work = `ok (${wc} rows)`
  } catch (e: any) {
    results.work = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  // Test 4: User table
  try {
    const uc = await prisma.user.count()
    results.user = `ok (${uc} rows)`
  } catch (e: any) {
    results.user = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  // Test 5: DB URL (sanitized)
  const raw = process.env.DATABASE_URL || 'not set'
  const sanitized = raw.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')
  results.dbUrl = sanitized

  await prisma.$disconnect()

  return NextResponse.json(results)
}
