# 美食红黑榜网站实现参考指南

> 本文档记录「美食红黑榜」网站从零到上线的完整实现方式，供生成下一个类似网站时直接参考复用。

---

## 一、项目概览

- **项目类型**：美食评分社区（内容型 + 用户贡献 + 审核工作流）
- **使用场景**：个人及朋友共同使用，后续可扩展为公开社区
- **核心业务**：红榜（推荐）、灰榜（中性记录）、黑榜（避雷）三类内容
- **访问地址**：https://www.607520.xyz
- **代码仓库**：https://github.com/jiazizeng/food-rating

---

## 二、技术栈（全部免费）

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js | 16.2.12 | App Router 全栈框架 |
| 语言 | TypeScript | 5.x | 类型安全 |
| UI | React | 19.2.4 | 组件化 |
| 样式 | Tailwind CSS | 4.x | 原子化 CSS |
| 图标 | lucide-react | 1.28.0 | 开源图标 |
| 数据库 | Supabase PostgreSQL | - | 免费 500MB |
| 认证 | Supabase Auth | - | 邮箱 + OAuth |
| 存储 | Supabase Storage | - | 免费 1GB，图片上传 |
| 地图 | Leaflet + OpenStreetMap | 1.9.4 | 免费地图 |
| 部署 | Vercel | - | 免费 Hobby 计划 |
| 状态管理 | Zustand | 5.x | 轻量全局状态 |
| 通知 | react-hot-toast | 2.6.0 | Toast 提示 |

**选型理由**：全链路免费额度充足，个人项目无需付费；Next.js + Supabase 组合能在一个仓库内完成前后端、数据库、认证、存储，维护成本最低。

---

## 三、目录结构

```
food-rating/
├── public/                          # 静态资源
│   ├── manifest.json                # PWA 清单
│   ├── sw.js                        # Service Worker
│   └── icons/                       # PWA 图标（16/32/180/192/512）
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # 根布局（含 PWA meta + SW 注册）
│   │   ├── globals.css              # 全局样式
│   │   ├── page.tsx                 # 首页（内容型，非 landing page）
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx       # 登录
│   │   │   ├── register/page.tsx    # 注册
│   │   │   └── callback/page.tsx    # OAuth 回调
│   │   ├── red-list/page.tsx        # 红榜页
│   │   ├── gray-list/page.tsx       # 灰榜页
│   │   ├── black-list/page.tsx      # 黑榜页
│   │   ├── takeout/page.tsx         # 外卖专栏
│   │   ├── restaurant/[id]/         # 餐厅详情
│   │   ├── add-restaurant/page.tsx  # 添加餐厅
│   │   ├── admin/page.tsx           # 管理面板（审核）
│   │   ├── profile/page.tsx         # 个人中心
│   │   ├── map/page.tsx             # 地图
│   │   ├── search/page.tsx          # 搜索
│   │   ├── stats/page.tsx           # 统计
│   │   └── api/                     # API Routes
│   │       ├── auth/callback/route.ts
│   │       ├── favorites/route.ts
│   │       ├── restaurants/route.ts
│   │       ├── reviews/route.ts
│   │       └── stats/route.ts
│   ├── components/
│   │   ├── layout/                  # Header、Footer
│   │   ├── auth/                    # AuthForm
│   │   ├── restaurant/              # 餐厅卡片、表单、评价
│   │   ├── home/                    # 首页组件
│   │   ├── map/                     # RestaurantMap
│   │   ├── profile/                 # ProfilePanel
│   │   └── shared/                  # Loading、Pagination、Toast 等
│   ├── hooks/                       # useAuth、useRestaurants、useFavorites
│   ├── lib/
│   │   ├── constants.ts             # 常量配置
│   │   ├── utils.ts                 # 工具函数
│   │   ├── validators.ts            # 输入校验
│   │   └── supabase/                # client/server/admin 客户端
│   ├── types/index.ts               # 全局类型定义
│   └── middleware.ts                # 路由鉴权中间件
├── supabase/schema.sql              # 数据库初始化脚本
├── .env.local.example               # 环境变量模板
├── next.config.ts
├── package.json
└── README.md
```

---

## 四、数据库设计（核心）

### 表清单

