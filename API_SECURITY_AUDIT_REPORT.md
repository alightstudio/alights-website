# alights-website API 安全审计报告

**审计日期**: 2026-05-10
**审计范围**: `/src/app/api/` 所有路由 + `/src/lib/` 核心工具库
**审计员**: QClaw 安全审计系统

---

## 执行摘要

本次审计对 alights-website 项目的所有 API 路由进行了深度代码审计，发现 **5 个高危漏洞**、**5 个中危漏洞**、**4 个低危问题** 和 **3 个优化建议**。

最严重的问题包括：
- 积分系统竞态条件（双花漏洞）
- 用户认证冷启动密钥不一致
- 文件上传安全校验不足
- 硬编码敏感信息

---

## 🔴 高危漏洞（需立即修复）

### H-1: 积分系统竞态条件 — 双花漏洞

**文件**: `src/app/api/canvas/pixel/route.ts`

**问题描述**:  
像素放置时的积分扣除和像素创建操作不在同一事务中，存在典型的 Race Condition。攻击者可并发发送多个放置请求，导致：
1. 重复扣除积分
2. 使用相同积分解锁多个像素位置（双花）

**受影响代码**:
```typescript
// 第一阶段：扣除积分（独立事务）
await awardPoints(userId, -pointCost, 'place_pixel', dailyLimit)

// 第二阶段：创建像素（另一独立事务）
await prisma.pixel.create({ ... })
```

**攻击场景**:
```bash
# 攻击脚本示例
for i in {1..10}; do
  curl -X POST /api/canvas/pixel -d '{"x":50,"y":50,"color":"#fff"}' &
done
wait
# 结果：扣了10次积分，但只有一个像素被创建（或更糟：创建了多个）
```

**修复建议**:
```typescript
// 使用 Prisma 事务包装所有操作
await prisma.$transaction(async (tx) => {
  // 1. 先锁定用户记录（SELECT FOR UPDATE 等效）
  const user = await tx.user.findUnique({ 
    where: { id: userId },
    select: { points: true }
  })
  
  if (user.points < pointCost) {
    throw new Error('积分不足')
  }
  
  // 2. 检查像素是否已被占用（原子操作）
  const existing = await tx.pixel.findUnique({
    where: { canvasId_x_y: { canvasId, x, y } }
  })
  
  if (existing) {
    throw new Error('位置已被占用')
  }
  
  // 3. 扣除积分
  await tx.user.update({
    where: { id: userId },
    data: { points: { decrement: pointCost } }
  })
  
  // 4. 创建像素记录
  await tx.pixel.create({ ... })
  
  // 5. 记录交易
  await tx.pointsRecord.create({ ... })
})
```

---

### H-2: 用户认证冷启动密钥不一致

**文件**: `src/lib/user-auth.ts`

**问题描述**:  
在 Vercel Serverless 环境中，环境变量可能在冷启动时未及时注入。代码在此时回退到固定密钥 `fallback-secret-key`，导致：
1. 不同 Lambda 实例生成不同的签名密钥
2. 用户登录后，后续请求可能路由到不同实例，cookie 验证失败

**受影响代码**:
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

export function createSessionToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySessionToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded.userId
  } catch {
    return null
  }
}
```

**修复建议**:
```typescript
let cachedSecret: string | null = null

function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret
  
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // 生产环境必须有环境变量，否则拒绝启动
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    // 开发环境可以使用默认值（但要警告）
    console.warn('[WARN] Using fallback JWT secret - DO NOT USE IN PRODUCTION')
    cachedSecret = 'dev-fallback-secret-key-' + process.env.NODE_ENV
  } else {
    cachedSecret = secret
  }
  return cachedSecret
}
```

---

### H-3: 注册时使用 Math.random() 生成邀请码

**文件**: `src/app/api/auth/register/route.ts`

**问题描述**:  
使用 `Math.random()` 生成邀请码，该函数不是密码学安全的随机数生成器（CSPRNG），可被预测。

**受影响代码**:
```typescript
const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
```

**修复建议**:
```typescript
import { randomBytes } from 'crypto'

