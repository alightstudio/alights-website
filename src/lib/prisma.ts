import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Build a serverless-friendly database URL
function buildDbUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl

  // Remove channel_binding=require — it conflicts with Neon's PgBouncer pooler
  let url = rawUrl.replace(/&?channel_binding\s*=\s*require/gi, '')

  // Optimize connection params for serverless (Neon cold-start wakeup can take 20s+)
  if (!url.includes('connection_limit')) {
    const separator = url.includes('?') ? '&' : '?'
    url += `${separator}connection_limit=5&pool_timeout=30&connect_timeout=30`
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