| 表名 | 作用 | 关键字段 |
|------|------|---------|
| `profiles` | 用户资料 | `id`（关联 auth.users）、`role`（user/admin） |
| `restaurants` | 餐厅 | `list_type`（red/gray/black）、`status`（pending/approved/rejected）、`avg_rating` |
| `foods` | 菜品 | `restaurant_id`、`rating` |
| `reviews` | 评价 | 多维评分、`is_approved`、`list_type` |
| `comments` | 评论回复 | `review_id`、`parent_id`（支持嵌套） |
| `favorites` | 收藏餐厅 | `user_id` + `restaurant_id` |
| `dish_favorites` | 收藏菜品 | `user_id` + `food_id` |
| `browse_history` | 浏览记录 | `user_id` + `restaurant_id` |
| `review_likes` | 评价点赞 | `user_id` + `review_id` |
| `tags` | 标签 | `type`（cuisine/feature/warning） |
| `restaurant_tags` | 餐厅-标签关联 | 多对多 |
| `reports` | 举报 | `target_type`、`target_id`、`status` |

### 关键设计决策

1. **`list_type` 三态设计**（本网站核心）
   - `red` = 红榜推荐（评分 ≥ 4 星）
   - `gray` = 灰榜中性记录（无评分限制）
   - `black` = 黑榜避雷（评分 ≤ 2 星）
   - 用 CHECK 约束强制合法值：`CHECK (list_type IN ('red','black','gray'))`

2. **审核工作流**
   - 普通用户提交 → `status='pending'`
   - 管理员审核 → `status='approved'` 或 `'rejected'`
   - 管理员额外标记 `eaten_status`（已吃过/未吃过）和 `reviewed_by`

3. **评分分离**
   - 餐厅有 `avg_rating`（综合平均分，通过 `update_restaurant_stats` RPC 自动计算）
   - 评价有 4 个维度分：味道/环境/服务/性价比（1-10 分）
   - 综合分 = 各维度平均分 / 2（映射到 1-5 星）

4. **自动创建 profile**
   - 用 PostgreSQL Trigger：`auth.users` 插入时自动在 `public.profiles` 创建对应记录

---

## 五、认证系统实现

### Supabase Auth 三种客户端

```typescript
// 浏览器端（组件内）
import { createBrowserClient } from '@supabase/ssr';
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 服务端（Server Components / API Routes）
import { createServerClient } from '@supabase/ssr';
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({name,value,options}) => cookieStore.set(name,value,options)),
    },
  });
}
```

### 登录方式

- **邮箱密码登录**：`supabase.auth.signInWithPassword({ email, password })`
- **OAuth 登录**：`supabase.auth.signInWithOAuth({ provider: 'google' | 'github' })`
- **注册**：`supabase.auth.signUp({ email, password, options: { data: { username } } })`

### 路由鉴权（middleware.ts）

保护 `/profile`、`/add-restaurant`、`/admin` 三个路径。关键：用 `getSession()` 而不是 `getUser()`，因为后者会发起网络请求，国内访问 Supabase API 慢会导致误判未登录。

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (isProtected && !session) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

### 管理员判定

`useAuth` hook 从 `profiles` 表读取 `role === 'admin'`，前端据此显示管理入口和审核按钮。

---

## 六、核心功能实现

### 1. 红/灰/黑榜严格隔离（重要教训）

**问题**：曾用 `or()` 条件查询导致黑榜内容串到红榜。例如红榜查询写成 `list_type=red OR avg_rating>3.5`，导致任何高分餐厅（包括黑榜）都出现在红榜。

**正确做法**：严格按 `list_type` 筛选，不混入评分条件。

```typescript
// 红榜
query.eq('list_type', 'red').order('avg_rating', { ascending: false })
// 灰榜
query.eq('list_type', 'gray').order('created_at', { ascending: false })
// 黑榜
query.eq('list_type', 'black').order('avg_rating', { ascending: true })
```

### 2. 星级评分 + 榜单联动

- 红榜：只能选 4-5 星（锁定 1-3 星）
- 黑榜：只能选 1-2 星（锁定 3-5 星）
- 灰榜：无限制（1-5 星）

### 3. 地图导航

使用各大地图 App 的 URI Scheme，**用地址优先、名称兜底**做关键词搜索（避免坐标反查导致"店名+地址"重复显示）：

