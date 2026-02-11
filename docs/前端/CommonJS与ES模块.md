转载自： [CommonJS与ES模块：新手完全指南 | 吉森的技术小站](http://www.gsein.cn/pages/commonjs-vs-es/#%E9%80%89%E6%8B%A9%E6%8C%87%E5%8D%97)

如果你是JavaScript新手，一定会对代码中时而出现的`require()`，时而出现的`import`感到困惑。为什么JavaScript会有两套不同的模块导入方式？它们有什么区别？什么时候该用哪一个？本文将用最通俗易懂的方式为你解答这些问题。

| 特性   | ES Module（ESM）                                          | CommonJS（CJS）                                         |
| ---- | ------------------------------------------------------- | ----------------------------------------------------- |
| 定位   | ECMAScript 官方原生模块系统（ES6 引入）                             | Node.js 最早采用的模块系统                                     |
| 支持环境 | 浏览器 + Node.js（v12+）                                     | 主要用于 Node.js 服务器端，可通过打包工具适配浏览器                        |
| 核心语法 | 导入：`import ... from '...'`；导出：`export`/`export default` | 导入：`require('...')`；导出：`module.exports`/`exports.xxx` |

## 📚 历史背景：为什么会有两套规范？

### JavaScript的模块化之路

在很久很久以前（大约2009年之前），JavaScript是没有官方模块系统的。开发者只能通过全局变量或者立即执行函数表达式来组织代码（如果你写过jquery，一定印象深刻），但是这也带来了很多问题。

```js
// 古老的方式：全局变量（容易冲突）
var myLibrary = {
  add: function(a, b) {
    return a + b;
  }
};

// 或者使用IIFE（立即执行函数表达式）组织代码（写法复杂）
(function() {
  var privateVar = 'secret';
  window.myLibrary = {
    add: function(a, b) {
      return a + b;
    }
  };
})();
```

### CommonJS的诞生（2009年）

2009年，Node.js诞生了。Node.js需要在服务器端运行JavaScript，而服务器端需要一个模块系统来组织代码。于是，Node.js建立并采用了CommonJS规范。

**CommonJS的设计理念**：

- 专为服务器端设计
- 同步加载模块（因为服务器端文件都在本地）
- 简单直观的语法

### ES模块的出现（2015年）

2015年，ECMAScript 2015（ES6）正式引入了官方的模块系统——ES模块（ESM）。这是JavaScript语言层面的标准，不再依赖于特定的运行环境（即浏览器或Node.js中都可以执行）。

**ES模块的设计理念**：

- 语言层面的标准
- 支持静态分析（编译时就能确定依赖关系）
- 异步加载（适合浏览器环境）
- 更好的Tree Shaking支持

## 🔍 基础语法对比

让我们通过实际例子来看看两种模块系统的语法差异。

### CommonJS语法

```js
// math.js - 导出模块
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// 方式1：逐个导出
exports.add = add;
exports.subtract = subtract;

// 方式2：整体导出
module.exports = {
  add,
  subtract
};

// 方式3：导出单个函数
module.exports = add;
```

```js
// main.js - 导入模块
const math = require('./math'); // 导入整个模块
const { add, subtract } = require('./math'); // 解构导入
const add = require('./math'); // 如果模块只导出一个函数

console.log(math.add(2, 3)); // 5
console.log(add(2, 3)); // 5
```

### ES模块语法

```js
// math.js - 导出模块
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// 方式1：命名导出
export { add, subtract };

// 方式2：直接导出
export function multiply(a, b) {
  return a * b;
}

// 方式3：默认导出
export default function divide(a, b) {
  return a / b;
}

// 方式4：混合导出
export { add, subtract };
export default divide;
```

```js
// main.js - 导入模块
import { add, subtract } from './math.js'; // 命名导入
import divide from './math.js'; // 默认导入
import divide, { add, subtract } from './math.js'; // 混合导入
import * as math from './math.js'; // 导入所有

console.log(add(2, 3)); // 5
console.log(divide(10, 2)); // 5
console.log(math.add(2, 3)); // 5
```

## ⚡ 核心差异详解

CommonJS和ES模块不仅仅是语法上的差异，它们就像大黄蜂和蜜蜂一样，长的很像，但是原理却完全不同。下面，将简要介绍二者的差异：

### 1. 加载机制

**CommonJS：同步加载**

```js
console.log('开始');
const math = require('./math'); // 这里会阻塞，直到模块加载完成
console.log('模块加载完成');
math.add(1, 2);
```

**ES模块：异步加载**

```js
console.log('开始');
import { add } from './math.js'; // 这里不会阻塞
console.log('继续执行');
// 模块会在后台异步加载
```

### 2. 导出值的性质

**CommonJS：导出的是值的拷贝**

```js
// counter.js
let count = 0;
function increment() {
  count++;
}
module.exports = { count, increment };

// main.js
const { count, increment } = require('./counter');
console.log(count); // 0
increment();
console.log(count); // 还是0！因为count是拷贝的值
```

**ES模块：导出的是值的引用**

```js
// counter.js
let count = 0;
export function increment() {
  count++;
}
export { count };

// main.js
import { count, increment } from './counter.js';
console.log(count); // 0
increment();
console.log(count); // 1！因为count是引用
```

### 3. 循环依赖处理

**CommonJS：可能导致部分加载**

```js
// a.js
const b = require('./b');
console.log('a.js:', b.name);
module.exports = { name: 'module-a' };

// b.js
const a = require('./a'); // 这时a.js还没执行完
console.log('b.js:', a.name); // undefined
module.exports = { name: 'module-b' };
```

**ES模块：更好的循环依赖处理**

```js
// a.js
import { name as bName } from './b.js';
console.log('a.js:', bName);
export const name = 'module-a';

// b.js
import { name as aName } from './a.js';
console.log('b.js:', aName); // 可以正确获取到值
export const name = 'module-b';
```

## 📁 文件扩展名：.js、.cjs、.mjs

这是很多新手困惑的地方。让我们来理清楚：

### .js文件

- **在Node.js中**：默认被当作CommonJS模块
- **在浏览器中**：需要通过`<script type="module">`来使用ES模块
- **在package.json中设置`"type": "module"`**：.js文件会被当作ES模块

### .cjs文件

- **明确表示**：这是一个CommonJS模块
- **无论package.json如何设置**：始终使用CommonJS语法

### .mjs文件

- **明确表示**：这是一个ES模块
- **无论package.json如何设置**：始终使用ES模块语法

### 实际例子

```js
// package.json
{
  "type": "module"
}
```

```js
// math.js - 现在被当作ES模块
export function add(a, b) {
  return a + b;
}

// utils.cjs - 明确指定为CommonJS
function helper() {
  return 'helper';
}
module.exports = { helper };

// main.mjs - 明确指定为ES模块
import { add } from './math.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { helper } = require('./utils.cjs');
```

## 🌍 使用场景

### 什么时候使用CommonJS？

1. **Node.js服务器端项目**

```js
// 典型的Node.js应用
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
// ...
```

2. **需要动态导入**

```js
// 根据条件动态加载模块
const moduleName = process.env.NODE_ENV === 'production' ? './prod' : './dev';
const config = require(moduleName);
```

3. **与旧项目兼容**

```js
// 大量现有的npm包仍然使用CommonJS
const lodash = require('lodash');
const moment = require('moment');
```

### 什么时候使用ES模块？

1. **现代前端项目**

```js
// React项目
import React from 'react';
import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

export default App;
```

2. **需要Tree Shaking**

```js
// 只导入需要的函数，减少打包体积
import { debounce } from 'lodash-es';
import { format } from 'date-fns';
```

3. **现代Node.js项目**

```js
// package.json中设置"type": "module"
import express from 'express';
import { readFile } from 'fs/promises';

const app = express();
```

## 🔧 常见问题与解决方案

### 问题1：Cannot use import statement outside a module

**错误示例**：

```js
// main.js
import { add } from './math.js'; // 报错！
```

**解决方案**：

```json
// package.json
{
  "type": "module"
}
```

或者使用.mjs扩展名：

```javascript
// main.mjs
import { add } from './math.js'; // 正确！
```

### 问题2：require is not defined

**错误示例**：

```js
// 在ES模块中使用require
const fs = require('fs'); // 报错！
```

**解决方案**：

```js
// 方法1：使用ES模块语法
import fs from 'fs';

// 方法2：创建require函数
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
```

### 问题3：混合使用CommonJS和ES模块

**在ES模块中导入CommonJS**：

```js
// commonjs-module.cjs
module.exports = { name: 'CommonJS Module' };

// es-module.mjs
import cjsModule from './commonjs-module.cjs'; // 正确！
console.log(cjsModule.name);
```

**在CommonJS中导入ES模块**：

```js
// es-module.mjs
export const name = 'ES Module';

// commonjs-module.cjs
// const esModule = require('./es-module.mjs'); // 错误！

// 正确的方式：使用动态import
(async () => {
  const esModule = await import('./es-module.mjs');
  console.log(esModule.name);
})();
```

### 问题4：__dirname和__filename在ES模块中不可用

**解决方案**：

```js
// ES模块中获取当前文件路径
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);
console.log(__filename);
```

