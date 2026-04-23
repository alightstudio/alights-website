import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'src/data/site-config.json')
const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads')

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
}

function writeConfig(config: any) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// POST /api/admin/upload - 文件上传
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const subdir = (formData.get('subdir') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 })
    }

    // 确保上传目录存在
    const targetDir = path.join(UPLOAD_DIR, subdir)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    // 生成唯一文件名
    const ext = path.extname(file.name) || '.bin'
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}_${randomStr}${ext}`
    const filepath = path.join(targetDir, filename)

    // 写入文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(filepath, buffer)

    // 返回可访问的 URL 路径
    const url = `/uploads/${subdir}/${filename}`

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败' }, { status: 500 })
  }
}
