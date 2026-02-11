## 什么是JS构建工具
前端构建工具是将 TS、JSX 等源码转为浏览器可运行代码的自动化工具集（代表工具：Webpack、Vite 等）。
即便原生代码无需构建即可运行，但现代前端开发依赖框架、TypeScript 及 HMR 等能力提升效率，而这些技术浏览器无法直接支持；同时构建工具的 Tree-Shaking、代码分割等优化能提升应用性能。
因此，构建工具就成为了平衡**开发者体验**与**产物兼容性、性能**的核心桥梁.
## 区分构建与打包

**构建工具就像一个完整的工具箱，里面有各类不同的工具，而其中之一就是打包工具。** 以目前社群中最热门的构建工具 Vite 来说，Vite 本身会做很多事情，其中的打包则是透过 esbuild 与 Rollup 来处理（未来会改由 Rolldown 处理）。
打包就是先厘清众多原始代码之间的关系，然后去除不需要的代码（tree shaking），再把彼此相关的代码放在同一个包（代码分割），最后产出优化后的结果。
## 构建工具的底层原理
### 核心模块

| 核心模块          | 作用                                | 技术实现 / 依赖                                                                |
| ------------- | --------------------------------- | ------------------------------------------------------------------------ |
| **文件系统操作**    | 读取源码文件、写入打包产物                     | 基于 Node.js 的 `fs` 模块（文件读写）、`path` 模块（路径处理）                               |
| **模块解析器**     | 分析 `import/require`，找到对应文件，构建依赖图谱 | 实现一套符合 ESM/CommonJS 规范的解析逻辑，处理路径别名、扩展名（.js/.ts/.vue）、第三方依赖（node_modules） |
| **编译器 / 转译器** | 把高版本语法 / 非 JS 文件转成浏览器兼容代码         | 核心依赖 `Babel`（JS/JSX 转译）、`postcss`（CSS 转译）、`esbuild/swc`（新一代极速编译器）        |
| **打包器**       | 将分散的模块合并 / 拆分，生成最终产物              | 传统工具（Webpack/Rollup）自研打包逻辑，Vite 开发阶段不打包、生产阶段复用 Rollup 打包逻辑               |
| **开发服务器**     | 提供本地预览、热更新能力                      | 基于 Node.js 的 `http` 模块，或更轻量的 `connect` 框架，结合 WebSocket 实现热更新通信           |

### 构建步骤

前端构建工具的工作流程本质是 **「解析 - 转换 - 输出」** 三步：
1. **解析（依赖分析）**
    从入口文件出发，递归分析项目中所有模块的依赖关系（如 `import`/`require`），构建出**依赖图谱**。
2. **转换（编译 / 优化）**
    通过 Loader（处理非 JS 文件）、Plugin（执行打包优化）对源码进行编译、转译、优化。比如TS Loader 把 TS 转 JS，CSS Loader 处理 CSS 模块化，TerserPlugin 压缩 JS 代码。
3. **输出（打包生成）**
    将转换后的模块，按照配置的规则打包成一个或多个「产物文件」（如 `main.js`、`style.css`），输出到指定目录。


## 前端主流打包工具对比

