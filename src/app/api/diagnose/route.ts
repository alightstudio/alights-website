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

async function testTls(host: string, port: number): Promise<string> {
  const tls = await import('tls')
  const net = await import('net')
  return new Promise((resolve) => {
    const raw = new net.Socket()
    const ts = Date.now()
    raw.connect(port, host, () => {
      // TCP connected, now upgrade to TLS
      const socket = tls.connect({ socket: raw, servername: host, rejectUnauthorized: false }, () => {
        if (socket.authorized) {
          resolve(`ok (${Date.now()-ts}ms, verified)`)
        } else {
          resolve(`ok (${Date.now()-ts}ms, unverified: ${socket.authorizationError})`)
        }
        socket.destroy()
      })
      socket.setTimeout(8000)
      socket.on('error', (err: any) => {
        resolve(`fail: ${err.code || err.message}`)
      })
      socket.on('timeout', () => {
        resolve('timeout')
        socket.destroy()
      })
    })
    raw.on('error', (err: any) => {
      resolve(`tcp_err: ${err.code || err.message}`)
    })
  })
}

function parseDbHost(rawUrl: string): { host: string; port: number } {
  const match = rawUrl.match(/@([^:/]+)(?::(\d+))?\//)
  if (!match) return { host: 'localhost', port: 5432 }
  return { host: match[1], port: match[2] ? parseInt(match[2]) : 5432 }
}

function extractCreds(rawUrl: string): { user: string; password: string; host: string; port: number; database: string } {
  const match = rawUrl.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/)
  if (!match) return { user: '', password: '', host: 'localhost', port: 5432, database: '' }
  return { user: match[1], password: match[2], host: match[3], port: match[4] ? parseInt(match[4]) : 5432, database: match[5] }
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

  // Raw TCP connect test
  results.tcp = await testTcp(host, port, 10000)
  
  if (results.tcp !== 'ok') {
    results.diagnosis = 'NETWORK_BLOCKED'
    results.elapsed = `${Date.now() - startTime}ms`
    return NextResponse.json(results)
  }

  // TLS handshake test (simulates what Prisma does)
  results.tls = await testTls(host, port)

  if (results.tls !== 'ok') {
    results.diagnosis = 'TLS_HANDSHAKE_FAILED'
    results.elapsed = `${Date.now() - startTime}ms`
    return NextResponse.json(results)
  }

  // Raw pg.Client test (bypasses Prisma entirely, uses node-postgres)
  try {
    const { user, password, host: dbHost, port: dbPort, database } = extractCreds(raw)
    const pg = await import('pg')
    const pgClient = new pg.Client({
      user, password, host: dbHost, port: dbPort, database,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    })
    await pgClient.connect()
    const res = await pgClient.query('SELECT 1 as ok')
    results.pg = `ok (rows: ${res.rowCount})`
    await pgClient.end()
  } catch (e: any) {
    results.pg = `fail: ${e?.message?.split('\n')[0] || e}`
  }

  // Prisma connect
  try {
    await prisma.$connect()
    results.connect = 'ok'
  } catch (e: any) {
    results.connect = `fail: ${e?.message?.split('\n')[0] || e}`
    await prisma.$disconnect()
  }

  // DB queries
  if (results.connect === 'ok') {
    try { results.siteConfig = `ok (${await prisma.siteConfig.count()} rows)` } catch {}
    try { results.work = `ok (${await prisma.work.count()} rows)` } catch {}
  }

  await prisma.$disconnect().catch(() => {})
  results.elapsed = `${Date.now() - startTime}ms`
  return NextResponse.json(results)
}
