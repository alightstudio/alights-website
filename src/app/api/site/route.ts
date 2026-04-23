import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), 'src/data/site-config.json')

// GET /api/site/config - 公开的网站配置读取接口（无需认证）
export async function GET() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(raw)
    // 只返回前端需要的字段，不返回敏感信息
    return NextResponse.json({
      company: config.company,
      contact: {
        phone: config.contact?.phone || '',
        email: config.contact?.email || '',
        address: config.contact?.address || '',
        wechat: config.contact?.wechat || '',
      },
      seo: config.seo,
      hero: config.hero,
      featuredWorks: config.featuredWorks || [],
      services: config.services || [],
      brands: config.brands || [],
    })
  } catch (error) {
    return NextResponse.json({ error: '读取配置失败' }, { status: 500 })
  }
}
