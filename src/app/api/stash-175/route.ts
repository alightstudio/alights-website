// Stash 175 API — 2026-04-24 v2
import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/stash175.json')
    const data = fs.readFileSync(filePath, 'utf-8')
    const works = JSON.parse(data)
    
    const transformed = works.map((w: any) => ({
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
    }))
    
    return NextResponse.json(transformed)
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: 'Failed to read stash 175' }, { status: 500 })
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
