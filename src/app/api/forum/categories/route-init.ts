import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DEFAULT_CATEGORIES = [
  { name: 'TVC广告', icon: '📽️', description: '商业广告、品牌片、项目案例', sortOrder: 1 },
  { name: '产品动画', icon: '🎬', description: '三维/二维动画、产品演示、动态图形', sortOrder: 2 },
  { name: '短片/微电影', icon: '🎞️', description: '剧情短片、实验影像、创意作品', sortOrder: 3 },
  { name: '行业动态', icon: '📰', description: '资讯、趋势、新技术、新工具', sortOrder: 4 },
  { name: '创意灵感', icon: '💡', description: '参考素材、灵感来源、审美讨论', sortOrder: 5 },
  { name: '技术交流', icon: '🔧', description: '制作技巧、灯光、合成、调色', sortOrder: 6 },
  { name: '资源共享', icon: '📂', description: '素材分享、工具推荐、学习资料', sortOrder: 7 },
]

// POST /api/forum/categories/init — seed default categories
export async function POST() {
  const created: string[] = []
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.forumCategory.findFirst({ where: { name: cat.name } })
    if (!existing) {
      await prisma.forumCategory.create({ data: cat })
      created.push(cat.name)
    }
  }
  return NextResponse.json({ message: '初始化完成', created })
}
