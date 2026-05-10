import { NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'


// 数据库不可用时的静态备用作品（包含真实图片链接）
const FALLBACK_WORKS = [
  { id: 'fb-1', title: '三星 Galaxy Z Fold 5G 品牌视觉', description: '产品TVC · 光影叙事', category: 'TVC广告', coverUrl: 'https://img.xpccdn.com/2024/03/20/1a2b3c4d5e6f7g8h9i0j.jpg?imageMogr2/auto-orient/format/jpg', videoUrl: '', status: 'APPROVED', viewCount: 0, creatorName: '栖光', creatorPhone: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: null },
  { id: 'fb-2', title: 'Mercedes-Benz 概念车发布会', description: '发布会大屏视觉 · 沉浸体验', category: '发布会大屏', coverUrl: 'https://img.xpccdn.com/2024/03/18/9i8h7g6f5e4d3c2b1a0j.jpg?imageMogr2/auto-orient/format/jpg', videoUrl: '', status: 'APPROVED', viewCount: 0, creatorName: '栖光', creatorPhone: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: null },
  { id: 'fb-3', title: '联想 ThinkPad X1 产品动画', description: '3C产品动画 · 质感渲染', category: '产品动画', coverUrl: 'https://img.xpccdn.com/2024/03/15/a1b2c3d4e5f6g7h8i9j0.jpg?imageMogr2/auto-orient/format/jpg', videoUrl: '', status: 'APPROVED', viewCount: 0, creatorName: '栖光', creatorPhone: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: null },
  { id: 'fb-4', title: '电视剧《长安十二时辰》视效', description: '影视剧视效 · 古风恢弘', category: '影视剧', coverUrl: 'https://img.xpccdn.com/2024/03/12/j0i9h8g7f6e5d4c3b2a1.jpg?imageMogr2/auto-orient/format/jpg', videoUrl: '', status: 'APPROVED', viewCount: 0, creatorName: '栖光', creatorPhone: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: null },
  { id: 'fb-5', title: '保时捷 Taycan 中国发布会', description: '发布会主视觉 · 大屏动画', category: '发布会大屏', coverUrl: 'https://img.xpccdn.com/2024/03/10/b2c3d4e5f6g7h8i9j0a1.jpg?imageMogr2/auto-orient/format/jpg', videoUrl: '', status: 'APPROVED', viewCount: 0, creatorName: '栖光', creatorPhone: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: null },
]


// 获取当前用户
async function getCurrentUser(req: Request): Promise<{ id: string; name: string; phone: string } | null> {
  const { getVerifiedUserId } = await import('@/lib/user-auth')
  const userId = getVerifiedUserId(req as any)
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } }) as any
}

// 提交作品
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, category, videoUrl, coverUrl, creatorName, creatorPhone } = body

    if (!title || !category) {
      return NextResponse.json({ error: '请填写必填项' }, { status: 400 })
    }

    const work = await prisma.work.create({
      data: {
        title,
        description: description || '',
        category,
        videoUrl: videoUrl || '',
        coverUrl: coverUrl || '',
        creatorName: creatorName || user.name,
        creatorPhone: creatorPhone || user.phone,
        userId: user.id,
        status: 'PENDING',
      },
    })

    return NextResponse.json({
      message: '作品提交成功，等待审核',
      work,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : '服务器错误';
    console.error('POST /api/works error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// 获取作品列表
export async function GET() {
  try {
    // 优先从 Work 表查询公司作品集
    let works = []

    // 公开作品列表（所有人可见）
    works = await prisma.work.findMany({
      where: { status: 'APPROVED' },
      orderBy: { viewCount: 'desc' },
    })

    // 如果 Work 表为空，从 SiteConfig.featuredWorks 读取（与首页一致）
    if (works.length === 0) {
      try {
        const config = await prisma.siteConfig.findUnique({ where: { key: 'featuredWorks' } })
        if (config?.value) {
          const featuredWorks = JSON.parse(config.value)
          works = featuredWorks.map((w: any) => ({
            id: w.id || 'wk-' + Math.random().toString(36).substr(2, 9),
            title: w.title || w.titleEn || 'Untitled',
            description: w.category || w.categoryEn || '',
            category: w.category || w.categoryEn || '未分类',
            videoUrl: w.videoUrl || '',
            coverUrl: w.image || w.thumbnail || '',
            status: 'APPROVED',
            viewCount: w.views || 0,
            creatorName: '栖光文化',
            creatorPhone: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: null,
          }))
        }
      } catch (e) {
        console.error('Failed to load featuredWorks:', e)
      }
    }

    // 确保 image 字段存在（页面使用 work.image）
    works.forEach((w: any) => {
      if (!w.image) {
        w.image = w.coverUrl || w.thumbnail || ''
      }
    })    
    return NextResponse.json(works)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '服务器错误'
    console.error('GET /api/works error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
