// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createRateLimiter } from '@/lib/rate-limit'

// 数据库持久化速率限制：1小时窗口，最多5次
const contactRateLimiter = createRateLimiter('contact', 5, 60 * 60 * 1000)

export async function POST(request: Request) {
  const req = request as unknown as NextRequest
  const rateCheck = await contactRateLimiter.check(req, '')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: '提交过于频繁，请稍后再试' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { name, phone, email, company, message } = body

    if (!name || !message) {
      return NextResponse.json(
        { error: '请填写姓名和留言内容' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: '留言内容不能超过2000字' },
        { status: 400 }
      )
    }

    const contact = await prisma.contact.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        company: company?.trim() || null,
        message: message.trim(),
      },
    })

    return NextResponse.json({
      message: '提交成功，我们会尽快回复您！',
      id: contact.id,
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json(
      { error: '提交失败，请稍后重试' },
      { status: 500 }
    )
  }
}