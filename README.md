# 🍜 美食红黑榜

一个免费的美食评分社区网站，支持红榜推荐和黑榜避雷，基于 Next.js + Supabase + Vercel 构建。

## ✨ 功能特性

- **美食红黑榜** — 红榜推荐高分餐厅，黑榜曝光踩坑店铺
- **用户系统** — 邮箱注册/登录，支持 Google、GitHub OAuth
- **餐厅数据库** — 完整餐厅信息（名称、地址、菜系、价格、坐标等）
- **评价系统** — 1-5 星评分、文字评价、图片上传、标签标记
- **互动功能** — 点赞、回复、举报
- **收藏功能** — 收藏喜爱的餐厅，个人中心统一管理
- **美食地图** — Leaflet + OpenStreetMap 地图展示附近餐厅
- **数据统计** — 红黑榜 TOP10、城市美食排行
- **响应式设计** — 完美适配电脑和手机

## 🏗 技术栈

| 层级       | 技术                                | 说明          |
| ---------- | ----------------------------------- | ------------- |
| 前端框架   | Next.js 16 + React 19 + TypeScript  | App Router    |
| 样式       | Tailwind CSS 4                      | 实用优先      |
| 图标       | Lucide React                        | 开源图标库    |
| 数据库     | Supabase PostgreSQL                 | 免费 500MB    |
| 认证       | Supabase Auth                       | 免费 50k MAU  |
| 文件存储   | Supabase Storage                    | 免费 1GB      |
| 地图       | Leaflet + OpenStreetMap             | 完全免费      |
| 部署       | Vercel                              | 免费 Hobby    |

## 📦 项目结构

```
food-rating/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.tsx            # 首页
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   ├── (auth)/             # 认证页面
│   │   ├── red-list/           # 红榜页
│   │   ├── black-list/         # 黑榜页
│   │   ├── restaurant/[id]/    # 餐厅详情页
│   │   ├── profile/            # 个人中心
│   │   ├── stats/              # 数据统计
│   │   ├── map/                # 美食地图
│   │   ├── search/             # 搜索页
│   │   ├── add-restaurant/     # 添加餐厅
│   │   └── api/                # API 路由
│   ├── components/             # React 组件
│   │   ├── layout/             # Header, Footer
│   │   ├── auth/               # 认证表单
│   │   ├── restaurant/         # 餐厅卡片、评价等
│   │   ├── home/               # 首页组件
│   │   ├── map/                # 地图组件
│   │   ├── profile/            # 个人中心
│   │   └── shared/             # 通用组件
│   ├── hooks/                  # 自定义 Hooks
│   ├── lib/                    # 工具函数
│   │   └── supabase/           # Supabase 客户端
│   ├── types/                  # TypeScript 类型定义
│   └── middleware.ts           # 路由中间件
├── supabase/
│   └── schema.sql              # 数据库初始化脚本
├── .env.local.example          # 环境变量模板
├── next.config.ts              # Next.js 配置
└── README.md
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/food-rating.git
cd food-rating
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置 Supabase

1. 访问 [supabase.com](https://supabase.com) 注册并创建项目
2. 在 SQL Editor 中执行 `supabase/schema.sql` 初始化数据库
3. 在 Authentication > Providers 中启用 Email 和 OAuth（Google、GitHub）
4. 在 Storage 中创建三个公开存储桶：
   - `restaurant-images` — 餐厅图片
   - `review-images` — 评价图片
   - `avatars` — 用户头像
5. 进入 Settings > API，复制 `Project URL` 和 `anon public key`

### 4. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入 Supabase 的 URL 和 Key：

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 查看效果。

## 🚢 部署到 Vercel

### 方法一：GitHub 自动部署（推荐）

1. 将项目推送到 GitHub
2. 登录 [vercel.com](https://vercel.com)，点击 **Import Project**
3. 选择你的 GitHub 仓库
4. 在环境变量中填入以下三个变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. 点击 **Deploy**

每次推送 `main` 分支，Vercel 会自动重新部署。

### 方法二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

根据提示完成部署。

### 配置自定义域名

1. 在 Vercel Dashboard > Settings > Domains 中添加域名
2. 按提示配置 DNS 记录
3. 在 Supabase Authentication > URL Configuration 中更新 Site URL 为重定向 URL

## 🔒 Supabase 安全配置

1. **Row Level Security（RLS）** — schema.sql 已配置所有表的 RLS 策略
2. **Storage 权限** — 确保存储桶的 RLS 策略正确配置
3. **认证设置** — 在 Supabase Auth Settings 中：
   - 关闭 "Allow anonymous sign-ins"（不开启匿名登录）
   - 配置 OAuth 回调 URL：`https://your-domain.com/callback`
   - 设置最小密码长度

## 📱 功能路线图

- [x] 用户注册登录（邮箱 + OAuth）
- [x] 餐厅增删改查
- [x] 红黑榜评分系统
- [x] 图片上传
- [x] 收藏功能
- [x] 评论回复
- [x] 举报系统
- [x] 数据统计
- [x] 美食地图
- [x] 搜索筛选
- [ ] 管理员后台面板
- [ ] 手机号登录
- [ ] PWA 支持
- [ ] 国际化（英文版）
- [ ] 活动/促销信息

## 📄 License

MIT
