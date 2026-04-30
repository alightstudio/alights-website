import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Build a serverless-friendly database URL
function buildDbUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl

  // Use direct endpoint (not pooler) — better reliability from Vercel serverless
  let url = rawUrl.replace(/-pooler\.c-/g, '.c-')

  // Remove channel_binding=require — some Neon endpoints reject it
  url = url.replace(/&?channel_binding\s*=\s*require/gi, '')

  // Serverless-optimized params (longer timeouts for Neon free-tier wake-up)
  if (!url.includes('connect_timeout')) {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}connect_timeout=30`
  }
  
  return url
}

// Lazy initialization to avoid build-time DB connection
function createPrisma(): PrismaClient {
  const dbUrl = buildDbUrl(process.env.DATABASE_URL || '')
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: { url: dbUrl },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma