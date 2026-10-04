#!/usr/bin/env node
/**
 * 把 Pyodide 运行时资源从 node_modules 拷到 `static/pyodide/`。
 *
 * ## 为什么必须自托管而不是用 CDN
 *
 * Pyodide 默认的 `cdnUrl` 指向 `cdn.jsdelivr.net`。国内访问 jsdelivr
 * 慢且经常失败，一个 `code-training` 教学站不能把核心功能挂在境外 CDN 上。
 * 自托管后所有资源都从本站同源加载。
 *
 * ## 为什么资源来自 npm 的 node_modules
 *
 * `pyodide` 是 devDependency，版本被 pnpm-lock.yaml 锁死，所以：
 *   - 版本可复现，不会某天上游发新版导致构建产物变化
 *   - `pnpm install` 时就装好了，CI 不需要额外联网执行 `npm pack`
 *
 * 注意：**只从 node_modules 取资源文件，不 import 这个包**。
 * `import {loadPyodide} from 'pyodide'` 会让 webpack 构建失败 ——
 * pyodide.mjs 是浏览器/Node 双用产物，内部 `await import("node:fs")`
 * 之类的 Node 分支会被 webpack 解析并报 UnhandledSchemeError。
 * 详细原因见 src/components/training/pyrunner/runtime.ts 的注释。
 *
 * ## 体积
 *
 * pyodide.asm.wasm 9.2MB + python_stdlib.zip 2.4MB + pyodide.asm.mjs 1.2MB
 * ≈ 12.9MB。所以：
 *   - 放 static/ 但 **.gitignore**，不进版本库
 *   - 组件必须「点击才加载」，绝不预加载
 *   - 用「页面内 fetch 拦截 + Cache API」做持久缓存
 *     （Service Worker 走不通，原因同样见 runtime.ts 的注释）
 *
 * ## 用法
 *
 *   node scripts/fetch-pyodide.js          # 已完整则跳过
 *   node scripts/fetch-pyodide.js --force  # 强制重新拷贝
 */

const fs = require('fs');
const path = require('path');

const DEST = path.join(process.cwd(), 'static/pyodide');

/**
 * 需要拷的运行时文件。
 * 特意**不**取 pyodide.js（UMD 版，浏览器 ESM 用不到）、
 * console.html / console-v2.html（只在 pyodide 自带的 REPL 里用）、
 * *.map 和 *.d.ts（调试/类型用，静态站不需要）。
 */
const WANTED = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

/** 定位 node_modules 里的 pyodide 目录（兼容 pnpm 的 .pnpm 布局） */
function resolvePackageDir() {
  const candidates = [
    path.join(process.cwd(), 'node_modules/pyodide'),
    ...(fs.existsSync(path.join(process.cwd(), 'node_modules/.pnpm'))
      ? fs
          .readdirSync(path.join(process.cwd(), 'node_modules/.pnpm'))
          .filter((d) => d.startsWith('pyodide@'))
          .map((d) => path.join(process.cwd(), 'node_modules/.pnpm', d, 'node_modules/pyodide'))
      : []),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'pyodide.mjs'))) {
      return dir;
    }
  }
  return null;
}

function human(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function main() {
  const force = process.argv.includes('--force');

  if (!force && WANTED.every((f) => fs.existsSync(path.join(DEST, f)))) {
    console.log('static/pyodide/ 已完整，跳过。需要重新拷贝请加 --force');
    return;
  }

  const src = resolvePackageDir();
  if (!src) {
    console.error(
      '在 node_modules 里找不到 pyodide。\n' +
        '请先安装依赖：pnpm install\n' +
        '（pyodide 是 devDependency，版本由 pnpm-lock.yaml 锁定）',
    );
    process.exit(1);
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(src, 'package.json'), 'utf8'),
  );
  fs.mkdirSync(DEST, {recursive: true});

  let total = 0;
  for (const name of WANTED) {
    const from = path.join(src, name);
    if (!fs.existsSync(from)) {
      console.error(
        `node_modules/pyodide@${pkg.version} 里缺少 ${name}，` +
          '上游包结构可能变了，需要更新 WANTED 列表',
      );
      process.exit(1);
    }
    const to = path.join(DEST, name);
    fs.copyFileSync(from, to);
    const size = fs.statSync(to).size;
    total += size;
    console.log(`  ${name.padEnd(22)} ${human(size)}`);
  }

  console.log(
    `\n完成，共 ${human(total)} -> static/pyodide/ （pyodide@${pkg.version}）`,
  );
  console.log('（该目录已 gitignore，由 pnpm sync:pyodide 或 CI 重新生成）');
}

main();