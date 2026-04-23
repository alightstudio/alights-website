import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// 频率限制
const registerAttempts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1小时
const MAX_ATTEMPTS = 5

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const record = registerAttempts.get(ip)

  if (!record || now > record.resetTime) {
    registerAttempts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  record.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count }
}

function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// 验证手机号格式
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)
    const rateCheck = checkRateLimit(ip)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: '注册过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, phone, email, company, password } = body

    // 验证必填字段
    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: '请填写必填项' },
        { status: 400 }
      )
    }

    // 验证手机号格式
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      )
    }

    // 检查手机号是否已注册
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已注册' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || '',
        company: company || '',
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      message: '注册成功',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error('注册错误:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
