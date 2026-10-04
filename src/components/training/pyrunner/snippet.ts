/**
 * 题解代码块的「能不能跑 + 入口在哪」判定。纯函数，无 React / 无 DOM。
 *
 * ## 为什么需要它
 *
 * 一篇题解平均有 3.2 个 ```python 块，但其中约 55% 是「片段」——
 * 易错点小节里的单行对比、带 `...` 的伪代码。它们单独执行必然报 NameError
 * 或 IndentationError，给它们挂运行按钮只会让页面变脏、让读者误以为可以验。
 *
 * 判据（实测 182 篇 / 578 个块）：373 个块能抽出入口，205 个抽不出。
 * 抽不出的一律不给按钮 —— 留白本身就是「这段是示意」的信号。
 *
 * ## 入口为什么用启发式而不是元信息
 *
 * 想过让作者写 ```python run 显式开关（docusaurus-theme-live-codeblock 就是
 * 靠 ```jsx live opt-in 的）。但那要么改 182 篇 md，要么多 swizzle 一个
 * MDXComponents/Code 才能拿到 metastring，收益只是几条边角 case。
 * 自动判定 + 逃生舱留给以后。
 */

/** LeetCode 风格：Solution 类的方法 */
export interface MethodEntry {
  kind: 'method';
  /** 方法名，如 twoSum */
  name: string;
  /** 位置参数名（不含 self），按签名顺序 */
  paramNames: string[];
  /** 各参数的类型标注原文（小写），用来判断哪些参数要构造成链表/树 */
  annotations: string[];
  /** 必填参数个数。带默认值的参数（如 `carry=0`）可以不传。 */
  requiredCount: number;
}

/** 牛客 / 脚本风格：顶层函数 */
export interface FunctionEntry {
  kind: 'function';
  name: string;
  paramNames: string[];
  annotations: string[];
  requiredCount: number;
}

export type SnippetEntry = MethodEntry | FunctionEntry;

export interface SnippetAnalysis {
  /** 有没有可调用入口 */
  runnable: boolean;
  entry: SnippetEntry | null;
  /**
   * 这个块本身是不是「程序」—— 也就是带 `if __name__ == "__main__":` 入口。
   *
   * 只有程序才能用 stdin 模式。牛客题的一篇题解里往往有三个块共享同一个
   * 函数：解题思路里的两个纯函数定义 + 完整代码实现里的那个带 __main__ 的。
   * 对前两个喂 stdin，输出恒为空 —— 读者只会看到「点了没反应」。
   */
  isProgram: boolean;
  /** 不可运行的原因。只用于调试和测试断言，不展示给读者。 */
  reason: string;
}

/**
 * 这些包 Pyodide 的 stdlib 里没有。
 *
 * 绝不调 `loadPackagesFromImports`（见 runtime.ts），所以 import numpy
 * 必然 ImportError。与其让读者撞一堵红字，不如根本不给按钮。
 * 目前只有 ML23 k-Means 一篇命中。
 */
const THIRD_PARTY = new Set([
  'numpy',
  'pandas',
  'scipy',
  'sklearn',
  'matplotlib',
  'torch',
  'tensorflow',
  'requests',
  'PIL',
  'cv2',
  'networkx',
  'sympy',
  'seaborn',
  'plotly',
]);

/** 找出 `if __name__ == ...` 那一行，之前的部分才是「定义」 */
function selfTestStart(code: string): number {
  return code.split('\n').findIndex((l) => /^if\s+__name__\s*==/.test(l));
}

/**
 * 解析签名里的参数。
 *
 * `nums: List[int], target: int = 9` -> 名字 ['nums','target']、
 * 标注 ['list[int]','int']、必填个数 1（target 有默认值，可以不传）。
 *
 * 带默认值这件事必须单独记：0002 的签名是
 * `addTwoNumbers(self, l1, l2, carry=0)`，样例只给两个链表。
 * 早先按「参数个数必须相等」判定，结果这类题永远匹配不上样例。
 */
