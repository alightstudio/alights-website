// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

// POST /api/admin/refresh-stash — 从新片场刷新作品热度数据
// 注意：此功能需要本地 Chrome CDP (port 9222)，Vercel 环境不可用
export async function POST() {
  try {
    if (!(await verifyAdminSession())) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 尝试连接本地 Chrome CDP
    let chromeAvailable = false
    try {
      const res = await fetch('http://localhost:9222/json/version', { signal: AbortSignal.timeout(2000) })
      chromeAvailable = res.ok
    } catch {
      chromeAvailable = false
    }

    if (!chromeAvailable) {
      return NextResponse.json({
        error: 'Chrome CDP 不可用',
        message: '请确保本地 Chrome 以 --remote-debugging-port=9222 启动，然后重试',
        instructions: '1) 关闭所有 Chrome\n2) 终端运行: open -a "Google Chrome" --args --remote-debugging-port=9222\n3) 刷新本页面后重试',
      }, { status: 503 })
    }

    // 使用轮询方式等待刷新完成
    return NextResponse.json({
      success: true,
      message: 'CDP 可用！请在本地终端运行以下命令刷新数据:\n\ncd alights-website && node scripts/refresh-stash.mjs\n\n刷新后 commit 并部署即可生效。',
      command: 'node scripts/refresh-stash.mjs',
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
