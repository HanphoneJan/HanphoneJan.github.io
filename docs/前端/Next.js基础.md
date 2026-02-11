

“基于 React 的服务端渲染（SSR）/ 静态站点生成（SSG）框架”

1. **渲染模式优化**：支持 SSR（服务端渲染）、SSG（静态站点生成）、ISR（增量静态再生）、CSR（客户端渲染），核心目标是提升前端页面的性能和 SEO 表现；
2. **前端工程化**：内置路由（文件系统路由）、代码分割、图片优化、TypeScript 支持、ESLint 集成等，简化前端开发流程；

[Next.js - React 应用开发框架 | Next.js中文网](https://www.nextjs.cn/)   由vercel维护支持

[Nextjs全栈详细开发教程，完整版Nextjs是一个使用react作为前端框架底层的支持SSR(请求时渲染)、SSG( - 掘金](https://juejin.cn/post/7203180600818581563)

内置对sass，tailwindcss，css-in-js的支持，内置状态管理。推荐创建`typescript`加持下的项目，有更好的开发体验和对项目更高的掌控力。项目核心依赖库`next`、`react`、`react-dom`三个库。

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


## Next.js 渲染模式代码实现

#### 1. SSG 静态站点生成（Pages Router）

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

#### 2. ISR 增量静态再生（Pages Router）

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

#### 3. SSR 服务端渲染（App Router）

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

## 状态管理

`useState` 是 React 提供的最基础的状态管理 Hook，适用于组件内部状态

### 1. Context API 跨组件状态共享

Context 提供了一种在组件树中共享数据的方式，无需逐层传递Props。

```tsx
// src/contexts/AuthContext.tsx
'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

// 定义Context类型
interface User {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (name: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// 创建Context（默认值用于类型提示，实际由Provider提供）
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 创建Provider组件
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (name: string) => {
    // 模拟登录逻辑
    const mockUser = { id: Date.now().toString(), name };
    setUser(mockUser);
    localStorage.setItem('user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // 组件挂载时从本地存储恢复状态
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

// 自定义Hook简化使用
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

#### Context 使用示例

```tsx
// 1. 在根布局中包裹Provider
// app/layout.tsx
import { AuthProvider } from '@/src/contexts/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

// 2. 在组件中使用
// app/login/page.tsx
'use client';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');

  // 已登录则跳转首页
  React.useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(name);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
```



Context 的作用域由其「提供者（Provider）」在组件树中的位置决定。只有被 Provider 包裹的子组件（包括深层嵌套组件）才能访问该 Context 的数据，未被包裹的组件无法获取。React 组件树是**自上而下渲染**的：

- 父组件先初始化，再渲染子组件。
- Context Provider 必须包裹使用它的组件，且 Provider 会先于子组件初始化。

## 生命周期管理

页面刷新会导致 React 组件完全重新挂载（从 `constructor` 到 `render` 再到 `useEffect` 执行）

### 类组件与函数组件生命周期对比

| 类组件生命周期       | 函数组件等效实现（Hooks）                | 作用                               |
| :------------------- | :--------------------------------------- | :--------------------------------- |
| componentDidMount    | useEffect(() => {}, [])                  | 组件挂载后执行（初始化请求、订阅） |
| componentDidUpdate   | useEffect(() => {}, [依赖项])            | 依赖项变化时执行（更新后操作）     |
| componentWillUnmount | useEffect(() => { return () => {} }, []) | 组件卸载前执行（清理资源）         |

#### 生命周期清理示例

```tsx
const SubscriptionComponent = () => {
  const [data, setData] = React.useState('');

  React.useEffect(() => {
    // 订阅数据
    const subscription = someService.subscribe((newData) => {
      setData(newData);
    });

    // 清理函数：组件卸载或依赖变化前执行
    return () => {
      subscription.unsubscribe(); // 取消订阅
    };
  }, []); // 空依赖：只执行一次

  return <p>{data}</p>;
};
```

## 图标

### lucide-react

图标库Lucide

[What is Lucide? | Lucide](https://lucide.dev/guide/)

#### Lucide 使用示例

```tsx
// 1. 安装
// npm install lucide-react

// 2. 组件中使用
import { Search, User, LogOut } from 'lucide-react';

export default function IconDemo() {
  return (
    <div className="flex items-center gap-4">
      <Search size={20} color="#666" />
      <User size={24} strokeWidth={1.5} />
      <button className="flex items-center gap-2">
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </div>
  );
}
```

### font-awesome

[CSS 如何在 Next.js 项目中添加 Font Awesome|极客教程](https://geek-docs.com/css/css-ask-answer/918_css_how_to_add_font_awesome_to_nextjs_project.html)

```shell
npm install --save @fortawesome/fontawesome-svg-core
npm install @fortawesome/free-solid-svg-icons
npm install --save @fortawesome/free-brands-svg-icons
npm install @fortawesome/react-fontawesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

export default function FontAwesomeDemo() {
  return (
    <div>
      <FontAwesomeIcon icon={faPen} className="text-blue-500" />
      <FontAwesomeIcon icon={faTrash} className="text-red-500 ml-2" />
      <a href="https://github.com" target="_blank" rel="noreferrer">
        <FontAwesomeIcon icon={faGithub} size="2x" />
      </a>
    </div>
  );
}
```


## 样式

### tailwind.css

浏览器默认的 样式被覆盖的原因是 **Tailwind CSS 的基础样式重置** 和 **自定义 prose 类样式** 的共同作用
标题没有样式(Headings are unstyled
有序和无序列表默认无样式，没有项目符号或数字：
默认情况下，所有标题元素均完全未设置样式，并且具有与普通文本相同的字体大小和粗细
[预检 - 基本样式 - Tailwind CSS 中文网](https://tailwind.nodejs.cn/docs/preflight)

```
User Request
    ↓
Next.js Server → Server Components (JSX + Tailwind classes)
    ↓
Tailwind CSS compiled at build-time (only used classes included)
    ↓
Optimized HTML + Single CSS bundle sent to client
    ↓
Browser caches CSS; Fast subsequent page loads
```

原代码中直接导入 `globals.css` 会导致样式全局生效（这是 Next.js 全局样式的特性）。最彻底的隔离方案是使用 **CSS Modules** 或 **CSS-in-JS**，推荐优先选择 CSS Modules，它既能保持 CSS 书写习惯，又能实现样式隔离
### ant-design


无法找到模块“md5”的声明文件。“e:/front-project/blog3-front/node_modules/md5/md5.js”隐式拥有 "any" 类型。 尝试使用 `npm i --save-dev @types/md5` (如果存在)，或者添加一个包含 `declare module 'md5';` 的新声明(.d.ts)文件

1. `md5` 库本身是用 JavaScript 编写的，没有自带 TypeScript 类型定义
2. TypeScript 需要类型定义文件来提供类型检查和代码提示
3. 当找不到类型定义时，TypeScript 会默认将模块视为 `any` 类型，并抛出这个提示

```shell
npm install --save-dev @types/md5
```


### FramerMotion/React-Spring

[Motion for React — Install & first React animation | Motion](https://motion.dev/docs/react)

强大的动画库

### Echarts

图标库

[快速上手 - 使用手册 - Apache ECharts](https://echarts.apache.org/handbook/zh/get-started/)

GeoJSON是一种基于JSON的地理编码格式，用于表示地理空间信息。
一个GeoJSON文档可能包含以下类型的数据：Feature（特征）、FeatureCollection（特征集合）、Geometry（几何）、Point（点）、LineString（线）、Polygon（多边形）等。


[如何将next 15的 react 19 降级为react 18稳定版本胆子大且吃过亏的同学应该知道，最近next 15 - 掘金](https://juejin.cn/post/7441925700297244681)

请仿照文件中的代码，使用axios代替fetch重构以下代码的api请求

将以下vue组件更改为next.js项目中的page.tsx页面,不要使用element，样式可以使用antd或者taidwind.css
请修改以下代码，使得其样式风格与api格式与文件中的样式风格与api格式保持一致
请修改以下代码，使用apiClient，使得api格式与文件中的api格式保持一致


[TypeScript 参数隐式具有 ‘any’ 类型|极客笔记](https://deepinout.com/typescript/typescript-questions/891_typescript_parameter_implicitly_has_an_any_type.html)

##### DOMPurify

##### Prismjs

data-fns

### React-Markdown

[React-Markdown 完全上手指南这份 React-Markdown 上手指南，详解其核心用法、插件和代码高亮， - 掘金](https://juejin.cn/post/7515393471542312995)

[react-markdown - npm](https://www.npmjs.com/package/react-markdown)
react-markdown
remark-gfm
react-syntax-highlighter
rehype

用 `npm i --save-dev @types/react-syntax-highlighter` 

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
