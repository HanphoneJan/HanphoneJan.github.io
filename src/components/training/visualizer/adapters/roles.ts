/**
 * 从原始轨迹里认出「数组」与「指针」两种角色。
 *
 * ## 为什么不靠变量名
 *
 * 题解里同一个数组可能叫 `nums` / `arr` / `height` / `a` / `s`，
 * 指针可能叫 `i` / `left` / `right` / `p`。靠名字必然漏一大半，
 * 而且一改题解的变量名可视化就失灵。
 *
 * 靠**值的形状**也不够 —— 这是实测踩出来的：值落在数组下标区间内的
 * 变量，既有真指针，也有累加器。
 *
 * - 0011 盛水容器的 `max_area` 取过 `0 / 8 / 49`，其中 8 恰好落在
 *   数组长度 9 之内，纯看取值会被当成指针
 * - 0053 最大子数组和的 `max_sum` 比例高到 0.88，也是累加器
 *
 * 所以要**两类证据合起来看**。
 *
 * ## 三类证据
 *
 * 1. **取值形状**：整数、几乎每次出现都落在 `[0, len)`、且取过多个不同值
 *    （排除常量与循环上界 `n`）
 * 2. **源码用法**：在题解代码里被当作下标 / 切片边界 / 以 ±1 移动
 *    （累加器永远不会有这些特征）
 * 3. **命名**：叫 `i` / `left` / `mid` 这类约定的下标名（弱证据，
 *    只在其他证据不足以定案时用来把真指针捞回来）
 *
 * 三者都指不到同一个变量时，就**不认它是指针** —— 宁可这道题没有可视化，
 * 也不能让读者看着一根乱指的标签以为那就是算法的指针。
 *
 * ## 兜底：显式覆盖表
 *
 * 少数题目的源码形态特殊（例如 0003 的 `left` 从不被写成 `s[left]`，
 * 它只出现在 `ans = i - left` 这种算式里），自动判据捞不回来。
 * 这类题在 `OVERRIDES` 里显式钉死，并且由 `pnpm test:adapters`
 * 校验覆盖表与轨迹一致 —— 题解一改，覆盖表对不上会直接报错，
 * 不会悄悄画错。
 */

/** 画面上一个格子能放的东西 */
export type CellValue = number | string;

export interface Roles {
  /** 数组变量名 */
  arrayVar: string;
  /** 数组内容（字符串已拆成字符数组） */
  values: CellValue[];
  /** 会在 [0, len) 内移动的整数变量，按首次出现顺序 */
  pointerVars: string[];
}

/**
 * 逐题钉死的角色。
 *
 * 键是题解 md 的文件名去扩展名（与 `static/traces/<name>.json` 一致）。
 * 只在自动判据确实失手时才写这里，写之前先看一眼 `test:adapters`
 * 报出来的存疑变量 —— 能靠判据捞回来的就别硬编码。
 */
export const OVERRIDES: Record<
  string,
  {arrayVar?: string; pointerVars: string[]}
> = {
  // 0003 的 left 从不写成 `s[left]`，只出现在 `ans = i - left` 里，
  // 自动判据只认得出 i（enumerate）。left 是滑动窗口的左边界，必须显式给。
  '0003_longest_substring_without_repeating_characters': {
    pointerVars: ['left', 'i'],
  },
  // 0448 消失的数字：x 是原地交换的下标，名字太短不在约定名单里。
  '0448_find_all_numbers_disappeared_in_an_array': {
    pointerVars: ['i', 'x'],
  },
  // 0239 滑动窗口最大值：q 是单调队列的**下标**，自动判据看得见 i，
  // 但队列本身是个 deque（录成 `"<deque>"`），q 的值来自 nums[q] 所以源码
  // 证据其实够 —— 留着这行是为了在队列下标命名变化时兜底。
  '0239_sliding_window_maximum': {
    pointerVars: ['i'],
  },
  // 0957 牢房：i 是逐天推进的下标，n 是待模拟的天数（会自减）。
  // n 不是指针 —— 它落在 [0, 8) 里只是因为牢房恰好有 8 间。
  '0957_prison_cells_after_n_days': {
    arrayVar: 'curr_cells',
    pointerVars: ['i'],
  },
  // 0045 跳跃游戏：current_end / farthest 是两个窗口边界，
  // 源码里只与 len 比较、不作下标，自动判据捞不到。
  '0045_jump_game_ii': {
    pointerVars: ['current_end', 'farthest', 'i'],
  },
  // 0131 分割回文串：i / j 是回溯枚举的两个边界（s[i:j+1]）。
  '0131_palindrome_partitioning': {
    pointerVars: ['i', 'j'],
  },
  // 0072 编辑距离：dp 是二维表、`_` 是内层下标，j 是字符位置。
  // 这题本来更适合 DP 表格视图，先按一维窗口画。
  '0072_edit_distance': {
    pointerVars: ['i', 'j'],
  },
  /**
   * 0647 回文子串：主数组是带哨兵的 `t = "#" + s + "#"`（长度 2n+1），
   * `i` 与 `hl` 都在 t 上算。自动判据已经能选中 t（它被 `t[i - hl]`
   * 引用），但 hl 是「半长步数」而不是下标 —— 它会超出 t 的范围，
   * 画成指针会给出悬空标签。只保留 i。
   */
  '0647_palindromic_substrings': {
    arrayVar: 't',
    pointerVars: ['i'],
  },
};

