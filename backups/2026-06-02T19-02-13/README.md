# alights.cn 数据库备份

**备份时间：** 2026-06-03 03:02 (Asia/Shanghai)
**数据库：** Neon PostgreSQL (ep-hidden-star-amsp16xn-pooler)
**项目：** alights-website

## 备份内容

| 表名 | 记录数 | 说明 |
|------|--------|------|
| User | 18 | 用户注册信息 |
| SiteConfig | 19 | 网站设置 |
| Contact | 1 | 联系表单 |
| ForumCategory | 7 | 社区分类 |
| ForumPost | 106 | 社区帖子 |
| ForumTag | 229 | 标签 |
| ForumPostTag | 316 | 帖子-标签关联 |
| ForumPostLike | 2 | 帖子点赞 |
| ForumComment | 0 | 帖子评论 |
| PointsRecord | 35 | 积分记录 |
| SiteAnalytics | 123 | 访问统计 |
| Canvas | 49 | 像素画板周期 |
| Pixel | 202,399 | 像素数据 |
| CanvasExpansion | 1 | 画板扩张记录 |
| Transaction | 1,581 | 像素交易记录 |
| RateLimitEntry | 245 | 速率限制 |

**总计：205,131 条记录，22 张表**

## 文件说明

- `*.json` — 每张表的完整数据（JSON 格式）
- `schema-and-data.sql` — SQL INSERT 语句（不含 Pixel 表）
- `_summary.json` — 备份摘要

## 恢复方式

### JSON 恢复
导入到 Prisma 或手动处理。

### SQL 恢复
```bash
psql "$DATABASE_URL" < schema-and-data.sql
```
注意：Pixel 表需从 Pixel.json 单独恢复。

## 未备份的表

- `VideoReview` / `ReviewComment` — 表尚未创建（Schema 已定义，迁移未执行）
- `Work` / `WorkView` / `Review` — 表为空
- `MarketplaceListing` / `Referral` / `CanvasPixelCount` — 表为空
