/** CSS Modules 的类型声明（Vite 会处理实际样式） */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

/** 构建期由 .vuepress/plugins/training.ts 通过 Vite define 注入 */
declare const __SITE_DATA__: Record<string, unknown>
