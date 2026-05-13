import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

// POST /api/admin/batch-set-avatars
// 批量设置用户头像，按手机号匹配
export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { avatars } = body as { avatars: Record<string, string> }
    // avatars: { "15000000001": "https://...", ... }

    const results: { phone: string; success: boolean; name?: string; error?: string }[] = []

    for (const [phone, avatarUrl] of Object.entries(avatars)) {
      try {
        const user = await prisma.user.findUnique({ where: { phone } })
        if (!user) {
          results.push({ phone, success: false, error: '用户不存在' })
          continue
        }
        await prisma.user.update({
          where: { phone },
          data: { avatar: avatarUrl },
        })
        results.push({ phone, success: true, name: user.name })
      } catch (err: any) {
        results.push({ phone, success: false, error: err.message })
      }
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: '设置头像失败' }, { status: 500 })
  }
}
