#!/usr/bin/env node
/**
 * 批量设置 13 个社区主理人账号的头像
 * 
 * 用法: node scripts/set-avatars.mjs
 * 
 * 头像来源: randomuser.me (真实人物照片, 非AI生成)
 */

const AVATARS = {
  '15000000001': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  '15000000002': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  '15000000003': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  '15000000004': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  '15000000005': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  '15000000006': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  '15000000007': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
  '15000000008': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  '15000000009': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=200&h=200&fit=crop&crop=face',
  '15000000010': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face',
  '15000000011': 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop&crop=face',
  '15000000012': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
  '15000000013': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face',
}

async function main() {
  // 1. 登录管理后台
  const loginRes = await fetch('https://alights.cn/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: '0757075' }),
  })

  if (!loginRes.ok) {
    const err = await loginRes.text()
    console.error('❌ 管理后台登录失败:', loginRes.status, err)
    process.exit(1)
  }

  // 获取 cookie
  const cookieHeader = loginRes.headers.get('set-cookie') || ''
  console.log('✅ 管理后台登录成功')

  // 2. 调用批量设置头像接口
  const res = await fetch('https://alights.cn/api/admin/batch-set-avatars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ avatars: AVATARS }),
  })

  const data = await res.json()
  
  if (!res.ok) {
    console.error('❌ API 错误:', data.error || res.status)
    process.exit(1)
  }

  // 3. 输出结果
  const success = data.results.filter(r => r.success).length
  const failed = data.results.filter(r => !r.success).length
  console.log(`\n📊 结果: ${success} 成功, ${failed} 失败`)
  
  for (const r of data.results) {
    if (r.success) {
      console.log(`  ✅ ${r.name} (${r.phone})`)
    } else {
      console.log(`  ❌ ${r.phone}: ${r.error}`)
    }
  }
}

main().catch(console.error)