/** Json 标量判定：数字或单字符字符串 */
export function isScalar(v: unknown): v is CellValue {
  return (
    typeof v === 'number' ||
    (typeof v === 'string' && v.length > 0 && [...v].length === 1)
  );
}

/**
 * 能不能当**一格**画出来。
 *
 * 与 `isScalar` 的区别是允许多字符字符串。0014 最长公共前缀的入参是
 * `strs = ["flower","flow","flight"]`，0013/0038 这类题面给的也是整词 ——
 * 按单字符判据会被拒掉，而这一类题**恰恰有指针**（`i` 逐字符下标
 * `strs[0]`），是很好的可视化素材。
 *
 * 代价是要防住「字符串数组其实是算法的中间产物」的情况
 * （0049 字母分组词组的 `res`、0038 的 `words`）——
 * 靠 `pickArray` 里「入参优先」那条规则挡。
 */
export function isCellValue(v: unknown): v is CellValue {
  return (
    typeof v === 'number' ||
    (typeof v === 'string' && v.length > 0 && v.length <= 24)
  );
}

/**
 * 节点标记对象。录制器把 ListNode/TreeNode 编成这个形状。
 *
 * ```
 * {"$": "tree", "v": [1, 2, 3, null, 5]}  层序展开（与力扣题面一致）
 * {"$": "list", "v": [1, 2, 3]}          沿 next 走出来的链表
 * {"$": "n", "i": 2, "v": 3}             某个节点：我在第 i 格
 * ```
 *
 * 「$」而不是 `__type__` 这种长键，是为了轨迹 JSON 里**肉眼可辨** ——
 * diff 时一眼能看出是节点标记而不是普通数据。
 */
export interface NodeMark {
  $: 'tree' | 'list' | 'n';
  /** tree/list：整条结构的值；n：单个值 */
  v?: unknown;
  /** n：层序/链表下标 */
  i?: number;
}

/** 这个 Json 是不是节点标记对象 */
export function isNodeMark(v: unknown): v is NodeMark {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { $?: unknown }).$ === 'string'
  );
}

/**
 * 整棵结构 / 整条链的值。
 *
 * 只对 `$: 'tree' | 'list'` 成立。`$: 'n'` 是单个节点，
 * 画面上的「数组」要靠 `$: 'tree'|'list'` 那个提供 ——
 * 树题里局部变量有 `root`/`node`/`left`/`cur` 四个，全是单个节点。
 */
export function nodeSequence(v: unknown): unknown[] | null {
  if (!isNodeMark(v) || v.$ === 'n' || !Array.isArray(v.v)) {
    return null;
  }
  return v.v;
}

/** 节点在结构里的下标；不是节点或没记录下标时返回 undefined */
export function nodeIndex(v: unknown): number | undefined {
  return isNodeMark(v) && v.$ === 'n' && typeof v.i === 'number' ? v.i : undefined;
}

/** 结构类型：树还是链表 */
export function nodeKindOf(v: unknown): 'tree' | 'list' | null {
  return isNodeMark(v) && (v.$ === 'tree' || v.$ === 'list') ? v.$ : null;
}

/**
 * 序列判定。
 *
 * 数字 list 与**字符串**都算序列：0003 无重复子串这类题吃的就是一个 str，
 * 它在画面上就是一串字符（与现有 `sliding-window` tracer 的做法一致）。
 */
