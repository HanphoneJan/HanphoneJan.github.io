/**
 * 「数组 + 若干滚动标量」类 adapter：DP 前向推进、打家劫舍、最长递增子序列。
 *
 * ## 为什么这类题需要单独一个 adapter
 *
 * 它们的画面上**没有指针**。
 *
 * 0198 打家劫舍：
 *
 * ```python
 * f0 = f1 = 0
 * for i, num in enumerate(nums):
 *     f0, f1 = f1, max(f1, f0 + num)   # 两个滚动变量，没有 i / j / left
 * return f1
 * ```
 *
 * `i` 是 enumerate 下标，`roles.ts` 那套「指针必须是画出来的那个数组的下标」
 * 能认出它，但更关键的是：这类题的教学点是**状态怎么转移**，
 * 而不是「两个指针夹出的区间」。把 `i` 当指针画成 boxes 之外，
 * `f0` / `f1` 这两个正在被更新的数完全看不见 —— 而它们才是这题的主角。
 *
 * 所以这里把滚动标量放进 `counters`，让播放器顶部的计数器面板显示它们，
 * 同时用 `i` 在数组上标出「推进到第几个」。
 *
 * ## 覆盖
 *
 * - 0070 爬楼梯、0198 打家劫舍、0152 最大乘积子数组、0309 冷冻期、
 *   0338 比特位计数、0621 任务调度
 * - 0004 两个正序数组的中位数（两个数组 + `m`/`n` 两个下标）
 * - 0128 最长连续序列、0560 和为 K 的子数组（数组 + 一个 set/累加器）
 * - 0279 完全平方数、0494 目标和（数组 + 回溯下标）
 */

import type {AuxArray, CellState, Frame} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import {isCellValue} from './roles';
import type {AdapterResult} from './types';

/** 数组长度上限：再长画面挤不下 */
const MAX_LEN = 40;

/**
 * 滚动标量的名字特征。
 *
 * 认不出来就退化成「所有没被当成数组、也不是指针的整数」——
 * 那正好是 DP 的状态量。宁可多显示几个数字，也不要漏掉正在转移的那个。
 */
const DP_NAME_RE = /^(?:f\d*|dp\w*|prev\d*|pre\d*|best\w*|cur\w*|max\w*|min\w*|cnt|count|total|sum|res\w*|ans|ans\d*|slow|fast|first|second|take|skip|keep|hold|sell|buy|hold\d*|profit|last\w*)$/i;

interface Pick {
  /**
   * 主数组变量名。**没有真实数组时为 undefined**，此时按整数入参
   * 合成一条「格子条」（见 synthFromInt）。
   */
  arrayVar?: string;
  values: CellValueLike[];
  /** 合成格子条时的长度来源（整数入参名） */
  synthVar?: string;
  /**
   * 「逐位消费」模式：主格子条是某个整数的**各位数字**，
   * 光标位置 = 当前还剩几位（`len(str(x))`，由 `digitVar` 的值推出来）。
   *
   * 0007 整数反转是唯一的实例，而它的教学内容恰恰是那个十进制拆位：
   *
   * ```
   * x = 123  res = 0   digit = 3     -> 取末位 3，res = 3
   * x = 12   res = 3   digit = 2     -> res = 3 * 10 + 2 = 32
   * x = 1    res = 32  digit = 1     -> res = 321
   * x = 0    res = 321                 -> 退出
   * ```
   *
   * 主行画 `[1, 2, 3]`，光标停在「还没被吃掉的那一位」上，
   * 计数器面板显示 res 一步步长出来 —— 「为什么是 res*10 + digit」
   * 这件事在画面上就是「左边一格一格变暗，右边的数字一格一格多出来」。
   */
  digitVar?: string;
  /** 推进位置的名字（enumerate 下标 / range 下标） */
  cursorVar?: string;
  /** 滚动标量名字，按首次出现顺序 */
  dpVars: string[];
  /** 「在长大」的 DP 表，当 aux 行渲染 */
  auxVars: string[];
}

/** 画面上能放的东西 */
type CellValueLike = number | string;

function isNodeMark(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    typeof (v as { $?: unknown }).$ === 'string'
  );
}

