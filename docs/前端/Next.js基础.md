---
title: Next.js 基础
sidebar_position: 12
description: 项目结构、四种渲染模式的写法、路由与中间件、Suspense、PWA 与部署。
---

Next.js 是 Vercel 维护的 React 框架，支持 CSR、SSR、SSG、ISR 四种渲染模式，内置文件系统路由、代码分割、图片优化、TypeScript 与 ESLint。核心依赖是 `next`、`react`、`react-dom`。

- [Next.js 中文文档](https://www.nextjs.cn/)
- [Next.js 全栈开发教程](https://juejin.cn/post/7203180600818581563)

```shell
npx create-next-app@latest
```

基本信息选择：全yes即可，方便开发

```shell
√ What is your project named? ... blog3-front
√ Which linter would you like to use? » ESLint
√ Would you like to use Tailwind CSS? ... No / Yes
√ Would you like your code inside a `src/` directory? ... No / Yes
√ Would you like to use App Router? (recommended) ... No / Yes
√ Would you like to use Turbopack? (recommended) ... No / Yes
√ Would you like to customize the import alias (`@/*` by default)? ... No / Yes
√ What import alias would you like configured? ... @/*
```

## 项目结构

[项目结构 | Next.js 中文文档](https://nextjscn.org/docs/app/getting-started/project-structure)

```plaintext
.next目录。这是Nextjs的缓存目录，在执行dev或者build等命令的时候，会在本地项目的根目录下生成此目录。
node_modules目录
public目录 默认没有二级目录，默认路径是在根目录，以类似/favicon.ico的形式使用
src目录
.eslintrc.json 主要是eslint的规则。
.gitignore git 排除文件。
next-env.d.ts nextjs的一些ts相关内容，目前只有默认引用。
next.config.js Nextjs的配置文件，这里默认只有appDir参数。
package-lock.json 项目依赖lock文件。
package.json 项目npm相关文件。
tsconfig.json。typescript相关配置文件。
```

## 渲染模式：CSR / SSR / SSG / ISR

| 模式 | 页面在哪生成 | 什么时候拿到内容 | 适合 |
|---|---|---|---|
| **CSR** 客户端渲染 | 浏览器 | 先拿到空壳，JS 执行后再请求数据 | 后台管理、登录后的页面 |
| **SSR** 服务端渲染 | 每次请求时在服务器 | 首屏 HTML 就带数据 | 内容实时、要 SEO |
| **SSG** 静态生成 | 构建时 | 首屏 HTML 就带数据，最快 | 博客、文档、营销页 |
| **ISR** 增量静态再生 | 构建时生成，之后按间隔重新生成 | 首屏是静态 HTML | 内容会变但不要求实时 |

- **CSR**：服务器只发 `index.html` 和 JS，首屏白屏时间长，SEO 差，但部署最简单（一份静态文件）。
- **SSR**：服务器按请求渲染完整 HTML，首屏快、SEO 好；代价是要有 Node 服务，且每次请求都要等数据。
- **SSG**：构建时把每个页面生成成 HTML，直接放 CDN；内容更新要重新构建。
- **ISR** 是 Next.js 在 SSG 上加的：页面照样静态发布，但超过 `revalidate` 秒后，下一个请求会触发后台重新生成。

同一套代码里可以混用：列表页 SSG、详情页 ISR、登录后的面板 CSR。

## 四种渲染模式的写法

### 1. SSG 静态站点生成（Pages Router）

```tsx
// pages/posts/[id].tsx
import { GetStaticProps, GetStaticPaths } from 'next';

interface PostProps {
  post: { id: string; title: string; content: string };
}

export default function Post({ post }: PostProps) {
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  );
}

// 构建时获取所有需要预渲染的路由
export const getStaticPaths: GetStaticPaths = async () => {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();
  const paths = posts.map((post: { id: string }) => ({ params: { id: post.id } }));

  return { paths, fallback: false }; // fallback: false 表示只预渲染paths中的路由
};

// 构建时为每个路由获取数据
export const getStaticProps: GetStaticProps = async (context) => {
  const { id } = context.params as { id: string };
  const res = await fetch(`https://api.example.com/posts/${id}`);
  const post = await res.json();

  return { props: { post } };
};
```

### 2. ISR 增量静态再生（Pages Router）

```tsx
// pages/products/[id].tsx
export const getStaticProps: GetStaticProps = async (context) => {
  const { id } = context.params as { id: string };
  const res = await fetch(`https://api.example.com/products/${id}`);
  const product = await res.json();

  // revalidate: 60 表示60秒内重新生成页面（增量更新）
  return { props: { product }, revalidate: 60 };
};
```

### 3. SSR 服务端渲染（App Router）

```tsx
// app/users/[id]/page.tsx
// App Router 中异步函数默认实现SSR
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    cache: 'no-store', // 禁用缓存，每次请求都获取最新数据
  });
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

interface UserPageProps {
  params: { id: string };
}

export default async function UserPage({ params }: UserPageProps) {
  const user = await getUser(params.id);
  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

## 页面与路由

[理解 Next.js 项目结构：文件与文件夹解析_nextjs项目结构-CSDN博客](https://blog.csdn.net/zimin1985/article/details/149834995)

### 嵌套路由和布局

- **嵌套路由**：在 `app/` 下创建子目录，如 `app/blog/post/page.tsx` 对应 `/blog/post`。
- **嵌套布局**：每个目录可以包含 `layout.tsx`，为子路由定义特定布局，支持布局嵌套复用。

#### 嵌套布局代码示例（App Router）

```tsx
// app/blog/layout.tsx 博客模块共享布局
import Link from 'next/link';

export const metadata = {
  title: 'Blog | My App',
  description: 'Blog section',
};

export default function BlogLayout({
  children, // 子路由内容（如post页面）
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <nav className="p-4 border-b">
        <Link href="/blog" className="mr-4">Blog Home</Link>
        <Link href="/blog/post/1">Sample Post</Link>
      </nav>
      <main className="p-4">{children}</main>
    </div>
  );
}
```

### Pages Router

pages/ 目录是 Pages Router 的核心，每个文件直接映射为路由。作用：定义页面和 API 路由。

路由规则：

- index.js 对应 /。
- about.js 对应 /about。
- [slug].js 对应动态路由 /:slug。
- api/hello.js 对应 /api/hello。

### 动态路由

Next.js 支持具有动态路由的 pages（页面）。例如，如果你创建了一个命名为 `pages/posts/[id].js` 的文件，那么就可以通过 `posts/1`、`posts/2` 等类似的路径进行访问。

#### App Router 动态路由参数获取

```tsx
// app/posts/[id]/page.tsx
'use client'; // 客户端组件（如需使用useState等Hooks）
import { useParams } from 'next/navigation';

export default function PostPage() {
  // 获取动态路由参数id
  const params = useParams();
  const postId = params.id as string; // TypeScript类型断言

  const [post, setPost] = React.useState(null);
  React.useEffect(() => {
    fetch(`/api/posts/${postId}`)
      .then(res => res.json())
      .then(data => setPost(data));
  }, [postId]);

  if (!post) return <p>Loading...</p>;
  return <h1>{post.title}</h1>;
}
```

#### 动态路由预渲染配置（App Router）

```tsx
// app/posts/[id]/page.tsx
// 静态生成动态路由（类似getStaticPaths）
export async function generateStaticParams() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();
  return posts.map((post: { id: string }) => ({
    id: post.id,
  }));
}

// 静态获取数据（构建时执行）
async function getPost(id: string) {
  const res = await fetch(`https://api.example.com/posts/${id}`, {
    cache: 'force-cache', // 默认缓存
  });
  return res.json();
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return (
    <div>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </div>
  );
}
```

### 私有与共有

私有文件夹可以通过在文件夹前加上下划线来创建：`_folderName` 这表示该文件夹是私有实现细节，不应被路由系统考虑，从而**选择该文件夹及其所有子文件夹**退出路由。

### 两种路由方式对比

| 特性       | App Router                                | Pages Router                      |
| :--------- | :---------------------------------------- | :-------------------------------- |
| 路由目录   | app/                                      | pages/                            |
| 布局支持   | 嵌套布局（layout.tsx）                    | 全局布局（_app.js）               |
| 服务器组件 | 默认支持                                  | 不支持                            |
| 动态路由   | app/[slug]/page.tsx                       | pages/[slug].js                   |
| API 路由   | 需使用 Route Handlers（app/api/route.ts） | pages/api/                        |
| 数据获取   | 异步组件（默认SSR）                       | getStaticProps/getServerSideProps |
| 适用场景   | 新项目、复杂布局、现代特性                | 现有项目、简单路由                |

```text
my-nextjs-app/
├── app/
│   ├── api/
│   │   ├── route.ts  // API路由（Route Handler）
│   ├── [slug]/
│   │   ├── page.tsx  // 动态页面
│   ├── layout.tsx    // 根布局（服务器组件默认）
│   ├── page.tsx      // 首页
├── components/       // 共享组件
│   ├── Header.tsx
│   ├── Footer.tsx
├── lib/              // 工具函数、API客户端
│   ├── api.ts        // axios封装
│   ├── utils.ts
├── styles/           // 样式文件
│   ├── globals.css
├── public/           // 静态资源
├── types/            // TypeScript类型定义
│   ├── index.ts 
├── next.config.js    // Next.js配置
├── tsconfig.json     // TypeScript配置
```

`.tsx` 文件通常用于定义组件，既可以使用 TypeScript 的类型系统约束变量、函数和组件的 props 等，又能通过 JSX 语法描述组件的结构和外观。

### API 路由实现（Route Handler）

```tsx
// app/api/posts/route.ts
import { NextResponse } from 'next/server';

// 定义请求/响应类型
interface Post {
  id: string;
  title: string;
  content: string;
}

// GET请求
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // 模拟数据库查询
  const posts: Post[] = [
    { id: '1', title: 'First Post', content: 'Hello Next.js' },
    { id: '2', title: 'Second Post', content: 'App Router' },
  ];

  const result = id ? posts.find(p => p.id === id) : posts;
  return NextResponse.json(result);
}

// POST请求
export async function POST(request: Request) {
  const newPost = await request.json() as Omit<Post, 'id'>;
  const postWithId = { ...newPost, id: Date.now().toString() };
  
  // 模拟保存到数据库
  console.log('Saving post:', postWithId);
  return NextResponse.json(postWithId, { status: 201 });
}
```

对于大多数Next.js项目来说，fetch 就足够了，并且与框架的极简主义理念非常吻合。若需更强大的请求能力（如拦截器、请求取消），可使用axios封装API客户端。

#### axios API客户端封装（lib/api.ts）

```tsx
import axios from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// 请求拦截器：添加认证token
apiClient.interceptors.request.use(
  (config) => {
    // 客户端环境下获取token（避免服务器组件报错）
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一错误处理
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 处理401未授权（跳转登录）
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || 'Request failed');
  }
);

// 封装请求方法
export const api = {
  get: <T>(url: string, params?: any) => apiClient.get<T>(url, { params }),
  post: <T>(url: string, data?: any) => apiClient.post<T>(url, data),
  put: <T>(url: string, data?: any) => apiClient.put<T>(url, data),
  delete: <T>(url: string) => apiClient.delete<T>(url),
};

// 使用示例（客户端组件）
// const fetchPosts = async () => {
//   const posts = await api.get<Post[]>('/posts');
//   setPosts(posts);
// };
```

### 未挂载NextRouter

[未挂载“NextRouter” |Next.js](https://nextjs.org/docs/messages/next-router-not-mounted)

报错原因：在服务器组件或组件挂载前使用NextRouter（如useRouter）。 解决方案：1. 标记组件为'use client'；2. 在useEffect中使用路由方法；3. App Router推荐使用useParams/useRouter（from 'next/navigation'）。

## 中间件

[中间件 (Middleware) | Next.js 简体中文](https://zh-hans.nextjs.im/docs/pages/building-your-application/routing/middleware)

### 中间件核心用法（App Router）

作用：拦截请求、路由守卫、修改响应等，运行在边缘网络。

```tsx
// middleware.ts（项目根目录）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. 获取认证token
  const token = request.cookies.get('authToken')?.value;

  // 2. 路由守卫：未登录用户跳转登录页
  const isLoginPage = request.nextUrl.pathname === '/login';
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. 已登录用户禁止访问登录页
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. 为响应添加自定义头
  const response = NextResponse.next();
  response.headers.set('X-Custom-Header', 'Next.js Middleware');
  return response;
}

// 配置中间件生效的路由
export const config = {
  matcher: ['/', '/login', '/dashboard/:path*'],
};
```

## Suspense 边界管理

服务端预渲染 → 客户端补全，Suspense 用于优雅处理组件加载状态（如数据请求、代码分割）。

### Suspense 代码示例

```tsx
// app/page.tsx
import { Suspense } from 'react';
import Loading from '@/components/Loading';
// 动态导入组件（代码分割）
const HeavyComponent = React.lazy(() => import('@/components/HeavyComponent'));

// 异步组件（数据请求）
async function DataComponent() {
  const data = await fetch('https://api.example.com/data').then(res => res.json());
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      {/* 1. 包裹异步组件，加载时显示Loading */}
      <Suspense fallback={<Loading />}>
        <DataComponent />
      </Suspense>
      {/* 2. 包裹动态导入组件 */}
      <Suspense fallback={<p>Loading heavy component...</p>}>
        <HeavyComponent />
      </Suspense>
    </div>
  );
}
```

## PWA

[配置：渐进式 Web 应用 (PWA) | Next.js 框架](https://nextjs.net.cn/docs/app/building-your-application/configuring/progressive-web-apps)

## 部署

[如何部署你的 Next.js 应用 | Next.js 简体中文](https://zh-hans.nextjs.im/docs/pages/getting-started/deploying)

### Node.js部署
npm run build ，上传所有文件到服务器，运行：npm run start 
**`.next` 目录的特性**：
- 该目录是「构建产物」，不建议手动修改（修改后可能导致页面异常），所有代码变更应在项目源码（如 `app/` 目录）中进行，再重新执行 `npm run build` 生成新的 `.next`。
### 静态打包部署
**不能有server组件。静态打包不支持动态路由。**
```javascript
'use server'
```
只用了next.js静态部分，没用到api服务，官方提供了静态打包方式。
在配置文件next.config.ts中添加output: ‘export’
再执行npm run build打包
打包后，可以看到根目录下生成了out文件夹，拷贝out到服务器
[部署：静态导出 | Next.js 框架](https://nextjs.net.cn/docs/app/building-your-application/deploying/static-exports)