```typescript
const keyword = address || name || '目的地';
// 高德
`https://uri.amap.com/search?keyword=${encoded}&callnative=1`
// 百度
`https://map.baidu.com/search/${encoded}`
// Apple
`https://maps.apple.com/?q=${encoded}`
// Google
`https://www.google.com/maps/search/${encoded}`
```

### 4. 图片上传

用 Supabase Storage 的 `review-images` bucket，路径 `{userId}/{folder}/{timestamp}-{filename}`。

```typescript
const fileName = `${user.id}/restaurants/${Date.now()}-${file.name}`;
const { data } = await supabase.storage.from('review-images').upload(fileName, file);
const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(data.path);
```

### 5. 菜品批量添加

`RestaurantForm` 用数组 state 管理多个菜品输入，每个菜品有独立的名字/价格/评分/图片。

---

## 七、PWA 实现（本次新增）

### 1. 图标

用 `pwa.png`（1024x1024）通过 PIL 生成各尺寸图标到 `public/icons/`。

### 2. manifest.json

`public/manifest.json` 配置应用名、主题色、图标、快捷入口。

### 3. Service Worker

`public/sw.js`：
- 安装时缓存静态壳（首页、manifest、图标）
- 页面导航用 network-first（断网回退缓存）
- 静态资源用 cache-first

### 4. 注册

`ServiceWorkerRegister.tsx` 在 production 环境注册 `/sw.js`。

### 5. meta 标签

`layout.tsx` 中通过 Next.js Metadata API 配置 manifest、icons、appleWebApp、themeColor。

---

## 八、部署配置

### 环境变量（.env.local）

```
NEXT_PUBLIC_SUPABASE_URL=https://goxjhavlzugaxeegpfxj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的-anon-key
SUPABASE_SERVICE_ROLE_KEY=你的-service-role-key
```

### Vercel 部署步骤

1. 代码推到 GitHub 仓库
2. Vercel 导入仓库
3. 配置环境变量（同 .env.local）
4. 自动部署

### 域名绑定

在 Vercel 的 Domains 中添加自定义域名（如 `607520.xyz`），再到阿里云 DNS 添加 CNAME 记录指向 `cname.vercel-dns.com`。

---

## 九、踩坑记录与经验教训

1. **数据库 schema 与实际不符**：代码引用了 `eaten_date`、`updated_at` 列但数据库没有，导致更新报错。解决：删除所有对不存在列的引用。

2. **list_type 内容串榜**：`or()` 条件混入评分导致榜单互串。解决：严格 `eq('list_type', ...)`。

3. **Promise.all 元组类型限制**：TypeScript 对 Promise.all 超过 4 个元素的元组类型推断有问题。解决：拆成多个 Promise.all。

4. **中文平台 URL 解析**：美团/点评/高德有反爬和 App 深链，服务端抓取拿不到数据。结论：放弃链接抓取，改用人工输入。

5. **国内访问 Supabase 慢**：middleware 用 `getSession()` 读 cookie 而非 `getUser()` 网络请求，避免重定向循环。

6. **Python 写 TypeScript 时的转义问题**：`\n`、`\x00` 等会被 Python 解释成实际字符，破坏正则。解决：用 heredoc 直接写文件或仔细转义。

---

## 十、可复用模板（生成下一个网站）

### 最小可行技术栈

```
Next.js 16 + TypeScript + Tailwind CSS 4
+ Supabase（数据库/认证/存储）
+ Vercel（部署）
+ lucide-react（图标）
+ react-hot-toast（提示）
+ zustand（可选，全局状态）
```

### 通用启动流程

1. `npx create-next-app@latest` 初始化项目
2. 配置 Tailwind、lucide-react、Supabase
3. 创建 `supabase/schema.sql`，在 Supabase SQL Editor 执行
4. 写 `.env.local.example` 和 Supabase 客户端
5. 实现认证（邮箱 + OAuth + middleware）
6. 实现核心 CRUD 页面
7. 实现审核工作流（pending → approved/rejected）
8. 配置 Vercel + 自定义域名
9. 实现 PWA（manifest + service worker + 图标）

### 通用组件清单

- `Header`（导航 + 用户菜单）
- `Footer`（链接 + 免责声明）
- `Loading` / `EmptyState` / `Pagination`
- `AuthForm`（登录/注册）
- 列表卡片 + 详情页 + 表单
- `ServiceWorkerRegister`

---

## 十一、文件清单速查

| 功能 | 文件 |
|------|------|
| 根布局/PWA | `src/app/layout.tsx` |
| 首页 | `src/app/page.tsx` |
| 榜单页（3个） | `red-list/` `gray-list/` `black-list/` |
| 餐厅详情 | `restaurant/[id]/ClientDetail.tsx` |
| 添加餐厅 | `add-restaurant/` + `RestaurantForm.tsx` |
| 评价系统 | `ReviewForm.tsx` + `ReviewList.tsx` |
| 管理面板 | `admin/page.tsx` |
| 个人中心 | `profile/` + `ProfilePanel.tsx` |
| 认证 | `(auth)/` + `useAuth.tsx` + `middleware.ts` |
| 数据库 | `supabase/schema.sql` |
| PWA | `public/manifest.json` + `public/sw.js` |

---

*生成时间：2026-08-21*
*项目状态：已上线，PWA 已实现*