function pickShapes(
  events: RawTrace['events'],
  paramNames: string[] | undefined,
  code: string,
): Pick | null {
  // 1. 找主数组
  const score = new Map<string, number>();
  /**
   * 「在长大」的列表：DP 表边算边填（0338 的 `bits`、0494 的 `f`）。
   *
   * 它们不能当主数组 —— 长度每帧都在变，拿「首个数组帧的长度」当 n
   * 会得到 1（0338 的 `bits` 只有一个元素被算出来过），
   * 于是 `values.length < 2` 把整题拒掉。但它们恰恰是这题的主角，
   * 所以当 aux 行渲染，见 auxVars。
   */
  const grows = new Map<string, number>();
  /** 名字 -> 出现过的长度集合。集合大小 1 = 长度稳定 */
  const lensPerVar = new Map<string, Set<number>>();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (isNodeMark(v) || name.startsWith('.')) {
        continue;
      }
      if (!Array.isArray(v)) {
        continue;
      }
      if (v.length >= 2 && v.length <= MAX_LEN && v.every(isCellValue)) {
        score.set(name, (score.get(name) ?? 0) + 1);
        grows.set(name, Math.max(grows.get(name) ?? 0, v.length));
        let s = lensPerVar.get(name);
        if (!s) {
          s = new Set<number>();
          lensPerVar.set(name, s);
        }
        s.add(v.length);
      }
    }
  }
  const params = new Set(paramNames ?? []);

  /**
   * **光标指到哪张表，哪张表就是主画面。**
   *
   * 这是本 adapter 最关键的一条不变式，也是 0494 目标和的由来。
   *
   * 0494 的局部变量是 `nums`（输入，5 格不变）、`f`（背包表，2 格但每帧被改）
   * `x`（外层循环元素）、`c`（内层倒序下标）。按「入参优先」挑主数组会选中
   * `nums`，而 `nums` 在整个过程里**一个格子都没变过** —— 画面是一排不动的 1，
   * 读者什么也学不到。而真正在动的是 `f[c] += f[c - x]`：源码里
   * `f` 被 `c` 下标访问，光标也在 `c` 上，所以主画面应该是 `f`，
   * 光标标在「正在被更新的那一格」上。
   *
   * 这正是 0-1 背包最该讲的一件事：**内层为什么必须倒序** ——
   * 看到 c 从 m 一路退到 x、而 f[x] 不被重复用，规则自己就显出来了。
   *
   * 0338 比特位计数走的是同一条路（`bits[i] = bits[i-1] + ...`），
   * 而且它的 `bits` 是边算边长的，`n` 取最大值、短的帧补空格。
   */
  let arrayVar: string | undefined;
  let cursorVar: string | undefined;

  const candidates = [...grows.keys()].filter(
    (name) => (grows.get(name) ?? 0) >= 2,
  );
  /** 长度稳定的优先（普通输入数组），其次入参，再次出现格数多的 */
  const rank = (name: string) =>
    ((lensPerVar.get(name)?.size ?? 1) === 1 ? 1000 : 0) +
    (params.has(name) ? 500 : 0) +
    (grows.get(name) ?? 0);

  for (const listName of candidates) {
    const len = grows.get(listName)!;
    const a = listName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const e of events) {
      for (const [name, v] of Object.entries(e.locals)) {
        if (
          name === listName ||
          name.startsWith('.') ||
          typeof v !== 'number' ||
          !Number.isInteger(v) ||
          v < 0 ||
          v >= len
        ) {
          continue;
        }
        const subscripts = new RegExp(`\\b${a}\\s*\\[\\s*${name}\\b`).test(code);
        const enumerated = new RegExp(
          `for\\s+${name}\\s*,[\\w\\s,]*\\bin\\s+enumerate\\s*\\(\\s*${a}\\b`,
        ).test(code);
        if (subscripts || enumerated) {
          arrayVar = listName;
          cursorVar = name;
          break;
        }
      }
      if (cursorVar) {
        break;
      }
    }
    if (cursorVar) {
      break;
    }
  }

  if (!arrayVar && candidates.length > 0) {
    /**
     * 没有源码证据时的挑法：**稳定的在前、都稳定或都不稳定时短的在前**。
     *
     * HJ150 全排列有两个都在长大的列表：`path`（当前拼到哪，3 格）
     * 与 `res`（已凑出的排列，6 格）。长的那个当主画面的话，
     * 第一帧是六个空格 —— 读者看到一片空白，直到最后一格突然出现。
     * 而「回溯到第几层、已经选了什么」才是这题的内容，所以短的当主画面。
     */
    arrayVar = [...candidates].sort((x, y) => {
      const sx = (lensPerVar.get(x)?.size ?? 1) === 1 ? 1 : 0;
      const sy = (lensPerVar.get(y)?.size ?? 1) === 1 ? 1 : 0;
      if (sx !== sy) {
        return sy - sx;
      }
      const gx = grows.get(x) ?? 0;
      const gy = grows.get(y) ?? 0;
      if (gx !== gy) {
        return gx - gy;
      }
      return rank(y) - rank(x);
    })[0];
  }

  /**
   * 没有数组时按整数入参合成一条格子条。
   *
   * 0070 爬楼梯的入参就是 `n = 2`，代码里只有 `f0` / `f1` 两个滚动变量，
   * 没有任何数组 —— 但「爬到第 n 阶」天然就是一条 n 格的进度条，
   * 而状态转移（f(n) = f(n-1) + f(n-2)）正是这题的全部教学内容。
   *
   * 合成的前提是这个整数**在整段轨迹里保持不变**：它若是循环计数器
   * （`for i in range(n)` 里的 i）就会一路增长，那不是「规模」而是「位置」，
   * 合成出来的格子条会越缩越短，没有意义。
   */
  let synthVar: string | undefined;
  /**
   * 「逐位消费」的整数入参（0007 整数反转）。
   *
   * 判据：**一路变小**的整数入参，且位数为 2~MAX_LEN。
   *
   * 为什么必须是入参：`x` 是这道题**唯一**的数据，局部变量里从头到尾
   * 只有它一个在缩小（res 在变大、digit 每帧重算）。而位数为 1 的整数
   * 没有「一位一位被吃掉」这回事，2 位起步才有画面。
   */
  let digitVar: string | undefined;
  if (!arrayVar) {
    for (const name of params) {
      const vals = events
        .map((e) => e.locals[name])
        .filter((v): v is number => typeof v === 'number' && Number.isInteger(v));
      if (vals.length < 3) {
        continue;
      }
      const digits = String(Math.abs(vals[0])).length;
      if (vals[0] <= 0 || digits < 2 || digits > MAX_LEN) {
        continue;
      }
      // 一路变小（含相等）：每位被吃掉之后 x 变短
      if (vals.some((v, i) => i > 0 && v > vals[i - 1])) {
        continue;
      }
      digitVar = name;
      break;
    }
    for (const name of params) {
      if (digitVar) {
        break;
      }
      const vals = events
        .map((e) => e.locals[name])
        .filter((v): v is number => typeof v === 'number' && Number.isInteger(v));
      if (vals.length === 0) {
        continue;
      }
      const uniq = [...new Set(vals)];
      if (uniq.length !== 1) {
        continue;
      }
      const size = uniq[0];
      // 下限 2：1 格画不出「前两项」这种关系；上限 MAX_LEN：画面放不下
      if (size >= 2 && size <= MAX_LEN) {
        synthVar = name;
        break;
      }
    }
    if (!synthVar && !digitVar) {
      return null;
    }
  }

  const n = arrayVar
    ? (grows.get(arrayVar) ?? 0)
    : digitVar
      ? String(
          Math.abs(
            events.find((e) => typeof e.locals[digitVar!] === 'number')
              ?.locals[digitVar!] as number,
          ),
        ).length
      : (events.find((e) => typeof e.locals[synthVar!] === 'number')
          ?.locals[synthVar!] as number);

  /**
   * 源码里找不到下标证据时的兜底：**在范围内、动得最多的整数**。
   *
   * 「逐位消费」模式下不走这里：那个整数就是光标本身。
   * 让兜底先挑一遍会把 `digit` 选成光标（它在 [0, 位数) 里动得最勤），
   * 于是画面高亮的是「刚取出来的那一位」而不是「还剩几位没取」——
   * 0007 整数反转实测指针一直停在 digit=1，21 帧画面一动不动。
   *
   * HJ150 全排列的 `path.append(x)` 是回溯，没有 `path[x]` 这样的下标，
   * 但 `x`（当前正在试的那个数）正是该高亮的东西。
   * 0279 完全平方数的 `for i in reversed(range(1, n+1))` 同理 ——
   * i 从 isqrt(n) 一路降到 1，**倒退**正是这题的关键（平方数从大到小枚举
   * 才不用回头重算），没有光标的话读者完全看不出这个方向。
   *
   * 排在源码证据**之后**是关键：0070 爬楼梯踩过「取值落在 [0, n)」
   * 就把 DP 状态量 `f1` 当成了下标（它取过 1 和 2，数组长度正好是 2），
   * 于是 f1 被排除出状态量、整题不画。有源码证据时绝不能走这条路。
   */
  if (!cursorVar && !digitVar) {
    /**
     * 光标必须走一段**连续的整数**。
     *
     * 0198 打家劫舍的代码是 `for num in nums:` —— 没有下标变量，
     * 只有元素值 `num`。它的取值是 2, 7, 9, 3, 1，全都在 [0, 5) 里，
     * 于是「取值落在数组范围内」把 `num` 选成了光标，画面上把
     * `num=2` 标在**第 2 格**（那一格是 9）—— 一个纯属巧合的高亮，
     * 读者会以为「现在处理的是第 2 个元素」。
     *
     * 真正的下标会**逐格走完**：0279 的 i 从 isqrt(n) 降到 1、
     * HJ150 的 x 从 1 走到 n，取值集合是一段连续整数。
     * 「distinct 个值恰好铺满 [min, max]」这条判据把两类分得干干净净，
     * 而且它不需要看源码 —— 合成格子条与回溯题里本来就没有下标可看。
     */
    const moves = new Map<string, Set<number>>();
    /** 越界过一次就整个否掉 —— 见下面 0279 那段 */
    const outOfRange = new Set<string>();
    for (const e of events) {
      for (const [name, v] of Object.entries(e.locals)) {
        if (
          name === synthVar ||
          name === arrayVar ||
          name.startsWith('.') ||
          // `_` 开头的按 Python 惯例就是「这个我不用」，拿它当光标
          // 画出来是一个没人看得懂的标签（sf_tiling 铺砖实测指针写着 `_`）
          name.startsWith('_') ||
          // 名字像 DP 状态的一律不当光标：0070 爬楼梯踩过这个 ——
          // `f1` 取过 1 和 2 而格子条正好 3 格，于是 f1 被当成推进下标，
          // 结果它被排除出 dpVars（那才是这题的主角），画面上只剩
          // 一个没有意义的「f1 指向第 1 格」。
          DP_NAME_RE.test(name) ||
          typeof v !== 'number' ||
          !Number.isInteger(v)
        ) {
          continue;
        }
        // 越界：0279 的 `for j in range(i*i, n+1, j)` 里 j 会取到 n，
        // 而格子条只有 0..n-1。只把越界的**那几帧**丢掉的话，
        // 前 8 帧指针全落在格子条外面 —— 要么空指针要么满屏高亮，
        // 而读者看到的是一个指不到任何东西的箭头。
        if (v < 0 || v >= n) {
          outOfRange.add(name);
          continue;
        }
        let s = moves.get(name);
        if (!s) {
          s = new Set<number>();
          moves.set(name, s);
        }
        s.add(v);
      }
    }
    /** 连续整数：distinct 个值恰好铺满 [min, max] */
    const contiguous = (s: Set<number>): boolean => {
      const vs = [...s];
      return Math.max(...vs) - Math.min(...vs) + 1 === vs.length;
    };
    let best = 1;
    for (const [name, s] of moves) {
      if (outOfRange.has(name) || !contiguous(s)) {
        continue;
      }
      if (s.size > best) {
        best = s.size;
      }
    }
    /**
     * 成对的行列变量一起否掉。
     *
     * sf_tiling 铺砖的局部变量是 `r` / `c` / `out`：r 是行数、c 是列数，
     * 两者都取 1~2 的连续整数，于是 r 被选成光标标在 `out` 的第 2 格 ——
     * 而 `out` 是**输出字符串**的列表，`out[r]` 这种下标压根不存在。
     *
     * 判据是命名成对：`(r, c)` / `(i, j)` / `(x, y)` / `(row, col)`。
     * 一对里两个都是候选就说明它们是坐标而不是下标 ——
     * 真下标不会成对出现（0015 三数之和的 i/j/left/right 是四个不同的下标）。
     */
    const PAIR = [
      ['r', 'c'],
      ['i', 'j'],
      ['x', 'y'],
      ['row', 'col'],
      ['rowi', 'colj'],
    ];
    const paired = new Set<string>();
    for (const [a, b] of PAIR) {
      if (moves.has(a) && moves.has(b)) {
        paired.add(a);
        paired.add(b);
      }
    }
    for (const [name, s] of moves) {
      if (
        s.size === best &&
        best >= 2 &&
        contiguous(s) &&
        !outOfRange.has(name) &&
        !paired.has(name)
      ) {
        cursorVar = name;
        break;
      }
    }
  }
  // 「逐位消费」模式下，光标就是那个正在被吃掉的整数本身
  if (!cursorVar && digitVar) {
    cursorVar = digitVar;
  }

  /** 除了主数组之外、也值得画一行的列表 */
  const auxVars = candidates
    .filter((name) => name !== arrayVar)
    .sort((x, y) => rank(y) - rank(x))
    .slice(0, 2);

  // 3. 滚动标量：名字像 DP 状态的整数
  const dpVars: string[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      if (
        name === arrayVar ||
        name === cursorVar ||
        auxVars.includes(name) ||
        name.startsWith('.') ||
        typeof v !== 'number' ||
        !Number.isFinite(v) ||
        DP_NAME_RE.test(name) === false
      ) {
        continue;
      }
      if (!seen.has(name)) {
        seen.add(name);
        dpVars.push(name);
      }
    }
    if (dpVars.length >= 3) {
      break;
    }
  }
  /**
   * 名字认不出来就退化成「任何在动的整数」。
   *
   * 0279 完全平方数是 `for i in reversed(range(1, n+1)): for j in range(i*i, n+1, i*i)`
   * —— 没有一个变量叫 f/dp/cnt，但 `i` 与 `j` 就是这题的两个状态
   * （i 是当前平方数，j 是它覆盖到的位置）。按名字挑会全被丢掉。
   */
  if (dpVars.length === 0) {
    const varies = new Map<string, Set<number>>();
    for (const e of events) {
      for (const [name, v] of Object.entries(e.locals)) {
        if (
          name === arrayVar ||
          name === cursorVar ||
          auxVars.includes(name) ||
          name.startsWith('.') ||
          name === synthVar ||
          typeof v !== 'number' ||
          !Number.isFinite(v)
        ) {
          continue;
        }
        let s = varies.get(name);
        if (!s) {
          s = new Set<number>();
          varies.set(name, s);
        }
        s.add(v);
      }
    }
    for (const [name, s] of varies) {
      if (s.size > 1) {
        dpVars.push(name);
      }
      if (dpVars.length >= 3) {
        break;
      }
    }
  }
  /**
   * 一个在动的标量都没有，**也别急着放弃** —— 0494 目标和就是这样：
   * `m = 1` 的样例里内层下标 `c` 恒为 1、外层元素 `x` 恒为 1，
   * 唯一在变的是背包表 `f` 自己的格子（`[1,0]` -> `[1,1]` -> … -> `[1,5]`）。
   *
   * 那正是这题要讲的东西：每一次 `f[c] += f[c-x]` 都让 f 的一格涨 1。
   * 所以这里退化成「取任意整数当状态量（拿来做计数器面板的常驻上下文）」，
   * 真正的推进信号交给主数组的内容变化去判断。
   */
  if (dpVars.length === 0) {
    for (const e of events) {
      for (const [name, v] of Object.entries(e.locals)) {
        if (
          name === arrayVar ||
          name === synthVar ||
          name === cursorVar ||
          auxVars.includes(name) ||
          name.startsWith('.') ||
          typeof v !== 'number' ||
          !Number.isFinite(v) ||
          seen.has(name)
        ) {
          continue;
        }
        seen.add(name);
        dpVars.push(name);
      }
      if (dpVars.length >= 3) {
        break;
      }
    }
  }
  if (dpVars.length === 0) {
    return null;
  }

  const seq = arrayVar
    ? events.map((e) => e.locals[arrayVar]).find((v): v is Json[] => Array.isArray(v))
    : undefined;
  if (arrayVar && !seq) {
    return null;
  }
  return {
    arrayVar,
    /** 主数组在这一题里的**最长**样子；短的那些帧由帧循环补空格 */
    values: arrayVar
      ? (Array.from({length: n}, (_, i) => (seq as Json[])[i] ?? '') as CellValueLike[])
      : digitVar
        ? // 逐位消费：主格子条就是那个整数的各位数字
          ([...(events.find((e) => typeof e.locals[digitVar!] === 'number')?.locals[
            digitVar
          ] as number)
            .toString()
            .slice(0, MAX_LEN)] as CellValueLike[])
        : Array.from({length: n}, (_, i) => i as CellValueLike),
    synthVar,
    digitVar,
    cursorVar,
    dpVars: dpVars.slice(0, 3),
    auxVars,
  };
}

