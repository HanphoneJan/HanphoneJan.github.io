资料参考：[前端面试 Vue篇_w3cschool](https://www.w3cschool.cn/web_interview/web_interview-ncsq3pv3.html)
## Vue3简介

一款用于构建用户界面的 JavaScript 框架。它基于标准 HTML、CSS 和 JavaScript 构建，并提供了一套声明式的、组件化的编程模型。
渐进式的即可以被“拆分”的部分的使用，而不是像next.js框架一样必须全盘使用。
![vue应用框架示例图1.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/vue/vue%E5%BA%94%E7%94%A8%E6%A1%86%E6%9E%B6%E7%A4%BA%E4%BE%8B%E5%9B%BE1.webp)

### 组合式API（Composition API）

Options API 要求将代码按 data/methods/computed/watch 等 “选项” 拆分，即使是同一业务逻辑（如 “用户信息管理”），代码也会分散在不同选项中，复杂组件维护难度高。

```vue
<!-- Vue2 选项式 API -->
<script>
export default {
  data() {
    return { user: { name: '', age: 0 } } // 用户信息（分散）
  },
  methods: {
    fetchUser() { /* 获取用户信息（分散） */ },
    updateUser() { /* 更新用户信息（分散） */ }
  },
  watch: {
    'user.name'(val) { /* 监听用户名（分散） */ }
  }
}
</script>
```

组合式 API ：通过 setup 入口，将 “用户信息管理” 的响应式数据、方法、监听逻辑聚合在一起，代码关联性更强，且支持逻辑抽离复用：ref（包装基本类型响应式）、reactive（包装对象响应式）、computed（计算属性）、watch（监听器）、onMounted（生命周期钩子）等。

```vue
<!-- Vue3 组合式 API（setup 语法糖） -->
<script setup>
import { ref, watch } from 'vue'

// 聚合：用户信息相关逻辑
const user = ref({ name: '', age: 0 })
const fetchUser = () => { /* 获取用户信息 */ }
const updateUser = () => { /* 更新用户信息 */ }
watch(() => user.value.name, (val) => { /* 监听用户名 */ })

// 逻辑抽离复用（可抽成独立函数/文件）
const useUserLogic = () => {
  // 复用的用户逻辑
  return { user, fetchUser, updateUser }
}
</script>
```

## 开发环境配置
参考：[快速上手 | Vue.js](https://cn.vuejs.org/guide/quick-start.html)
#### vue-cli 运行

1.全局安装(一次):yarn global add @vue/cli 或 npm i -g @vue/cli 
2.查看 Vue 版本:vue --version 
3.创建项目架子:vue create project-name(项目名-不能用中文) 
4.启动项目:yarn serve 或 npm run serve(找 package.json)

常见问题：电脑禁止运行脚本,set-ExecutionPolicy RemoteSigned；未在管理员模式下运行，vue add 命令会调用 npm，可能导致出问题

#### Vue3 + Vite 初始化
1. 创建 Vue3 项目：`npm create vite@latest project-name -- --template vue`（或 vue-ts 模板）
2. 安装依赖：`cd project-name && npm install`
3. 启动项目：`npm run dev`
4. Vue3 项目入口（main.js）核心写法：
```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'

const app = createApp(App)
app.use(router) // 挂载路由
app.use(pinia) // 挂载状态管理
app.mount('#app') // 替代 Vue2 的 new Vue({el: '#app'})
```

#### 项目结构

```plaintext
VUE-DEMO
├── node_modules          # 第三包文件夹
├── public                # 放html文件的地方
│   ├── favicon.ico       # 网站图标
│   └── index.html        # 模板文件
├── src                   # 源代码目录（写代码的文件夹）
│   ├── assets            # 静态资源目录（放图片、字体等）
│   ├── components        # 组件目录（存放组件）
│   ├── App.vue           # 项目运行看到的内容编写处
│   └── main.js           # 入口文件（打包/运行时第一个执行）
├── .gitignore            # git忽略文件
├── babel.config.js       # babel配置文件
├── jsconfig.json         # js配置文件
├── package.json          # 项目配置文件（含项目名、版本、scripts、依赖等）
├── README.md             # 项目说明文档
├── vue.config.js         # vue-cli配置文件
└── yarn.lock             # yarn锁文件（锁定安装版本）
```

src 中 views 文件夹用于存放页面组件

#### 网页生命周期

区分插件和组件
- 组件：可复用的 UI 单元，注册后在模板中使用
- 插件：扩展 Vue 全局功能的工具，如路由、状态管理

组件在 main.js 中通过 `app.component()` 全局注册，或在组件内局部注册；
插件在 main.js 中通过 `app.use()` 安装，Vue3 插件的实现仍暴露 install 方法（适配 Vue3 实例）：
```js
// 自定义 Vue3 插件
const MyPlugin = {
  install(app, options) {
    // 全局注册组件
    app.component('MyComponent', /* 组件定义 */)
    // 全局指令
    app.directive('my-directive', /* 指令定义 */)
    // 全局属性
    app.config.globalProperties.$myUtil = options.util
  }
}
// 安装插件
app.use(MyPlugin, { util: /* 自定义工具 */ })
```

#### 打包

通过配置 package.json 文件中的 scripts 来配置运行的指令，例如
```json
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "build:dev":"vue-cli-service build --mode dev",
    "build:pro":"vue-cli-service build --mode pro"
  }
```

开发模式（Development Mode）： 在开发模式下，Vue.js 提供了丰富的开发工具和调试功能，方便开发者进行快速的前端开发和调试。在开发模式下，Vue.js 会输出有关错误信息和警告的详细日志，帮助开发者定位问题和调试代码。开发模式下的构建文件通常较大，包含了额外的调试代码和开发工具。

生产模式（Production Mode）： 在生产模式下，Vue.js 会对代码进行优化和压缩，去除调试和开发工具，以提高页面加载速度和性能。生产模式下的构建文件通常较小，适合在实际生产环境中使用。
打包命令：`npm run build`，打包配置在 `vite.config.js` 中（如 base 路径、输出目录）：
```js
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  base: './', // 解决打包后空白页（适配相对路径）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src') // 配置 @ 别名
    }
  },
  build: {
    outDir: 'dist', // 输出目录
    assetsDir: 'assets' // 静态资源目录
  }
})
```

## 模板语法

### vue3常用指令

```js
//指令作用
v-bind //为HTML标签绑定属性值，如设置 href , css样式等  可以省略（简写 :）
v-model //在表单元素上创建双向数据绑定（Vue3 支持参数和自定义组件绑定）
v-on //为HTML标签绑定事件（简写 @）
v-if //条件性的渲染某元素，判定为true时渲染,否则不渲染
v-else
v-else-if
v-show // 根据条件展示某元素，区别在于切换的是display属性的值（Vue3 无本质变化）
v-for // 列表渲染，遍历容器的元素或者对象的属性（Vue3 要求配合 key，且不能和 v-if 同级）
v-slot// 插槽绑定（简写 #）
v-pre //跳过当前元素及子元素的编译（提升性能）
v-cloak //解决初始化时的插值表达式闪烁问题
v-once //只渲染一次，后续数据变化不更新
```

使用示例：
```vue
<template>
  <!-- v-bind 简写 -->
  <a :href="url">链接</a>
  <!-- v-on 简写 + 事件参数 -->
  <button @click="handleClick($event, '参数')">点击</button>
  <!-- v-for + key（必须为唯一值） -->
  <div v-for="item in list" :key="item.id">{{ item.name }}</div>
  <!-- v-model 参数（Vue3 新特性） -->
  <MyComponent v-model:title="pageTitle" />
</template>
```

### 插值表达式

- 支持单个表达式（不支持语句/流程控制）：`{{ 1 + 1 }}`、`{{ msg || '默认值' }}`，
- 数据为 `undefined`/`null`时，插值会显示空字符串，不会报错
- 不能渲染HTML标签
```vue
<template>
  <p>{{ htmlText }}</p> <!-- 会显示：<span>这是红色文字</span>，而不是红色文字 -->
</template>
<script setup>
const htmlText = ref('<span style="color:red">这是红色文字</span>');
</script>
```
- Vue2有过滤器，Vue3 移除，用计算属性/方法替代：
```vue
<template>
  <!-- 计算属性替代过滤器 -->
  {{ formatMsg(msg) }}
</template>
<script setup>
	const msg = 'hello'
	const formatMsg = (str) => str.toUpperCase()
</script>
```

## Vue响应式原理与数据绑定

### Proxy

在 Vue 3 中，Proxy 是实现其响应式系统的底层技术。响应式是指当数据变化时，视图会自动更新。Vue 2 使用 Object.defineProperty() 来实现响应式，但有一些限制，比如：无法检测到对象属性的动态添加或删除。
需要对数组进行特殊处理（重写数组方法）。Vue 3 使用 ES6 的 Proxy 来解决这些问题。Proxy 可以拦截并自定义对对象的底层操作，如属性查找、赋值、枚举、函数调用等。

```js
// 简单示例：使用 Proxy 创建一个响应式对象
const handler = {
  get(obj, prop) {
    console.log(`Getting ${prop}!`)
    return obj[prop]
  },
  set(obj, prop, value) {
    console.log(`Setting ${prop} to ${value}`)
    obj[prop] = value
    // 通知更新
    return true
  }
}

const state = new Proxy({ count: 0 }, handler)

state.count // 会触发 get，输出 "Getting count!"
state.count = 1 // 会触发 set，输出 "Setting count to 1"
```
Vue 3 内部使用 Proxy 来包裹你的数据对象，当你访问或修改数据时，Vue 可以通过 Proxy 的拦截机制精确地追踪到这些变化。
### 响应式数据属性
Vue2 响应式基于 `Object.defineProperty`（仅支持对象/数组，存在新增属性无响应、数组下标修改无响应问题）；
Vue3 响应式核心基于 `Proxy` + `Reflect`（支持对象、数组、Map/Set 等，解决 Vue2 痛点）：

```js
// Vue3 响应式底层简化实现
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      const res = Reflect.get(target, key, receiver)
      // 依赖收集
      track(target, key)
      return typeof res === 'object' && res !== null ? reactive(res) : res
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver)
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        // 触发更新
        trigger(target, key)
      }
      return result
    }
  })
}
```

### Vue3 的响应式 API
常用的是ref和reactive

| API      | 作用              | 适用场景                |
| -------- | --------------- | ------------------- |
| ref      | 包装基本类型/对象为响应式   | 基本类型（string/number） |
| reactive | 包装对象为响应式（深度）    | 复杂对象/数组             |
| readonly | 包装响应式数据为只读      | 防止数据被修改             |
| toRef    | 为响应式对象的属性创建 ref | 保留响应式的属性传递          |
| toRefs   | 解构响应式对象且保留响应式   | 解构 reactive 对象      |
代码示例：
```vue
<script setup>
import { ref, reactive, readonly, toRef, toRefs } from 'vue'

// ref（基本类型）
const count = ref(0)
count.value++ // 访问/修改需通过 .value（模板中无需）

// reactive（复杂对象）
const user = reactive({ name: '张三', age: 18 })
user.age = 19 // 直接修改

// readonly（只读）
const readOnlyUser = readonly(user)
// readOnlyUser.age = 20 // 报错

// toRef（单个属性）
const ageRef = toRef(user, 'age')

// toRefs（解构）
const { name, age } = toRefs(user)
</script>
```
### 计算属性（Computed）
Vue3 组合式 API 写法（支持 getter/setter）：
```vue
<script setup>
import { ref, computed } from 'vue'

const count = ref(0)
// 只读计算属性
const doubleCount = computed(() => count.value * 2)

// 可写计算属性
const fullName = computed({
  get() {
    return `${firstName.value} ${lastName.value}`
  },
  set(newValue) {
    const [first, last] = newValue.split(' ')
    firstName.value = first
    lastName.value = last
  }
})

const firstName = ref('张')
const lastName = ref('三')
fullName.value = '李 四' // 触发 setter
</script>
```
原理：计算属性基于依赖缓存，依赖不变时重复访问不会重新计算，性能优于方法。

### 监听器（Watch）

Vue3 监听器分为 `watch`（显式监听）和 `watchEffect`（隐式监听），代码示例：
```vue
<script setup>
import { ref, reactive, watch, watchEffect } from 'vue'

// 监听 ref
const count = ref(0)
watch(count, (newVal, oldVal) => {
  console.log(`count从${oldVal}变为${newVal}`)
}, { immediate: true, deep: false }) // immediate：立即执行；deep：深度监听

// 监听 reactive 对象
const user = reactive({ name: '张三', age: 18 })
watch(() => user.age, (newVal) => {
  console.log(`年龄变为${newVal}`)
})

// 监听多个源
watch([count, () => user.age], ([newCount, newAge]) => {
  console.log(`count:${newCount}, age:${newAge}`)
})

// watchEffect（自动收集依赖）
const stop = watchEffect((onInvalidate) => {
  console.log(`count:${count.value}, name:${user.name}`)
  // 清理副作用（如取消请求）
  onInvalidate(() => {
    // 副作用触发前执行
  })
})
// 停止监听
// stop()
</script>
```
区别：
- watch：需指定监听源，可获取新旧值，支持懒执行（默认首次不执行）；
- watchEffect：无需指定源，自动收集依赖，立即执行，无法获取旧值。

## vue生命周期钩子

![vue生命周期流程图.webp](https://hanphone.top/gh/HanphoneJan/public_pictures/vue/vue%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E6%B5%81%E7%A8%8B%E5%9B%BE.webp)
### 生命周期钩子

Vue3 存在两种生命周期写法：选项式 API（和 Vue2 兼容）、组合式 API（推荐），对应关系：

| 选项式 API       | 组合式 API         | 作用                     |
| ------------- | --------------- | ---------------------- |
| beforeCreate  | -               | 组合式 API 中无对应（setup 替代） |
| created       | -               | setup 替代               |
| beforeMount   | onBeforeMount   | 挂载前                    |
| mounted       | onMounted       | 挂载完成（DOM 可用）           |
| beforeUpdate  | onBeforeUpdate  | 更新前                    |
| updated       | onUpdated       | 更新完成                   |
| beforeUnmount | onBeforeUnmount | 卸载前                    |
| unmounted     | onUnmounted     | 卸载完成                   |

组合式 API 示例：
```vue
<script setup>
import { onMounted, onUpdated, onUnmounted } from 'vue'

onMounted(() => {
  console.log('组件挂载完成')
  // 可执行 DOM 操作、发起请求等
})

onUpdated(() => {
  console.log('组件更新完成')
})

onUnmounted(() => {
  console.log('组件卸载完成')
  // 清理定时器、取消请求等
})
</script>
```

## 表单绑定 v-model

Vue3 中 v-model 底层实现变更（替代 Vue2 的 `value`/`input`，统一为 `modelValue`/`update:modelValue`），核心用法：

```vue
<template>
  <!-- 输入框 -->
  <input v-model="msg" />
  <!-- 复选框 -->
  <input type="checkbox" v-model="checked" />
  <!-- 单选框 -->
  <input type="radio" v-model="gender" value="male" />
  <!-- 下拉框 -->
  <select v-model="city">
    <option value="beijing">北京</option>
  </select>
</template>
<script setup>
import { ref } from 'vue'
const msg = ref('')
const checked = ref(false)
const gender = ref('')
const city = ref('')
</script>
```
### input修饰符
为简化表单输入的常见处理逻辑，Vue3 为 v-model 提供了专属的 input 修饰符，无需手动编写处理函数即可实现首尾空格去除、输入值自动转数字、延迟更新（失去焦点时同步）等效果
- `.trim`：去除首尾空格；
- `.number`：转为数字（非数字则返回原始值）；
- `.lazy`：失去焦点时更新（替代 input 事件为 change 事件）；
```vue
<input v-model.trim="msg" />
<input v-model.number="age" />
<input v-model.lazy="content" />
```

### 自定义组件的 v-model
```vue
<!-- 父组件 -->
<template>
  <MyInput v-model="username" />
  <!-- 带参数的 v-model -->
  <MyInput v-model:email="userEmail" />
</template>

<!-- 子组件 MyInput.vue -->
<script setup>
// 声明接收的 model prop（默认 modelValue）
const props = defineProps(['modelValue', 'email'])
// 声明触发的事件（默认 update:modelValue）
const emit = defineEmits(['update:modelValue', 'update:email'])
</script>
<template>
  <input 
    :value="modelValue" 
    @input="emit('update:modelValue', $event.target.value)"
  />
  <input 
    :value="email" 
    @input="emit('update:email', $event.target.value)"
  />
</template>
```

## 事件处理
事件处理是 Vue3 实现页面交互的核心能力，用于响应用户在页面上的操作（如点击、滚动、输入等）
### 事件修饰符
Vue3 保留了 Vue2 中实用的事件修饰符，用于简化原生事件的常见操作（如阻止冒泡、阻止默认行为等）
```vue
<!-- 阻止冒泡 -->
<button @click.stop="handleClick">点击</button>
<!-- 阻止默认行为 -->
<a @click.prevent="handleLink">链接</a>
<!-- 捕获模式 -->
<div @click.capture="handleCapture">容器</div>
<!-- 只触发一次 -->
<button @click.once="handleOnce">点击</button>
<!-- 被动监听（优化滚动性能） -->
<div @scroll.passive="handleScroll">滚动容器</div>
```

### .sync 修饰符与v-model:prop
Vue2 中用于实现单个 prop 双向绑定的 `.sync` 修饰符在 Vue3 中被废弃，取而代之的是更统一、语义更清晰的 `v-model:prop` 写法，两者功能完全等价，但 `v-model:参数` 更贴合 Vue3 双向绑定的核心逻辑
```vue
<!-- Vue2 .sync 写法（Vue3 废弃） -->
<MyComponent :title.sync="pageTitle" />
<!-- Vue3 等价写法 -->
<MyComponent v-model:title="pageTitle" />
```

### 组合式 API 事件绑定
在 Vue3 组合式 API（setup 语法糖）中，事件绑定逻辑更简洁，可直接在 setup 中定义事件处理函数，通过 `@事件名` 绑定到元素上，支持传递原生事件对象 `$event` 和自定义参数。
```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
// 事件处理函数
const handleClick = (e, num) => {
  count.value += num
  console.log(e) // 原生事件对象
}
</script>
<template>
  <button @click="handleClick($event, 1)">+1</button>
</template>
```

### 自定义指令
自定义指令是 Vue3 提供的扩展能力，用于对普通 DOM 元素进行底层操作（如自动聚焦、修改样式、监听滚动等），弥补内置指令（如 v-model、v-for）无法覆盖的个性化 DOM 操作需求。Vue3 为自定义指令设计了专属钩子函数（如 mounted、updated），支持全局注册和局部注册，指令可接收参数和值，能在 DOM 生命周期的不同阶段执行自定义逻辑。**指令对象**，是定义自定义指令时的核心载体 —— 它本质是一个包含特定生命周期钩子函数的 JavaScript 对象，每个钩子函数对应 DOM 元素的不同阶段，用于执行自定义的 DOM 操作。
#### 全局自定义指令
全局自定义指令通过 Vue 应用实例的 `directive` 方法注册，注册后可在项目所有组件的模板中直接使用，适合需要全项目复用的 DOM 操作逻辑（如输入框自动聚焦、统一的样式处理）
```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
// 注册全局指令 v-focus
app.directive('focus', {
  mounted(el) {
    el.focus() // 挂载后自动聚焦
  }
})
app.mount('#app')
```
#### 局部自定义指令
局部自定义指令仅在当前组件内生效，通过在组件的 setup 语法糖中**定义指令对象实现**
```vue
<script setup>
// 注册局部指令 v-color
const vColor = {
  mounted(el, binding) {
    el.style.color = binding.value // 接收指令参数
  },
  updated(el, binding) {
    el.style.color = binding.value
  }
}
</script>
<template>
  <input v-focus />
  <div v-color="'red'">红色文本</div>
</template>
```
##### 自定义插槽
插槽是 Vue3 实现组件内容分发的核心机制，允许父组件向子组件的指定位置传递自定义内容，让组件结构更灵活、可复用。Vue3 插槽分为匿名插槽（默认插槽）、具名插槽（多区域内容分发）和作用域插槽（子组件向父组件传递数据），通过 `slot` 标签定义插槽位置，`v-slot`（简写 \#）绑定插槽内容，满足不同场景下的组件内容定制需求。
**匿名插槽（默认插槽）**：
匿名插槽是最基础的插槽类型，子组件中未命名的 `<slot>` 标签会接收父组件传入的所有未指定插槽名的内容，还可设置后备内容（父组件未传内容时显示），适合组件只有一个自定义内容区域的场景
```vue
<!-- 子组件 -->
<template>
  <div>
    <slot>默认内容（后备内容）</slot>
  </div>
</template>

<!-- 父组件 -->
<template>
  <MyComponent>自定义内容</MyComponent>
</template>
```

**具名插槽（v-slot 简写 \#）**：
具名插槽为子组件的不同区域命名（通过 `name` 属性），父组件可通过 `v-slot:名称`（简写 \#名称）将内容精准分发到对应位置，解决单个组件多区域内容定制的问题，让组件结构分工更清晰。
```vue
<!-- 子组件 -->
<template>
  <div>
    <slot name="header"></slot>
    <slot></slot>
    <slot name="footer"></slot>
  </div>
</template>

<!-- 父组件 -->
<template>
  <MyComponent>
    <template #header>头部内容</template>
    <template #default>主体内容</template>
    <template #footer>底部内容</template>
  </MyComponent>
</template>
```

**作用域插槽（子传父数据）**：
作用域插槽是带数据传递的插槽，子组件可通过 `slot` 标签绑定数据（如 `:user="user"`），父组件在使用插槽时能接收这些数据并结合自身逻辑渲染内容，实现 “子组件提供数据、父组件定制渲染” 的灵活交互，常用于列表渲染、表格列定制等场景。
```vue
<!-- 子组件 -->
<template>
  <div>
    <slot :user="user" :age="18"></slot>
  </div>
</template>
<script setup>
const user = { name: '张三' }
</script>

<!-- 父组件 -->
<template>
  <MyComponent>
	<!-- 写法1 -->
    <template #default="slotProps">
      {{ slotProps.user.name }} - {{ slotProps.age }}
    </template>
    <!-- 写法2：解构写法 -->
    <template #default="{ user, age }">
      {{ user.name }} - {{ age }}
    </template>
  </MyComponent>
</template>
```

## 组件化开发

1. 组件是 “特殊的响应式对象”Vue3 中组件通过`defineComponent`定义，本质是一个包含`setup`、`props`、`emits`等选项的组件描述对象；当组件被使用时，Vue 会基于这个描述对象创建**组件实例**，实例内部维护着自身的响应式状态、生命周期等。
2. **组件的渲染流程**
	- **初始化**：组件被使用时，Vue 先解析组件的`props`、`emits`等选项，创建组件实例。
	- **执行逻辑**：调用`setup`函数（组合式 API），执行组件逻辑、创建响应式数据。
	- **生成 VNode**：通过模板编译（或 JSX）生成**虚拟 DOM 节点（VNode）**，描述组件的 UI 结构。
	- **渲染挂载**：Vue 的渲染器（Renderer）将 VNode 转换为真实 DOM，并挂载到页面；后续响应式数据变化时，触发组件的**重新渲染**（仅更新变化的 VNode 对应的 DOM）。
3. **组件的作用域隔离**    
    每个组件实例都有独立的**作用域**：响应式状态、`props`、`context`等都是组件实例独有的，不同组件实例之间不会相互干扰（除非主动通过`provide/inject`、事件等方式通信）。
### 组件注册
全局注册时，Vue 会将组件存入**应用实例的全局组件注册表**中，渲染时从全局表中查找。
局部注册时，组件仅存入**当前组件实例的局部注册表**，作用域仅限当前组件及其子组件（需显式传递）。
#### 全局注册
注册在根app上
```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import MyComponent from './components/MyComponent.vue'

const app = createApp(App)
app.component('MyComponent', MyComponent) // 全局注册
app.mount('#app')
```
#### 局部注册
```vue
<script setup>
// 直接导入即局部注册，无需声明 components 选项
import MyComponent from './MyComponent.vue'
</script>
<template>
  <MyComponent />
</template>
```
#### scoped 样式
原理：Vue 为 scoped 样式的元素添加唯一属性（如 `data-v-xxx`），样式自动拼接该属性选择器，仅作用于当前组件；
注意点：
- 子组件根元素会继承父组件 scoped 样式的属性，可通过 `:deep()` 穿透：
```vue
<style scoped>
/* 穿透子组件样式 */
:deep(.child-class) {
  color: red;
}
/* 全局样式（不添加 scoped 属性） */
.global-class {
  font-size: 14px;
}
</style>
```

#### 组件 data 规则
选项式 API 的 data 仍需为函数（避免组件复用数据共享）；组合式 API 用 ref/reactive 替代：
```vue
<!-- 选项式 API -->
<script>
export default {
  data() { // 必须是函数
    return {
      count: 0
    }
  }
}
</script>

<!-- 组合式 API（推荐） -->
<script setup>
import { ref } from 'vue'
const count = ref(0) // 天然隔离，无需函数
</script>
```

### 组件通信
多组件数据共享核心方案：
1. **Pinia**：全局共享（如用户信息、全局配置），推荐首选；
2. **Provide / Inject**：跨层级组件共享（如主题、语言）；
3. **Mitt 事件总线**：临时、低频的跨组件通信；
4. **LocalStorage/SessionStorage**：持久化共享（如 token、用户偏好设置），注意非响应式，需结合 watch 实现响应式

#### 父子通信
##### 父传子（Props）
Vue3 中 Props 支持 TypeScript 类型校验，示例：
```vue
<!-- 子组件 -->
<script setup>
// 基础写法
const props = defineProps(['title', 'count'])

// 带类型校验
const props = defineProps({
  title: {
    type: String,
    required: true,
    default: '默认标题'
  },
  count: {
    type: Number,
    default: 0
  }
})

// TS 写法
interface Props {
  title: string
  count?: number
}
const props = defineProps<Props>()
</script>

<!-- 父组件 -->
<template>
  <MyComponent title="父组件传递的标题" :count="10" />
</template>
```

##### 子传父（Emit）
```vue
<!-- 子组件 -->
<script setup>
// 基础写法
const emit = defineEmits(['change', 'delete'])

// 带参数校验（TS）
const emit = defineEmits<{
  (e: 'change', value: string): void
  (e: 'delete', id: number): void
}>()

// 触发事件
const handleClick = () => {
  emit('change', '子组件传递的值')
  emit('delete', 1)
}
</script>

<!-- 父组件 -->
<template>
  <MyComponent 
    @change="handleChange" 
    @delete="handleDelete"
  />
</template>
<script setup>
const handleChange = (value) => {
  console.log('接收子组件值：', value)
}
const handleDelete = (id) => {
  console.log('删除 ID：', id)
}
</script>
```

####  Provide / Inject（跨层级通信）
```vue
<!-- 父组件（提供数据） -->
<script setup>
import { provide, ref } from 'vue'

const theme = ref('dark')
// 提供静态数据
provide('siteName', 'Vue 学习笔记')
// 提供响应式数据
provide('theme', theme)
// 提供方法
provide('changeTheme', (newTheme) => {
  theme.value = newTheme
})
</script>

<!-- 子/孙组件（注入数据） -->
<script setup>
import { inject } from 'vue'

const siteName = inject('siteName', '默认名称') // 第二个参数为默认值
const theme = inject('theme')
const changeTheme = inject('changeTheme')
</script>
```

#### Pinia状态管理

Vue3 推荐使用 Pinia 替代 Vuex（更简洁、支持 TS、无模块嵌套限制）

```bash
npm install pinia # 安装命令
```

##### 配置 Pinia
挂载到根组件app上
```js
// src/stores/index.js
import { createPinia } from 'pinia'
const pinia = createPinia()
export default pinia

// main.js 挂载
import pinia from './stores'
app.use(pinia)
```
##### 定义 Store
```js
// src/stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 选项式写法
export const useUserStore = defineStore('user', {
  state: () => ({
    name: '张三',
    age: 18,
    token: ''
  }),
  getters: {
    // 计算属性（基于 state）
    fullInfo: (state) => `${state.name} - ${state.age}岁`
  },
  actions: {
    // 方法（可异步）
    setToken(newToken) {
      this.token = newToken
    },
    async fetchUserInfo() {
      const res = await fetch('/api/user')
      const data = await res.json()
      this.name = data.name
      this.age = data.age
    }
  }
})

// 组合式写法（推荐，支持 setup 语法）
export const useCounterStore = defineStore('counter', () => {
  // state：ref/reactive
  const count = ref(0)
  // getters：computed
  const doubleCount = computed(() => count.value * 2)
  // actions：普通函数
  const increment = () => {
    count.value++
  }
  const incrementAsync = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    count.value++
  }

  return { count, doubleCount, increment, incrementAsync }
})
```
##### 使用 Store
```vue
<script setup>
import { useUserStore, useCounterStore } from '@/stores'

// 获取 Store 实例
const userStore = useUserStore()
const counterStore = useCounterStore()

// 访问 state
console.log(userStore.name)
console.log(counterStore.count)

// 访问 getters
console.log(userStore.fullInfo)
console.log(counterStore.doubleCount)

// 调用 actions
userStore.setToken('xxx')
counterStore.increment()

// 批量修改 state（$patch）
userStore.$patch({
  name: '李四',
  age: 20
})
// 函数式修改（适合复杂逻辑）
userStore.$patch((state) => {
  state.age += 1
})

// 重置 state
userStore.$reset()

// 订阅 state 变化
userStore.$subscribe((mutation, state) => {
  console.log('state 变化：', mutation, state)
})
</script>
```
#### 事件总线
Vue2 使用EventBus，Vue3已经废弃，推荐用 Pinia/Provide Inject通信，或第三方库 mitt实现事件总线通信
```bash
npm install mitt
```
```js
// utils/bus.js
import mitt from 'mitt'
const bus = mitt()
export default bus
```
```vue
<!-- 发送方 -->
<script setup>
import bus from '@/utils/bus'
const handleSend = () => {
  bus.emit('msg', '跨组件消息')
}
</script>

<!-- 接收方 -->
<script setup>
import bus from '@/utils/bus'
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  bus.on('msg', (msg) => {
    console.log('接收消息：', msg)
  })
})

onUnmounted(() => {
  bus.off('msg') // 解绑事件，避免内存泄漏
})
</script>
```

## Vue路由
### 路由的概念
后端路由：在前后端不分离的时代，路由都是通过服务端指定的，服务端根据客户端发来的HTTP请求，将返回的数据于模板引擎响应结果结合后进行渲染，将渲染完毕的页面发送给客户端。
优点：SEO友好，爬虫爬取到的页面就是最终的渲染结果。
缺点：每次发起请求都要刷新页面，用户体验不好，服务器压力大。
##### 单页面和多页面网站的区别
| 特性    | 单页面应用（SPA）       | 多页面应用（MPA）     |
| ----- | ---------------- | -------------- |
| 页面跳转  | 无刷新（JS 切换组件）     | 整页刷新（请求新 HTML） |
| 路由控制  | 前端路由（Vue Router） | 后端路由（服务器返回页面）  |
| 性能    | 首次加载慢，后续快        | 首次加载快，后续慢      |
| SEO   | 差（需预渲染/SSR）      | 好              |
| 开发复杂度 | 高（需前端路由/状态管理）    | 低              |

SPA是单页面应用Single Page web Application的简写。简单理解就是一个web项目只有一个html文件，一旦页面加载完成，SPA不会因为用户的操作进行重新加载或跳转，而是用JS动态变换html的内容（使页面无需重新加载，用户体验更加流程），页面本身的url并没有变化，这将导致两个问题：

1.SPA无法就记住用户的操作：刷新 & 前进 & 后退。
2.实际只有一个url，对SEO不友好，爬虫获取到的html只是模板而不是最终的页面。

前端路由的由来可以理解成是基于SPA页面局部更新特点的，但是要解决SPA的两个问题，实现：
1、改变url不让浏览器向服务器发送请求
2、监听url的变化，执行对应的操作

### Vue Router

```bash
npm install vue-router # 安装命令
```
##### 配置路由
```js
// src/router/index.js
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import NotFind from '@/views/NotFind.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/user/:id?', // 动态路由参数（? 表示可选）
    name: 'User',
    component: () => import('@/views/User.vue') // 懒加载（优化首屏）
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { requiresAuth: true } // 路由元信息（用于权限控制）
  },
  {
    path: '*',
    component: NotFind // 404 页面
  },
  {
    path: '/redirect',
    redirect: '/home' // 路由重定向
  }
]

const router = createRouter({
  // hash 路由（# 号，无需服务器配置）
  // history: createWebHashHistory(),
  // history 路由（无 # 号，需服务器配置）
  history: createWebHistory(),
  routes
})

// 全局路由守卫（权限控制示例）
router.beforeEach((to, from, next) => {
  const isLogin = localStorage.getItem('token')
  if (to.meta.requiresAuth && !isLogin) {
    next('/login') // 未登录跳转到登录页
  } else {
    next() // 放行
  }
})

export default router

// main.js 挂载
import router from './router'
app.use(router)
```

#### 声明式导航—跳转传参
```vue
<template>
  <!-- 查询参数传参（query）：适合多参数，刷新页面不丢失 -->
  <router-link :to="{ name: 'User', query: { id: 1, name: '张三' } }">
    用户页（query）
  </router-link>

  <!-- 动态路由传参（params）：适合单参数，需配置动态路由，刷新页面不丢失（history 模式） -->
  <router-link :to="{ name: 'User', params: { id: 1 } }">
    用户页（params）
  </router-link>
</template>
```

#### 编程式导航
```vue
<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter() // 路由实例
const route = useRoute() // 当前路由信息

// 获取参数
console.log(route.query.id) // query 参数
console.log(route.params.id) // params 参数

// 跳转页面
const goToUser = () => {
  router.push({ name: 'User', query: { id: 1 } })
}

// 替换页面（无历史记录）
const replaceToHome = () => {
  router.replace('/')
}

// 前进/后退
const goBack = () => {
  router.go(-1) // 后退一步
}
</script>
```
#### hash 路由 和 history 路由
[【面试】前端路由 hash 和 history 的区别_history hash 服务器压力哪个大-CSDN 博客](https://blog.csdn.net/qq_42345108/article/details/124144047)

- hash模式的特点；
    - hash值的变化不会导致浏览器向服务器发送请求，不会引起页面刷新
    - hash值变化会触发hashchange事件
    - hash值变化会在浏览器的历史中留下记录，使用的浏览器的后退按钮可以回到上一个hash值
    - hash永远不会提交到服务器，即使刷新页面也不会。


在HTML5规范中，history中增加了新的API

```js
/*
  参数说明：
    state：合法的JavaScript对象，可以用在popstate对象中
    title：标题，基本忽略，用null
    url: 任意有效的url，将要跳转的新地址
*/
history.pushState(state, title, url) // 保留现有记录的同时，将url加到历史记录中
history.replaceState(state, title, url) // 将历史记录中的当前页面替换成url
history.state // 返回当前状态对象
```
pushState和replaceState方法可以改变url，但是不会刷新页面，浏览器不会向服务端发送请求，具备了实现前端路由的能力。
如何监听url的变化？
对比hash的hashchange方法，history的变化不会触发任何事件，我们可以通过罗列可能触发history变化的情况，对这些情况进行拦截，以此监听history的变化。
对于单页面的history模式而言，url的改变只能由以下情况引起：
1.点击浏览器的前进/后退按钮，onpopstate可以监听到
2.点击a标签
3.在JS代码中触发history.pushState()或history.replaceState()
history模式的url发生变化时不会立即向服务器发起请求，刷新会立即请求。

history 需要后端配合，比如配置Nginx：
```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/dist;
  index index.html;

  # 解决 history 路由 404 问题
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

#### 组件内路由守卫
```vue
<script setup>
import { onBeforeRouteEnter, onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'

// 进入路由前（无法访问组件实例 this，需通过 next 回调）
onBeforeRouteEnter((to, from, next) => {
  next(vm => {
    // vm 为组件实例
    console.log(vm)
  })
})

// 离开路由前
onBeforeRouteLeave((to, from, next) => {
  const confirm = window.confirm('确定离开吗？')
  if (confirm) {
    next()
  } else {
    next(false)
  }
})

// 路由参数更新时（如 /user/1 → /user/2）
onBeforeRouteUpdate((to, from, next) => {
  console.log('路由参数更新：', to.params.id)
  next()
})
</script>
```

## HTML 转 VUE
可以使用iframe嵌入，但是建议让AI把HTML页面重新为Vue组件。
#### iframe 嵌入
```vue
<template>
    <div style="width: 100%;height: 100%;">
        <iframe :src='src' frameborder="0" style="width: 100%;height: 100%;"></iframe>
    </div>
</template>

<script setup lang='ts'>
import { ref, onMounted } from 'vue';

const showSessionId = ref<string>('');
const src = ref<string>('');

onMounted(() => {
    showSessionId.value = window.location.search;
    src.value = `../../../public/register/index.html${showSessionId.value}`;
});
</script>
```

