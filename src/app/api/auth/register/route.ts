// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { createRateLimiter } from '@/lib/rate-limit'

// 数据库持久化速率限制：1小时窗口，最多5次
const registerRateLimiter = createRateLimiter('register', 5, 60 * 60 * 1000)

// 验证手机号格式
function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone)
}

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

function getReferralBonus(referralCount: number): number {
  if (referralCount < 4) return 10
  if (referralCount < 11) return 20
  if (referralCount < 31) return 30
  return 50
}

export async function POST(request: Request) {
  const req = request as unknown as NextRequest
  const rateCheck = await registerRateLimiter.check(req, '')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: '注册过于频繁，请稍后再试' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { name, phone, email, company, password, referralCode } = body

    if (!name || !phone || !password) {
      return NextResponse.json({ error: '请填写必填项' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6位' }, { status: 400 })
    }
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } })
    if (existingUser) {
      return NextResponse.json({ error: '该手机号已注册' }, { status: 400 })
    }

    let referrer = null
    if (referralCode && referralCode.trim()) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
      })
      if (!referrer) {
        return NextResponse.json({ error: '邀请码无效' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
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

    let bonus = 0
    if (referrer) {
      const today = new Date().toISOString().split('T')[0]
      const existingReferrals = await prisma.referral.count({
        where: { referrerId: referrer.id },
      })
      bonus = getReferralBonus(existingReferrals)

      await prisma.user.update({
        where: { id: user.id },
        data: { points: { increment: bonus } },
      })
      await prisma.pointsRecord.create({
        data: { userId: user.id, points: bonus, reason: 'referral_signup', date: today },
      })
      await prisma.user.update({
        where: { id: referrer.id },
        data: { points: { increment: bonus } },
      })
      await prisma.pointsRecord.create({
        data: { userId: referrer.id, points: bonus, reason: 'referral_invite', date: today },
      })
      await prisma.referral.create({
        data: { referrerId: referrer.id, refereeId: user.id },
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
    return NextResponse.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}