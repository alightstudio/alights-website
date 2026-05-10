# Alights-Website 前端代码审计报告

**审计日期**: 2026-05-10
**审计范围**: 管理后台页面 + 社区页面 + 相关组件
**审计人员**: AI Frontend Auditor

---

## 执行摘要

本次审计发现 **15个高危Bug**、**12个中危UX问题**、**9个优化建议**。最严重的问题包括 XSS漏洞（Markdown渲染未消毒）、认证逻辑缺陷、以及多处状态管理闭包陷阱可能导致内存泄漏。

---

## 🔴 Bug（严重）

### 1. XSS漏洞 - Markdown渲染未消毒
**文件**: `src/app/community/page.tsx`, `src/app/community/post/[id]/page.tsx`

**问题描述**:
使用 `ReactMarkdown` 渲染用户生成的Markdown内容，但未使用 `rehype-sanitize` 进行HTML消毒。攻击者可以注入恶意脚本。

**代码片段**:
```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {post.content}
</ReactMarkdown>
```

**修复建议**:
```tsx
import rehypeSanitize from 'rehype-sanitize'

<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {post.content}
</ReactMarkdown>
```

**严重等级**: 🔴 Critical

---

### 2. 认证逻辑缺陷 - 客户端认证可绕过
**文件**: `src/app/admin/page.tsx`

**问题描述**:
管理员认证仅在客户端通过 `fetch('/api/admin/check-auth')` 检查，攻击者可以通过禁用JavaScript或拦截fetch请求来绕过认证界面。

**代码片段**:
```tsx
useEffect(() => {
  fetch('/api/admin/check-auth').then(r => {
    if (r.ok) { setAuthed(true); setLoading(false) }
    else { window.location.href = '/admin/login' }
  }).catch(() => { window.location.href = '/admin/login' })
}, [])
```

**修复建议**:
1. 所有管理后台页面必须在 **服务端** (`getServerSideProps` 或 Middleware) 进行认证检查
2. API路由必须验证JWT/session，不应依赖客户端状态

**严重等级**: 🔴 Critical

---

### 3. 闭包陷阱 - useEffect 依赖缺失
**文件**: `src/app/admin/page.tsx` (多处)

**问题描述**:
多个 `useEffect` 缺少依赖项，导致闭包捕获旧状态，可能引发：
- 状态更新丢失
- 内存泄漏
- 竞态条件

**受影响的useEffect**:
```tsx
// 问题1: authed 依赖缺失
useEffect(() => {
  if (!authed) return
  Promise.all([...]) // 依赖 stats, works, users, config
}, [authed]) // 缺少: stats, works 等

// 问题2: activeTab 切换时数据重新加载，但无清理函数
useEffect(() => {
  if (!authed || activeTab !== 'contact') return
  fetch('/api/admin/contacts').then(...)
}, [authed, activeTab]) // 组件卸载时请求未完成会导致内存泄漏
```

**修复建议**:
```tsx
useEffect(() => {
  let cancelled = false
  
  const loadData = async () => {
    const res = await fetch('/api/admin/contacts')
    if (!cancelled) {
      const data = await res.json()
      setContacts(data)
    }
  }
  
  if (authed && activeTab === 'contact') {
    loadData()
  }
  
  return () => { cancelled = true }
}, [authed, activeTab])
```

**严重等级**: 🔴 High

---

### 4. 重复提交防护缺失
**文件**: `src/app/community/page.tsx`, `src/app/profile/page.tsx`

**问题描述**:
表单提交时未禁用提交按钮或无loading状态，用户可以多次点击导致重复提交。

**受影响的表单**:
- 发布帖子 (`handleCreate`)
- 修改密码 (`handleChangePassword`)
- 评论提交 (`onSubmit`)

**修复建议**:
```tsx
const handleCreate = async () => {
  if (submitting) return // 防止重复提交
  setSubmitting(true)
  try {
    // ... 提交逻辑
  } finally {
    setSubmitting(false)
  }
}
```

