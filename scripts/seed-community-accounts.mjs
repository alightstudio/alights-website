/**
 * 社区主理人账号批量创建脚本
 * 运行: cd alights-website && node scripts/seed-community-accounts.mjs
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

const ACCOUNTS = [
  // ⚡ AIGC × 2
  { name: 'AIGC 前沿', phone: '15000000001', password: 'qiguang2026', bio: 'AI 视觉创作的第一手动态与前沿提示词分享' },
  { name: 'AIGC 实验室', phone: '15000000002', password: 'qiguang2026', bio: '用 AI 做视觉实验，分享好玩的生成技巧' },

  // 📽️ TVC广告 × 2
  { name: '创意简报', phone: '15000000003', password: 'qiguang2026', bio: '商业广告案例拆解，创意背后的逻辑' },
  { name: '创意切片', phone: '15000000004', password: 'qiguang2026', bio: '好的广告值得一帧帧看，分享值得研究的作品' },

  // 🎬 产品动画 × 2
  { name: '动效研究室', phone: '15000000005', password: 'qiguang2026', bio: '三维动画与动态设计的技术笔记' },
  { name: '灵感精选', phone: '15000000006', password: 'qiguang2026', bio: '精选优秀动画与视效作品，不只是好看' },

  // 💡 创意灵感 × 2
  { name: '灵感捕手', phone: '15000000007', password: 'qiguang2026', bio: '走在审美前线，捕捉值得一看的视觉作品' },
  { name: '审美积累', phone: '15000000008', password: 'qiguang2026', bio: '构图、光影、色彩——好的视觉审美是一点点攒出来的' },

  // 🔧 技术交流 × 2
  { name: '技术笔记', phone: '15000000009', password: 'qiguang2026', bio: '视效工具使用心得与踩坑记录' },
  { name: '工作流实验室', phone: '15000000010', password: 'qiguang2026', bio: '管线、效率工具、协作方式——让工作流更顺滑' },

  // 📢 行业机会 × 1（暂不发布）
  { name: '行业雷达', phone: '15000000011', password: 'qiguang2026', bio: '行业动态、赛事展览、招聘信息一网打尽' },

  // 📦 资源共享 × 2
  { name: '素材仓库', phone: '15000000012', password: 'qiguang2026', bio: '免费高质素材与实用工具推荐' },
  { name: '资源分享', phone: '15000000013', password: 'qiguang2026', bio: '设计资源收割机，好东西不私藏' },
]

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = randomBytes(6)
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length]
  return code
}

async function main() {
  console.log('开始创建社区主理人账号...\n')

  const results = []
  for (const acc of ACCOUNTS) {
    try {
      const existing = await prisma.user.findUnique({ where: { phone: acc.phone } })
      if (existing) {
        console.log(`  ⏭️  ${acc.name} (${acc.phone}) — 已存在`)
        results.push({ ...acc, id: existing.id, status: 'EXISTS' })
        continue
      }

      const hashedPassword = await bcrypt.hash(acc.password, 10)
      const user = await prisma.user.create({
        data: {
          name: acc.name,
          phone: acc.phone,
          password: hashedPassword,
          bio: acc.bio,
          referralCode: generateReferralCode(),
        },
      })
      console.log(`  ✅ ${acc.name} (${acc.phone}) — 创建成功`)
      results.push({ ...acc, id: user.id, status: 'CREATED' })
    } catch (err) {
      console.error(`  ❌ ${acc.name} (${acc.phone}) — 失败:`, err.message || err)
      results.push({ ...acc, id: null, status: 'FAILED', error: err.message })
    }
  }

  console.log(`\n📊 汇总: ${results.filter(r => r.status !== 'FAILED').length}/${results.length} 成功`)
  console.log('\n📋 账号密码表:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  账号名\t\t手机号\t\t密码')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const r of results) {
    if (r.status !== 'FAILED') {
      console.log(`  ${r.name.padEnd(10)}\t${r.phone}\t${r.password}`)
    }
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n登录地址: https://alights.cn/login')
  console.log('管理后台: https://alights.cn/admin/login (admin / 0757075)')

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('脚本执行失败:', e)
  process.exit(1)
})
