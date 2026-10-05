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
  /** 所在类名，如 Solution（0297 的序列化题写的是 Codec） */
  className: string;
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
   * 这个块里的入口是不是**这道题的入口**。
   *
   * 不知道文档入口名（没传 docEntryName）时恒为 true。
   *
   * 为何需要它：一篇题解里常有几个「别的函数」。0300 的「如何输出具体的
   * LIS？」小节里是 `lengthOfLIS_with_path(nums)` —— 收同一个参数，但返回的是
   * 那条递增子序列本身 `[2,3,7,101]`，而题面的期望值是长度 `4`。
   * 拿题面的样例去调它，9 组全判失败，而代码一个字都没错。
   * 读者看到的是「这篇题解写错了」，实际上是我们调错了函数。
   *
   * 所以样例只在名字对得上时给；对不上就只留「自己输参数」。
   */
  matchesDocEntry: boolean;
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
function pickEntry<
  T extends {name: string; info: ParamInfo},
>(candidates: T[]): T {
  if (candidates.length === 1) {
    return candidates[0];
  }
  /**
   * 「把入参加工成另一个东西」的函数名先让给别的候选。
   *
   * balance_paths 的代码是 `build_tree(level_order)` + `count_balance_paths(root)`，
   * 挑中 `build_tree` 之后页面上两组样例全报
   * `AttributeError: 'TreeNode' object has no attribute ...` ——
   * 它返回的是那棵树本身，而题面要的是那条路径数。
   *
   * **只在有得选时才换**：0105 的入口真的叫 `buildTree`、0761 真的叫
   * `makeLargestSpecial`，单候选时不动。
   * 与 py-samples 的 `looksLikeFactory` 是同一条判据，两边必须同步。
   */
  const notFactory = candidates.filter(
    (c) => !/^(build|make|create|parse|construct|from|to|of)([A-Z_]|$)/i.test(c.name),
  );
  const pool0 = notFactory.length > 0 ? notFactory : candidates;
  /**
   * **下划线开头的是私有辅助函数**，不是题目入口。
   *
   * shoppee 合并降序链表写的是 `MergeList(l1, l2)` 与 `_reverse(head)`，
   * 候选里 `_reverse` 也在，而它是**最后一个**被定义的 ——
   * `pickEntry` 的兜底是 `candidates[0]`（第一个），可
   * `analyzeSnippet` 的调用方给的 `docEntryName` 有时命中不到，
   * 于是 `_reverse` 成了入口：录制时喂两个链表参数进去报
   * `missing 1 required positional argument`，
   * 页面上「跑样例」也是同一个错。
   *
   * 判据用单下划线（Python 的「非公开」约定）而不是双下划线 ——
   * dunder 已经在 `isDunder` 里滤掉了。
   */
  const publicOnes = pool0.filter((c) => !c.name.startsWith('_'));
  const pool = publicOnes.length > 0 ? publicOnes : pool0;
  return pool.find((c) => !looksLikeRangeParam(c.info.names)) ?? pool[0];
}

/**
 * 某个方法所在的类名。
 *
 * 绝大多数题解写的是 `class Solution`，但不是全部：0297 的序列化题写的是
 * `class Codec`（力扣那边的类名就叫 Codec）。驱动里写死 `Solution()` 的话，
 * `__sol__ = Solution()` 直接 NameError，两组样例全判失败。
 *
 * 办法是找**位置在它前面的最后一个 class** —— Python 的方法体缩进在类里，
 * 不用真做语法分析。
 */
function classNameAt(code: string, methodIndex: number): string {
  const classRe = /^[ \t]*class\s+(\w+)/gm;
  let name = 'Solution';
  let m: RegExpExecArray | null;
  while ((m = classRe.exec(code)) !== null) {
    if (m.index > methodIndex) {
      break;
    }
    name = m[1];
  }
  return name;
}

/**
 * 「同一道题的另一种写法」允许带变体后缀。
 *
 * 题解里讲多种解法时习惯性地在入口名后面挂一个后缀：
 * `moveZeroes_brute` / `moveZeroes_two_pass` / `maxSlidingWindow_heap` /
 * `rotate_left` / `numSquares_bfs`。它们算的仍然是那道题，题面的样例照样适用，
 * 不该因为多一个后缀就失去「跑样例」按钮（实测这样会误伤 12 个块）。
 *
 * ## 但「换了要返回什么」的不算
 *
 * `lengthOfLIS_with_path` 也在解 0300，可它返回的是那条递增子序列本身
 * （`[2,3,7,101]`），题面的期望值是长度 `4`。这后缀表示「输出换了形态」，
 * 拿 4 去比一个列表，判出来的 ✗ 与代码对错无关。
 *
 * 只有这几个后缀是这种含义 —— 宁可漏判（多给一次手动输入）也不误判
 * （谎报代码写错了）。
 */
const DIFFERENT_OUTPUT_SUFFIXES = [
  'with_path',
  'with_index',
  'with_detail',
  'with_trace',
  'trace',
  // 换了**方向**也是另一道题：0189 的「扩展思考」里给了个 rotate_left，
  // 它问的是向左轮转，而题面要的是向右 —— 左轮 3 位和右轮 3 位的结果不同，
  // 题面的样例对它天然不适用。
  'left',
  'right',
  'reverse',
];