export function parseParamInfo(raw: string): {
  names: string[];
  annotations: string[];
  requiredCount: number;
} {
  const names: string[] = [];
  const annotations: string[] = [];
  // 「必填」= 从第一个参数起连续不带默认值的那些。
  // 一旦遇到默认值就停住：Python 里默认值之后的参数也必须有默认值。
  let seenDefault = false;
  let requiredCount = 0;

  for (const part of splitTopLevel(raw)) {
    const hasDefault = part.includes('=');
    // 先切 '=' 再切 ':'：默认值里可能有 [1, 2] 甚至含冒号
    const beforeEq = part.split('=')[0];
    const [nameRaw, annRaw = ''] = beforeEq.split(':');
    const name = nameRaw.trim().replace(/^\*+/, '');
    if (!name || name === 'self' || name === '...') {
      continue;
    }
    names.push(name);
    annotations.push(annRaw.trim().toLowerCase());
    if (!seenDefault) {
      if (hasDefault) {
        seenDefault = true;
      } else {
        requiredCount = names.length;
      }
    }
  }
  return {names, annotations, requiredCount};
}

/** 只要参数名 */
export function parseParams(raw: string): string[] {
  return parseParamInfo(raw).names;
}

/**
 * 按顶层逗号切分，括号/引号里的逗号不算。
 * 和 py-samples 插件里那份逻辑同源，抽到这里一份，避免两处实现漂移。
 */
export function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = '';
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if ('([{'.includes(ch)) {
      depth++;
    } else if (')]}'.includes(ch)) {
      depth--;
    }
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) {
    parts.push(cur);
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** 双下划线开头的是魔法方法，不该当入口（__init__ 尤其常见） */
function isDunder(name: string): boolean {
  return name.startsWith('__') && name.endsWith('__');
}

function thirdPartyImports(code: string): string[] {
  const re = /^[ \t]*(?:import|from)\s+([A-Za-z_][\w]*)/gm;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (THIRD_PARTY.has(m[1])) {
      found.push(m[1]);
    }
  }
  return [...new Set(found)];
}

/**
 * 中文标识符 = 伪代码。
 *
 * 题解里讲回溯/滑动窗口的骨架会写成这样：
 *
 *     def backtrack(路径, 选择列表):
 *         if 满足结束条件:
 *             收集结果
 *
 * Python 3 允许中文标识符，所以它**语法上是合法的**，`def` 判定会放它过关，
 * 于是页面上出现一个「▶ 跑样例」按钮，点了必然 NameError。
 * 这种代码是给人读的骨架，不是能跑的代码 —— 不该给按钮。
 *
 * 判据是「去掉注释与字符串之后还有没有中文」。0003 里那种
 * `while 需要收缩:` 藏在函数体内的也算，只查签名行会漏掉。
 */
function hasCjkIdentifier(code: string): boolean {
  const withoutLiterals = code
    .replace(/#[^\n]*/g, '')
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/'''[\s\S]*?'''/g, '')
    .replace(/"[^"\n]*"/g, '')
    .replace(/'[^'\n]*'/g, '');
  return /[一-鿿]/.test(withoutLiterals);
}

/** parseParamInfo 的返回类型，取个短名字好写 */
interface ParamInfo {
  names: string[];
  annotations: string[];
  requiredCount: number;
}

/**
 * 一对同时出现的下界/上界参数名。
 *
 * 力扣的公开入口不会收「区间」—— 读者手里只有题目给的输入。
 * 而 `partition(self, nums, left, right)` 这种是类内辅助方法：
 * 0215 的完整代码里它排在第一个，「取第一个方法」会选到它，
 * 于是页面上出现一个要求读者凭空填 left/right 的输入框。
 *
 * 只认「成对出现」：单独的 `n`（0062 的 `uniquePaths(m, n)`）是正常入参，
 * 不能排除；`left` + `right` 同时出现才是内部区间。
 */
const RANGE_PAIRS: Array<[string, string]> = [
  ['left', 'right'],
  ['lo', 'hi'],
  ['low', 'high'],
  ['l', 'r'],
  ['start', 'end'],
  ['begin', 'end'],
];

function looksLikeRangeParam(names: string[]): boolean {
  return RANGE_PAIRS.some(([a, b]) => names.includes(a) && names.includes(b));
}

/**
 * 在类的多个方法里挑入口。
 *
 * 只有一个方法时没什么可选的；有多个时优先选不带区间参数的 ——
 * 那样读者至少知道自己该填什么。
 */
function pickEntry(
  candidates: Array<{name: string; info: ParamInfo}>,
): {name: string; info: ParamInfo} {
  if (candidates.length === 1) {
    return candidates[0];
  }
  return (
    candidates.find((c) => !looksLikeRangeParam(c.info.names)) ?? candidates[0]
  );
}

