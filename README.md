# Alights 官网

西安栖光文化传播有限公司官方网站

## 技术栈

- **框架:** Next.js 14 (App Router)
- **样式:** Tailwind CSS
- **动画:** Framer Motion
- **语言:** TypeScript
- **数据库:** PostgreSQL (Prisma ORM)
- **AI:** OpenAI API

## 开始使用

### 1. 安装依赖

\`\`\`bash
npm install
\`\`\`

### 2. 运行开发服务器

\`\`\`bash
npm run dev
\`\`\`

打开 [http://localhost:3000](http://localhost:3000) 查看网站

### 3. 构建生产版本

\`\`\`bash
npm run build
npm start
\`\`\`

## 项目结构

\`\`\`
alights-website/
├── src/
│   ├── app/
│   │   ├── page.tsx          # 首页
│   │   ├── layout.tsx        # 根布局
│   │   ├── globals.css       # 全局样式
│   │   ├── works/            # 作品集页面
│   │   ├── about/            # 关于我们页面
│   │   └── contact/          # 联系方式页面
│   └── components/
│       ├── Navigation.tsx    # 导航栏
│       └── Footer.tsx        # 页脚
├── public/                   # 静态资源
├── package.json
├── tailwind.config.js
└── tsconfig.json
\`\`\`

## 功能模块

- ✅ 响应式设计（移动端适配）
- ✅ 暗调极简风格
- ✅ 流畅动画效果
- ✅ 作品集展示（分类筛选）
- ✅ 在线咨询表单
- 🚧 AI 自动回复（开发中）
- 🚧 后台管理系统（开发中）
- 🚧 视频赏析库（开发中）

## 部署

### Vercel（推荐）

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置域名 alights.cn

### 云服务器

1. 构建项目：`npm run build`
2. 使用 PM2 运行：`pm2 start npm --name "alights" -- start`
3. 配置 Nginx 反向代理

## 环境变量

创建 `.env.local` 文件：

\`\`\`
# OpenAI API（AI 回复功能）
OPENAI_API_KEY=your_key_here

# 数据库连接
DATABASE_URL=your_db_url_here
\`\`\`

## 联系方式

- 电话：15091855505
- 邮箱：184436962@qq.com
- 域名：alights.cn

---

**西安栖光文化传播有限公司**  
专业视效制作 · 光影叙事艺术