/**
 * 「同一道题的另一种写法」的解法名后缀。
 *
 * 题解讲多种解法时习惯性地挂一个后缀：`moveZeroes_brute` / `rotate_by_three` /
 * `searchMatrix_binary_search`。去掉它之后剩下的 stem 就是题目的名字。
 */
const VARIANT_SUFFIXES = [
  'brute',
  'brute_force',
  'naive',
  'heap',
  'stack',
  'dfs',
  'bfs',
  'memo',
  'memoized',
  'greedy',
  'dp',
  'two_pass',
  'one_pass',
  'iterative',
  'recursive',
  'binary_search',
  'bisect',
  'counting',
  'hash',
  'fast',
  'slow',
  'opt',
  'optimized',
  'alt',
  'v2',
];

/**
 * 剥掉结尾的解法变体后缀，拿到「题目本身」的名字。
 *
 * 用 endsWith 而不是「按最后一个下划线切」：`binary_search` 里还有一个
 * 下划线，按最后一段切出来的是 `search`，认不出来。
 */
function stem(name: string): string {
  for (const suf of VARIANT_SUFFIXES) {
    if (name.length > suf.length + 1 && name.endsWith('_' + suf)) {
      return name.slice(0, -(suf.length + 1));
    }
  }
  return name;
}

/** 后缀是不是「换了要返回什么 / 换了方向」 */
function hasDifferentOutputSuffix(name: string): boolean {
  return DIFFERENT_OUTPUT_SUFFIXES.some(
    (suf) => name.length > suf.length + 1 && name.endsWith('_' + suf),
  );
}

/**
 * 这个块里的函数算不算「这道题的解法」。
 *
 * 认三种：名字一致；候选名带一个解法变体后缀（`moveZeroes_brute` 对
 * `moveZeroes`）；或者文档入口名自己带变体后缀而候选是那个 stem
 * （0240 的完整代码里是 `searchMatrix_binary_search`，思路小节里写的是
 * `searchMatrix_brute`）。
 *
 * 只要**任何一边**挂着「换了要返回什么」的后缀就否掉 ——
 * `lengthOfLIS_with_path` 的 stem 恰好是 `lengthOfLIS`，
 * 光比 stem 会把它放行，而它返回的是那条子序列本身。
 */
export function isDocEntryOf(name: string, docEntryName: string): boolean {
  if (name === docEntryName) {
    return true;
  }
  if (hasDifferentOutputSuffix(name) || hasDifferentOutputSuffix(docEntryName)) {
    return false;
  }
  return stem(name) === stem(docEntryName);
}

