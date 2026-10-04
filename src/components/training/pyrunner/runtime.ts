/**
 * Pyodide 运行时加载器。
 *
 * ## 为什么运行时才加载
 *
 * pyodide.asm.wasm 9.2MB + python_stdlib.zip 2.4MB ≈ 12.9MB。
 * 哪怕放 CDN 也绝不能预加载 —— 会让每个访问 code-training 的人
 * 都白下载 13MB。所以严格「用户点运行才加载」，且加载后**单例复用**：
 * 同一页面内第二次运行是瞬时的，Python 解释器不重建。
 * 跨页面复用靠下面的 fetch 拦截 + Cache API。
 *
 * ## 为什么必须自托管（indexURL 指向本站）
 *
 * Pyodide 默认 `cdnUrl = https://cdn.jsdelivr.net/pyodide/v…`。
 * 国内访问 jsdelivr 慢且经常失败。更隐蔽的坑是 `loadPackagesFromImports`：
 * 它会在检测到 `import numpy` 时**自动去 CDN 装包**，静默失败。
 * 这里用自托管 + 永不调 loadPackagesFromImports，两条路都断掉。
 *
 * ## loader 为什么不能用 npm 的 import（实测过，别再试）
 *
 * `import {loadPyodide} from 'pyodide'` **构建直接失败**：
 *
 *   Module build failed: UnhandledSchemeError: Reading from "node:fs" is not handled
 *   （同样报错的还有 node:child_process / node:crypto / node:path / node:url / node:vm）
 *
 * 原因是 `pyodide.mjs` 是「浏览器 + Node 双用」的产物，内部写了 Node 专用分支
 * （`if (IN_NODE) { await import("node:fs") }` 之类）。webpack 打浏览器 bundle
 * 时会连这些分支一起解析，遇到 `node:` scheme 直接报错 —— 与体积无关。
 *
 * 所以 loader 只能用 `webpackIgnore` 从 `/pyodide/pyodide.mjs` 按 URL 加载：
 * webpackIgnore 让 webpack 完全不碰这个文件，只留一条无害的
 * "Critical dependency" 警告。
 *
 * ## 但 npm 仍然有用武之地
 *
 * `pyodide` 作为 devDependency 提供那 12.9MB 资源文件：版本被 lockfile 锁住、
 * `pnpm install` 时就装好，CI 不必额外联网执行 `npm pack`。
 * 见 `scripts/fetch-pyodide.js`。
 */

/** 运行时类型（只用到这几个方法） */
export interface PyodideRuntime {
  runPythonAsync(code: string): Promise<unknown>;
  setStdout(options: {
    batched?: (msg: string) => void;
    raw?: (msg: string) => void;
  }): void;
  setStderr(options: {
    batched?: (msg: string) => void;
    raw?: (msg: string) => void;
  }): void;
  globals: {
    set(name: string, value: unknown): void;
    get(name: string): unknown;
    delete(name: string): void;
  };
}

/**
 * 加载路径。用 site 的 baseUrl 拼，不能写死 `/pyodide/`
 * —— 万一部署到子路径就全废了。
 */
let runtimePromise: Promise<PyodideRuntime> | undefined;

export interface LoadOptions {
  /** indexURL，例如 '/pyodide/' */
  indexUrl: string;
  /** 加载过程中的进度回调，用于给用户反馈（13MB 不给进度会很像卡死） */
  onProgress?: (message: string) => void;
}

/**
 * 这 12.9MB 的缓存策略：页面内拦截 fetch + Cache API。
 *
 * ## 为什么不用 Service Worker（踩过的坑）
 *
 * 试过两种 SW 方案，都不行：
 *
 * 1. `plugin-pwa` 的 `swCustom` —— SW 的 webpack 构建要 babel-loader，
 *    而 pnpm 下它没被 hoist 到根 node_modules，构建直接失败。
 * 2. 自己注册一个作用域 `/pyodide/` 的 SW —— **概念错误**：
 *    SW 只能拦截「它所控制的客户端」的请求，而 plugin-pwa 的 SW 已用
 *    作用域 `/` claim 了页面。作用域不包含页面 URL 的 SW 永远收不到
 *    fetch 事件，`clients.claim()` 对它也是空操作。
 *
 * ## 现在怎么做
 *
 * 在页面里包一层 `window.fetch`：命中 Cache 就返回缓存，否则走网络
 * 并顺手存进 Cache。
 *
 * 好处：1) 不与 plugin-pwa 冲突 2) Cache API 同源，跨页面持久
 * 3) 首次运行之后就是秒开。
 */
const CACHE_NAME = 'pyodide-runtime-v1';

/**
 * 必须缓存的运行时文件。
 *
 * 两个 .mjs 也要显式预取：它们是被 `import()` 加载的，走的是 ESM 模块加载器
 * 而**不是** `window.fetch`，所以光靠 fetch 拦截是碰不到它们的
 * （漏掉的话 asm.mjs 的 1.2MB 每次都要重下）。
 */
const RUNTIME_FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

let fetchShimInstalled = false;

/**
 * 装一次 fetch 拦截（模块级单例，页面内只装一次）。
 * 保留原始 fetch 以便回退，避免影响站点其它请求。
 */