export function analyzeSnippet(rawCode: string): SnippetAnalysis {
  const not = (reason: string): SnippetAnalysis => ({
    runnable: false,
    entry: null,
    isProgram: false,
    reason,
  });

  // 自测尾巴（if __name__ == "__main__"）不算定义部分。
  // 它是 stdin 模式的唯一入口，所以要单独记下来。
  const cut = selfTestStart(rawCode);
  const isProgram = cut !== -1;
  const code = (isProgram ? rawCode.split('\n').slice(0, cut).join('\n') : rawCode)
    .trim();

  if (!code) {
    return not('空代码块');
  }

  const third = thirdPartyImports(code);
  if (third.length > 0) {
    return not(`依赖浏览器里没有的包：${third.join(', ')}`);
  }

  if (hasCjkIdentifier(code)) {
    return not('中文标识符，是给人看的骨架代码');
  }

  // 1) class Solution 的第一个非魔法方法
  const methodRe =
    /^[ \t]+def\s+(\w+)\s*\(\s*self\s*(?:,\s*([^)]*))?\s*\)/gm;

  // 带 self 的方法必须真的有 class 兜着。
  // 题解里偶尔只贴方法体、忘了 class 那一行：
  //     def invertTree(self, root: Optional[TreeNode]) -> ...:   ← 缩进了，没有 class
  // 这种块在 Python 里是 IndentationError（unexpected indent），
  // 给它挂按钮只会让读者每组样例都看到一个 IndentationError。
  const hasClass = /^[ \t]*class\s+\w+/m.test(code);
  const candidates: Array<{name: string; info: ParamInfo}> = [];
  let m: RegExpExecArray | null;
  while ((m = methodRe.exec(code)) !== null) {
    if (isDunder(m[1])) {
      continue;
    }
    if (!hasClass) {
      return not('只有方法体、缺 class 声明');
    }
    candidates.push({name: m[1], info: parseParamInfo(m[2] ?? '')});
  }
  if (candidates.length > 0) {
    const picked = pickEntry(candidates);
    return {
      runnable: true,
      entry: {
        kind: 'method',
        name: picked.name,
        paramNames: picked.info.names,
        annotations: picked.info.annotations,
        requiredCount: picked.info.requiredCount,
      },
      isProgram,
      reason: '',
    };
  }

  // 2) 顶层 def（牛客题、脚本）。列 0 匹配，天然排除类里的方法。
  const funcRe = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm;
  while ((m = funcRe.exec(code)) !== null) {
    if (isDunder(m[1])) {
      continue;
    }
    // 首参是 self 的「顶层函数」其实是丢了 class 那一行的方法体。
    // 注意 analyzeSnippet 开头做了 trim()，原本的缩进被去掉了，
    // 所以这种块会以「列 0 的 def」形态走到这里，只能靠 self 认出来。
    if (/^\s*self\b/.test(m[2])) {
      return not('只有方法体、缺 class 声明');
    }
    const info = parseParamInfo(m[2]);
    return {
      runnable: true,
      entry: {
        kind: 'function',
        name: m[1],
        paramNames: info.names,
        annotations: info.annotations,
        requiredCount: info.requiredCount,
      },
      isProgram,
      reason: '',
    };
  }

  return not('没有可调用入口（只有片段）');
}

/** 参数要还原成哪种节点结构 */
export type NodeKind = 'none' | 'list' | 'tree';

