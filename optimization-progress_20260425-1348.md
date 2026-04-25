# 网站优化进展 (2026-04-25 第2轮)

## ✅ 已完成 (新增)

### 第8项 - Gallery 移动端标签优化
- 桌面端保留水平 tab bar（隐藏 md 以下）
- 移动端改为**两组分类按钮**（最新收藏 170-176 / 早期收藏 160-169）
- 使用小标签按钮，支持换行，适合触屏操作
- 不再需要横向滚动 17 个 tab

### 第4项 - 网站英文版切换
- 创建 `src/lib/LanguageContext.tsx`（React Context + localStorage 持久化）
- `layout.tsx` 包裹 `<LanguageProvider>`
- 导航栏新增 `EN/中文` 切换按钮（桌面端在菜单栏 + 移动端在汉堡菜单底部）
- 主页所有区块（Hero / About / Services / Brands / Works / Contact）根据语言切换显示内容
- 保留双语数据在 siteConfig 中（titleEn/subtitleEn/descEn 等）

## ✅ 已完成 (第1轮)

1. 死代码清理 (AdminContent.tsx × 2)
3. SEO 元数据动态化 (generateMetadata + Prisma)
5. 关于页面骨架屏 + 动态配置 + 错误态
6. 导航/页脚闪烁修复 (默认值预填充)
7. 作品页面骨架屏 (网格布局)
8. Gallery 移动端标签优化

## 📅 剩余待办

| # | 项目 | 难度 | 备注 |
|---|------|------|------|
| 2 | Admin 页面拆分 | 中 | 1268 行单文件 |
| 9 | 图片优化开启 | 低风险 | `images.unoptimized: true` 需测试 |
| 10 | 代码分割优化 | 中 | 需恢复 splitChunks |
| — | CTA 英文版各子页面 | 中 | about/works/contact/gallery 等还有硬编码中文 |

## 技术笔记
- `LanguageContext.tsx` 使用 `'use client'` 避免 SSR 问题
- 语言选择存储在 `localStorage('alights_lang')`
- 所有语言切换目前只在主页实现，子页面还未覆盖