export function adaptDpCounter(trace: RawTrace): AdapterResult | null {
  const pick = pickShapes(trace.events, trace.paramNames, trace.code);
  if (!pick || pick.values.length < 2) {
    return null;
  }
  const n = pick.values.length;
  const b = new TraceBuilder();

  // 记录每个标量**上一帧**的值，用来判断「这一步更新了谁」。
  // 没有这个就不知道该在 note 里说什么 —— DP 的每一步都在改状态。
  const prevDp: Record<string, number | undefined> = {};
  let declared = false;
  /** 「状态量有没有在动」。决定要不要按内容去重帧 */
  const dpVaries = pick.dpVars.some((k) => {
    const vals = new Set(
      trace.events
        .map((e) => e.locals[k])
        .filter((v): v is number => typeof v === 'number'),
    );
    return vals.size > 1;
  });
  let lastContent = '';
  let contentChanged = false;

  for (const e of trace.events) {
    /**
     * 有真实数组时它每帧都得在（原地修改的题会改内容）；
     * 合成格子条时内容恒定，只要长度对得上就行。
     */
    let cur: Array<CellValueLike>;
    if (pick.arrayVar) {
      const raw = e.locals[pick.arrayVar];
      if (!Array.isArray(raw) || raw.length > n) {
        continue;
      }
      /**
       * 「在长大」的数组每帧长度不同，短了就补空格（`''`）。
       *
       * 空格是**有意的**：0338 比特位计数的 `bits` 一开始只有一格，
       * 第二格补出来的空格就是「这一位还没算」—— 与其把画面缩回去
       * 让读者以为题目变了，不如固定长度 + 空格子。
       */
      cur = [
        ...(raw as CellValueLike[]),
        ...new Array(n - raw.length).fill('' as CellValueLike),
      ];
    } else {
      cur = pick.values;
    }
    const dpNow: Record<string, number> = {};
    for (const k of pick.dpVars) {
      const v = e.locals[k];
      if (typeof v === 'number' && Number.isFinite(v)) {
        dpNow[k] = v;
      }
    }
    if (Object.keys(dpNow).length === 0) {
      continue;
    }

    const states: CellState[] = new Array(n).fill('idle');
    const cursorVal =
      pick.cursorVar !== undefined ? e.locals[pick.cursorVar] : undefined;
    /**
     * 「逐位消费」模式下光标位置是**推出来的**：整数还剩几位。
     *
     * 0007 整数反转的 x 是 123 -> 12 -> 1 -> 0，直接拿 x 当下标会算出
     * 123（越界，画面上根本没有那一格）。而「还剩几位」正是这一帧
     * 真正要讲的事 —— 左边暗掉了几位，右边就长出来几位。
     */
    const ci =
      typeof cursorVal === 'number'
        ? pick.digitVar
          ? String(Math.abs(cursorVal)).length
          : cursorVal
        : undefined;
    if (ci !== undefined && ci >= 0 && ci <= n) {
      if (ci < n) {
        states[ci] = 'active';
      }
      // 推进到哪了：光标之前的算完了
      for (let i = 0; i < ci; i++) {
        states[i] = 'done';
      }
      if (pick.digitVar) {
        // 逐位消费反过来：**右边**（已经吃掉的位）才是 done
        for (let i = 0; i < n; i++) {
          states[i] = i < ci ? 'idle' : 'done';
        }
      }
    }

    if (!declared) {
      b.push({
        note: pick.arrayVar
          ? `${pick.arrayVar}（最长 ${n} 格，空格 = 还没算到），状态量：${pick.dpVars.join(' / ')}`
          : pick.digitVar
            ? `${pick.digitVar} 的各位（高亮 = 还没被取走的那一位），状态量：${pick.dpVars.join(' / ')}`
            : `${pick.synthVar} = ${n}（没有数组，按规模画成 ${n} 格），状态量：${pick.dpVars.join(' / ')}`,
        array: [...pick.values],
      });
      declared = true;
    }

    const changed = pick.dpVars.filter(
      (k) => dpNow[k] !== undefined && dpNow[k] !== prevDp[k],
    );
    const src = (trace.code.split('\n')[e.line - 1] ?? '').replace(/#.*$/, '').trim();
    const changedText =
      changed.length > 0
        ? changed.map((k) => `${k}=${dpNow[k]}`).join('，')
        : Object.entries(dpNow)
            .map(([k, v]) => `${k}=${v}`)
            .join('，');

    /**
     * 「在长大」的 DP 表当 aux 行：0338 比特位计数里 `bits` 是
     * `[0]` -> `[0, 1]`，0494 目标和里 `f` 是 `[1]` -> `[1, 0]` -> …
     *
     * 只画主数组的话，这些表一个都看不见 —— 而「表怎么一格一格被填上」
     * 才是这两题唯一值得看的东西。
     */
    const auxRows: AuxArray[] = [];
    for (const name of pick.auxVars) {
      const list = e.locals[name];
      if (!Array.isArray(list)) {
        continue;
      }
      const vals = list as CellValueLike[];
      const states: CellState[] = vals.map((_, i) =>
        i === vals.length - 1 ? 'active' : 'done',
      );
      auxRows.push({label: name, values: vals, states});
    }
    const grewNote =
      auxRows.length > 0
        ? `，${auxRows.map((r) => `${r.label} 已有 ${r.values.length} 格`).join('；')}`
        : '';

    /**
     * 「这一步有没有推进」：状态量、被更新的格子、光标、aux 任一变了才算。
     *
     * 每一行源码都会产生一个事件帧，而一行里往往有好几个不改变画面的
     * 语句。0007 整数反转实测 21 个事件只对应 4 张不同的画面 ——
     * 全记下来的话读者会以为播放器卡住了。
     *
     * 留下的是**每段静止期的第一帧**，note 里写的是「画面变成这样的那一刻
     * 正在执行哪一行」，比写这段静止期最后一行更贴切。
     */
    const contentKey = `${(cur as CellValueLike[]).join(',')}|${auxRows
      .map((r) => r.values.join(','))
      .join('|')}|${ci ?? ''}|${JSON.stringify(dpNow)}`;
    if (b.frames.length > 1 && contentKey === lastContent) {
      continue;
    }
    lastContent = contentKey;
    contentChanged = true;

    b.push({
      note: `${changedText || '(状态未变)'}${grewNote}：${src || `第 ${e.line} 行`}`,
      array: cur as CellValueLike[],
      states,
      counters: dpNow,
      pointers: ci !== undefined && pick.cursorVar ? {[pick.cursorVar]: ci} : undefined,
      aux: auxRows.length > 0 ? auxRows : undefined,
      line: e.line,
    });
    for (const k of pick.dpVars) {
      prevDp[k] = dpNow[k];
    }
    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  // 状态量从头到尾没变过 = 这题不是 DP，别硬画
  /**
   * 「没有状态量在动」的题里，**表自己在动**也算数（见 pickShapes 末尾
   * 那段注释）：0494 的背包表 f 一格一格涨，那正是要讲的东西。
   * 两者都不动才是真的没过程。
   */
  if ((!dpVaries && !contentChanged) || b.frames.length < 3) {
    return null;
  }
  return {frames: b.frames, display: 'boxes'};
}