const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}
```

---

### H-4: 用户资料更新时使用 Math.random()

**文件**: `src/app/api/user/profile/route.ts`

**问题描述**:  
同 H-3，在用户首次设置资料时生成邀请码。

**受影响代码**:
```typescript
const generateReferralCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
```

**修复建议**: 同 H-3，使用 `crypto.randomBytes()`。

---

### H-5: 管理员认证密钥回退问题

**文件**: `src/lib/admin-auth.ts`

**问题描述**:  
与管理员认证相关的密钥在环境变量未设置时回退到硬编码值，可能导致认证绕过。

**受影响代码**:
```typescript
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'admin-session-secret'
```

**修复建议**: 同 H-2，在生产环境强制要求环境变量。

---

## 🟠 中危漏洞（建议修复）

### M-1: 文件上传仅校验 Content-Type

**文件**: `src/app/api/admin/upload/route.ts`

**问题描述**:  
仅通过 `Content-Type` 判断文件类型，可被攻击者伪造。恶意文件可通过修改请求头的 Content-Type 绕过检查。

**攻击场景**:
```bash
# 上传包含 XSS 的 SVG 文件
curl -X POST /api/admin/upload \
  -H "Content-Type: image/png" \
  --data-binary @malicious.svg
# SVG 内容：<svg onload="alert('xss')">
```

**受影响代码**:
```typescript
const getFileCategory = (contentType: string): 'video' | 'image' | null => {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(contentType)) return category as 'video' | 'image'
  }
  return null
}
```

**修复建议**:
```typescript
import { createHash } from 'crypto'
import { fileTypeFromBuffer } from 'file-type'

// 1. 验证文件魔数（Magic Number）
const buffer = await file.arrayBuffer()
const fileType = await fileTypeFromBuffer(Buffer.from(buffer))

if (!fileType || !ALLOWED_TYPES[category]?.includes(fileType.mime)) {
  return NextResponse.json({ error: '文件类型不匹配' }, { status: 400 })
}

// 2. 针对图片，检查像素尺寸
if (category === 'image') {
  const sharp = require('sharp')
  const metadata = await sharp(Buffer.from(buffer)).metadata()
  if (metadata.width > 10000 || metadata.height > 10000) {
    return NextResponse.json({ error: '图片尺寸过大' }, { status: 400 })
  }
}

// 3. 针对 SVG，禁用脚本
if (fileType.mime === 'image/svg+xml') {
  const content = Buffer.from(buffer).toString('utf-8')
  if (/<script|on\w+\s*=|javascript:/i.test(content)) {
    return NextResponse.json({ error: 'SVG 包含不安全内容' }, { status: 400 })
  }
}
```

---

### M-2: Canvas History 无分页限制

**文件**: `src/app/api/canvas/history/route.ts`

**问题描述**:  
返回所有历史画布的完整像素数据，无分页。假设有 30 个归档画布，每个 80x80 = 6400 像素，响应体可达数 MB，可能造成：
1. 内存溢出
2. 响应超时
3. 带宽浪费

**受影响代码**:
```typescript
const allPixels = await prisma.pixel.findMany({
  where: { canvasId: { in: canvasIds } },
  select: { canvasId: true, x: true, y: true, color: true, userId: true },
})
```

**修复建议**:
```typescript
// 1. 添加分页参数
const page = parseInt(searchParams.get('page') || '1')
const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)
const offset = (page - 1) * limit

// 2. 只返回画布元数据，像素数据按需加载
const canvases = await prisma.canvas.findMany({
  where: { status: 'ARCHIVED' },
  orderBy: { endTime: 'desc' },
  skip: offset,
  take: limit,
  select: {
    id: true,
    width: true,
    height: true,
    name: true,
    // 不返回完整像素数组
  }
})

// 3. 提供单独的像素数据端点
// GET /api/canvas/[id]/pixels
```

---

### M-3: Canvas Current 无分页限制

**文件**: `src/app/api/canvas/current/route.ts`

**问题描述**:  
同 M-2，单次请求返回当前画布的所有像素数据。

**修复建议**: 
- 对于 80x80 的画布，6400 个像素点可接受
- 建议添加 `?compact=true` 参数，返回压缩格式（如 RLE 编码）
- 或使用 WebSocket 流式传输

---

### M-4: 积分点击刷取风险

**文件**: `src/app/api/points/click/route.ts`

**问题描述**:  
虽然已修复 workId 伪造问题，但仍缺少每日积分上限的全局校验。用户可通过自动化脚本持续点击。

**受影响代码**:
```typescript
// 当前只检查单次点击的每日上限
const result = await awardPoints(userId, 1, 'click_work', 100)
```

**修复建议**:
```typescript
// 1. 在 awardPoints 中添加更严格的频率限制
const clickAttempts = new Map<string, { count: number; resetTime: number }>()

function checkClickRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = clickAttempts.get(userId)
  if (!record || now > record.resetTime) {
    clickAttempts.set(userId, { count: 1, resetTime: now + 60000 })
    return true
  }
  if (record.count >= 10) return false // 每分钟最多10次
  record.count++
  return true
}

// 2. 在数据库层添加唯一约束，防止重复点击
// ALTER TABLE "PointsRecord" ADD CONSTRAINT unique_click UNIQUE ("userId", "reason", "metadata");
```

---

### M-5: 硬编码百度推送 Token

**文件**: `src/app/api/cron/baidu-push/route.ts`

**问题描述**:  
百度推送的 token 直接硬编码在代码中，token 泄露后需要修改代码才能更换。

**受影响代码**:
```typescript
const BAIDU_PUSH_URL = 'http://data.zz.baidu.com/urls?site=https://www.alights.cn&token=affCAR7MWNuBHLXq'
```

**修复建议**:
```typescript
const BAIDU_PUSH_TOKEN = process.env.BAIDU_PUSH_TOKEN
const BAIDU_PUSH_SITE = process.env.BAIDU_PUSH_SITE || 'https://www.alights.cn'

if (!BAIDU_PUSH_TOKEN) {
  console.warn('[WARN] BAIDU_PUSH_TOKEN not configured, skipping push')
  return NextResponse.json({ success: false, message: 'Token not configured' })
}

const BAIDU_PUSH_URL = `http://data.zz.baidu.com/urls?site=${BAIDU_PUSH_SITE}&token=${BAIDU_PUSH_TOKEN}`
```

---

## 🟡 低危问题（可优化）

### L-1: 错误信息泄露

**文件**: `src/app/api/canvas/history/route.ts`

**问题描述**:  
错误响应中暴露了 `error.message`，可能泄露内部实现细节。

**受影响代码**:
```typescript
return NextResponse.json({ error: '服务器错误', detail: error.message }, { status: 500 })
```

**修复建议**:
```typescript
// 生产环境隐藏详细错误
return NextResponse.json({ 
  error: '服务器错误',
  detail: process.env.NODE_ENV === 'development' ? error.message : undefined
}, { status: 500 })
```

---

### L-2: 内存速率限制多实例不共享

**文件**: 多处 admin/ 系列 API

**问题描述**:  
使用内存 Map 实现速率限制，在 Vercel 多 Lambda 实例环境下不共享，限制效果有限。

**受影响文件**:
- `admin/login/route.ts`
- `chat/route.ts`
- `contact/route.ts`
- `analytics/route.ts`

**修复建议**:
```typescript
// 1. 使用 Vercel KV（Redis）存储速率限制
import { kv } from '@vercel/kv'

async function checkRateLimit(key: string, limit: number, window: number): Promise<boolean> {
  const count = await kv.incr(key)
  if (count === 1) {
    await kv.expire(key, window)
  }
  return count <= limit
}

// 2. 或使用第三方服务如 Upstash
```

---

### L-3: 论坛评论分页无上限

**文件**: `src/app/api/forum/posts/[id]/route.ts`

**问题描述**:  
评论分页虽然有限制，但理论上可请求大量评论。

**修复建议**:
```typescript
const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
```

---

### L-4: Diagnose 端点暴露敏感信息

**文件**: `src/app/api/diagnose/route.ts`

**问题描述**:  
该端点暴露了数据库连接信息、IP 地址等敏感信息，虽然需要管理员权限，但仍建议在生产环境禁用。

**修复建议**:
```typescript
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
}
```

---

## 🔵 优化建议

### O-1: SQL 注入风险评估

**文件**: 多处使用 `$queryRaw` 的代码

**问题描述**:  
虽然 Prisma 的 `$queryRaw` 使用参数化查询，但仍需注意字符串拼接。

**当前状态**: 安全（使用了 Prisma 的参数化查询）

**建议**: 代码审计确认所有 `$queryRaw` 调用都使用 `${variable}` 而非直接拼接。

---

### O-2: 论坛帖子内容长度限制

**文件**: `src/app/api/forum/posts/route.ts`

**问题描述**:  
帖子内容虽有 `sanitizeForumContent` 处理，但缺少长度上限。

**修复建议**:
```typescript
if (content.length > 10000) {
  return NextResponse.json({ error: '内容过长，最多10000字' }, { status: 400 })
}
```

---

### O-3: 点赞计数 TOCTOU 竞态

**文件**: `src/app/api/forum/posts/[id]/like/route.ts`

**问题描述**:  
点赞后在事务外重新查询 `likes` 数量，存在竞态条件。

**受影响代码**:
```typescript
await prisma.$transaction([
  prisma.forumPostLike.create({ ... }),
  prisma.forumPost.update({ data: { likes: { increment: 1 } } })
])
// 事务外查询，可能与其他请求竞态
return NextResponse.json({ liked: true, likes: (await prisma.forumPost.findUnique({ where: { id: postId } }))?.likes })
```

**修复建议**:
```typescript
const result = await prisma.$transaction(async (tx) => {
  await tx.forumPostLike.create({ ... })
  const updated = await tx.forumPost.update({
    where: { id: postId },
    data: { likes: { increment: 1 } },
    select: { likes: true }
  })
  return updated
})