function asSequence(v: unknown): CellValue[] | null {
  if (typeof v === 'string') {
    // 太长的字符串当序列录进来，画面会挤成一条线
    return v.length >= 2 && v.length <= 60 ? [...v] : null;
  }
  if (!Array.isArray(v) || v.length === 0) {
    return null;
  }
  if (!v.every(isCellValue)) {
    return null;
  }
  return v as CellValue[];
}

function firstSeen(
  events: Array<{locals: Record<string, unknown>}>,
  name: string,
): number {
  return events.findIndex((e) => e.locals[name] !== undefined);
}

/**
 * `name` 是不是 `enumerate(...)` 产出的下标。
 *
 * 必须把 `enumerate` 也匹配进去，只看 `for name,` 会误判：
 * 0079 单词搜索的 `for x, y in (i, j-1), (i, j+1), (i-1, j), (i+1, j)`
 * 是遍历四个方向，`x` 是 board 的行坐标而不是任何数组的下标。
 */
export function isEnumerateIndex(code: string, name: string): boolean {
  const n = escapeRe(name);
  return new RegExp(
    `for\\s+${n}\\s*,\\s*[\\w\\s,]*\\bin\\s+enumerate\\s*\\(`,
  ).test(code);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 最后一关：指针与画出来的数组之间**必须**有源码上的关联。
 *
 * 前面的判据（取值形状 + 源码证据 + 命名）只负责**提名**，这一关负责**否决**。
 * 分成两轮是因为提名可以宽松（宁可多提，靠覆盖表或下一关收拾），
 * 而否决必须严格 —— 一根指不到任何格子的标签，比少一根指针坏得多：
 * 读者会以为那就是算法的指针，然后照着它去理解一段其实对不上的动画。
 *
 * 合法的关联只有四种：
 *
 * 1. 作为下标 `nums[i]`，含算式里 `nums[i - 1]`、`t[i - hl]`（0957、0647）
 * 2. enumerate 下标 `for i, x in enumerate(arr)`
 * 3. `while left < right` 里的区间边界（二分与滑窗的左闭右开两端）
 * 4. 覆盖表显式钉死（源码里确实看不出关联的那些）
 *
 * 落在四种之外的候选会被丢掉。丢掉之后的两种结果都可接受：
 * 题目变成单指针（画面仍然正确，只是少一根标签），
 * 或者一根都不剩、整题不画。
 */
function isLinkedToArray(
  code: string,
  arrayVar: string,
  ptr: string,
  overrideDeclared: boolean,
): boolean {
  if (overrideDeclared) {
    return true;
  }
  const n = escapeRe(ptr);
  // 数组名前的 \b 不能省：`s` 不加边界就会匹配到 `rows[index]` 的尾巴 ——
  // 0006 Z 字形变换因此被误判成「index 在给 s 下标」，而实际上它下标的是
  // 每一行收集桶 rows，画面上画的是入参 s，两者毫无关系。
  const a = `\\b${escapeRe(arrayVar)}\\b`;
  // 1. 下标（含算式）：nums[i] / nums[i - 1] / t[i - hl] / s[left : right]
  if (new RegExp(`${a}\\s*\\[[^\\]]*\\b${n}\\b`).test(code)) {
    return true;
  }
  // 2. enumerate 下标
  if (isEnumerateIndex(code, ptr)) {
    return true;
  }
  // 3. 区间边界：while a < b
  if (
    new RegExp(`while\\s+${n}\\s*(?:<|<=|>|>=)\\s*\\w+\\s*:`).test(code) ||
    new RegExp(`while\\s+\\w+\\s*(?:<|<=|>|>=)\\s*${n}\\s*:`).test(code)
  ) {
    return true;
  }
  return false;
}
const POINTER_NAMES = new Set([
  'i', 'j', 'k', 'l', 'r', 'x', 'y',
  'left', 'right', 'lo', 'hi', 'low', 'high',
  'start', 'end', 'begin', 'mid', 'pos', 'idx',
  'first', 'second', 'third', 'slow', 'fast', 'head',
  'p', 'q',
]);

/**
 * 源码证据：这个变量是不是被当作下标/边界在用。
 *
 * 返回 0~3 的分数，>=2 才算「有硬证据」。
 */
function codeEvidence(code: string, name: string): number {
  const n = escapeRe(name);
  let score = 0;
  // 强证据：被用作下标 arr[name] / arr[name:...] / arr[name + 1]
  if (new RegExp(`[\\w\\]]\\s*\\[\\s*${n}\\b`).test(code)) {
    score += 2;
  }
  // 强证据：作为 enumerate 的下标 for name, x in enumerate(...)
  // 必须连 enumerate 一起匹配：0079 单词搜索里有
  // `for x, y in (i, j-1), (i, j+1), ...`（四方向邻居），
  // 只匹配 `for x,` 会把 x 这个**坐标对**当成数组下标。
  if (isEnumerateIndex(code, name)) {
    score += 2;
  }
  // 强证据：以 ±1 移动 —— 指针最典型的动作，累加器不会这么走
  if (new RegExp(`${n}\\s*\\+=\\s*1\\b`).test(code) || new RegExp(`${n}\\s*-=\\s*1\\b`).test(code)) {
    score += 2;
  }
  // 弱证据：作为切片边界 arr[name:]
  if (new RegSlice(name).test(code)) {
    score += 1;
  }
  return score;
}

/** 切片边界 `x:` / `:x` / `x-1:j` 这类形态 */
class RegSlice {
  private re: RegExp;
  constructor(name: string) {
    const n = escapeRe(name);
    this.re = new RegExp(`\\[\\s*${n}\\s*:`);
  }
  test(s: string): boolean {
    return this.re.test(s);
  }
}

/**
 * 数组变量已被重新绑定成**更长的**序列（哨兵填充等）时的显式放行。
 *
 * 0015 三数之和与 0215 数组第 K 大都做 `nums.sort()` / 原地划分 ——
 * 长度不变，只是内容变了，那属于正常情况，本来就不会被排除。
 * 真正需要放行的是「长度变长」且读者仍希望看到完整数组的题，
 * 目前没有，先留空以备后用。
 */
export interface DetectOptions {
  /** 题解代码全文，用来取源码证据；缺省时只靠取值形状 + 覆盖表 */
  code?: string;
  /** 题解文件名（去扩展名），命中 OVERRIDES 时以覆盖表为准 */
  overrideKey?: string;
  /**
   * 入口方法的参数名（不含 self）。
   *
   * 「是入参」是主数组最可靠的信号 —— 题面描述的就是入参。
   * 0300 最长递增子序列里 nums 与 dp 都被 i/j 下标，光看下标关系分不出高下，
   * 但读者要看的是 nums。
   */
  paramNames?: string[];
}

export function detectRoles(
  events: Array<{line: number; locals: Record<string, unknown>}>,
  opts: DetectOptions = {},
): Roles | null {
  if (events.length < 3) {
    return null;
  }
  const code = opts.code ?? '';

  // ---- 1. 主数组 ----
  const candidates = new Map<
    string,
    {len: number; frames: number; values: CellValue[]}
  >();
  /** 出现过「长度中途变了」的变量，直接排除 */
  const rebounded = new Set<string>();
  for (const e of events) {
    for (const [name, raw] of Object.entries(e.locals)) {
      // 录制器把链表节点、函数、deque 这类对象记成 `"<ListNode>"` /
      // `"<function>"` 的摘要串。它们以 `<` 开头，不是真的序列 ——
      // 不挡掉的话 0079 单词搜索会把 `dfs` 这个**函数**当成主数组
      // （`"<function>"` 有 11 个字符，于是画面上凭空多出 11 个格子）。
      if (typeof raw === 'string' && raw.startsWith('<')) {
        continue;
      }
      const seq = asSequence(raw);
      if (!seq) {
        continue;
      }
      // 已经被判过「长度中途变了」就彻底排除。必须在 add 之前查：
      // `candidates.delete` 之后同一变量还会以新长度反复出现，
      // 不查就会被重新塞回去（0084 就是这么漏过去的）。
      if (rebounded.has(name)) {
        continue;
      }
      const cur = candidates.get(name);
      if (!cur) {
        candidates.set(name, {len: seq.length, frames: 1, values: seq});
      } else if (cur.len === seq.length) {
        cur.frames++;
        // 记最后一次的值：原地修改类题目的终态才是「做完的样子」
        cur.values = seq;
      } else {
        /**
         * 长度变了 —— 放弃这个候选，而不是「换一个长度继续」。
         *
         * 最常见的形态是**哨兵填充**：`nums = [1] + nums + [1]`（0312 戳气球）、
         * `heights = [0] + heights + [0]`（0084 柱状图最大矩形）。
         * 这类题解里数组被重新绑定成更长的版本，于是画面上会比题面多出
         * 两格读者从没见过的哨兵，而指针又只在原来那几格上移动 ——
         * 末尾两格永远不会有高亮，看起来像是漏算。
         *
         * 与其画一个自相矛盾的图，不如不画。这两题另有专用视图（单调栈 /
         * 区间 DP 表格）才画得对，交给后续 adapter。
         */
        candidates.delete(name);
        rebounded.add(name);
      }
    }
  }
  if (candidates.size === 0) {
    return null;
  }

  // `X[ptr]` 关系：谁被谁下标。这是「指针与画面必须对得上」那条不变式的依据。
  const subscriptTargets = new Map<string, Set<string>>();
  const subRe = /([\w.]+)\s*\[\s*([\w]+)\s*[\]:]/g;
  let sm: RegExpExecArray | null;
  while ((sm = subRe.exec(code)) !== null) {
    let set = subscriptTargets.get(sm[1]);
    if (!set) {
      set = new Set<string>();
      subscriptTargets.set(sm[1], set);
    }
    set.add(sm[2]);
  }

  const override = opts.overrideKey ? OVERRIDES[opts.overrideKey] : undefined;

  // ---- 2. 指针候选：取值形状 ----
  // 先把「像不像下标」的所有候选收齐，再回头决定主数组选谁。
  // 反过来（先定数组再找指针）会漏：0647 的指针 `i` 下标的是带哨兵的
  // 辅助数组 `t`，若主数组先被启发式选成入参 `s`，就再也找不到
  // 能与画面对上账的指针了。
  const stat = new Map<
    string,
    {moves: boolean; vals: Set<number>; sample: number[]}
  >();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (
        rebounded.has(name) ||
        typeof v !== 'number' ||
        !Number.isInteger(v)
      ) {
        continue;
      }
      let s = stat.get(name);
      if (!s) {
        s = {moves: false, vals: new Set<number>(), sample: []};
        stat.set(name, s);
      }
      s.vals.add(v);
      if (s.sample.length < 400) {
        s.sample.push(v);
      }
    }
  }
  // 「在动」= 取过多个不同值。这一条把常量与循环上界（`n = len(nums)`）
  // 挡在外面，比「取值落在 [0, len) 里」可靠得多 —— 0011 的 `max_area`
  // 取过 0/8/49，其中 8 恰好落在长度 9 之内，靠范围判断会被骗。
  for (const s of stat.values()) {
    s.moves = s.vals.size > 1;
  }

  /**
   * 选主数组。
   *
   * 判据按优先级：
   *
   * 1. 覆盖表钉死的
   * 2. **入参** —— 题面描述的就是入参，最可靠
   * 3. **被认出的指针下标得动的那一个** —— 画面显示 A 数组、指针 P 却在
   *    B 数组上下标时，指针指不到任何格子，读者看到的是悬空标签。
   *    0647 因此从 `s`（入参，3 格）改成 `t`（哨兵数组，9 格）：
   *    `i` 一直在 `t` 上算，硬套到 `s` 上会让 62% 的帧指针越界 ——
   *    这就是「指针与画面对不上」的具体代价。
   *    0239 反过来不能换：nums 被 `q` 下标、ans 被 `left` 下标，
   *    而真正的指针 `i` 对两个都不下标，此时换过去只会更糟 ——
   *    所以要求「候选指针与被下标者有交集」，换不动就保留启发式选择。
   * 4. 出现帧数最多的那个（兜底启发式）
   */
  const pointerNames = [...stat.keys()].filter((p) => stat.get(p)!.moves);
  const [heuristicVar, heuristicInfo] = [...candidates.entries()].sort(
    (a, b) => b[1].frames - a[1].frames,
  )[0];
  let arrayVar = heuristicVar;
  let info = heuristicInfo;

  if (override?.arrayVar && candidates.has(override.arrayVar)) {
    arrayVar = override.arrayVar;
    info = candidates.get(arrayVar)!;
  } else {
    // 2. 入参优先（题面描述的对象）
    const byParam = (opts.paramNames ?? [])
      .map((p) => candidates.get(p))
      .find((c): c is {len: number; frames: number; values: CellValue[]} => !!c);
    if (byParam) {
      arrayVar = opts.paramNames!.find((p) => candidates.has(p))!;
      info = byParam;
    } else {
      // 3. 与已认出的指针有下标关系的那些里，取出现帧数最多的
      const indexed = [...candidates.entries()].filter(
        ([name]) =>
          name !== arrayVar &&
          pointerNames.some((p) => subscriptTargets.get(name)?.has(p)),
      );
      if (indexed.length > 0) {
        [arrayVar, info] = indexed.sort((a, b) => b[1].frames - a[1].frames)[0];
      }
    }
  }

  const n = info.values.length;

  /**
   * 形状检查：`p` 是不是「这个数组的下标」。
   *
   * 判据是「取值几乎每次都落在 [-1, len]」：
   *
   * - 上界含 len：左闭右开二分 `left, right = 0, len(nums)` 里 right 的
   *   初值就是 len。写死 `< n` 会把 right 的比例拉到阈值以下，
   *   整道题只剩 mid 一根指针（实测 0034/0035），而 right 恰恰最该被看见。
   * - 下界是 -1 而不是 0：`-1` 是 Python 里约定的「没找到 / 起点之前」
   *   哨兵值，题解里到处都是 `ans_left = -1`、`count -= 1` 归零到 -1。
   *   0076 最小覆盖子串的 `ans_left` 初值就是 -1，0322 的记忆化 dfs 里
   *   `i - 1` 也会取到 -1 —— 把它们判成「不是下标」会白白丢掉一根指针。
   * - len 与 -1 都没有对应格子，渲染时会被 `markByPointers` 丢掉，
   *   不会出现指向不存在格子的标签。
   */
  const shapeOk = (p: string): boolean => {
    const s = stat.get(p);
    if (!s || !s.moves || s.sample.length === 0) {
      return false;
    }
    const ok = s.sample.filter((v) => v >= -1 && v <= n).length;
    return ok / s.sample.length >= 0.8;
  };

  // ---- 3. 覆盖表优先 ----
  // 覆盖表是「提名」，仍要过形状检查与最后一关的关联检查 ——
  // 写错一个名字（比如题解把 left 改成 l）会在最后一关被安静地丢掉，
  // 由 `pnpm test:adapters` 的覆盖表一致性断言把它变成显式报错。
  if (override?.pointerVars) {
    const picked = override.pointerVars.filter(
      (p) => p !== arrayVar && stat.has(p) && shapeOk(p),
    );
    if (picked.length > 0) {
      return {
        arrayVar,
        values: info.values,
        pointerVars: orderByFirstSeen(events, picked).slice(0, 3),
      };
    }
  }

  // ---- 4. 硬证据：取值形状合格 + 源码里有下标级用法 ----
  const hard: string[] = pointerNames.filter(
    (p) => shapeOk(p) && codeEvidence(code, p) >= 2,
  );

  /**
   * `name` 是否真的在给**画出来的那个数组**下标。
   *
   * 注意是 `arrayVar[name]`，不是「任意东西的下标」。这个区别很要紧：
   *
   * 0079 单词搜索里 `i` / `j` 是 board（二维）的行列坐标，`k` 才是 word 的下标。
   * 而 board 录成了嵌套 list，被 `asSequence` 拒掉，于是主数组选中了 word。
   * 若只判「`i` 出现在某个 `x[i]` 里」，i 就会被认成指针画到 word 头上 ——
   * 恰好 board 是 3×3、word 长 3，范围检查还过得去，页面看上去完全正常，
   * 但它画的是「board 的行列」却标在 word 的格子上，纯属误导。
   *
   * 所以判据必须是「指针下标的就是我画的那个数组」。
   */
  const subscriptsArray = (name: string): boolean =>
    new RegExp(
      `\\b${escapeRe(arrayVar)}\\b\\s*\\[\\s*${escapeRe(name)}\\b`,
    ).test(code);

  const isSubscripted = (name: string): boolean =>
    new RegExp(`[\\w\\]]\\s*\\[\\s*${escapeRe(name)}\\b`).test(code);
  const isEnumerate = (name: string): boolean => isEnumerateIndex(code, name);

  /**
   * 把「不是下标的东西」挡在门外。
   *
   * `count` / `max_sum` 这类累加器会以 ±1 移动（`count += 1`），
   * 因此上面那条「±1 即硬证据」的判据会被它们骗到。但它们**从不被用作下标**，
   * 所以只要在源码里从未出现过 `arr[name]`，就不是指针。
   *
   * 这一条比「有硬证据」更严，是刻意的：`count` 出现在 0169 多数元素、
   * `max_sum` 出现在 0053 最大子数组和，两者都会被误判，而漏判一个真指针
   * 只是画面少一根标签，误判一个累加器会让读者盯着一个假下标看半天。
   */
  const hardReal = hard.filter(
    (p) => subscriptsArray(p) || (subscriptTargets.get(arrayVar)?.has(p) ?? false),
  );
  // enumerate 下标不需要出现 `arr[i]`（它本身就是 enumerate 产出的）
  const hardEnumerate = hard.filter(isEnumerate);

  /**
   * 区间边界：两个变量在 `while a < b` 里互为界。
   *
   * 二分查找的 `left` / `right` 从不被写成 `nums[left]` —— 它们只出现在
   * `while left < right:` 和 `mid = left + (right - left) // 2` 里。
   * 所以「必须是下标」这条判据会把二分题的两个指针都误杀
   * （实测 0034 只剩 mid，0035 只剩 mid）。
   *
   * 判据是「同一条 while 比较语句里成对出现」：两个形状合格的整数变量
   * 在 while 条件里互相比较，几乎必然是区间两端。累加器不会被拿来当界 ——
   * `while i < n` 里的 n 是循环上界而非区间右端，但 n 是**常量**
   * （形状检查要求「取过多个不同值」），已经被挡掉了。
   */
  const bounds: string[] = [];
  const whileCmp = /while\s+([\w]+)\s*(?:<|<=|>|>=)\s*([\w]+)\s*:/g;
  let wm: RegExpExecArray | null;
  while ((wm = whileCmp.exec(code)) !== null) {
    for (const nm of [wm[1], wm[2]]) {
      if (
        shapeOk(nm) &&
        !isSubscripted(nm) &&
        !isEnumerate(nm) &&
        nm !== arrayVar &&
        !bounds.includes(nm)
      ) {
        bounds.push(nm);
      }
    }
  }

  // ---- 5. 只有一根指针时，用命名把同族的那根捞回来 ----
  /**
   * 0003 的 `left` 是滑动窗口的左边界，但它从不写成 `s[left]` ——
   * 只出现在 `ans = i - left` 这种算式里，源码证据拿不到。
   * 而 `i` 是 enumerate 下标（有证据）。两者同属「窗口边界」这一族，
   * 所以当已经有硬证据时，把命名符合约定、且确实在移动的变量一起带进来。
   *
   * 命名名单刻意保守（只有 i/j/left/right 这类公认的下标名），
   * 否则 `count`、`ans` 这种也会被当成指针捞回来。
   */
  const named = pointerNames.filter(
    (p) => shapeOk(p) && POINTER_NAMES.has(p.toLowerCase()),
  );
  const pool = new Set<string>([...hardReal, ...hardEnumerate, ...bounds]);
  if (pool.size >= 1) {
    for (const p of named) {
      // 命名像下标还不够 —— 必须确认它下标的就是画出来的那个数组。
      // 0079 的 i/j 是 board 的行列坐标，若不查这一层会被画到 word 上。
      if (
        (subscriptsArray(p) ||
          (subscriptTargets.get(arrayVar)?.has(p) ?? false)) &&
        codeEvidence(code, p) >= 1
      ) {
        pool.add(p);
      }
    }
  }

  // ---- 6. 最后一关：与画出来的数组有源码关联 ----
  const declared = new Set(override?.pointerVars ?? []);
  const pointerVars = orderByFirstSeen(
    events,
    [...pool].filter((p) =>
      isLinkedToArray(code, arrayVar, p, declared.has(p)),
    ),
  ).slice(0, 3);

  if (pointerVars.length === 0) {
    return null;
  }
  return {
    arrayVar,
    values: info.values,
    pointerVars,
  };
}

function orderByFirstSeen(
  events: Array<{locals: Record<string, unknown>}>,
  names: string[],
): string[] {
  // 首次出现顺序决定画面上指针标签的配色顺序，稳定输出（否则每次构建颜色会变）
  return [...names].sort((a, b) => firstSeen(events, a) - firstSeen(events, b));
}