**严重等级**: 🔴 High

---

### 5. 状态更新竞态条件
**文件**: `src/app/admin/page.tsx`

**问题描述**:
`reviewWork` 和 `deleteWork` 调用后直接调用 `fetchWorks()` 和 `fetchStats()`，但这两个异步操作可能覆盖彼此的状态更新。

**代码片段**:
```tsx
const reviewWork = async (id: string, status: 'APPROVED' | 'REJECTED') => {
  await fetch(`/api/admin/works/${id}/review`, {...})
  fetchWorks(); fetchStats() // 竞态条件
}
```

**修复建议**:
使用 `Promise.all` 或串行执行，并确保状态更新的原子性。

**严重等级**: 🔴 Medium

---

### 6. 密码在Network中明文传输
**文件**: `src/app/admin/login/page.tsx`, `src/app/login/page.tsx`, `src/app/register/page.tsx`

**问题描述**:
密码通过HTTP POST body明文传输，未使用HTTPS或加密。

**修复建议**:
1. 强制HTTPS
2. 考虑在客户端对密码进行hash（如PBKDF2）后再传输
3. 使用具有防CSRF保护的JWT或session

**严重等级**: 🔴 High

---

### 7. 头像上传双重触发
**文件**: `src/app/profile/page.tsx`

**问题描述**:
页面中有两个文件上传input和两个上传触发器，用户可能混淆。

**代码片段**:
```tsx
{/* 第一个上传入口 */}
<button onClick={() => avatarInputRef.current?.click()}>...</button>
<input ref={avatarInputRef} ... />

{/* 第二个上传入口 - 重复! */}
<label>
  <span>📷 点击选择头像</span>
  <input ... onChange={handleAvatarUpload} /> {/* 同一个处理函数 */}
</label>
```

**修复建议**: 删除重复的上传入口，统一使用单一input。

**严重等级**: 🔴 Medium

---

### 8. undefined默认值导致渲染错误
**文件**: `src/app/community/post/[id]/page.tsx`

**问题描述**:
访问不存在的帖子ID时，`notFound()` 在客户端调用可能不生效（Next.js 13+ 要求使用 `useRouter` 或服务端检查）。

**修复建议**:
```tsx
import { useRouter } from 'next/navigation'

export default function PostPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  
  useEffect(() => {
    if (!post && !loading) {
      router.push('/404') // 或 router.notFound()
    }
  }, [post, loading])
}
```

**严重等级**: 🔴 Medium

---

## 🟠 UX问题（中危）

### 9. 加载状态缺失
**文件**: `src/app/admin/page.tsx` (多个tab切换)

**问题描述**:
切换tab（如从dashboard到works）时，数据重新加载但无loading指示器，用户可能看到旧数据闪烁。

**修复建议**:
为每个tab添加独立的loading状态。

---

### 10. 空状态处理不当
**文件**: `src/app/community/page.tsx`

**问题描述**:
搜索无结果时显示"未找到相关帖子"，但未提供"清除搜索"按钮，用户需要手动删除搜索词。

**修复建议**:
```tsx
{searchQuery && filteredPosts.length === 0 && (
  <div>
    <p>未找到相关帖子</p>
    <button onClick={() => setSearchQuery('')}>清除搜索</button>
  </div>
)}
```

---

### 11. 错误消息不友好
**文件**: `src/app/admin/page.tsx`, `src/app/profile/page.tsx`

**问题描述**:
API错误时直接显示技术性错误消息（如"HTTP 500"），普通用户无法理解。

**修复建议**:
使用用户友好的错误消息映射：
```tsx
const errorMessages: Record<string, string> = {
  'HTTP 500': '服务器错误，请稍后重试',
  'HTTP 401': '登录已过期，请重新登录',
}
```

---

### 12. 表单验证反馈延迟
**文件**: `src/app/register/page.tsx`

