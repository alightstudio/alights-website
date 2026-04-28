import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy initialization to avoid build-time DB connection
function createPrisma(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // M-3 修复：Serverless 优化连接池
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // L-3 修复：连接超时配置
    ...(process.env.DATABASE_URL?.includes('connection_limit')
      ? {}
      : {
          datasources: { db: { url: `${process.env.DATABASE_URL}?connection_limit=5&pool_timeout=10&connect_timeout=5` } }
        }),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma