# alights-website 代码深度检查报告

生成时间：2026-05-22  
检查范围：全量源代码（src/、prisma/、配置文件）

---

## 一、严重问题（Critical）

### 1. 无 CSRF 防护
- **位置**：所有写操作 API（`/api/contact`、`/api/auth/*`、`/api/forum/*` 等）
- **问题**：没有 CSRF Token 验证，攻击者可构造恶意页面诱导用户发起跨站请求
- **建议**：
  - 对 `POST/PUT/PATCH/DELETE` 请求验证 `Origin` / `Referer` 头
  - 或使用 `csrf` / `next-csrf` 库生成/验证 Token
  - 或开启 SameSite=Lax（已开启，但不够）

### 2. 无统一输入验证（无 Zod）
- **位置**：几乎所有 API Route
- **问题**：未发现 Zod / Joi / yup 等 Schema 校验库，依赖手动 `if (!field)` 判断，容易遗漏
- **风险**：字段缺失、类型错误、边界值可能导致运行时异常或数据污染
- **建议**：引入 `zod` 对所有 API 请求体做 Schema 校验

### 3. RateLimitEntry 存数据库（serverless 性能问题）
- **位置**：`prisma/schema.prisma` → `RateLimitEntry` 模型；`src/lib/rate-limit.ts`
- **问题**：每次请求都读写数据库来统计速率，Vercel Serverless 下数据库连接数易耗尽
- **建议**：改用 Redis（Vercel KV / Upstash Redis）

---

## 二、高风险问题（High）

### 4. 依赖严重过期（有 Breaking Change 风险）
```
Prisma      5.22 → 7.8   ⚠️ 大版本跳跃，Schema 语法可能变化
Next.js     14.2 → 16.2  ⚠️ App Router / Route Handler 可能不兼容
React       18.3 → 19.2  ⚠️ 新并发特性，部分三方库可能不兼容
@types/react 18 → 19     ⚠️ 类型定义变化
```
- **建议**：分批升级，先 Prisma → Next.js → React，每步跑全量测试

### 5. CSP 含 `'unsafe-inline'` 脚本白名单
- **位置**：`next.config.ts` → `Content-Security-Policy`
- **问题**：`script-src 'self' 'unsafe-inline'` 允许内联脚本，XSS 攻击仍可执行
- **建议**：移除 `'unsafe-inline'`，改用 `nonce-${crypto.randomUUID()}` 动态 nonce

### 6. 缺少全局 Error Boundary
- **位置**：`src/app/**` 各路由
- **问题**：仅 `src/app/lab/spirit/page.tsx` 有 `SplineErrorBoundary`，其余页面组件崩溃会白屏
- **建议**：为每个 `page.tsx` 添加 `error.tsx`（Next.js 内置 Error Boundary 支持）

### 7. 论坛/社区内容缺少敏感词过滤
- **位置**：`/api/forum/posts/route.ts`、`/api/forum/posts/[id]/comments/route.ts`
- **问题**：虽有 `sanitize-html` 防 XSS，但无敏感词/垃圾信息过滤
- **建议**：接入腾讯云天御 / 百度内容审核 API

---

## 三、中风险问题（Medium）

### 8. Prisma Schema 改进建议
| 模型 | 问题 | 建议
|------|------|------
| `SiteConfig.value` | `String`（手动 JSON.stringify）| 改用 `Json` 类型（Prisma 4+ 支持）|
| `Work` / `ForumPost` | 无软删除标志 | 添加 `deletedAt: DateTime?` 以便恢复
| `MarketplaceListing` | 缺少出价历史表 | 新建 `Bid` 模型，记录每次出价
| `User.password` | 哈希存储 ✅（bcrypt）| 建议加盐轮数从 10 提升至 12

### 9. API 响应格式不统一
- **问题**：部分接口返回 `{ success: true }`，部分返回 `{ error: '...' }`，部分直接返回数据
- **建议**：统一响应格式，如 `{ code: 0, data: ..., message: '...' }`

### 10. 环境变量校验缺失
- **位置**：`src/lib/admin-auth.ts`（仅生产环境检查 `ADMIN_JWT_SECRET`）
- **问题**：其他环境变量（`DATABASE_URL`、`OPENAI_API_KEY`、`BLOB_` 等）未做启动时校验
- **建议**：使用 `@t3-oss/env-core` 或 `zod` 做环境变量 Schema 校验

### 11. 图片优化未开启
- **位置**：`next.config.ts` → `images.unoptimized: true`
- **问题**：关闭了 Next.js 内置图片优化，所有图片原图传输
- **建议**：设为 `false`，配合 `next/image` 组件自动优化

---

## 四、低风险问题（Low）

### 12. ESLint 配置未迁移到 v9 格式
- `.eslintrc.json` 仍使用旧格式，ESLint v9+ 要求 `eslint.config.js`
- 建议按官方 Migration Guide 迁移

### 13. `next.config.ts` 中 `Referrer-Policy` 值非最优
- 当前：`strict-origin-when-cross-origin`
- 建议：`no-referrer-when-downgrade` 或 `same-origin`（更严格）

### 14. `xlsx` Skill 依赖 `useStreaming` 实验性 API
- 位置：`{managed_skill_dir}/xlsx/SKILL.md`（非项目代码，但影响部署）
- 无风险，仅记录

---

## 五、做得好的地方（Positive Findings）✅

| 项目 | 位置 | 说明 |
|------|------|------|
| 密码 bcrypt 哈希 | `src/app/api/auth/*/route.ts` | ✅ 无明文存储 |
| HMAC 恒定时间比较 | `admin-auth.ts`、`middleware.ts` | ✅ 防 Timing Attack |
| XSS 防护 | `sanitize-html` | ✅ 论坛/评论均有过滤 |
| Cookie 安全标志 | `admin/login/route.ts` | ✅ httpOnly + secure + sameSite |
| CSP 安全头 | `next.config.ts` | ✅ HSTS / X-Frame-Options 等均已配置 |
| Rate Limit | `lib/rate-limit.ts` | ✅ 登录/注册/聊天均有速率限制 |
| TypeScript `strict: true` | `tsconfig.json` | ✅ 类型安全 |
| `.env` 在 `.gitignore` | `.gitignore` | ✅ 无密钥泄露风险 |
| 管理员路由鉴权 | 所有 `/api/admin/*` | ✅ 均有 `verifyAdminSession()` |
| SEO Metadata | `layout.tsx` | ✅ Open Graph / Twitter Card 已配置 |

---

## 六、修复优先级建议

| 优先级 | 项目 | 预计工时 |
|--------|------|----------|
| P0 | 添加 CSRF 防护 | 2h |
| P0 | 引入 Zod 统一输入验证 | 4h |
| P1 | 升级过期依赖（Prisma → Next.js → React）| 1-2天 |
| P1 | 移除 CSP `unsafe-inline`，改用 nonce | 3h |
| P1 | 为所有路由添加 `error.tsx` | 2h |
| P2 | `RateLimitEntry` 迁移到 Redis | 3h |
| P2 | Prisma Schema 改进（`Json` 类型、软删除）| 2h |
| P3 | 图片优化开启 | 1h |
| P3 | ESLint 配置迁移 | 1h |

---

*本报告由 AI 辅助生成，建议人工复核关键安全项后再上线。*
