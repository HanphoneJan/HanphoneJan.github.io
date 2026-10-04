/**
 * 「操作脚本」样例：class-API 设计题的样例长这样
 *
 * ```
 * 输入
 * ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]
 * [[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]
 * 输出
 * [null, null, null, 1, null, -1, null, -1, 3, 4]
 * ```
 *
 * 第一行是「类名 + 之后每个要调的方法名」，第二行是**每次调用的实参**
 * （第一个对应构造器），第三行是每次调用的返回值。
 *
 * ## 为什么必须专门处理
 *
 * 这类题（0146 LRU 缓存、0155 最小栈、0208 前缀树）**根本没有「一次调用」**：
 * 样例是一整个操作序列。`extractDocSamples` 按「实参个数 == 入口签名」过滤，
 * 于是这些样例一个都匹配不上 —— 18 篇 `no-sample` 里有 5 篇是这个问题，
 * 报的还是「候选入口都匹配不上样例」，完全指不到真正的原因。
 *
 * 而它们恰恰是最需要可视化的一类题：LRU 的淘汰顺序、最小栈的那个辅助栈、
 * 前缀树的插入路径，画面上全是「内部状态一步步在动」。
 *
 * ## 与 py-samples 的分工
 *
 * py-samples 负责「一次调用」的样例抽取（126 篇力扣题的主力形态），
 * 这里只补它覆盖不到的形态，且**只在常规路径一条样例都抽不到时**才启用。
 */

export interface ScriptStep {
  /** 方法名 */
  method: string;
  /** 实参（JSON 值，null 会翻成 None） */
  args: unknown[];
}

export interface ScriptSample {
  className: string;
  /** 构造器实参 */
  ctorArgs: unknown[];
  steps: ScriptStep[];
  /** 题面给的期望值（每次调用的返回值，含构造器那个 null） */
  expected: string;
}

/** 代码里所有 `class X` 的名字，按出现顺序 */
export function classNames(code: string): string[] {
  return [...code.matchAll(/^class\s+(\w+)/gm)].map((m) => m[1]);
}

/**
 * `## 示例` 小节里的围栏块，按「三个数组」解析。
 *
 * 容错点是有的题不带 `输入` / `输出` 标签（0208 就是），
 * 所以不按标签取，而是**按形状**取：第一个「全是字符串」的数组是方法名，
 * 第二个「元素全是数组」的数组是实参，第三个「元素全是标量」的数组是期望。
 */
function arraysInFence(fence: string): unknown[][] {
  const out: unknown[][] = [];
  // 逐行扫，`[` 开头到配平的 `]` 为一个数组（样例都是一行一个数组）
  for (const rawLine of fence.split('\n')) {
    const line = rawLine.trim();
    const start = line.indexOf('[');
    if (start === -1) {
      continue;
    }
    let depth = 0;
    let quote = '';
    let end = -1;
    for (let i = start; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        if (ch === quote && line[i - 1] !== '\\') {
          quote = '';
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '[') {
        depth++;
      } else if (ch === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) {
      continue;
    }
    try {
      const v: unknown = JSON.parse(line.slice(start, end + 1));
      if (Array.isArray(v)) {
        out.push(v);
      }
    } catch {
      // 不是合法 JSON（可能带注释或尾逗号），跳过这一行
    }
  }
  return out;
}

/** 全是字符串 */
function allStrings(a: unknown[]): boolean {
  return a.length > 0 && a.every((x) => typeof x === 'string');
}

/** 元素全是数组 */
function allArrays(a: unknown[]): boolean {
  return a.length > 0 && a.every(Array.isArray);
}

/** 元素全是标量（不是数组/对象） */
function allScalars(a: unknown[]): boolean {
  return (
    a.length > 0 &&
    a.every((x) => x === null || ['string', 'number', 'boolean'].includes(typeof x))
  );
}

/**
 * 从题解 md 里抠出一份操作脚本样例；不像就返回 null。
 *
 * @param md     题解全文
 * @param names  代码里所有类名。样例的第一项是**被测的那个类**，
 *              而代码里的第一个类常常只是辅助数据结构：
 *              0146 的第一个 class 是 `Node`（双向链表节点），
 *              0208 的第一个是 `TrieNode`。所以按样例核对，不按顺序取。
 */
export function parseScriptSample(md: string, names: string[]): ScriptSample | null {
  const known = new Set(names);
  // 只看「示例」相关的小节。0295 的示例写在「示例推演」里，
  // 而那一节是散文推演、拿不到期望值，解析不出三数组形态，自然会被拒。
  const fences = [...md.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const fence of fences) {
    const arrays = arraysInFence(fence);
    if (arrays.length < 3) {
      continue;
    }
    // 方法名数组
    const namesRow = arrays.find((a) => allStrings(a) && known.has(a[0] as string));
    if (!namesRow) {
      continue;
    }
    const at = arrays.indexOf(namesRow);
    const argsRow = arrays
      .slice(at + 1)
      .find((a) => allArrays(a) && a.length === namesRow.length);
    if (!argsRow) {
      continue;
    }
    const argsAt = arrays.indexOf(argsRow);
    const expectedRow = arrays
      .slice(argsAt + 1)
      .find((a) => allScalars(a) && a.length === namesRow.length);
    if (!expectedRow) {
      continue;
    }
    const className = namesRow[0] as string;
    const steps: ScriptStep[] = [];
    for (let i = 1; i < namesRow.length; i++) {
      steps.push({method: namesRow[i] as string, args: (argsRow[i] ?? []) as unknown[]});
    }
    return {
      className,
      ctorArgs: (argsRow[0] ?? []) as unknown[],
      steps,
      expected: JSON.stringify(expectedRow),
    };
  }
  return null;
}