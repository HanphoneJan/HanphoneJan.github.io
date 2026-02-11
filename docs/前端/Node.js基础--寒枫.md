Node.js不是编程语言，而是基于Chrome V8引擎的JavaScript运行时环境，使JS能脱离浏览器在服务器端运行。

**核心特点**：
- 单线程：避免多线程上下文切换开销，通过事件循环实现高并发
- 非阻塞I/O：执行I/O操作时不阻塞主线程，通过回调/ Promise处理结果
- 事件驱动：基于事件循环机制，响应各类事件（如I/O完成、网络请求）
- 跨平台：可在Windows、Linux、macOS等系统运行，依赖libuv库实现系统交互

**适用场景**：高并发I/O场景（如API接口、即时通讯、日志处理）、后端服务、工具开发（如Webpack、Gulp）；不适用CPU密集型场景（需通过子进程规避阻塞）。
## Node.js工作机制
参考：[Node.js 工作机制 | 菜鸟教程](https://www.runoob.com/nodejs/how-nodejs-works.html)

![nodejs工作机制图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/nodejs/nodejs%E5%B7%A5%E4%BD%9C%E6%9C%BA%E5%88%B6%E5%9B%BE.webp)
- **V8 JavaScript Engine**：这是 Node.js 的核心，负责执行 JavaScript 代码。V8 是 Chrome 浏览器的 JavaScript 引擎，它将 JavaScript 代码编译成机器码以提高执行效率。
- **Node.js Bindings (Node API)**：这一层提供了一组 API，允许 JavaScript 代码与操作系统进行交互。这些 API 包括文件系统、网络、进程等操作。
- **Libuv (Asynchronous I/O)**：Libuv 是一个跨平台的异步 I/O 库，它在 Node.js 下运行，用于处理文件系统、网络和进程等异步操作。Libuv 使用事件循环和工作线程来处理这些操作，而不会阻塞主线程。
- **Event Loop**：这是 Node.js 的核心概念之一。事件循环不断检查事件队列，处理事件和执行回调函数。它确保了 Node.js 的非阻塞和事件驱动的特性。
- **Event Queue**：事件队列用于存储即将处理的事件。当一个异步操作完成时，相关的回调函数会被放入事件队列中，等待事件循环处理。
- **Worker Threads**：这些是用于处理阻塞操作的线程，如文件读写、网络请求等。它们允许 Node.js 在不阻塞主线程的情况下执行这些操作。
- **Blocking Operation**：这些是可能阻塞线程的操作，如同步的文件读写。在 Node.js 中，这些操作通常被放在工作线程中执行，以避免阻塞事件循环。
- **Execute Callback**：一旦一个异步操作完成，它的回调函数就会被执行。这是通过事件循环来管理的。
### 架构组成

| 层级名称         | 核心组成部分                                                                                                                    | 主要作用                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| JavaScript 层 | 1. 核心模块（fs、http、path 等）  <br>2. 第三方模块（npm 安装）  <br>3. 用户自定义模块                                                             | 开发者直接编写/调用的层面，是 Node.js 对外暴露的可编程接口。可以细分为JS应用与Node..js核心模块两层。   |
| C++ 绑定层      | 1. Node.js 核心 API 的 C++ 实现  <br>2. V8 引擎的接口封装                                                                             | 作为 JS 层和底层依赖的桥梁，将底层 C/C++ 功能暴露给 JavaScript 层调用                 |
| 底层依赖         | 1. V8 引擎（Google 开发的 JS 引擎）  <br>2. libuv（跨平台异步 I/O 库）  <br>3. c-ares（异步 DNS 解析库）  <br>4. OpenSSL（加密功能）  <br>5. zlib（压缩功能） | 提供 Node.js 运行的核心能力，支撑异步 I/O、JS 执行、网络/加密等基础功能，主要是V8引擎、libuv等底层库 |

### 单线程与事件循环

**单线程模型**：主线程仅一个，负责执行JS代码、处理事件回调。所有同步代码依次执行，异步操作（如fs.readFile、http请求）会委托给底层线程池（由libuv管理），主线程继续执行后续代码。

**事件循环机制**（6个阶段，按顺序循环执行）：
1. **timers**：执行 setTimeout 和 setInterval 的回调
2. **pending callbacks**：执行系统操作的回调（如 TCP 错误）
3. **idle, prepare**：内部使用（开发者无需关注）
4. **poll**：检索新的 I/O 事件，执行相关回调（此阶段最久）
5. **check**：执行 setImmediate 的回调
6. **close callbacks**：执行关闭事件的回调（如 socket.on('close')）

### 非阻塞IO原理

1. 应用发起 I/O 请求（如读取文件）
2. Node.js 将请求交给 libuv 处理
3. libuv 使用系统提供的异步接口（如 Linux 的 epoll）
4. 主线程继续执行其他任务
5. I/O 完成后，回调函数被放入事件队列
6. 事件循环在适当阶段执行回调

![nodejs的非阻塞IO原理.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/nodejs/nodejs%E7%9A%84%E9%9D%9E%E9%98%BB%E5%A1%9EIO%E5%8E%9F%E7%90%86.webp)
和Js的异步编程机制一致，有三个，分别是回调函数、Promise、Async/Await。

### 单线程与多进程
虽然 Node.js 是单线程的，但它可以通过以下方式利用多核 CPU。

| 特性   | 子进程 (child_process) | 集群模式 (cluster)   | Worker Threads（工作线程） |
| ---- | ------------------- | ---------------- | -------------------- |
| 核心类型 | 多进程                 | 多进程（封装 fork）     | 多线程                  |
| 内存隔离 | 完全隔离（独立内存）          | 完全隔离（独立内存）       | 共享进程内存（独立栈）          |
| 端口共享 | 不支持                 | 支持（主进程分发请求）      | 不涉及                  |
| 通信成本 | 高（IPC 进程通信）         | 高（同子进程）          | 低（线程间共享内存）           |
| 适用场景 | 独立任务、调用外部脚本         | 多核网络服务（HTTP/TCP） | CPU 密集型计算            |
| 轻量性  | 重（独立 V8 / 事件循环）     | 重（同子进程）          | 轻（共享进程资源）            |
1. **子进程**：Node.js 最基础的多进程方案，隔离性最强，适合执行独立、无关联的任务，缺点是资源消耗高；
2. **集群模式**：专为网络服务优化的多进程方案，核心优势是**端口共享和请求分发**，是构建多核 HTTP 服务的首选；
3. **Worker Threads**：轻量级多线程方案，共享内存、通信成本低，是处理 CPU 密集型任务的最优选择（替代传统多进程）。

简单来说：做网络服务用 `cluster`，做 CPU 密集计算用 `Worker Threads`，做独立任务 / 调用外部脚本用 `child_process`

## Node.js模块化机制
Node.js采用CommonJS模块规范：
**模块导出**：通过module.exports或exports暴露模块内容
**模块导入**：通过require()加载模块，会缓存已加载模块（多次require同一模块仅执行一次）

```javascript
// 导出模块（utils.js）
function add(a, b) {
  return a + b;
}
module.exports = { add }; // 批量导出
// 或 exports.add = add;（单一导出）

// 导入模块（main.js）
const { add } = require('./utils'); // 相对路径，可省略.js后缀
console.log(add(2, 3)); // 输出5
```

|模块系统|规范|文件扩展名|导入方式|导出方式|
|---|---|---|---|---|
|**CommonJS**|Node.js 早期使用|`.js`|`require()`|`module.exports` / `exports`|
|**ES Module (ESM)**|ECMAScript 标准|`.mjs` 或 `"type": "module"`|`import`|`export` / `export default`|
## 安装与配置
### 直接安装（不推荐）
**前置步骤**：从Node.js官网（https://nodejs.org/）下载对应系统的LTS版本（长期支持版，稳定性高），默认安装或自定义路径（建议路径不含中文空格，如D:\nodejs）。
1. 在安装路径的根目录下新建两个文件夹：
- node_global：全局安装文件夹（存放全局npm包）
- node_cache：npm缓存文件夹（存放下载的包缓存）

2. 环境变量设置：

- **用户变量**：将用户变量中PATH的值改成D:\nodejs\node_global（替换原有C:\Users\<username>\AppData\Roaming\npm），无PATH则直接添加。
- **系统变量**：添加变量NODE_PATH，值为D:\nodejs\node_modules（用于Node.js识别全局模块）

3. 配置npm全局路径与缓存路径（打开cmd执行）：

```bash
npm config set prefix "D:\nodejs\node_global"  
npm config set cache "D:\nodejs\node_cache"
```

4. 验证配置：执行node -v（查看Node.js版本）、npm -v（查看npm版本），输出版本号即配置成功。

### depcheck包管理工具

作用：检测项目中未使用的依赖包、缺失的依赖及无效的导出，修复package.json依赖关系。

```bash
// 全局安装
npm install -g depcheck
// 进入项目根目录执行
depcheck
// 输出结果包含：dependencies（已用依赖）、devDependencies（已用开发依赖）、unused（未用依赖）
```

### NVM安装
参考：
1、[使用nvm管理node多版本（安装、卸载nvm，配置环境变量，更换npm淘宝镜像）_node 版本管理-CSDN博客](https://blog.csdn.net/goods_yao/article/details/137854626)
2、[coreybutler/nvm-windows: A node.js version management utility for Windows. Ironically written in Go.](https://github.com/coreybutler/nvm-windows)

通过nvm可以安装和切换不同版本的node.js，安装nvm前首先要卸载原本的node.js，包括删除环境变量、安装目录D:\nodejs

找到nvm安装路径 =》找到 setting.txt 文件 =》新增两行信息，配置下载源
```txt
node_mirror: https://npmmirror.com/mirrors/node/
npm_mirror: https://npmmirror.com/mirrors/npm/
```
个人觉得没必要，直接挂梯子用官方源即可。

```shell
nvm list available 
nvm install 20.19.6
nvm uninstall 20.19.6
nvm use 20.19.6 #由该命令自动新建nodejs文件夹
nvm list
```
安装Node.js后正常配置缓存
```
npm config set prefix "D:\nvm\nodejs\node_global"
npm config set cache "D:\nvm\nodejs\node_cache"
```
环境变量已经自动配好

### yarn

Facebook开发的包管理工具，相比npm优势：安装速度快（并行安装）、版本锁定更严格（yarn.lock）、缓存机制更高效。
```bash
npm install -g yarn
```
**环境变量配置**：将D:\nodejs\node_cache\node_modules\yarn\bin添加到系统变量PATH中，验证：yarn -v输出版本号。

#### 常用命令

```bash
yarn init -y # 快速初始化项目（生成package.json）
yarn add 包名 # 安装生产依赖（写入dependencies）
yarn add 包名 --dev # 安装开发依赖（写入devDependencies）
yarn remove 包名 # 卸载依赖
yarn install # 依据package.json和yarn.lock安装依赖
yarn global add 包名 # 全局安装包
```

## 项目初始化

通过npm或yarn初始化项目，生成package.json文件（项目核心配置文件）。

```bash
// npm初始化（交互模式，需手动输入项目信息）
npm init
// npm快速初始化（使用默认配置，无需交互）
npm init -y

// yarn初始化（对应命令）
yarn init
yarn init -y
```

初始化后生成的package.json关键字段：

```json
{
  "name": "project-name", // 项目名称
  "version": "1.0.0", // 版本号
  "main": "index.js", // 入口文件
  "scripts": { // 自定义脚本（如npm run start）
    "start": "node index.js"
  },
  "dependencies": {}, // 生产依赖
  "devDependencies": {} // 开发依赖
}
```
### 依赖文件夹

node_modules是项目依赖文件夹，存放通过npm或yarn安装的所有依赖包，包含直接依赖（package.json中声明的）和间接依赖。
- 每个项目独立拥有node_modules，避免依赖版本冲突
- 可通过.npmignore或.gitignore忽略该文件夹（体积大，无需提交到代码仓库）
- package.json：记录项目基本信息、依赖包版本（dependencies生产依赖，devDependencies开发依赖）
- package-lock.json：锁定依赖包精确版本，npm install时优先依据此文件安装
## Node.js路由
Node.js 本身并没有内置的路由机制，但可以通过中间件库（如 Express）来实现。
路由通常涉及以下几个方面：
- **URL 匹配**：根据请求的 URL 来匹配路由规则。
- **HTTP 方法匹配**：根据请求的 HTTP 方法（GET、POST、PUT、DELETE 等）来匹配路由规则。
- **请求处理**：一旦匹配到合适的路由规则，就调用相应的处理函数来处理请求。
### Express框架

Node.js最流行的Web开发框架，基于中间件模式，简化HTTP服务器开发，核心是路由和中间件。
中间件是函数，可访问req、res对象和next()函数，作用：请求处理、权限验证、日志记录等。
```bash
// 项目内局部安装（推荐，避免全局版本冲突）
npm install express
# 或 yarn add express
```
#### Express示例

```javascript
// 引入Express
const express = require('express');
// 创建应用实例
const app = express();
// 定义端口
const port = 3000;

// 中间件：解析JSON格式请求体（Express 4.16+内置）
app.use(express.json());

// 路由：处理GET请求
app.get('/', (req, res) => {
  // req：请求对象（包含请求参数、头信息等）
  // res：响应对象（用于返回数据给客户端）
  res.send('Hello Express!');
});

// 路由：处理带参数的GET请求
app.get('/user/:id', (req, res) => {
  const userId = req.params.id; // 获取URL路径参数
  res.send(`User ID: ${userId}`);
});

// 路由：处理POST请求
app.post('/user', (req, res) => {
  const userData = req.body; // 获取请求体数据（需express.json()中间件）
  console.log('新增用户：', userData);
  res.status(201).send({ message: '用户创建成功', data: userData });
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
```

