import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminSession } from '@/lib/admin-auth'

// 获取所有联系记录
export async function GET() {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('获取联系记录错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
