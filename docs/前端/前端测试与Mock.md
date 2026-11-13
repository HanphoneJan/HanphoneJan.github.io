---
title: 前端测试与 Mock
sidebar_position: 8
description: 单元测试、组件测试与端到端测试的分工，E2E 框架对比，以及 Mock.js、MSW、Apifox 三种造数据的方式。
---

前端测试按覆盖范围分三层，越往下越慢、越贵：

| 层 | 测什么 | 常用工具 |
|---|---|---|
| 单元测试 | 纯函数、工具方法、store | Vitest / Jest |
| 组件测试 | 组件的渲染与交互 | Testing Library + Vitest |
| 端到端（E2E） | 真实浏览器里跑完整流程 | Playwright / Cypress |

组件测试是性价比最高的一层：它不启动浏览器，却能覆盖「点了按钮有没有调接口、列表有没有渲染」。

## 单元测试

```js
// Vitest / Jest 语法一致
test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})

test('fetches user data', async () => {
  const data = await fetchUser(1)
  expect(data.name).toBe('John Doe')
})
```

Vite 项目用 Vitest，它复用同一份 Vite 配置与转换链；Webpack 老项目用 Jest。

## 组件测试

```js
import { render, screen, fireEvent } from '@testing-library/vue'
import Counter from './Counter.vue'

test('点击后数字加一', async () => {
  render(Counter)
  await fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('1')).toBeTruthy()
})
```

原则是**按用户能看到的东西断言**（role、label、文本），不要断言组件内部状态和 CSS 类名。

## 端到端测试

```js
// Playwright
import { test, expect } from '@playwright/test'

test('登录后进入控制台', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('用户名').fill('admin')
  await page.getByLabel('密码').fill('password')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/dashboard/)
})
```

### 框架怎么选

| 维度 | Cypress | Playwright | TestCafe | Nightwatch |
|---|---|---|---|---|
| 核心定位 | 专注前端 E2E，对 SPA 友好 | 跨端全场景（Web / 移动端 / 桌面端） | 无浏览器插件依赖，开箱即用 | 基于 WebDriver，轻量贴近原生，支持 E2E + 组件 |
| 浏览器支持 | Chrome / Firefox / Edge，无原生 Safari | Chrome / Firefox / Safari / 移动端，原生支持 | 全浏览器，无驱动依赖 | 全浏览器，基于 WebDriver，需配驱动 |
| 调试体验 | 实时重载、时间旅行、UI 直观 | 内置 trace、视频与截图录制 | 简单 UI，调试信息较少 | 轻量 UI，日志追踪 |
| 语法成本 | 基于 Mocha/Chai，`cy.get()` 简洁 | Jest 风格，`page.locator()` 全面 | 语法独特，中等 | 贴近 WebDriver，需了解驱动模型 |
| 并行与速度 | 单浏览器并行，SPA 场景快 | 多浏览器并行，最快 | 无免费并行 | 视驱动配置 |
| 适用场景 | 中小型 SPA、追求调试体验 | 大型项目、多浏览器覆盖、CI 集成 | 简单页面级 E2E、零配置 | 团队已熟悉 WebDriver |

新项目优先 Playwright：多浏览器、内置驱动、CI 里不用额外配环境。Cypress 的调试界面仍然是同类里最顺手的。

## Mock 数据

### Mock.js

在浏览器里拦截 XHR，适合没有后端、只想把页面调出来的场景。

```js
import Mock from 'mockjs'

Mock.mock('/api/users', 'get', {
  'users|1-10': [
    {
      'id|+1': 1,
      name: '@cname',
      'age|18-60': 1,
      email: '@email',
      date: '@datetime',
    },
  ],
})
```

### MSW（Mock Service Worker）

用 Service Worker 在**网络层**拦截请求，页面代码不用改，切到真实后端时只删一个开关。它也支持 Node 环境，同一份 handler 可以给单测和浏览器共用。

```js
// msw 2.x
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/user', () => HttpResponse.json({ name: 'John Doe', age: 30 })),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Apifox

Apifox 把 API 设计、调试、文档、Mock、自动化测试放在一个工具里，接口定义基于 OpenAPI。

- **Mock**：按字段类型自动生成假数据，也能写自定义规则；前端拿 Mock 地址就能联调
- **自动化测试**：把接口串成用例，在 CI 里跑
- **文档**：从接口定义直接生成，和 Postman 比省了维护两份的功夫

团队里已经有 Swagger/OpenAPI 时，用它当 Mock 服务最省事；只需要本地假数据的，MSW 更轻。

## 相关

- PWA 与 Service Worker 见 [浏览器 API 与图形](./浏览器API与图形.md)。
- 组件库自带的测试工具（Element Plus 用 Vitest、antd 用 Jest）见各框架页。
