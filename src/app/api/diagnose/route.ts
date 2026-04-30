import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

async function testTcp(host: string, port: number, timeoutMs = 5000): Promise<string> {
  const net = await import('net')
  return new Promise((resolve) => {
    const sock = new net.Socket()
    sock.setTimeout(timeoutMs)
    sock.on('connect', () => { sock.destroy(); resolve('ok') })
    sock.on('error', (err: any) => { sock.destroy(); resolve(`err: ${err.code || err.message}`) })
    sock.on('timeout', () => { sock.destroy(); resolve('timeout') })
    sock.connect(port, host)
  })
}

function parseDbHost(rawUrl: string): { host: string; port: number } {
  const match = rawUrl.match(/@([^:/]+)(?::(\d+))?\//)
  if (!match) return { host: 'localhost', port: 5432 }
  return { host: match[1], port: match[2] ? parseInt(match[2]) : 5432 }
}

export async function GET() {
  const startTime = Date.now()
  const results: Record<string, any> = {}
  
  const raw = process.env.DATABASE_URL || 'not set'
  results.dbUrl = raw.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')

  const { host, port } = parseDbHost(raw)
  results.dbHost = `${host}:${port}`

  // DNS resolution
  try {
    const dns = await import('dns/promises')
    const addrs = await dns.resolve4(host)
    results.dns = addrs.join(', ')
  } catch (e: any) {
    results.dns = `fail: ${e?.message || e}`
  }

  // Raw TCP connect test (bypasses Prisma entirely)
  results.tcp = await testTcp(host, port, 10000)
  
  if (results.tcp !== 'ok') {
    results.diagnosis = 'NETWORK_BLOCKED'
    results.elapsed = `${Date.now() - startTime}ms`
    return NextResponse.json(results)
  }

  // Prisma connect
  try {
    await prisma.$connect()
    results.connect = 'ok'
  } catch (e: any) {
    results.connect = `fail: ${e?.message?.split('\n')[0] || e}`
    await prisma.$disconnect()
    results.elapsed = `${Date.now() - startTime}ms`
    return NextResponse.json(results)
  }

  // SiteConfig
  try {
    const sc = await prisma.siteConfig.count()
    results.siteConfig = `ok (${sc} rows)`
  } catch (e: any) {
    results.siteConfig = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  // Work
  try {
    const wc = await prisma.work.count()
    results.work = `ok (${wc} rows)`
  } catch (e: any) {
    results.work = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  await prisma.$disconnect()
  results.elapsed = `${Date.now() - startTime}ms`
  return NextResponse.json(results)
}