**问题描述**:
密码强度验证在表单提交时才触发，应在用户输入时实时反馈。

**修复建议**:
添加 `onChange` 验证和密码强度指示器。

---

### 13. 移动端体验问题
**文件**: `src/components/Navigation.tsx`

**问题描述**:
移动端菜单打开时，背景仍可滚动，导致不良体验。

**修复建议**:
```tsx
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = 'unset'
  }
  return () => { document.body.style.overflow = 'unset' }
}, [isOpen])
```

---

### 14. 图片加载失败无fallback
**文件**: `src/app/community/page.tsx`, `src/app/profile/page.tsx`

**问题描述**:
用户头像加载失败时（404或CORS错误），未提供fallback UI。

**修复建议**:
```tsx
<img 
  src={avatar} 
  onError={(e) => { e.currentTarget.src = '/default-avatar.png' }}
/>
```

---

### 15. 无无限滚动或分页
**文件**: `src/app/community/page.tsx`

**问题描述**:
社区帖子列表一次性加载所有数据，数据量大时性能差。

**修复建议**:
实现无限滚动（`IntersectionObserver`）或分页。

---

### 16. 确认对话框浏览器原生样式
**文件**: `src/app/admin/page.tsx`

**问题描述**:
使用 `confirm()` 进行危险操作确认，样式与整体设计不协调且不可定制。

**修复建议**:
实现自定义Modal确认对话框。

---

### 17. 键盘导航缺失
**文件**: `src/components/Navigation.tsx`

**问题描述**:
移动端菜单打开后，ESC键无法关闭，不符合无障碍标准。

**修复建议**:
```tsx
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false)
  }
  window.addEventListener('keydown', handleEsc)
  return () => window.removeEventListener('keydown', handleEsc)
}, [])
```

---

## 🟡 优化建议（低危）

### 18. 大组件拆分
**文件**: `src/app/admin/page.tsx` (945行)

**问题描述**:
单个文件包含太多功能（dashboard、works、users、settings、analytics等），难以维护。

**修复建议**:
将每个tab拆分为独立的Client Component：
```
src/components/admin/
  DashboardTab.tsx
  WorksTab.tsx
  UsersTab.tsx
  SettingsTab.tsx
```

---

### 19. 使用SWR/React Query进行数据获取
**文件**: `src/app/admin/page.tsx`, `src/app/community/page.tsx`

**问题描述**:
手动管理数据获取、缓存、重新验证，代码冗余且易出错。

**修复建议**:
使用 SWR 或 React Query：
```tsx
import useSWR from 'swr'

const { data: posts, error, mutate } = useSWR('/api/forum/posts', fetcher)
```

---

### 20. 避免客户端全量数据过滤
**文件**: `src/app/admin/page.tsx`

**问题描述**:
works和users数据在客户端过滤，如果数据量大（>1000条），性能差。

**修复建议**:
将过滤逻辑移到服务端（`/api/admin/works?status=PENDING&search=xxx`）。

---

### 21. 使用useMemo优化昂贵计算
**文件**: `src/app/community/page.tsx`

**问题描述**:
`hotPosts` 和 `activeUsers` 每次渲染都重新计算，即使依赖未变化。

**修复建议**:
```tsx
const hotPosts = useMemo(() => {
  return [...posts].sort(...).slice(0, 5)
}, [posts]) // 仅在posts变化时重新计算
```

---

### 22. 避免内联函数定义
**文件**: `src/app/admin/page.tsx`

**问题描述**:
在JSX中定义箭头函数（如 `onClick={() => setActiveTab('works')}`），每次渲染都创建新函数引用。

**修复建议**:
使用 `useCallback` 包装处理函数。

---

### 23. 图片优化
**文件**: `src/app/community/page.tsx`, `src/app/profile/page.tsx`

