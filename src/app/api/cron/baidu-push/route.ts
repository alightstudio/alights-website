import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BAIDU_PUSH_URL = 'http://data.zz.baidu.com/urls?site=https://www.alights.cn&token=affCAR7MWNuBHLXq'

const PAGES = [
  'https://www.alights.cn/',
  'https://www.alights.cn/gallery',
  'https://www.alights.cn/works',
  'https://www.alights.cn/lab',
  'https://www.alights.cn/about',
  'https://www.alights.cn/contact',
  'https://www.alights.cn/community',
]

export async function GET(req: NextRequest) {
  try {
    const body = PAGES.join('\n')
    const response = await fetch(BAIDU_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'curl/7.43.0',
      },
      body,
    })

    const text = await response.text()
    const result = JSON.parse(text)

    return NextResponse.json({
      success: true,
      message: '百度推送成功',
      response: result,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: '推送失败', error: error.message },
      { status: 500 }
    )
  }
}
