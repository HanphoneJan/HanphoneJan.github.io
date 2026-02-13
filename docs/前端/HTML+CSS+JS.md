内容主要参考自：[html css js（这一篇就够了） - 小liii - 博客园](https://www.cnblogs.com/xxctx/p/18426729)

面经：[前端面试 HTML篇_w3cschool](https://www.w3cschool.cn/web_interview/web_interview-5pv93ptv.html)

语法速查：[HTML 速查表 | LabEx](https://labex.io/cheatsheets/zh/html)
## HTML：网页的结构骨架

HTML（超文本标记语言）是构建网页的基础，通过**标签+属性**定义网页结构，核心是「语义化」（用有意义的标签描述内容）。
### HTML基础结构
```html
<!DOCTYPE html>  <!-- 声明HTML5文档 -->
<html lang="zh"> <!-- 根元素，lang指定语言 -->
<head>
    <meta charset="UTF-8"> <!-- 字符编码 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> <!-- 适配移动端 -->
    <title>页面标题</title> <!-- 浏览器标签标题 -->
</head>
<body>
    <!-- 可见内容写在这里 -->
</body>
</html>
```
### 常用标签分类
| 类别       | 核心标签                          | 说明                     |
|------------|-----------------------------------|--------------------------|
| 文本       | h1-h6、p、br、hr                  | 标题、段落、换行、分隔线 |
| 列表       | ul/ol + li                        | 无序列表/有序列表        |
| 链接/媒体  | a(href/target)、img(src/alt)      | 超链接、图片             |
| 表格       | table > tr > td/th                | 表格行、单元格、表头     |
| 表单       | form、input(type/value)、button   | 表单容器、输入框、按钮   |
| 语义化标签 | header、nav、main、section、footer | 提升可访问性和SEO        |

### HTML属性
- 通用属性：`id`（唯一标识）、`class`（类名，可多个）、`style`（内联样式）
- 专属属性：`a`的`href`/`target`、`img`的`src`/`alt`、`input`的`type`/`placeholder`

### HTML关键概念
- 注释：`<!-- 注释内容 -->`（仅开发者可见）
- 元素类型：块级元素（占整行，如div/p）、行内元素（占内容宽，如span/a）

## CSS：网页的样式美化

CSS（层叠样式表）分离内容与样式，通过「选择器+属性:值」控制元素外观和布局。

### CSS基础语法与使用方式
#### CSS语法结构
```css
选择器 {
    属性1: 值1;
    属性2: 值2; /* 注释 */
}
```

#### 3种应用方式（优先级：内联 > 内部 > 外部）
1. 内联样式：`<div style="color: red;">`
2. 内部样式：`<head><style>div { color: red; }</style></head>`
3. 外部样式：`<link rel="stylesheet" href="style.css">`

### ⭐CSS选择器（优先级：ID > 类 > 元素 > 通配符）

| **选择器** | **格式**                                    | **优先级权重**        |
| ------- | ----------------------------------------- | ---------------- |
| id选择器   | \#id                                      | 100              |
| 类选择器    | .classname                                | 10               |
| 属性选择器   | a[ref=“eee”]                              | 10               |
| 伪类选择器   | li:last-child                             | 10               |
| 标签选择器   | div                                       | 1                |
| 伪元素选择器  | li:after                                  | 1                |
| 相邻兄弟选择器 | h1+p                                      | 0                |
| 子选择器    | ul>li                                     | 0                |
| 后代选择器   | li a                                      | 0                |
| 通配符选择器  | *                                         | 0                |

### CSS样式属性
#### ⭐CSS布局
- 盒模型：`width/height`、`margin`（外边距）、`padding`（内边距）、`border`（边框）
  - `box-sizing: content-box/border-box`：默认情况下，`box-sizing` 属性的值为 `content-box`，在这种模式下，`width` 和 `height` 只应用于内容区域。`border-box``width` 和 `height` 包括内容区域、内边距和边框，推荐使用。
- 定位：`position: static/relative/absolute/fixed/sticky`
  - `relative`：相对自身原位置偏移（保留文档流）
  - `absolute`：相对最近定位父元素（脱离文档流）
  - `fixed`：相对浏览器窗口（固定不动）
- 弹性布局（Flex）：`display: flex`
  - 主轴对齐：`justify-content`（center/space-between）
  - 交叉轴对齐：`align-items`（center/stretch）
- 网格布局（Grid）：`display: grid`
  - 定义行列：`grid-template-columns: 1fr 2fr`
- 响应式：`@media (max-width: 600px) { ... }`（适配小屏幕）

#### ⭐CSS样式
- 文本：`color`、`font-size`、`font-family`、`text-align`、`line-height`
- 背景：`background-color`、`background-image`
- 显示：`display: block/inline/inline-block/none`
- 文本溢出：`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`（省略号）

### CSS特性
#### 动画与过渡
animation动画、transition过渡、transform变换（rotate/scale）、linear-gradient渐变
- 过渡：`transition: background-color 0.5s ease`（hover时平滑变化）
- 动画：`@keyframes 动画名 { 0% { ... } 100% { ... } }` + `animation: 动画名 2s infinite`
#### 继承与优先级
- 继承：部分属性（如color）会继承父元素值，margin/padding不继承
- 优先级：内联样式 > ID > 类 > 元素；`!important` 强制最高优先级
#### CSS变量
`:root { --color: red; }` + `div { color: var(--color); }`

## JavaScript：网页的交互逻辑

JS是脚本语言，核心是操作DOM（文档对象模型）实现动态交互，支持异步编程。
- **核心语法**：变量（let/const/var）、数据类型（基本类型+引用类型）、运算符、控制结构（if-else/for/switch）
- **函数特性**：声明/表达式、箭头函数（无this绑定）、闭包（数据私有）、作用域（全局/函数/块级）
- **DOM操作**：选择（querySelector）、改内容（innerHTML）、改样式（classList）、操节点（appendChild）
- **事件处理**：addEventListener绑定、事件流（捕获→目标→冒泡）、事件委托（优化性能）
- **ES6+特性**：解构赋值、模板字符串、Promise、async/await、class类、import/export模块
### ⭐JS的DOM操作
![DOM树示例图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/frontend/DOM%E6%A0%91%E7%A4%BA%E4%BE%8B%E5%9B%BE.webp)


#### JS获取DOM元素
```javascript
// 常用方法（推荐querySelector/querySelectorAll）
document.getElementById("id"); // 获取单个元素
document.getElementsByClassName("class"); // 获取类数组
document.querySelector(".class"); // 获取第一个匹配元素
document.querySelectorAll("div"); // 获取所有匹配元素（NodeList）
```

#### JS修改DOM元素
```javascript
let div = document.querySelector("div");
// 修改内容
div.textContent = "纯文本"; // 推荐（安全）
div.innerHTML = "<span>带HTML</span>"; // 可插入标签（注意XSS）
// 修改属性
div.setAttribute("class", "new-class");
div.removeAttribute("class");
// 修改样式
div.style.color = "red"; // 内联样式
div.classList.add("active"); // 操作类名（推荐）
div.classList.toggle("active"); // 切换类名
```

#### JS创建/删除DOM元素
```javascript
// 创建
let newDiv = document.createElement("div");
newDiv.textContent = "新元素";
document.body.appendChild(newDiv); // 添加到页面
// 删除
document.body.removeChild(newDiv);
// 克隆
let clone = newDiv.cloneNode(true); // true=深度克隆（包含子元素）
```

### JS事件处理
#### （1）绑定/移除事件
```javascript
let btn = document.querySelector("button");
function handleClick() {
    console.log("点击了按钮");
}
btn.addEventListener("click", handleClick); // 绑定
btn.removeEventListener("click", handleClick); // 移除
```

#### （2）常见事件类型
- 鼠标：`click`、`mouseover`、`mouseout`
- 键盘：`keydown`、`keyup`
- 表单：`submit`、`input`、`change`
- 窗口：`resize`、`scroll`、`load`

#### （3）事件优化
- 事件委托：利用冒泡，将事件绑定到父元素（减少监听数）
  ```javascript
  document.querySelector(".parent").addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") { // 只响应按钮点击
          console.log("按钮被点击");
      }
  });
  ```
- 阻止默认行为/冒泡：`e.preventDefault()`、`e.stopPropagation()`

### ⭐JS异步编程
#### （1）回调函数（基础）
```javascript
setTimeout(() => {
    console.log("1秒后执行");
}, 1000);
```
![回调函数机制示例图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/frontend/%E5%9B%9E%E8%B0%83%E5%87%BD%E6%95%B0%E6%9C%BA%E5%88%B6%E7%A4%BA%E4%BE%8B%E5%9B%BE.webp)

#### （2）Promise（解决回调地狱）
Promise **用固定规范封装了回调逻辑**，核心新增了「微任务队列」机制：
- 核心结构：Promise 内部依然依赖回调函数（如 executor 函数的 resolve/reject），但将回调分为 `onFulfilled`（成功）和 `onRejected`（失败）两类，解决了回调地狱的嵌套问题；
- 微任务特性：Promise 的 `then/catch/finally` 回调会被推入**微任务队列**（优先级高于宏任务），这是它与普通回调函数的核心区别；
```javascript
let promise = new Promise((resolve, reject) => {
    // 异步操作
    setTimeout(() => resolve("成功"), 1000);
});
promise.then(res => console.log(res)).catch(err => console.error(err));
```
![js的promise状态图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/frontend/js%E7%9A%84promise%E7%8A%B6%E6%80%81%E5%9B%BE.webp)

#### （3）async/await（语法糖，更简洁）
Async/Await 完全基于 Promise 实现，没有任何新的底层机制，只是将 Promise 的链式调用（then/catch）转化为 “同步风格” 的语法。
```javascript
async function fetchData() {
    try {
        let res = await new Promise(resolve => setTimeout(() => resolve("数据"), 1000));
        console.log(res);
    } catch (err) {
        console.error(err);
    }
}
fetchData();
```

### JS的常用API
- 窗口操作：`window.innerWidth`、`window.scrollTo(0, 0)`、`window.open()`
- 定时器：`setTimeout`/`setInterval` + `clearTimeout`/`clearInterval`
- 表单操作：`input.value`（读取/设置值）、`form.checkValidity()`（验证）

### ES6+ 常用特性

```javascript
// 解构赋值
const { name, age } = user;
const [first, second] = array;

// 模板字符串
const message = `Hello ${name}, you are ${age} years old`;

// 箭头函数
const add = (a, b) => a + b;

// 展开运算符
const newArray = [...array1, ...array2];
const newObj = { ...obj1, ...obj2 };

// 可选链
const city = user?.address?.city;

// 空值合并
const name = username ?? 'Guest';

// 数组方法
const doubled = numbers.map(n => n * 2);
const adults = users.filter(u => u.age >= 18);
const sum = numbers.reduce((acc, n) => acc + n, 0);
```

### 性能优化技巧
#### 防抖
高频触发事件时，函数仅在最后一次触发后延迟执行，中途触发重置计时。
```javascript
// 防抖函数：高频触发时仅最后一次触发后延迟执行目标函数
function debounce(func, wait) {
  // 存储定时器ID，用于清除和重置计时
  let timeout;
  // 返回包装后的函数，接收原事件的参数
  return function executedFunction(...args) {
    // 定义延迟执行的逻辑：清除定时器并执行目标函数
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    // 每次触发都清除之前的定时器，重置计时
    clearTimeout(timeout);
    // 重新设置定时器，等待指定时间后执行later
    timeout = setTimeout(later, wait);
  };
}
```

#### 节流
指定时间内高频触发事件时，函数仅执行一次，控制执行频率。比如：
- 滚动条滚动（比如监听滚动加载数据、计算滚动位置）
- 鼠标移动（mousemove）、触摸滑动（touchmove）
- 高频点击的按钮（比如点赞按钮，限制 1 秒只能点一次）
```js
// 节流函数：限制函数在指定时间内只能执行一次
function throttle(func, limit) {
  // 标记是否处于节流窗口期
  let inThrottle;
  return function() {
    // 保存事件参数和函数执行上下文
    const args = arguments;
    const context = this;
    // 若不在窗口期，执行目标函数并开启窗口期
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      // 窗口期结束后重置标记，允许下次执行
      setTimeout(() => inThrottle = false, limit);
    }
  }
}
```


#### 懒加载
页面元素（如图片）仅在进入可视区域时才加载资源，优化首屏加载性能。
```js
// 图片懒加载：仅当图片进入视口时加载真实资源
const lazyLoad = () => {
  // 获取所有带data-src属性的图片（存储真实地址）
  const images = document.querySelectorAll('img[data-src]');
  // 创建交叉观察器，监听元素是否进入视口
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // 元素进入视口时
      if (entry.isIntersecting) {
        const img = entry.target;
        // 将真实地址赋值给src，触发图片加载
        img.src = img.dataset.src;
        // 停止监听该图片，避免重复处理
        imageObserver.unobserve(img);
      }
    });
  });
  // 为每个图片添加监听
  images.forEach(img => imageObserver.observe(img));
};
```