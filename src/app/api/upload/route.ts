import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getVerifiedUserId } from '@/lib/user-auth'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB（Vercel Hobby 对 FormData 请求体上限 ~4.5MB，留出 multipart 开销）

export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: '未选择文件' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: '不支持的图片格式，仅限 JPEG/PNG/WebP/GIF' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: '图片大小超过 2MB 限制' }, { status: 400 })

    const ext = file.name.split('.').pop() || 'jpg'
    // 安全审计修复：用 crypto.randomBytes 生成不可预测的文件名，防止 URL 枚举攻击
    const rand = randomBytes(8).toString('hex')
    const filename = `community/${userId}/${Date.now()}-${rand}.${ext}`

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    return NextResponse.json({ url: blob.url })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: '上传失败: ' + (err.message || '未知错误') }, { status: 500 })
  }
}