| 对比维度             | Vite                                                 | Webpack                                          | Rollup                                                    | Parcel                            |
| :--------------- | :--------------------------------------------------- | :----------------------------------------------- | :-------------------------------------------------------- | :-------------------------------- |
| **核心定位**         | **极速开发+高效生产**<br>为现代前端框架而生                           | **全能型打包工具**<br>支持高度复杂定制                          | **专注库/包打包**<br>追求极致的 Tree-Shaking                         | **零配置、开箱即用**<br>                  |
| **适用场景**         | 现代框架项目 (Vue/React)<br>追求 **ESM** 与开发速度<br>单页应用 (SPA) | 大型企业级应用<br>**微前端** / 多页应用 (MPA)<br>需要**深度定制**的项目 | **JavaScript 库开发**<br>(如 React, Vue 本身)<br>需要**精准移除无用代码** | 中小型项目、原型<br>**无复杂配置**需求<br>快速上手演示 |
| **主流框架支持**       |                                                      |                                                  |                                                           |                                   |
| Vue              | ✅ **原生支持** (官方推荐)                                    | ✅ **完善支持** (需配置 vue-loader)                      | ✅ **支持** (需插件)                                            | ✅ **自动支持** (开箱即用)                 |
| React            | ✅ **原生支持** (官方模板)                                    | ✅ **完善支持** (需配置 babel-loader)                    | ✅ **支持** (需插件)                                            | ✅ **自动支持** (开箱即用)                 |
| Angular          | ✅ **支持** (需 @angular/vite 插件)                        | ✅ **官方默认** (Angular CLI 使用)                      | ⚠️ **有限支持** (不适合应用开发)                                     | ✅ **支持** (开箱即用)                   |
| **性能表现**         |                                                      |                                                  |                                                           |                                   |
| 冷启动              | **极快** (ESM 按需编译)                                    | **较慢** (全量打包)                                    | **较快** (适配库场景)                                            | **较快** (自动优化)                     |
| 热更新 (HMR)        | **最快** (毫秒级更新)                                       | **较慢** (需重新编译)                                   | ❌ **不支持** (需插件)                                           | **较快**                            |
| 生产构建             | **快** (默认基于 Rollup)                                  | **较慢** (依赖优化插件)                                  | **较快** (Tree-Shaking驱动)                                   | **较快** (自动优化)                     |
| **Tree-Shaking** | ✅ **优秀** (依赖 Rollup)                                 | ✅ **良好** (Webpack 5优化后)                          | ✅ **最优** (行业标杆)                                           | ⚠️ **一般** (效果弱于 Rollup)           |
| **配置体验**         | ✅ **低**<br>预设现代需求，大幅减少配置                             | ❌ **高**<br>需配 Loader/Plugin，灵活但繁琐                | ⚠️ **中低**<br>JS打包简单，处理资源需插件                               | ✅ **零配置**<br>开箱即用，最适合新手           |
| **生态与扩展**        |                                                      |                                                  |                                                           |                                   |
| 插件生态             | ✅ **快速增长**<br>兼容 Rollup 插件生态                         | ✅ **最丰富**<br>超1.2万款插件，无所不包                       | ✅ **较丰富**<br>可复用 Vite 生态插件                                | ⚠️ **较少**<br>依赖内置优化，定制弱           |
| 兼容性              | ✅ **原生 ESM**<br>旧项目迁移需适配                             | ✅ **支持 CommonJS/ESM**<br>旧格式需额外配置                | ✅ **原生面向 ESM**<br>兼容 CJS 需插件                              | ✅ **支持主流格式**<br>定制化能力较弱           |
| **生产优化**         |                                                      |                                                  |                                                           |                                   |
| 代码分割             | ✅ **灵活** (依赖 Rollup)                                 | ✅ **最强** (灵活分包策略)                                | ⚠️ **较弱** (为库打包设计)                                        | ⚠️ **自动** (可控性低)                  |
| 输出优化             | ✅ **默认优化**                                           | ⚠️ **需手动配置优化**                                   | ✅ **最优** (输出纯净代码)                                         | ✅ **默认优化输出**                      |
| 微前端支持            | ⚠️ **需额外配置扩展**                                       | ✅ **最佳** (支持 Module Federation)                  | ❌ **不适合**                                                 | ❌ **不支持**                         |

注：**微前端（Micro-Frontends）** 是一种借鉴**微服务架构理念**的前端架构模式，核心思想是 **将一个大型、单体的前端应用，拆分为多个独立开发、独立部署、独立运行的小型前端应用（微应用）**，再通过一个**主应用（Shell App）** 将这些微应用整合为一个完整的用户体验。

## Vite

### Vite 常用配置
```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx' // 支持 JSX/TSX
import path from 'path'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000, // 开发服务器端口
    open: true, // 启动后自动打开浏览器
    proxy: { // 接口代理（解决跨域）
      '/api': {
        target: 'https://www.hanphone.top/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser', // 压缩（生产环境默认 esbuild，terser 压缩率更高）
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true // 移除 debugger
      }
    }
  }
})
```


### 问题记录
[VSCode 中，TS 提示 ”无法找到 *.vue 声明文件“ 的解决方案 - 前端三昧 - SegmentFault 思否](https://segmentfault.com/a/1190000040753312)
[Vue3 vite build 之后不显示页面内容，只显示空白，也没有报错如何解决_vue 运行没问题但是页面空白-CSDN 博客](https://blog.csdn.net/KimBing/article/details/130085256)

#### 1. 解决 TS 找不到 .vue 声明文件
在项目根目录或 src 下创建 `shims-vue.d.ts`：
```ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

#### 2. Vite 打包空白页常见原因及解决
- **base 路径配置错误**：vite.config.js 中 `base: './'`（相对路径），或根据部署路径配置（如 `base: '/vue-project/'`）；
- **路由模式问题**：history 模式未配置服务器，临时切换为 hash 模式验证；
- **静态资源路径**：确保图片/样式等资源使用相对路径（如 `./assets/img.png`）；