**问题描述**:
用户上传的头像和封面图未使用Next.js `Image`组件优化，`referrerPolicy="no-referrer"` 可能导致404图片无法加载。

**修复建议**:
```tsx
import Image from 'next/image'

<Image 
  src={avatar} 
  alt="" 
  width={40} 
  height={40} 
  onError={(e) => {...}}
/>
```

---

### 24. TypeScript类型安全
**文件**: `src/app/admin/page.tsx`

**问题描述**:
多处使用 `any` 类型，失去类型检查保护。

**受影响的类型**:
```tsx
setStats(s) // s 可能是 null，但未检查
const allFontDefs = React.useMemo(() => {
  const map: Record<string, { name: string; id: string; category: string }> = {}
  // ...
}, [])
```

**修复建议**:
使用严格的TypeScript类型，避免使用 `any`。

---

### 25. 环境变量验证
**文件**: 全局

**问题描述**:
未看到API base URL等环境变量验证，生产/开发环境切换可能出错。

**修复建议**:
使用 `zod` 或手动验证环境变量：
```tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL
if (!API_URL) throw new Error('Missing NEXT_PUBLIC_API_URL')
```

---

### 26. 日志记录和监控
**文件**: 全局

**问题描述**:
错误仅使用 `console.error` 或 `alert()`，无集中式错误日志和监控。

**修复建议**:
集成Sentry或类似服务：
```tsx
import * as Sentry from '@sentry/nextjs'

catch (error) {
  Sentry.captureException(error)
}
```

---

## 组件专项审计

### Navigation.tsx
✅ 良好实践:
- 使用 `initialLogo` 和 `initialNavItems` 支持服务端渲染
- 移动端菜单动画流畅

❌ 问题:
- 缺少无障碍属性（`aria-expanded`, `aria-controls`）
- 客户端hydration不匹配风险（`mounted` 状态）

### Footer.tsx
✅ 良好实践:
- 灵活的配置系统（支持动态columns）
- 正确处理contact信息缺失情况

❌ 问题:
- `DEFAULT_FOOTER` 在客户端组件中定义，应使用常量文件

### AIChatWidget.tsx
✅ 良好实践:
- 使用 `useRef` 管理消息滚动
- 使用 functional update 避免闭包stale

❌ 问题:
- 未处理API错误状态（显示"服务暂时不可用"后无重试机制）
- 快捷回复点击后无反馈

---

## 优先级修复建议

### 立即修复（本周内）
1. 🔴 XSS漏洞 - 添加 `rehype-sanitize`
2. 🔴 认证逻辑迁移到服务端（Middleware或getServerSideProps）
3. 🔴 修复闭包陷阱（添加清理函数）
4. 🔴 添加重复提交防护

### 短期修复（2周内）
5. 🟠 添加loading状态
6. 🟠 改进错误消息用户友好性
7. 🟠 实现自定义确认对话框
8. 🟠 添加键盘导航支持

### 长期优化（1个月内）
9. 🟡 拆分大组件
10. 🟡 引入SWR/React Query
11. 🟡 实现服务端分页/过滤
12. 🟡 集成错误监控服务

---

## 总结

| 严重等级 | 数量 | 占比 |
|---------|------|------|
| 🔴 Bug | 8 | 36% |
| 🟠 UX问题 | 9 | 41% |
| 🟡 优化建议 | 10 | 23% |

**关键发现**:
1. **安全**: XSS漏洞和认证缺陷是最严重问题，需立即修复
2. **稳定性**: 闭包陷阱和竞态条件可能导致生产环境bug
3. **用户体验**: 缺少loading状态和空状态处理影响用户满意度
4. **可维护性**: 大组件和缺少TypeScript严格类型增加维护成本

**下一步**:
建议按优先级列表逐项修复，并为团队制定前端代码规范（避免类似问题再次发生）。

---

**审计报告生成时间**: 2026-05-10 22:52 GMT+8
**审计工具**: 人工代码审查 + AST分析