/**
 * 每个参数要不要从「数组字面量」构造成链表/树。
 *
 * ## 为什么需要
 *
 * 0002 的样例写的是 `l1 = [2,4,3]`，而代码里 `l1.val` —— 直接把 list 传进去
 * 必然 `AttributeError: 'list' object has no attribute 'val'`，于是每组样例
 * 都判失败，读者会以为自己的理解错了。力扣真实评测传的是 ListNode 对象，
 * 我们要还原的正是这一点。
 *
 * ## 判据一：类型标注（最可靠）
 *
 * 标注写着 `Optional[ListNode]` 就转链表，`Optional[TreeNode]` 就转树。
 *
 * 但只靠标注不够：13 篇题解的签名是光秃秃的 `def f(self, l1, l2)`，没有标注 ——
 * 因为在真平台上 ListNode 是平台给的，不需要标注。这种代码在力扣跑得通，
 * 我们却会报 `AttributeError`，等于告诉读者「你读的这篇题解是错的」。
 *
 * ## 判据二：看代码实际访问了哪些属性
 *
 * 未标注的参数靠代码本身来判：`root.left` / `root.right` 只能是树，
 * `l1.next` 只能是链表。这比「看数组长度」可靠 ——
 * 树的层序格式和递归格式在字面量上都是长度 3 的数组，光看数据分不出来。
 *
 * ## 为什么还要求代码里出现过节点类的名字
 *
 * 属性推断单独用是不够的：`nums.reverse()` 里的 `.reverse` 不算，但要防的是
 * 另一种误判 —— 大量题解的代码里根本没有 `ListNode` 这个词，
 * 而入口签名也没标注。这时把样例数组硬构造成节点，等于凭空造对象：
 * 判出来的 ✗ 与代码对错无关，只会误导读者。
 *
 * 现在的规则是三者同时成立才认：出现了节点类名、块内没自己定义（说明是依赖
 * 平台预置）、参数没标注。实测语料里 0002 的第一个代码块就属于这一类 ——
 * 它在真平台跑得通，只是 md 里没带上 ListNode 的定义。
 *
 * 为什么还要求「块内没自己定义」：有 4 篇题解是「自己定义了 ListNode，
 * 签名又不带标注」，那种情况下把所有数组都当节点会把普通数组参数改坏，
 * 判出来的 ✗ 更具误导性。
 */
export function nodeParams(
  entry: SnippetEntry,
  code: string,
): NodeKind[] {
  const usesNode = /\b(ListNode|TreeNode)\b/.test(code);
  const definesNode = /^[ \t]*class\s+(ListNode|TreeNode)\b/m.test(code);

  // 代码动了哪些属性 —— 比「猜它是链表还是树」可靠得多。
  // 0104 的 `root.left` / `root.right` 只能是树；
  // 0002 的 `l1.next` 只能是链表。
  // 两者都有（比如既比较左右子树又遍历 next）时以树为准：树的建法更严格，
  // 用链表去建一定建错，用树去建顶多多余几个字段。
  const touchesTree = /\.\s*(left|right)\b/.test(code);
  const touchesList = /\.\s*next\b/.test(code);
  const inferred: NodeKind = touchesTree ? 'tree' : 'list';

  // 用了节点类但块内没定义 = 依赖平台预置。这时未标注的参数可以合理地
  // 按代码实际怎么用他来推断。块内自己定义了就只信标注 —— 有 4 篇题解是
  // 「自己定义了 ListNode 但签名不带标注」，此时把所有数组都当节点会把
  // 普通数组参数改坏，判出来的 ✗ 更具误导性。
  const assumeUnannotated = usesNode && !definesNode;

  return entry.annotations.map((a) => {
    if (/treenode/.test(a)) {
      return 'tree';
    }
    if (/listnode/.test(a)) {
      return 'list';
    }
    if (a === '' && assumeUnannotated) {
      return inferred;
    }
    return 'none';
  });
}

/**
 * 样例的参数个数必须与入口签名吻合，否则结果没有意义。
 *
 * - 少了必填参数：调用必然 TypeError
 * - 多于签名参数数：多出来的会被 Python 报「unexpected keyword argument」
 *
 * 顺序错比个数错更危险（`[2,7,11,15], 9` 喂给 `(target, nums)` 会得到一个
 * 看起来很合理的错误答案），所以宁可不给样例模式。
 */
export function samplesFit(
  entry: SnippetEntry,
  sampleArgs: string[][],
): boolean {
  if (sampleArgs.length === 0) {
    return false;
  }
  return sampleArgs.every(
    (a) => a.length >= entry.requiredCount && a.length <= entry.paramNames.length,
  );
}

/** 驱动代码里怎么拿到可调用对象 */
export function callTarget(entry: SnippetEntry): {
  /** Python 表达式，例如 `__sol__.twoSum` 或 `reverse_number` */
  expr: string;
  /** 给人看的调用名，例如 `Solution().twoSum` */
  display: string;
  /** 执行前要不要先 `__sol__ = Solution()` */
  needsInstance: boolean;
} {
  return entry.kind === 'method'
    ? {
        expr: `__sol__.${entry.name}`,
        display: `Solution().${entry.name}`,
        needsInstance: true,
      }
    : {expr: entry.name, display: entry.name, needsInstance: false};
}