export function analyzeSnippet(
  rawCode: string,
  docEntryName?: string | null,
): SnippetAnalysis {
  const not = (reason: string): SnippetAnalysis => ({
    runnable: false,
    entry: null,
    matchesDocEntry: true,
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
  const candidates: Array<{name: string; info: ParamInfo; className: string}> = [];
  let m: RegExpExecArray | null;
  while ((m = methodRe.exec(code)) !== null) {
    if (isDunder(m[1])) {
      continue;
    }
    if (!hasClass) {
      return not('只有方法体、缺 class 声明');
    }
    candidates.push({
      name: m[1],
      info: parseParamInfo(m[2] ?? ''),
      className: classNameAt(code, m.index),
    });
  }
  if (candidates.length > 0) {
    const match = docEntryName
      ? candidates.find((c) => isDocEntryOf(c.name, docEntryName))
      : undefined;
    const picked = match ?? pickEntry(candidates);
    return {
      runnable: true,
      entry: {
        kind: 'method',
        name: picked.name,
        className: picked.className,
        paramNames: picked.info.names,
        annotations: picked.info.annotations,
        requiredCount: picked.info.requiredCount,
      },
      matchesDocEntry: !docEntryName || match !== undefined,
      isProgram,
      reason: '',
    };
  }

  // 2) 顶层 def（牛客题、脚本）。列 0 匹配，天然排除类里的方法。
  const funcRe = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm;
  const funcs: Array<{name: string; info: ParamInfo}> = [];
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
    funcs.push({name: m[1], info: parseParamInfo(m[2])});
  }
  if (funcs.length > 0) {
    const match = docEntryName
      ? funcs.find((f) => isDocEntryOf(f.name, docEntryName))
      : undefined;
    // 顶层函数沿用「取第一个」的旧规则（牛客题一篇里通常只有一个函数）；
    // 但文档入口名能对上时就用那个 —— 0300 的最后一节里
    // `lengthOfLIS_with_path` 前面还杵着别的辅助函数。
    const picked = match ?? funcs[0];
    return {
      runnable: true,
      entry: {
        kind: 'function',
        name: picked.name,
        paramNames: picked.info.names,
        annotations: picked.info.annotations,
        requiredCount: picked.info.requiredCount,
      },
      matchesDocEntry: !docEntryName || match !== undefined,
      isProgram,
      reason: '',
    };
  }

  return not('没有可调用入口（只有片段）');
}

/**
 * 参数要还原成哪种节点结构。
 *
 * `byval` 是 0236 那种：签名写着 `p: 'TreeNode'`，可题面给的样例是 `p = 5`
 * —— 一个**节点值**，不是节点对象。力扣的评测驱动就是照着这个值到树里
 * 找对应节点的，我们也照做（见 driver.ts 的 `__find__`）。
 */
export type NodeKind = 'none' | 'list' | 'tree' | 'randlist' | 'byval';

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
 * 属性访问本身也足以说明「这个块在跟节点打交道」，不必非得出现
 * `ListNode` 这个词：0025 的辅助函数 `def reverseKGroup(head, k)` 通篇只用
 * `curr.next`，一个字都没提节点类。
 *
 * ## 为什么不要求「块内没自己定义节点类」
 *
 * 早先要求过（怕把普通数组参数改坏），但它会误伤一类很常见的写法：
 * 0297 的 `def serialize(self, root)` 就在定义了 TreeNode 的块里，
 * 不带标注，参数只能是靠属性访问推出来的树。
 *
 * 真正的安全网在别处：`__mk__` 只在值**确实是标量数组**时才建节点
 * （`[[1,2],[3]]` 这种嵌套的、带 None 的都原样传），所以
 * 「普通数组参数」不会被误认 —— 0002 的 `carry` 就是这么安全的。
 */
export function nodeParams(
  entry: SnippetEntry,
  code: string,
): NodeKind[] {
  // 代码动了哪些属性 —— 比「猜它是链表还是树」可靠得多。
  // 0104 的 `root.left` / `root.right` 只能是树；
  // 0002 的 `l1.next` 只能是链表。
  // 两者都有（比如既比较左右子树又遍历 next）时以树为准：树的建法更严格，
  // 用链表去建一定建错，用树去建顶多多余几个字段。
  const touchesTree = /\.\s*(left|right)\b/.test(code);
  const touchesList = /\.\s*next\b/.test(code);
  const touchesVal = /\.\s*val\b/.test(code);
  const inferred: NodeKind = touchesTree ? 'tree' : 'list';

  // 「这个块在跟节点打交道」的信号：类型名，或者干脆就是属性访问。
  //
  // 只认 ListNode/TreeNode 这两个词是不够的：0025 的辅助函数
  // `def reverseKGroup(head, k)` 全程只用 `curr.next`，一个字都没提 ListNode，
  // 于是参数被当成普通数组传进去，第一行就 AttributeError。
  const usesNode =
    /\b(ListNode|TreeNode)\b/.test(code) ||
    touchesTree ||
    touchesList ||
    touchesVal;

  // 块里的节点类自己声明了 random 字段（0138 的 `self.random = None`）
  const definesRandom = /self\s*\.\s*random\s*=/.test(code);

  return entry.annotations.map((a, idx) => {
    // 0138 的节点类自己带 random 字段，样例 [[7,null],[13,0],...] 是
    // 「值 + random 指向的值」，必须按这种形态还原，指针才接得上。
    // 优先于下面所有判断：块里的类长什么样，入参就该长什么样。
    if (definesRandom) {
      return 'randlist';
    }
    // 0236：签名写的是 `root: 'TreeNode', p: 'TreeNode', q: 'TreeNode'`
    // （加引号的前向引用），题面给的样例却是 `p = 5` —— 一个节点**值**。
    // 力扣的评测驱动就是照这个值到树里找对应节点的，我们也照做。
    //
    // 判据是「标注里带引号」：这是前向引用的写法，全语料只有 0236 一篇。
    // 写成 `Optional[TreeNode]` 的那些（0160 的 headA/headB）传进来的
    // 确实是数组，不能一起当成值来查找。
    if (
      idx > 0 &&
      (a === "'treenode'" || a === "'listnode'" || a === "'node'")
    ) {
      return 'byval';
    }
    if (/treenode/.test(a)) {
      return 'tree';
    }
    if (/listnode/.test(a)) {
      return 'list';
    }
    // 0138 的 `Optional[Node]`：力扣用 Node 这个名字表示过两种结构 ——
    // 带 random 的链表节点（0138）和二叉树节点（0116/0117）。
    // 靠代码实际访问了哪个字段区分。
    if (/(^|[^a-z])node([^a-z]|$)/.test(a)) {
      if (touchesTree) {
        return 'tree';
      }
      if (touchesList || touchesVal) {
        return 'list';
      }
    }
    if (a === '' && usesNode) {
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
  /** 给 Python 源码用的实例化语句，例如 `__sol__ = Solution()` */
  instantiate: string | null;
  /** 给人看的调用名，例如 `Solution().twoSum` */
  display: string;
} {
  return entry.kind === 'method'
    ? {
        expr: `__sol__.${entry.name}`,
        instantiate: `__sol__ = ${entry.className}()`,
        display: `${entry.className}().${entry.name}`,
      }
    : {expr: entry.name, instantiate: null, display: entry.name};
}