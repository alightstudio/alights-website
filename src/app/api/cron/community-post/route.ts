// 社区定时发帖端点
// 由 cron-job.org 调用，每天 5 次（不同时段），随机选择未发布内容发布
// 支持 ?count=N 参数一次发布多篇
export const dynamic = 'force-dynamic'
export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import contentPool from '@/data/community-content-pool.json'

const CRON_SECRET = process.env.CRON_SECRET || ''

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// 检查 IP 是否在白名单内（cron-job.org 的 IP 段）
function isTrustedSource(ip: string): boolean {
  // cron-job.org 的常用出口 IP
  const trustedIPs = ['::1', '127.0.0.1']
  if (trustedIPs.includes(ip)) return true
  // 允许内网/Vercel 环境
  if (ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.')) return true
  return false
}

export async function GET(req: NextRequest) {
  try {
    // 鉴权：支持 secret token 或 IP 白名单
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('secret')
    const ip = getClientIP(req)

    if (token !== CRON_SECRET && !isTrustedSource(ip)) {
      console.warn('[community-post] 未授权访问:', ip, token)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. 获取已发布的帖子 ID 列表
    const publishedConfig = await prisma.siteConfig.findUnique({
      where: { key: 'community_published_posts' }
    })
    const publishedIds: string[] = publishedConfig
      ? JSON.parse(publishedConfig.value)
      : []

    // 2. 筛选未发布的帖子
    const unpublished = contentPool.filter(p => !publishedIds.includes(p.id))

    if (unpublished.length === 0) {
      return NextResponse.json({
        message: '所有内容已发布完毕，请补充内容池',
        total: publishedIds.length,
        remaining: 0,
      })
    }

    // 3. 确定发布数量（默认 1 篇，最多 5 篇）
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '1'), 1), 5)

    // 4. 随机选择指定数量的帖子
    const shuffled = [...unpublished].sort(() => Math.random() - 0.5)
    const picks = shuffled.slice(0, count)

    const published: Array<{ id: string; title: string }> = []
    let currentPublishedIds = [...publishedIds]

    for (const pick of picks) {
      // 先确保标签存在
      const tagRecords = await Promise.all(
        pick.tags.map(async (tagName) => {
          return prisma.forumTag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          })
        })
      )

      const post = await prisma.forumPost.create({
        data: {
          title: pick.title,
          content: pick.content,
          authorId: pick.accountId,
          categoryId: pick.categoryId,
          tags: {
            create: tagRecords.map(tag => ({ tagId: tag.id })),
          },
        },
      })

      currentPublishedIds.push(pick.id)
      published.push({ id: post.id, title: pick.title })
      console.log(`[community-post] 发布成功: "${pick.title}" (${pick.id})`)
    }

    // 5. 批量记录已发布
    await prisma.siteConfig.upsert({
      where: { key: 'community_published_posts' },
      update: { value: JSON.stringify(currentPublishedIds) },
      create: {
        key: 'community_published_posts',
        value: JSON.stringify(currentPublishedIds),
      },
    })

    return NextResponse.json({
      message: `发布成功，共 ${published.length} 篇`,
      published: published,
      publishedCount: currentPublishedIds.length,
      remaining: unpublished.length - published.length,
    })
  } catch (error) {
    console.error('[community-post] 发布失败:', error)
    return NextResponse.json({ error: '发布失败' }, { status: 500 })
  }
}

// POST 也可以（cron-job.org 支持两种方法）
export { GET as POST }
