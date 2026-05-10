// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
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

/**
 * 阶梯邀请奖励
 * 第1-3人: 10分，第4-10人: 20分，第11-30人: 30分，30+: 50分
 */
function getReferralBonus(referralCount: number): number {
  if (referralCount < 4) return 10
  if (referralCount < 11) return 20
  if (referralCount < 31) return 30
  return 50
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

    // 新用户注册奖励 + 邀请奖励（阶梯制）
    let bonus = 0
    if (referrer) {
      const today = new Date().toISOString().split('T')[0]

      // 查询邀请人已有邀请数量（在本次之前）
      const existingReferrals = await prisma.referral.count({
        where: { referrerId: referrer.id },
      })
      bonus = getReferralBonus(existingReferrals)

      // 新用户获积分
      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: bonus } },
      })
      await prisma.pointsRecord.create({
        data: {
          userId: user.id,
          points: bonus,
          reason: 'referral_signup',
          date: today,
        },
      })

      // 邀请人获积分
      await prisma.user.update({
        where: { id: referrer.id },
        data: { points: { increment: bonus } },
      })
      await prisma.pointsRecord.create({
        data: {
          userId: referrer.id,
          points: bonus,
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
      message: '注册成功' + (referrer ? '，获得邀请奖励 +' + bonus + ' 积分' : ''),
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        points: referrer ? bonus : 0,
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
