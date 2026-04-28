import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

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

// P1-2 修复：使用 crypto.randomBytes 替代 Math.random() 生成安全的邀请码
async function generateReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = randomBytes(6)
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length]
    }
    const existing = await prisma.user.findUnique({ where: { referralCode: code } })
    if (!existing) return code
  }
  return 'REF' + randomBytes(4).toString('hex').toUpperCase()
}

const REFERRAL_BONUS = 10 // 双方各得积分

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
    const { name, phone, email, company, password, referralCode } = body

    // P1-1 修复：验证必填字段 + 密码最小长度
    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: '请填写必填项' },
        { status: 400 }
      )
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少6位' },
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

    // 查找邀请人
    let referrer = null
    if (referralCode && referralCode.trim()) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
      })
      if (!referrer) {
        return NextResponse.json(
          { error: '邀请码无效' },
          { status: 400 }
        )
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户（含邀请关系）
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || '',
        company: company || '',
        password: hashedPassword,
        referralCode: await generateReferralCode(),
        referredById: referrer?.id || null,
      },
    })

    // 新用户注册奖励 + 邀请奖励
    if (referrer) {
      const today = new Date().toISOString().split('T')[0]

      // 新用户获积分
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: REFERRAL_BONUS } },
      })
      await prisma.pointsRecord.create({
        data: {
          userId: user.id,
          points: REFERRAL_BONUS,
          reason: 'referral_signup',
          date: today,
        },
      })

      // 邀请人获积分
      await prisma.user.update({
        where: { id: referrer.id },
        data: { points: { increment: REFERRAL_BONUS } },
      })
      await prisma.pointsRecord.create({
        data: {
          userId: referrer.id,
          points: REFERRAL_BONUS,
          reason: 'referral_invite',
          date: today,
        },
      })

      // 记录邀请关系（现有 Referral 表）
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          refereeId: user.id,
        },
      })
    }

    return NextResponse.json({
      message: '注册成功' + (referrer ? '，获得邀请奖励 +' + REFERRAL_BONUS + ' 积分' : ''),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        points: referrer ? REFERRAL_BONUS : 0,
      },
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
