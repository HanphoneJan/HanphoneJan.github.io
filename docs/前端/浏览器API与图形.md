---
title: 浏览器 API 与图形
sidebar_position: 5
description: Fetch/Ajax、IntersectionObserver、PWA 与离线，以及 Canvas、WebGL、Three.js 的定位与图表库选型。
---

## 请求：Fetch 与 Ajax

### Fetch API

Fetch 是浏览器原生的请求接口，基于 Promise，用来替代 `XMLHttpRequest`。

```js
// GET
const res = await fetch('https://api.example.com/data')
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()

// POST JSON
await fetch('https://api.example.com/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'demo' }),
})
```

关键点：

- `fetch(url, options)`：`options` 支持 `method`、`headers`、`body`、`credentials`、`signal`
- `Response`：`json()` / `text()` / `blob()` / `arrayBuffer()` 解析响应体，`status`、`ok`、`headers` 是常用属性
- **只有网络层失败才会 reject**。404、500 都算「请求成功」，必须自己检查 `response.ok`
- 带 cookie 跨域要显式写 `credentials: 'include'`，且服务端要允许对应来源

取消请求与上传文件：

```js
const controller = new AbortController()
fetch('/api/data', { signal: controller.signal })
  .then((r) => r.json())
  .catch((err) => {
    if (err.name === 'AbortError') console.log('请求已取消')
  })
controller.abort()

const formData = new FormData()
formData.append('file', fileInput.files[0])
await fetch('/upload', { method: 'POST', body: formData })
```

### Ajax（XMLHttpRequest）

Ajax 指「不刷新页面、异步换一部分内容」这套做法，`XMLHttpRequest` 是它最早的实现，现在仍然能在老代码和需要上传进度时见到。

```js
const xhr = new XMLHttpRequest()
xhr.open('GET', 'https://api.example.com/data')
xhr.onload = () => {
  if (xhr.status === 200) console.log(JSON.parse(xhr.responseText))
}
xhr.onerror = () => console.error('请求失败')
xhr.send()
```

| 特性 | Ajax（XHR） | Fetch |
|---|---|---|
| 返回 | 事件回调 | Promise |
| 语法 | 较繁琐 | 简洁 |
| HTTP 错误 | 手动检查状态码 | 手动检查 `ok` |
| 上传进度 | `xhr.upload.onprogress` | 需配合 `ReadableStream` |
| 请求取消 | `xhr.abort()` | `AbortController` |

需要上传进度条时，XHR 仍然比 Fetch 省事。

### IntersectionObserver

观察元素是否进入视口，图片懒加载、无限滚动、曝光埋点都用它，比监听 `scroll` 再算 `getBoundingClientRect` 便宜得多。

```js
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const img = entry.target
      img.src = img.dataset.src
      observer.unobserve(img)
    }
  },
  { threshold: 0.1, rootMargin: '200px' },
)

document.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img))
```

`threshold` 是可见比例阈值，`rootMargin` 可以提前触发（上面提前 200px 开始加载）。浏览器原生支持 `img loading="lazy"`，只做懒加载时优先用它。

## 其它常用 API

| API | 用途 |
|---|---|
| Web Storage | `localStorage` / `sessionStorage`，同步、只存字符串、约 5MB |
| History | 单页应用的路由前进后退、`pushState` |
| Notification | 系统通知，需用户授权 |
| Geolocation | 定位，需用户授权且要求 HTTPS |
| Web Speech | 语音识别与合成 |
| Canvas | 绘制图形和动画（见下节） |

存储的容量、生命周期与清理策略见 [浏览器原理](./浏览器原理.md) 的「浏览器存储」一节。

## 绘图：Canvas、WebGL 与 3D

先看要画什么：图表与像素级绘制用 Canvas 2D，矢量与图标用 SVG，大规模三维场景才轮到 WebGL / Three.js。

### Canvas 2D

`<canvas>` 是 HTML5 提供的位图画布，通过 2D 上下文逐像素绘制线条、图形、文本和图片。

```js
const ctx = canvas.getContext('2d')
ctx.fillStyle = '#3b82f6'
ctx.fillRect(10, 10, 120, 60)
ctx.font = '16px sans-serif'
ctx.fillText('Hello', 20, 40)
```

Canvas 是**立即模式**：画完就只剩像素，改一个元素要重画整帧；它也不进 DOM，所以没有 CSS 样式与可访问性语义。现代浏览器的 Canvas 2D 大多有 GPU 加速，但逐帧全量重绘的开销仍然比 GPU 管线的 WebGL 大。

### SVG

