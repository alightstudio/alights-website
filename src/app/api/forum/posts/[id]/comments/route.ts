import { NextRequest, NextResponse } from 'next/server'

// 禁止 Vercel CDN 缓存此动态端点
export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getVerifiedUserId } from '@/lib/user-auth'
import { awardPoints } from '@/lib/points'
import { verifyAdminSession } from '@/lib/admin-auth'
import sanitizeHtml from 'sanitize-html'

const MAX_COMMENT_LEN = 5000

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'blockquote', 'pre', 'code', 'a'],
  allowedAttributes: {
    'a': ['href', 'title'],
    'code': ['class'],
    'pre': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tagName, attribs) => {
      if ((attribs.href || '').startsWith('javascript:')) {
        return { tagName: 'span', attribs: {} }
      }
      return { tagName, attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }
    },
  },
}

function sanitizeComment(content: string): string {
  if (!content) return ''
  const clean = sanitizeHtml(content, sanitizeOptions)
  if (clean.length > MAX_COMMENT_LEN) return clean.slice(0, MAX_COMMENT_LEN)
  return clean
}

// GET /api/forum/posts/[id]/comments — list comments for a post
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await prisma.forumComment.findMany({
    where: { postId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(comments)
}

// POST /api/forum/posts/[id]/comments — add comment (requires login)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const body = await req.json()
  const { id: postId } = await params
  const post = await prisma.forumPost.findUnique({ where: { id: postId } })
  if (!post) return NextResponse.json({ error: '帖子不存在' }, { status: 404 })

  if (!body.content?.trim() || typeof body.content !== 'string') {
    return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
  }

  const cleanContent = sanitizeComment(body.content)
  if (!cleanContent.trim()) {
    return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
  }

  const comment = await prisma.forumComment.create({
    data: { content: cleanContent, postId, authorId: userId },
    include: { author: { select: { id: true, name: true } } },
  })

  awardPoints(userId, 2, 'comment_create', 20).catch(console.error)
  return NextResponse.json(comment, { status: 201 })
}

// DELETE /api/forum/posts/[id]/comments — delete comment (author or admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = getVerifiedUserId(req)
  if (!userId) return NextResponse.json({ error: '请先登录' }, { status: 401 })

  const { id: commentId } = await params
  const comment = await prisma.forumComment.findUnique({ where: { id: commentId } })
  if (!comment) return NextResponse.json({ error: '评论不存在' }, { status: 404 })

  // P2 #12 修复：通过 admin session 判断管理员，不再依赖硬编码手机号
  const isAdmin = await verifyAdminSession()
  if (comment.authorId !== userId && !isAdmin) {
    return NextResponse.json({ error: '无权限删除' }, { status: 403 })
  }

  await prisma.forumComment.delete({ where: { id: commentId } })
  return NextResponse.json({ message: '删除成功' })
}
