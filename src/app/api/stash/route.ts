import { NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import path from 'path'
import fs from 'fs'


export async function GET() {
  try {
    // Read Stash 176
    const filePath176 = path.join(process.cwd(), 'src/data/stash-works.json')
    const data176 = fs.readFileSync(filePath176, 'utf-8')
    const works176 = JSON.parse(data176)

    // Read Stash 175
    const filePath175 = path.join(process.cwd(), 'src/data/stash175.json')
    const data175 = fs.readFileSync(filePath175, 'utf-8')
    const works175 = JSON.parse(data175)

    const transform = (w: any) => ({
      id: w.id.toString(),
      title: w.title,
      category: mapCategory(w.categories),
      year: formatYear(w.publish_time),
      thumbnail: w.cover,
      description: `${w.categories} · ${formatDuration(w.duration)} · ${w.count_view}播放`,
      videoUrl: w.web_url,
      duration: w.duration,
      views: w.count_view,
      likes: w.count_like,
      collects: w.count_collect,
      heat: w.count_view + w.count_like * 5 + w.count_collect * 10,
      categories: w.categories,
      author: w.author,
    })

    return NextResponse.json({
      stash176: works176.map(transform),
      stash175: works175.map(transform),
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: 'Failed to read stash works' }, { status: 500 })
  }
}

function mapCategory(cat: string): string {
  const map: Record<string, string> = {
    '广告片': 'TVC广告',
    '宣传片': 'TVC广告',
    '竖屏广告': 'TVC广告',
    '剧情短片': '影视剧',
    '纪录片': '影视剧',
    '电影': '影视剧',
    '三维CG': '产品动画',
    '二维动画': '产品动画',
    'AIGC': '产品动画',
    '视觉探索': '产品动画',
    '学习分享': 'TVC广告',
    '自媒体': 'TVC广告',
    '其他': 'TVC广告',
  }
  return map[cat] || 'TVC广告'
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatYear(timestamp: number): string {
  return new Date(timestamp * 1000).getFullYear().toString()
}