return NextResponse.json({ liked: true, likes: result.likes })
```

---

## 修复优先级建议

| 优先级 | 问题编号 | 严重程度 | 建议修复时间 |
|--------|----------|----------|--------------|
| P0 | H-1 | 🔴 高危 | 立即（24小时内）|
| P0 | H-2 | 🔴 高危 | 立即（24小时内）|
| P1 | H-3, H-4 | 🔴 高危 | 1周内 |
| P1 | M-1 | 🟠 中危 | 1周内 |
| P2 | M-2, M-3 | 🟠 中危 | 2周内 |
| P2 | M-4 | 🟠 中危 | 2周内 |
| P2 | M-5 | 🟠 中危 | 2周内 |
| P3 | L-1 ~ L-4 | 🟡 低危 | 1个月内 |
| P3 | O-1 ~ O-3 | 🔵 建议 | 迭代优化 |

---

## 已修复的安全问题（代码中已标注）

审计过程中发现代码中已标注了多项已修复的安全问题：

| 标注编号 | 描述 | 修复状态 |
|---------|------|---------|
| P0-1 | 隐藏错误详情 | ✅ 已修复 |
| P1-2 | 使用 crypto.randomUUID() | ✅ 已修复 |
| P2 #11 | 限制 visitorIds 数组大小 | ✅ 已修复 |
| P3 #18 | 使用 crypto.randomBytes | ✅ 已修复 |
| C-3 | 管理员凭据必须通过环境变量 | ✅ 已修复 |
| H-1 | 论坛分类创建需管理员权限 | ✅ 已修复 |
| H-3 | 用户输入转义防止 prompt 注入 | ✅ 已修复 |
| C-4 | 使用严格 HTML sanitizer | ✅ 已修复 |
| C-5 | analytics GET 仅管理员可访问 | ✅ 已修复 |

---

## 附录：审计的文件清单

### API 路由文件（49个）
- `auth/login/route.ts`
- `auth/register/route.ts`
- `auth/logout/route.ts`
- `points/click/route.ts`
- `points/route.ts`
- `points/checkin/route.ts`
- `forum/posts/route.ts`
- `forum/posts/[id]/route.ts`
- `forum/posts/[id]/comments/route.ts`
- `forum/posts/[id]/like/route.ts`
- `forum/tags/route.ts`
- `forum/categories/route.ts`
- `user/profile/route.ts`
- `user/referral/route.ts`
- `user/posts/route.ts`
- `user/canvas-stats/route.ts`
- `canvas/pixel/route.ts`
- `canvas/current/route.ts`
- `canvas/history/route.ts`
- `canvas/leaderboard/route.ts`
- `canvas/name/route.ts`
- `admin/settings/route.ts`
- `admin/canvas-template/route.ts`
- `admin/contacts/route.ts`
- `admin/batch-set-avatars/route.ts`
- `admin/canvas/[id]/route.ts`
- `admin/works/route.ts`
- `admin/works/[id]/route.ts`
- `admin/review/route.ts`
- `admin/users/route.ts`
- `admin/users/[id]/route.ts`
- `admin/batch-create-users/route.ts`
- `admin/change-password/route.ts`
- `admin/login/route.ts`
- `admin/stats/route.ts`
- `admin/upload/route.ts`
- `admin/refresh-stash/route.ts`
- `gallery/route.ts`
- `contact/route.ts`
- `chat/route.ts`
- `proxy-image/route.ts`
- `diagnose/route.ts`
- `analytics/route.ts`
- `stats/route.ts`
- `featured-works/route.ts`
- `stash/route.ts`
- `stash-175/route.ts`
- `works/route.ts`
- `works/[id]/view/route.ts`
- `site/route.ts`
- `cron/baidu-push/route.ts`
- `cron/community-post/route.ts`

### 库文件（7个）
- `lib/admin-auth.ts`
- `lib/user-auth.ts`
- `lib/prisma.ts`
- `lib/cron-auth.ts`
- `lib/points.ts`
- `lib/siteConfig.ts`
- `lib/site-constants.ts`

---

**报告生成时间**: 2026-05-10T22:53:00+08:00  
**审计工具**: QClaw 安全审计系统 v2.0
