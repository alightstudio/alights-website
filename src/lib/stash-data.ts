import stash176Raw from '@/data/stash-works.json'
import stash175Raw from '@/data/stash175.json'

interface StashWork {
  id: string
  title: string
  videoUrl: string
  thumbnail: string
  duration: number
  categories: string
  views: number
  likes: number
  collects: number
  heat: number
  author: string
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

function transform(w: any): StashWork {
  return {
    id: w.id.toString(),
    title: w.title,
    videoUrl: w.web_url,
    thumbnail: w.cover,
    duration: w.duration,
    categories: w.categories,
    views: w.count_view,
    likes: w.count_like,
    collects: w.count_collect,
    heat: w.count_view + w.count_like * 5 + w.count_collect * 10,
    author: w.author || '未知',
  }
}

export const stash176: StashWork[] = stash176Raw.map(transform)
export const stash175: StashWork[] = stash175Raw.map(transform)
