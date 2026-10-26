/**
 * Pyodide 运行时的缓存契约（客户端、构建期、设置页共用）。
 *
 * 12.9MB 的运行时由 `runtime.ts` 在**页面内拦截 fetch + Cache API** 缓存，
 * 不用 Service Worker（那个方向试过两条死路，见 `runtime.ts` 文件头）。
 *
 * 这份常量单独拆出来，是为了让三处口径不会漂：
 *
 * 1. `runtime.ts` 的 `prewarmRuntime()` —— 第一次点「▶ 运行」时预取；
 * 2. `.vuepress/plugins/offline-package.ts` —— 构建期把这几份文件列进
 *    `offline-manifest.json`，设置页才有体积可显示；
 * 3. `.vuepress/components/CacheSettings.vue` —— 按同一个缓存名写。
 *
 * 缓存名改了而只改一处，症状是「设置页显示缓存好了，但点运行还是要下 13MB」，
 * 或者反过来「明明跑过一次，设置页仍说没缓存」—— 都不会报错。
 */
export const PYODIDE_CACHE_NAME = 'pyodide-runtime-v1'

/**
 * 必须缓存的运行时文件（相对 `indexUrl`）。
 *
 * 两个 `.mjs` 也要显式预取：它们是被 `import()` 加载的，走的是 ESM 模块
 * 加载器而**不是** `window.fetch`，光靠 fetch 拦截碰不到（漏掉的话
 * `pyodide.asm.mjs` 那 1.2MB 每次都要重下）。
 */
export const PYODIDE_RUNTIME_FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
]
