import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'src/data/site-config.json')

function checkAuth() {
  // 同步检查 - 在 GET/POST 中各自调用 async 版本
  return true // 占位，实际在 handler 中检查
}

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')
  return session?.value === 'authenticated'
}

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  return JSON.parse(raw)
}

function writeConfig(config: any) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

// GET /api/admin/settings - 获取配置
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const config = readConfig()
    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: '读取配置失败' }, { status: 500 })
  }
}

// PUT /api/admin/settings - 更新配置（整体替换某个 section）
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { section, data } = body

    if (!section || !data) {
      return NextResponse.json({ error: '缺少 section 或 data 参数' }, { status: 400 })
    }

    const config = readConfig()
    config[section] = data
    writeConfig(config)

    return NextResponse.json({ success: true, section, data })
  } catch (error) {
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 })
  }
}

// PATCH /api/admin/settings - 部分更新
export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { section, data } = body

    if (!section || !data) {
      return NextResponse.json({ error: '缺少 section 或 data 参数' }, { status: 400 })
    }

    const config = readConfig()
    config[section] = { ...config[section], ...data }
    writeConfig(config)

    return NextResponse.json({ success: true, section, data: config[section] })
  } catch (error) {
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 })
  }
}