function installFetchShim(indexUrl: string): void {
  if (fetchShimInstalled || typeof window === 'undefined') {
    return;
  }
  fetchShimInstalled = true;
  const original = window.fetch.bind(window);

  window.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    if (!raw.includes('/pyodide/') && !raw.startsWith(indexUrl)) {
      return original(input as RequestInfo, init);
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(raw);
      if (cached) {
        return cached;
      }
      const response = await original(input as RequestInfo, init);
      // 只缓存成功响应；把错误响应缓存下来会永久中毒
      if (response.ok && response.type === 'basic') {
        cache.put(raw, response.clone()).catch(() => {
          // 配额不足时忽略，不影响本次运行
        });
      }
      return response;
    } catch {
      // Cache API 不可用（隐私模式等）时退回普通网络请求
      return original(input as RequestInfo, init);
    }
  };
}

/**
 * 预热：把 5 个运行时文件过一遍 fetch 拦截，全部落进 Cache。
 * 之后 `loadPyodide` 发起的请求就直接命中缓存。
 *
 * 逐个串行并汇报进度 —— 13MB 的等待必须有可见反馈，否则用户以为页面卡死。
 */
async function prewarmRuntime(
  indexUrl: string,
  onProgress?: (m: string) => void,
): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }
  const cache = await caches.open(CACHE_NAME);
  let done = 0;
  let bytes = 0;
  await Promise.all(
    RUNTIME_FILES.map(async (name) => {
      const url = `${indexUrl}${name}`;
      try {
        const existing = await cache.match(url);
        if (existing) {
          done++;
          return;
        }
        const res = await fetch(url);
        if (res.ok) {
          const buf = await res.clone().arrayBuffer();
          bytes += buf.byteLength;
          await cache.put(url, res).catch(() => undefined);
        }
      } catch {
        // 单个文件失败不阻塞：loadPyodide 自己还会再请求一次
      } finally {
        done++;
        onProgress?.(
          `正在下载 Python 运行时 ${done}/${RUNTIME_FILES.length}` +
            (bytes > 0
              ? `（${(bytes / 1024 / 1024).toFixed(1)}MB）`
              : '（已有缓存）'),
        );
      }
    }),
  );
}

export async function loadPyodideRuntime({
  indexUrl,
  onProgress,
}: LoadOptions): Promise<PyodideRuntime> {
  // 单例：同一页面第二次调用直接复用，不重新下载也不重新初始化解释器
  if (runtimePromise) {
    return runtimePromise;
  }

  runtimePromise = (async () => {
    // 必须在第一次请求之前装好，否则首个请求不会被缓存
    installFetchShim(indexUrl);
    await prewarmRuntime(indexUrl, onProgress);

    // webpackIgnore: 让 webpack 别去打包这个 URL，它在 static/ 下由我们自己提供。
    // 必须是绝对路径，写成相对路径会被 webpack 当成本地模块去解析。
    // 注：ESM import() 不走 fetch，所以上面 prewarm 里显式把这 5 个文件
    // 都过了一遍缓存，这里命中的是浏览器模块缓存 + 我们的 Cache。
    const mod = (await import(
      /* webpackIgnore: true */ `${indexUrl}pyodide.mjs`
    )) as {loadPyodide: (config: unknown) => Promise<PyodideRuntime>};

    onProgress?.('正在初始化 Python 解释器…');

    const py = await mod.loadPyodide({
      indexURL: indexUrl,
      // 关键：不设 packageBaseUrl，也绝不调 loadPackagesFromImports，
      // 这样整个运行期不会有任何请求发往境外 CDN
    });

    onProgress?.('就绪');
    return py;
  })().catch((e) => {
    // 失败后清掉单例，否则用户点了重试还是拿到同一个 rejected promise
    runtimePromise = undefined;
    throw e;
  });

  return runtimePromise;
}

/** 预取提示信息：告诉用户这东西有多大、要等多久 */
export const PYODIDE_SIZE_HINT = '约 13MB';

/**
 * 把 Python 代码跑起来，收集 stdout/stderr 与异常。
 *
 * 不用 `runPython`（同步版）而是 `runPythonAsync`：内部会 await，
 * 异步代码（比如用户自己写的 async def）才能正确收敛。
 */
export async function runCode(
  py: PyodideRuntime,
  code: string,
): Promise<{stdout: string; stderr: string; error: string}> {
  let stdout = '';
  let stderr = '';

  py.setStdout({
    batched: (msg: string) => {
      stdout += msg;
      stdout += '\n';
    },
  });
  py.setStderr({
    batched: (msg: string) => {
      stderr += msg;
      stderr += '\n';
    },
  });

  let error = '';
  try {
    await py.runPythonAsync(code);
  } catch (e) {
    error = String((e as Error)?.message ?? e);
  }

  return {
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    error,
  };
}

/**
 * 从题解 md 里抽取可运行代码 + 测试用例。
 *
 * ## 为什么在客户端做而不在构建期做
 *
 * 题目数据在 `static/quiz/` 类似的静态 JSON 里，运行时 fetch 最省事；
 * 而 md 正文是编译进 HTML 的，拿不到原始 markdown 字符串。
 * 所以本题解器只支持「用户在框里粘贴代码」，不从 md 抽 ——
 * 见 `samples.ts` 里对 md 结构的解析说明。
 */
export function normalizeCode(raw: string): string {
  // 去掉 Pyodide 控制台常见的交互式 REPL 残留
  return raw.replace(/\r\n/g, '\n').replace(/^\s*>>>\s?/gm, '').trimEnd();
}