import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization to avoid build-time DB connection
function createPrisma(): PrismaClient {
  let url = process.env.DATABASE_URL || ''
  // Add connect_timeout for Neon free-tier cold-start (DB may be sleeping, needs 20s+ to wake)
  if (url && !url.includes('connect_timeout')) {
    const sep = url.includes('?') ? '&' : '?'
    url += `${sep}connect_timeout=30`
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: { url },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma