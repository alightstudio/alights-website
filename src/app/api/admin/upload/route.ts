// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { verifyAdminSession } from '@/lib/admin-auth'
import { randomUUID } from 'crypto'

// 允许的文件类型
const ALLOWED_TYPES: Record<string, string[]> = {
  video: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
}

const MAX_VIDEO_SIZE = 100 * 1024 * 1024   // 100MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024    // 10MB

function getFileCategory(contentType: string): 'video' | 'image' | null {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(contentType)) return category as 'video' | 'image'
  }
  return null
}

// POST /api/admin/upload - 文件上传到 Vercel Blob
export async function POST(request: NextRequest) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const subdir = (formData.get('subdir') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 })
    }

    const category = getFileCategory(file.type)
    if (!category) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}。支持: mp4/mov/webm/avi, jpg/png/webp/gif/svg` },
        { status: 400 }
      )
    }

    const maxSize = category === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件过大，${category === 'video' ? '视频' : '图片'}最大 ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // P1-2 修复：使用 crypto.randomUUID() 替代 Math.random() 生成唯一文件名
    const ext = (file.name.includes('.') ? file.name.split('.').pop() : null) || (category === 'video' ? 'mp4' : 'jpg')
    const uuid = randomUUID()
    const pathname = `${subdir}/${uuid}.${ext}`

    // 上传到 Vercel Blob
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
      size: file.size,
      type: file.type,
      category,
    })
  } catch (error) {
    // P0-1: hidden
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
