import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization to avoid build-time DB connection
function createPrisma(): PrismaClient {
  // Build URL safely — append serverless-optimized params without breaking existing query string
  let dbUrl = process.env.DATABASE_URL || ''
  if (!dbUrl.includes('connection_limit')) {
    const separator = dbUrl.includes('?') ? '&' : '?'
    dbUrl += `${separator}connection_limit=5&pool_timeout=10&connect_timeout=10`
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: { url: dbUrl },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma