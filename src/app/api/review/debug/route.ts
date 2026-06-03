import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const code = req.nextUrl.searchParams.get('code')
    
    if (!id) {
      return NextResponse.json({ models: Object.keys(prisma).filter(k => !k.startsWith('_')) })
    }

    const review = await prisma.videoReview.findUnique({ where: { id } })
    if (!review) return NextResponse.json({ error: 'not found' }, { status: 404 })
    
    return NextResponse.json({
      title: review.title,
      hasComments: false,
      passcodeMatch: code === review.passcode,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    })
  }
}
