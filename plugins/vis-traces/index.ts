/**
 * 把录制好的轨迹塞进 globalData，供题解页内嵌可视化。
 *
 * ## 只发清单，不发帧
 *
 * globalData 会进客户端主 bundle，被**全站每一页**加载。27 份轨迹的帧数据
 * 有几百 KB，绝不能放进来。所以这里只发「哪篇题解有可视化 + 用哪个文件」，
 * 帧数据由组件在用户点开时才 fetch `/traces/<name>.json`。
 *
 * 与自测题库（`plugins/self-test`）同一个取舍，那里有更详细的理由。
 *
 * ## 为什么构建期读 static/traces 而不是现场录制
 *
 * 录制要起 Pyodide，182 篇跑一遍要几分钟。放进 loadContent 会让每次
 * `pnpm start` 都重跑一遍。产物落盘后进 git，改题解代码时
 * `pnpm trace:record` 重录、`pnpm test:adapters` 校验差异。
 */

import fs from 'fs';
import path from 'path';
import type {LoadContext, Plugin} from '@docusaurus/types';
// 相对路径而不是 @site/*：插件由 Docusaurus 在 Node 里 require，
// 不走 webpack 的 alias 解析。py-samples 里那些 @site 引用全是
// `import type`（编译后被擦除），所以没暴露这个问题 —— 这里有真实运行时 import。
import {adapt} from '../../src/components/training/visualizer/adapters';
import type {RawTrace} from '../../src/components/training/visualizer/recorder/types';

export interface VisTraceEntry {
  /** 题解 md 相对 code-training/docs 的路径，如 `problems/leetcode/0001_two_sum.md` */
  docId: string;
  /** 静态资源路径，`/traces/<name>.json` */
  url: string;
  /** 用了哪个 adapter，排查时用 */
  adapterId: string;
  /** 录制用的实参，展示成「下面播的是哪组输入」 */
  args: string[];
  /** 帧数 */
  frameCount: number;
  /** 题解代码原文，用来在页面上显示源码 —— 不用再从 md 里抽一次 */
  code: string;
}

export interface VisTracesData {
  entries: VisTraceEntry[];
}

export default function visTracesPlugin(context: LoadContext): Plugin<VisTracesData> {
  const docsRoot = path.join(context.siteDir, 'code-training/docs');
  const tracesDir = path.join(context.siteDir, 'static/traces');

  const entries: VisTraceEntry[] = [];

  if (fs.existsSync(tracesDir)) {
    for (const file of fs.readdirSync(tracesDir).sort()) {
      if (!file.endsWith('.json')) {
        continue;
      }
      const name = file.replace(/\.json$/, '');
      const tracePath = path.join(tracesDir, file);
      let trace: RawTrace;
      try {
        trace = JSON.parse(fs.readFileSync(tracePath, 'utf8')) as RawTrace;
      } catch (e) {
        // 录坏了就跳过，不让整站构建挂掉。文件名会出现在控制台里，
        // 跑 `pnpm trace:record <名字>` 重录即可。
        console.warn(
          `[vis-traces] ${file} 不是合法 JSON（${(e as Error).message}），跳过`,
        );
        continue;
      }

      const adapted = adapt(trace);
      if (!adapted) {
        // 录制成功但没有 adapter 认识它（算法形态不在 array-scan 覆盖范围内）。
        // 留文件是对的 —— 后续补了 adapter 就能自动生效，不用重录。
        continue;
      }

      const md = findDoc(docsRoot, name);
      if (!md) {
        console.warn(`[vis-traces] 找不到 ${name} 对应的题解 md，跳过`);
        continue;
      }

      entries.push({
        docId: md,
        url: `/traces/${file}`,
        adapterId: adapted.adapterId,
        args: trace.args,
        frameCount: adapted.frames.length,
        code: trace.code,
      });
    }
  }

  return {
    name: 'vis-traces',

    async loadContent(): Promise<VisTracesData> {
      return {entries};
    },

    async contentLoaded({content, actions}): Promise<void> {
      const twoPointer = content.entries.filter((e) => e.adapterId === 'array-scan');
      console.log(
        `[vis-traces] ${content.entries.length} 篇题解内嵌可视化` +
          (twoPointer.length === content.entries.length
            ? ''
            : `（其中 ${content.entries.length - twoPointer.length} 篇用了其它 adapter）`),
      );
      actions.setGlobalData(content);
    },
  };
}

/**
 * 轨迹文件名 -> 题解 md 的相对路径。
 *
 * 两者都用「文件名去扩展名」，但题解 md 有 `numberPrefixParser` 之类的前缀
 * 处理，文件名本身是可靠的（trace:record 就是从 md 文件名生成的），
 * 所以直接按文件名找 md。
 */
function findDoc(docsRoot: string, name: string): string | null {
  const problems = path.join(docsRoot, 'problems');
  if (!fs.existsSync(problems)) {
    return null;
  }
  const stack = [problems];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.name === `${name}.md`) {
        return path
          .relative(docsRoot, full)
          .split(path.sep)
          .join('/');
      }
    }
  }
  return null;
}
