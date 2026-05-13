# 代码深度排查报告
时间：2026-05-11 23:43 | 范围：alights.cn 全站代码

## 已确认安全（之前的安全审计已覆盖）
| 领域 | 状态 | 说明 |
|------|------|------|
| XSS（评论/留言） | ✅ | 有完整消毒逻辑 |
| XSS（AI 聊天） | ✅ | 有 prompt 注入过滤 |
| 积分双花竞态 | ✅ | SELECT FOR UPDATE 悲观锁 |
| JWT/密码 | ✅ | bcrypt + crypto.randomBytes |
| 图片代理白名单 | ✅ | 仅限 xpccdn 域名 |
| 频率限制 | ✅ | 登录/注册/联系/聊天均有 |
| CSP 头 | ✅ | next.config.js 配置 |
| ReactMarkdown | ✅ | rehype-sanitize |

## 发现的新问题
| # | 位置 | 问题 | 严重度 | 建议 |
|---|------|------|--------|------|
| 1 | middleware.ts | 缺少 `/api/*` 路径排除，`/admin/*` 无 admin-auth 保护 | 中 | middleware 应排除 `/api/*` 并对 `/admin/*` 做 session 校验 |
| 2 | /admin/page.tsx | 客户端路由保护，前端隐藏菜单不够安全 | 高 | 应由 middleware 层拦截 |
| 3 | AIChatWidget | chat API 无 session 校验（客服场景可接受） | 低 | 当前设计合理，AI 对话无需登录 |
| 4 | post/[id]/page.tsx | 评论删除按钮前端直接调用，无权限状态反馈 | 低 | DELETE 已有后端校验，但前端按钮应加 loading 状态 |
| 5 | works page | 需检查是否暴露敏感数据 | 待查 | 需确认 /api/works 是否有权限控制 |
| 6 | stash 数据 | public/stash/*.txt 和 src/data/stash*.json 是否需要清理 | 低 | 历史脚本产物，可清理 |
| 7 | scripts/ | 多个调试脚本残留（gen_100, debug_*, fetch_*） | 低 | 可清理，减少维护负担 |

## 优先级建议
1. **高** — middleware.ts 加 `/admin/*` 保护 + `/api/*` 排除
2. **中** — 清理调试脚本和旧数据文件
3. **低** — works page 数据权限检查

## Spirit 页面（持续问题）
- Spline CDN (`prod.spline.design`) 在国内网络阻塞
- React Error #482（Spline 与 React 18 不兼容）
- 场景内容：3D 机器人（用户确认）
- 待办：Three.js 替换 or 静态 fallback
