---
title: TypeScript 使用笔记
description: 类型收窄的优先级、any 的代价、接口与泛型怎么选，以及几个 VSCode 里的假报错。
---

## 类型精度的优先级

写类型时按这个顺序退让，越靠前越好：

```text
精确的接口 > 泛型 > 联合类型 > unknown > 类型断言 > any
```

- **精确接口**：能写 `{ id: number; name: string }` 就别写 `object`
- **泛型**：`function first<T>(arr: T[]): T | undefined` 比返回 `any` 好，也比写十个重载好
- **联合类型**：`'idle' | 'loading' | 'done'` 比 `string` 好，配合 `switch` 能自动收窄
- **unknown**：外部输入（`JSON.parse`、`fetch` 的响应）用它，强制你先做类型判断
- **类型断言**：`as` 是「我知道得比你多」，用错时编译期不报错、运行时才炸
- **any**：一旦用了，它会在整个调用链上传染，后面所有检查都失效

## 接口 vs 类型别名

- `interface` 可以声明合并、可以被 `extends`，适合描述**对象形状**
- `type` 能表达联合、交叉、映射类型，适合描述**组合关系**
- 团队里二选一即可，别混着用同一层的东西

## 封装的常见写法

请求和响应的类型成对定义，别在调用处临时 `as`：

```ts
interface ApiResult<T> {
  code: number
  message: string
  data: T
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return ((await res.json()) as ApiResult<T>).data
}

// 调用处拿到的是具体类型，不是 any
const user = await get<User>('/api/user/1')
```

## VSCode 里的假报错

「找不到名称 "div"」「找不到名称 "describe"」这类，多半不是代码问题：

1. 确认 `tsconfig.json` 的 `lib` 里有 `DOM`（前端）
2. 确认 `types` 里有 `node` 或对应测试框架的类型（后端 / 测试）
3. 工作区打开的是子目录而不是仓库根，导致 `tsconfig` 没被识别 —— 把 VSCode 的工作区切到根目录
4. 仍不行时重启 TS 服务：`Ctrl+Shift+P` → `TypeScript: Restart TS Server`

## 参考资料

- [使用 TypeScript 中的 any 类型前，你需要了解的一切](https://blog.csdn.net/lunahaijiao/article/details/119769525)
- [在 TypeScript 项目中怎样封装后台接口的请求、响应参数类型？](https://www.zhihu.com/question/466026304)
