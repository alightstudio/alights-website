import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/canvas-template/thumbnails
// 返回所有名画的 40×40 缩略图（从 80×80 均匀采样）
// 80×80 canvas 上每格 2px = 1600 有效像素点，细节提升 25x
export async function GET(req: NextRequest) {
  const admin = await verifyAdminSession()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { FAMOUS_PAINTINGS } = await import('@/data/painting-pixels')
    const THUMB = 40

    const thumbnails = FAMOUS_PAINTINGS.map(p => {
      const src = p.pixelData
      const srcH = src.length
      const srcW = src[0].length

      const grid: string[][] = []
      for (let ty = 0; ty < THUMB; ty++) {
        const row: string[] = []
        for (let tx = 0; tx < THUMB; tx++) {
          const sx = Math.floor((tx / THUMB) * srcW)
          const sy = Math.floor((ty / THUMB) * srcH)
          row.push(src[sy]?.[sx] ?? '#000000')
        }
        grid.push(row)
      }

      return { id: p.id, grid }
    })

    return NextResponse.json({ thumbnails })
  } catch (e: any) {
    return NextResponse.json({ error: '加载失败: ' + e.message }, { status: 500 })
  }
}
