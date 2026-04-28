import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId } })
}

const ALLOWED_TYPES = [
  'video/mp4', 'video/quicktime', 'video/webm',
  'image/jpeg', 'image/png', 'image/webp',
]

// H-2 修复：文件魔数（magic bytes）白名单
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF....WEBP
  'video/mp4':  [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70],
  'video/webm': [0x1A, 0x45, 0xDF, 0xA3], // Matroska
  'video/quicktime': [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70],
}

async function validateFileMagicBytes(file: File, declaredType: string): Promise<boolean> {
  // webm/mp4/mov 需要更复杂的偏移检查，用宽松匹配
  const magic = MAGIC_BYTES[declaredType]
  if (!magic) return false
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length < magic.length) return false
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false
  }
  return true
}

const MAX_SIZE = 100 * 1024 * 1024 // 100MB

// POST /api/upload - 用户上传文件
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const subdir = (formData.get('subdir') as string) || 'works'

    if (!file) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      )
    }

    // H-2 修复：验证文件魔数，防止 MIME 欺骗
    if (!(await validateFileMagicBytes(file, file.type))) {
      return NextResponse.json(
        { error: '文件内容与声明类型不匹配' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: '文件过大，最大100MB' },
        { status: 400 }
      )
    }

    // P1-2 修复：使用 crypto.randomUUID() 替代 Math.random()
    const ext = (file.name.includes('.') ? file.name.split('.').pop() : null) || 'bin'
    const uuid = randomUUID()
    const pathname = `${subdir}/${user.id}/${uuid}.${ext}`

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
    })
  } catch (error) {
    // P0-1: hidden error details
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
