---
title: React 基础
sidebar_position: 11
description: 虚拟 DOM 与 JSX、组件与 props、State 与生命周期、Hooks、Context 状态管理，以及常用生态库。
---
[React 官方文档](https://react.dev/)

[漫谈 react 系列(一)：初探 react 的工作过程 - 知乎](https://zhuanlan.zhihu.com/p/410865029)
## React概念

Meta 开发的前端 JavaScript 库，核心聚焦 UI 构建，本身并非完整框架（非 MVC 框架，仅侧重 View 层），需搭配路由、状态管理等工具形成完整开发体系，常被宽泛称作“框架”。

### React特性
- 单向数据流向：数据→视图渲染（非双向绑定），单向响应数据流可减少重复代码；
- 高性能渲染：通过虚拟 DOM + Diff 算法最小化真实 DOM 操作，避免频繁全量 DOM 重绘；
- 开发体验优：声明式设计、高效灵活，支持服务端渲染，推荐使用 JSX 语法；
- 组件化思想：一切皆组件，组件高内聚、低耦合，支持复用与组合。
使用 React 可实现动态 JavaScript 逻辑与 UI 解耦，核心体现为“JS 函数返回唯一的 UI 描述”，让逻辑与视图映射更清晰。
### React依赖文件
- `react.production.min.js`：React 核心库；
- `react-dom.production.min.js`：处理 DOM 相关渲染功能；
- `babel.min.js`：将 ES6 语法转为 ES5，同时提供 JSX 语法支持。

## 三个核心
### 1. 渲染（Render）与虚拟 DOM（VDOM）
React 不直接操作浏览器真实 DOM，而是通过 JS 对象模拟 DOM 结构（虚拟 DOM）。当组件状态变化时，先对比新旧虚拟 DOM 的差异（Diff 算法），仅将变化部分同步到真实 DOM，降低浏览器重排重绘成本，尤其适配复杂 UI 频繁更新的场景。
![从template到dom流程机制图.webp](https://hanphone.top/gh/HanphoneJan/public-pictures/react/%E4%BB%8Etemplate%E5%88%B0dom%E6%B5%81%E7%A8%8B%E6%9C%BA%E5%88%B6%E5%9B%BE.webp)
AST是抽象语法树。Fiber 树是 Virtual DOM 的 “进化版”，兼容原有 Diff 逻辑，但引入**可中断、优先级、双缓冲**机制。
### 2. React JSX
JSX 是 React 核心组成部分，是一种语法糖，让开发者能用 XML 标记的方式声明界面，替代繁琐的 `createElement` 调用。
- 组件可通过 JSX 嵌套组合，返回的 JSX 标记描述页面展示内容；
- 约定：大写开头表示自定义组件，小写开头表示 HTML 原生标签；
- 样式：React 推荐内联样式，与 TailwindCSS 适配性好；
- 注释：需写在花括号内（`{/* 注释内容 */}`）。

### 3. 组件化开发
React 以组件为核心单元，分为函数组件（推荐）和类组件，组件可接收入参（props）并返回 React 元素。
#### 函数组件与 Props 传递
Props 是组件的入参，只读且不可修改，组件需像纯函数一样保护 props 不被更改。
```tsx
// 定义组件Props类型
interface GreetingProps {
  name: string;
  age?: number; // 可选属性
}

// 函数组件（React.FC 是函数组件类型别名）
const Greeting: React.FC<GreetingProps> = ({ name, age = 18 }) => {
  return (
    <div>
      <p>Hello, {name}! You are {age} years old.</p>
    </div>
  );
};

// 使用组件
const App = () => {
  return <Greeting name="Alice" age={22} />;
};
```

- 与 State 区别：Props 不可变，State 可随交互修改；
- 数据流向：单向向下流动，父组件的 state 可作为子组件的 props 传递；
- 默认值：可通过 `getDefaultProps()` 设置（类组件）或参数默认值（函数组件）；
- 验证：使用 `propTypes` 校验 props 类型；
- 内置属性：
  - `children`：获取组件的子节点；
  - `key`：唯一标识组件实例，帮助 React 区分不同组件，优化渲染性能。

#### 函数组件转类组件（五步）
1. 创建同名 ES6 class，继承 `React.Component`；
2. 添加空的 `render()` 方法；
3. 将函数体移入 `render()` 方法；
4. 在 `render()` 中用 `this.props` 替换 `props`；
5. 删除原空函数声明。

#### 状态（State）与生命周期
##### （1）State 核心
- 组件私有数据，用于管理动态内容，类组件原生支持，函数组件需通过 Hooks 使用；
- React 将组件视为状态机，通过更新 state 驱动 UI 渲染（无需手动操作 DOM）；
- 注意事项：不能直接修改 `this.state`（需用 `setState`）；`setState` 可能异步执行；`setState` 会合并状态而非覆盖。

##### （2）生命周期（以 Clock 组件为例）
组件生命周期分为三个阶段：Mounting（挂载）、Updating（更新）、Unmounting（卸载），核心执行流程：
1. 组件被 `ReactDOM.render()` 调用时，执行构造函数初始化 `this.state`；
2. 调用 `render()` 方法，React 根据返回值更新 DOM；
3. 组件挂载到 DOM 后，执行 `componentDidMount()`（如设置定时器）；
4. 状态更新时（如定时器触发 `tick()`），调用 `setState()` 触发重新 `render()`，更新 DOM；
5. 组件从 DOM 移除时，执行 `componentWillUnmount()`（如清除定时器）。

```jsx
class Clock extends React.Component {
  constructor(props) {
    super(props);
    this.state = {date: new Date()}; // 初始化状态
  }

  componentDidMount() {
    // 挂载后启动定时器
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  componentWillUnmount() {
    // 卸载前清除定时器
    clearInterval(this.timerID);
  }

  tick() {
    // 更新状态（不可直接修改 this.state）
    this.setState({date: new Date()});
  }

  render() {
    return (
      <div>
        <h1>Hello, world!</h1>
        <h2>It is {this.state.date.toLocaleTimeString()}.</h2>
      </div>
    );
  }
}

// 渲染组件
ReactDOM.render(<Clock />, document.getElementById('root'));
```

##### （3）核心组件 API
- `setState`：设置状态（异步，可接收函数式参数）；
- `replaceState`：替换状态（覆盖而非合并）；
- `setProps/replaceProps`：设置/替换属性（已不推荐使用）；
- `forceUpdate`：强制触发重渲染；
- `findDOMNode`：获取组件对应的 DOM 节点；
- `isMounted`：判断组件是否已挂载。
### React事件处理
React 支持常见的 DOM 事件绑定，命名采用小驼峰式（而非纯小写），核心常用事件：
- `onClick`：点击事件；
- `onChange`：输入/选择变化事件；
- `onSubmit`：表单提交事件。

## React Hooks 核心用法
Hooks 让函数组件可“钩入”React 状态和生命周期特性，无需编写类组件，核心 Hooks 如下：
#### （1）useState：状态管理
用于在函数组件中声明状态变量，返回“状态值 + 状态更新函数”。
```tsx
const Counter = () => {
  // 声明基础类型状态，初始值为 0
  const [count, setCount] = React.useState(0);
  // 声明对象类型状态
  const [user, setUser] = React.useState({ name: "Bob", role: "user" });

  // 函数式更新（依赖前一次状态）
  const increment = () => {
    setCount(prevCount => prevCount + 1);
  };

  // 更新对象状态（需合并原有属性）
  const upgradeRole = () => {
    setUser(prevUser => ({ ...prevUser, role: "admin" }));
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
      <p>Role: {user.role}</p>
      <button onClick={upgradeRole}>Upgrade</button>
    </div>
  );
};
```

#### （2）useEffect：副作用与生命周期
处理数据请求、DOM 操作、订阅等“副作用”，依赖项数组控制执行时机。
```tsx
const DataFetcher = () => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [userId, setUserId] = React.useState(1);

  // 模拟 API 请求
  const fetchData = async (id: number) => {
    setLoading(true);
    const res = await fetch(`https://api.example.com/user/${id}`);
    const result = await res.json();
    setData(result);
    setLoading(false);
  };

  // 场景1：组件挂载时执行一次（依赖空数组）
  React.useEffect(() => {
    fetchData(userId);
    // 清理函数：组件卸载/依赖变化前执行
    return () => {
      console.log("清理资源（如取消请求、清除定时器）");
    };
  }, []);

  // 场景2：依赖项变化时执行（userId 变化重新请求）
  React.useEffect(() => {
    fetchData(userId);
  }, [userId]);

  if (loading) return <p>Loading...</p>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
};
```

#### （3）useRef：持久化值与 DOM 引用
- 关联 DOM 元素：获取原生 DOM 节点；
- 持久化值：组件重渲染时值不重置（无需触发重渲染）。
```tsx
const RefDemo = () => {
  // 关联输入框 DOM 元素
  const inputRef = React.useRef<HTMLInputElement>(null);
  // 持久化定时器引用
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => console.log("Timer running"), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const focusInput = () => {
    inputRef.current?.focus(); // 安全访问 DOM 节点
  };

  return (
    <div>
      <input ref={inputRef} type="text" />
      <button onClick={focusInput}>Focus Input</button>
      <button onClick={startTimer}>Start Timer</button>
      <button onClick={stopTimer}>Stop Timer</button>
    </div>
  );
};
```

#### （4）其他常用 Hooks
- `useContext`：跨组件共享数据，减少 props 逐层传递（如用户信息、主题配置）；
- `useCallback/useMemo`：性能优化钩子，分别缓存函数和计算结果，避免重复渲染；

## 状态管理与 Context

`useState` 管组件内部状态；要跨层共享（登录用户、主题、语言），用 Context，避免 props 一层层往下传。

```tsx
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react'

interface User {
  id: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (name: string) => void
  logout: () => void
  isAuthenticated: boolean
}

// 默认值只用于类型提示，实际由 Provider 提供
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (name: string) => {
    const mockUser = { id: Date.now().toString(), name }
    setUser(mockUser)
    localStorage.setItem('user', JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  // 挂载时从本地存储恢复
  React.useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

// 自定义 Hook 简化调用，顺带处理「不在 Provider 里」的情况
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

用法：根组件包一层 `AuthProvider`，子组件里 `const { user, login } = useAuth()`。

Context 的可见范围由 Provider 在树里的位置决定：只有被它包裹的组件能读到。Provider 先于子组件初始化，所以放在最外层（`layout` / `App`）最稳。

状态再复杂就上状态库：**Zustand**（轻、无 Provider）、**Redux Toolkit**（规范、生态大）、**Jotai**（原子化）。中小项目 Context 就够，别一开始就引 Redux。

## 生命周期

函数组件没有类组件那套生命周期方法，用 `useEffect` 表达：

| 类组件 | 函数组件等效 | 时机 |
|---|---|---|
| `componentDidMount` | `useEffect(() => {}, [])` | 挂载后执行一次（请求、订阅） |
| `componentDidUpdate` | `useEffect(() => {}, [deps])` | 依赖变化后执行 |
| `componentWillUnmount` | `useEffect(() => { return () => {} }, [])` | 卸载前清理 |

```tsx
const SubscriptionComponent = () => {
  const [data, setData] = React.useState('')

  React.useEffect(() => {
    const subscription = someService.subscribe(setData)
    return () => subscription.unsubscribe() // 卸载或依赖变化时清理
  }, [])

  return <p>{data}</p>
}
```

页面刷新等于整棵树重新挂载：`constructor` → `render` → `useEffect` 都会再走一遍。开发环境下 StrictMode 会**故意**把挂载/卸载执行两次，用来暴露没写清理函数的副作用。

## 生态与 UI 库

| 类别 | 常用 | 说明 |
|---|---|---|
| UI 组件库 | **antd** | 企业级后台首选，表格、表单、弹窗齐全 |
| 图标 | **lucide-react** / Font Awesome | 前者是按需引入的 SVG 图标集，后者图标最全 |
| 动画 | **Framer Motion**（现 motion）/ React Spring | 声明式动画，布局动画与手势支持好 |
| 图表 | **ECharts**（echarts-for-react） | 与框架无关，配置式，国内文档全 |
| Markdown | **react-markdown** + remark-gfm + rehype | 渲染 Markdown，配 `react-syntax-highlighter` 做高亮 |
| 样式 | **Tailwind CSS** / CSS Modules | Tailwind 的 preflight 会重置默认样式，接在已有站点里要注意 |

antd 的安装与用法：

```bash
npm install antd
```

```tsx
import { Button, Input, Table } from 'antd'
import 'antd/dist/reset.css'

function App() {
  return (
    <div>
      <Button type="primary">Primary Button</Button>
      <Input placeholder="Basic usage" />
    </div>
  )
}
```

图标示例：

```tsx
// npm install lucide-react
import { Search, User, LogOut } from 'lucide-react'

export function IconDemo() {
  return (
    <div>
      <Search size={20} color="#666" />
      <User size={24} strokeWidth={1.5} />
      <LogOut size={18} />
    </div>
  )
}
```

TypeScript 项目里第三方的无类型包（如 `md5`）会报「找不到声明文件」，装 `@types/md5` 或补一个 `declare module 'md5'` 即可。

## React其他
- **Portals**：将组件渲染到当前 DOM 树之外的节点，适用于弹窗、模态框等场景；
- **Suspense**：实现“懒加载”，在组件加载完成前展示备用界面（如 loading）；
- **React vs React Native**：React 面向 Web 端，渲染目标是浏览器 DOM；React Native 面向移动端，渲染目标是原生平台控件。