SVG 是矢量、是 DOM 节点，能用 CSS 与事件，缩放不糊。图标、流程图、数据量不大的可交互图形优先用它；上万个节点时 DOM 开销会拖垮页面。

### WebGL 与 OpenGL

- **WebGL** 是浏览器里的图形标准，用 JavaScript 直接调 GPU，做 2D/3D 渲染不用插件。WebGL 1 对应 OpenGL ES 2.0，WebGL 2 对应 ES 3.0。
- **OpenGL** 是跨平台的图形 API 开放标准（Khronos 维护），并非 Web 专属，桌面、移动、嵌入式都在用；WebGL 是它在浏览器里的实现。浏览器之外的同类还有 Vulkan、Metal、Direct3D。
- 直接写 WebGL 的着色器与缓冲区很啰嗦，实际项目基本都套一层库。

### Three.js 与 Babylon.js

- **Three.js**：封装 WebGL 的 3D 库，几何体、材质、灯光、相机、射线拾取都有现成实现，是网页 3D 可视化、数据大屏最常用的选择。
- **Babylon.js**：更偏游戏引擎，内置物理、音效、碰撞、VR/AR，API 按游戏逻辑组织，适合网页 3D 游戏与交互式应用。

两者都能做同一件事，区别在生态与默认能力：可视化选 Three.js 资料多，游戏选 Babylon.js 少写一层。

### Canvas 2D 的封装：Fabric.js 与 Konva.js

- **Fabric.js**：把 Canvas 上的图形变成可操作对象，支持拖拽、缩放、旋转、分层、序列化，适合在线绘图工具、图片编辑器。
- **Konva.js**：围绕 Stage / Layer / Group 组织场景图，事件系统与多层渲染完善，适合交互式 2D 游戏与复杂图形应用。

### 图表库怎么选

ECharts、D3.js 这些做图表，和上面的渲染栈是两回事：

1. 国内项目、快速上手、中后台 / 数据大屏 → **ECharts**（首选）
2. React 项目、组件化开发 → **BizCharts（复杂场景）/ Recharts（简单场景）**
3. 复杂定制化、创意可视化 → **D3.js**
4. 中小型项目、轻量高效、无框架依赖 → **Chart.js**
5. 商业项目、高稳定性 / 全功能需求 → **Highcharts**（需考虑授权）

## 离线：PWA

PWA 让网页能装到桌面/主屏、断网可用。三个条件：HTTPS、`manifest`、Service Worker。

### manifest

```json
{
  "name": "My App",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```

`display: standalone` 决定打开时没有浏览器地址栏。图标至少要 192 与 512 两个尺寸。

### Service Worker

Service Worker 是独立于页面的脚本，能拦截它作用域内的所有请求，实现离线缓存与后台更新。缓存策略按资源分：

| 资源 | 策略 |
|---|---|
| 带哈希的 JS/CSS | CacheFirst（文件名不可变，命中直接用） |
| HTML 入口 | NetworkFirst（保证拿到最新外壳） |
| 图片、大文件 | StaleWhileRevalidate 或按需缓存 |

Workbox 的 `GenerateSW` 能自动生成缓存逻辑，Vite 用 `vite-plugin-pwa`，Vue CLI 用 `@vue/cli-plugin-pwa`，配置里生成 manifest 与 SW。

几个容易踩的点：

- **改了 `app-*.js` 的哈希就要换 SW 版本**，否则旧 SW 一直发旧外壳。
- **HTML 的 NetworkFirst 不要设 `networkTimeoutSeconds`**：超时回退的旧 HTML 会指向已删除的 chunk，页面卡在 `Failed to fetch dynamically imported module`。
- **Service Worker 只在 HTTPS（或 localhost）下注册**，`file://` 打开无效。
- 注册脚本要静态 import 一次，动态 import 落在 `load` 之后可能静默不注册。

### 打包成 App

- **套壳**：WebView 包一层原生壳，[Median](https://median.co/app) 这类工具可以不开代码直接封装；[HBuilderX](https://hx.dcloud.net.cn/Tutorial/install/windows) 也能把 H5 打成 App。
- **TWA（Trusted Web Activity）**：把 PWA 装进 Android，地址栏由系统隐藏，需要 Digital Asset Links 校验域名。[使用 TWA 把 Web 做成原生 App](https://juejin.cn/post/6926516835177365511)

Lighthouse 可以检查 PWA 是否满足可安装条件、离线是否可用。

## 相关

- 渲染模式（CSR / SSR / SSG）与 Next.js 的对应写法见 [Next.js 基础](./Next.js基础.md)。
- 浏览器多进程架构、渲染流水线、缓存与事件循环见 [浏览器原理](./浏览器原理.md)。
