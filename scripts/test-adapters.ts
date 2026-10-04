/**
 * adapter 的单测（跑在**真实录制产物**上）。
 *
 * ## 为什么必须测
 *
 * adapter 干的是「把局部变量翻译成画面」，错法有三类：
 *
 * 1. **认错角色** —— 把循环上界 `n` 当成指针、把哈希表当主数组、
 *    把函数对象（录成 `"<function>"`）当成数组
 * 2. **状态铺错** —— 指针之间的区间没标 active，读者看到的是一根指针
 *    孤零零地站在中间，双指针题的重点全丢了
 * 3. **形状不自洽** —— states 比数组长、指针越界、网格的 rows×cols
 *    与格子数对不上
 *
 * 三类都不会让构建报错，只会让可视化**看起来能跑但没有教学价值** ——
 * 这正是 AGENTS.md 里记的「可视化会掩盖错误」在 adapter 层的翻版。
 *
 * ## 断言按 adapter 分派
 *
 * 早先这里只有一套「数组帧」的断言（首帧有内容、每帧数组一致、
 * states 与数组等长）。加上链表/树/网格/栈/DP 之后这套断言大面积报错，
 * 但**报错的是尺子不是代码**：链表题的数组本来每帧都在变
 * （0021 合并两链表就是原地改），树帧的 states 用的是层序坐标、
 * 长度与 `tree.cells` 的物理长度不是一回事。
 *
 * 所以现在按 `adapterId` 分派，每类断言它**自己**该保证的东西 ——
 * 宁可断言少，也不能断言错（错的断言逼着人把代码改成错的）。
 *
 * 跑法：pnpm test:adapters
 * 需要先 pnpm trace:record（产物在 static/traces/）。
 */

import fs from 'fs';
import path from 'path';
import {adapt} from '../src/components/training/visualizer/adapters';
import {
  detectRoles,
  isEnumerateIndex,
  OVERRIDES,
} from '../src/components/training/visualizer/adapters/roles';
import type {RawTrace} from '../src/components/training/visualizer/recorder/types';
import type {
  ArrayFrame,
  CellState,
  Frame,
  GridFrameWrapper,
  TableFrameWrapper,
  TreeFrameWrapper,
} from '../src/components/training/visualizer/types';

let pass = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    const suffix = detail === undefined ? '' : ` → ${JSON.stringify(detail)}`;
    failures.push(`✗ ${name}${suffix}`);
    console.log(`✗ ${name}${suffix}`);
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const tracesDir = path.join(__dirname, '../static/traces');
if (!fs.existsSync(tracesDir) || fs.readdirSync(tracesDir).length === 0) {
  console.log('跳过：还没有录制产物。先跑 `pnpm trace:record`。');
  process.exit(0);
}

const files = fs.readdirSync(tracesDir).filter((f) => f.endsWith('.json'));

function read(file: string): RawTrace {
  return JSON.parse(fs.readFileSync(path.join(tracesDir, file), 'utf8')) as RawTrace;
}

/**
 * Frame 是 union，`array` 与 `tree` 同名，靠有没有 `tree` 字段区分。
 *
 * 手写守卫而不是用 types.ts 里那三个：那边是因为 `?: never` 不会自动收窄，
 * 而这里要的是「这个守卫要接受任意 Frame 并可能返回 null」，
 * 交给调用方分支处理。用 `as` 断言是安全的 —— 调用点都先判了非空。
 */
function asArray(f: Frame): ArrayFrame | null {
  return f.tree === undefined && f.grid === undefined && f.table === undefined
    ? (f as ArrayFrame)
    : null;
}
function asTree(f: Frame): TreeFrameWrapper | null {
  return f.tree !== undefined ? (f as TreeFrameWrapper) : null;
}
function asGrid(f: Frame): GridFrameWrapper | null {
  return f.grid !== undefined ? (f as GridFrameWrapper) : null;
}

// ============================================================
// 逐份轨迹：通用断言 + 按 adapter 分派的专属断言
// ============================================================

const orphans: string[] = [];
const byAdapter = new Map<string, string[]>();

for (const file of files) {
  const trace = read(file);
  const label = path.basename(file, '.json');
  const adapted = adapt(trace);

  if (!adapted) {
    orphans.push(label);
    continue;
  }
  const {frames, adapterId} = adapted;
  const list = byAdapter.get(adapterId) ?? [];
  list.push(label);
  byAdapter.set(adapterId, list);

  // ---------- 所有 adapter 都要满足的 ----------
  check(`${label}：产出了帧`, frames.length > 0);
  check(`${label}：帧数不超过 1500`, frames.length <= 1500, frames.length);
  check(
    `${label}：至少 3 帧`,
    frames.length >= 3,
    frames.length,
  );
  // note 是播放器顶部那一行，空了等于没有解说
  check(
    `${label}：每帧都有 note`,
    frames.every((f) => typeof f.note === 'string' && f.note.trim().length > 0),
  );
  // 高亮行号必须落在题解代码范围内，否则源码面板上没有对应行
  const lineCount = trace.code.split('\n').length;
  const badLine = frames.find(
    (f) => f.line !== undefined && (f.line < 1 || f.line > lineCount),
  );
  check(`${label}：高亮行号在范围内`, badLine === undefined, badLine?.line);

  // ---------- 按 adapter 分派 ----------
  if (adapterId === 'array-scan') {
    const arrays = frames.map(asArray);
    check(`${label}：每帧都是数组帧`, arrays.every((a) => a !== null));
    const n = arrays[0]?.array.length ?? 0;
    check(`${label}：首帧有内容`, n > 0);
    // 帧是自包含的：每帧的数组都要与首帧一致（原地修改题另说 ——
    // 那种题的数组本来就该变，但 roles 会把它判成别的形状）
    check(
      `${label}：每帧数组内容一致`,
      arrays.every((a) => JSON.stringify(a?.array) === JSON.stringify(arrays[0]?.array)),
    );
    check(
      `${label}：states 与数组等长`,
      arrays.every((a) => !a?.states || a.states.length === n),
    );
    const badPointer = frames
      .flatMap((f) => Object.entries(asArray(f)?.pointers ?? {}))
      .find(([, v]) => v < 0 || v >= n);
    check(`${label}：渲染出的指针不越界`, badPointer === undefined, badPointer);
  }

  if (adapterId === 'list') {
    const arrays = frames.map(asArray);
    check(`${label}：每帧都是数组帧`, arrays.every((a) => a !== null));
    check(
      `${label}：链表长度 ≥ 2`,
      arrays.every((a) => (a?.array.length ?? 0) >= 2),
    );
    /**
     * states 长度必须等于**当前帧**的链表长度。
     *
     * 不能拿首帧的长度去比：链表题大多原地修改（0021 合并、0024 交换、
     * 0025 K 组翻转、0328 奇偶重排），长度逐帧变化，
     * 而 adapter 每帧重新取结构并按新长度铺 states。
     */
    check(
      `${label}：states 与当前帧长度等长`,
      arrays.every((a) => !a?.states || a.states.length === a.array.length),
    );
    // 至少有一帧带指针标签 —— 没有指针就是一张静止的链表，没有过程
    const withPointer = frames.filter(
      (f) => Object.keys(asArray(f)?.pointers ?? {}).length > 0,
    );
    check(`${label}：至少有一帧带指针标签`, withPointer.length > 0);
  }

  if (adapterId === 'tree') {
    const trees = frames.map(asTree);
    check(`${label}：每帧都是树帧`, trees.every((t) => t !== null));
    check(
      `${label}：层序数组非空`,
      trees.every((t) => (t?.tree.cells.length ?? 0) > 0),
    );
    /**
     * states 用的是**层序下标**坐标，而录制时给越界节点编的号是
     * 「锚点链坐标 + 追加」，可能超过 `tree.cells` 的长度。
     * 所以这里只断言「落在范围内的部分与数组对齐」，
     * 不能断言 `states.length === cells.length` ——
     * 那样会把正确实现判成错的（实测 0010/0019 全是这样报错的）。
     */
    check(
      `${label}：states 不短于层序数组`,
      trees.every((t) => {
        const st = (t as {states?: CellState[]})?.states;
        return !st || !t || st.length >= t.tree.cells.length;
      }),
    );
    const badCursor = trees.find((t) => {
      const c = t?.tree.cursor;
      return c !== undefined && (c < 0 || c >= t!.tree.cells.length);
    });
    check(`${label}：光标在层序范围内`, badCursor === undefined, badCursor?.tree.cursor);
    // 至少有一帧有光标，否则画面只是一棵静止的树
    check(
      `${label}：至少有一帧有光标`,
      trees.some((t) => t?.tree.cursor !== undefined),
    );
  }

  if (adapterId === 'grid') {
    const grids = frames.map(asGrid);
    check(`${label}：每帧都是网格帧`, grids.every((g) => g !== null));
    check(
      `${label}：rows × cols 与格子数一致`,
      grids.every((g) => !g || g.grid.cells.length === g.grid.rows * g.grid.cols),
    );
    check(
      `${label}：网格不超 14×14`,
      grids.every((g) => !g || (g.grid.rows <= 14 && g.grid.cols <= 14)),
    );
    const badCursor = grids.find((g) => {
      const c = g?.grid.cursor;
      return (
        c !== undefined &&
        (c.length !== 2 || c[0] < 0 || c[0] >= g!.grid.rows || c[1] < 0 || c[1] >= g!.grid.cols)
      );
    });
    check(`${label}：网格光标不越界`, badCursor === undefined, badCursor?.grid.cursor);
  }

  if (adapterId === 'stack') {
    const arrays = frames.map(asArray);
    check(`${label}：每帧都是数组帧`, arrays.every((a) => a !== null));
    /**
     * **不是**「每帧都挂了栈」—— 首帧是「入参」那一帧，栈还没开始动，
     * 挂一个空栈上去只是噪音。断言的是「至少有一帧挂了栈」，
     * 而「栈深有变化」那条才保证它不是空的。
     */
    check(
      `${label}：至少有一帧挂了栈（aux）`,
      frames.some((f) => (asArray(f)?.aux?.length ?? 0) >= 1),
    );
    check(
      `${label}：栈长不超过 32`,
      frames.every((f) => (asArray(f)?.aux ?? []).every((a) => a.values.length <= 32)),
    );
    check(
      `${label}：栈的 states 与栈长等长`,
      frames.every((f) =>
        (asArray(f)?.aux ?? []).every(
          (a) => !a.states || a.states.length === a.values.length,
        ),
      ),
    );
    /**
     * 栈题的核心是「栈自己长大/缩小」，所以栈深必须**真的在变**。
     * 不变的话画面上就是一条静止的列表，adapter 应该识趣地不画。
     */
    const depths = new Set(
      frames.map((f) => (asArray(f)?.aux ?? [])[0]?.values.length ?? 0),
    );
    check(`${label}：栈深有变化`, depths.size >= 2, [...depths]);
  }

  if (adapterId === 'string') {
    const arrays = frames.map(asArray);
    check(`${label}：每帧都是数组帧`, arrays.every((a) => a !== null));
    const n = arrays[0]?.array.length ?? 0;
    check(`${label}：主行是字符串的字符`, n > 0);
    /**
     * 字符串题的「推进」有三种，**至少要真的发生一种**。
     *
     * 只看「主行内容不变」会放过两类假动画：
     * - 光标在主串上移动（HJ21 简单密码逐字符改写）
     * - 中间结果 aux 行在变长（HJ96 表示数字每遇到数字插一个 `*`）
     * - 光标落在 aux 的某一格上（HJ90 合法 IP 四个段依次被校验）
     */
    const pointers = frames.flatMap((f) => Object.values(asArray(f)?.pointers ?? {}));
    check(
      `${label}：光标不越界`,
      pointers.every((v) => v >= 0 && v < n),
      [...new Set(pointers)],
    );
    const auxLens = frames.map(
      (f) => (asArray(f)?.aux ?? []).map((a) => a.values.length).join(','),
    );
    const cursorMoved = new Set(
      frames.flatMap((f) => Object.values(asArray(f)?.pointers ?? {})),
    ).size;
    const auxGrew = new Set(auxLens).size;
    check(
      `${label}：真的有过程（光标移动过或中间结果变过）`,
      cursorMoved >= 2 || auxGrew >= 2,
      {cursorMoved, auxGrew},
    );
    check(
      `${label}：aux 行的 states 与行等长`,
      frames.every((f) =>
        (asArray(f)?.aux ?? []).every(
          (a) => !a.states || a.states.length === a.values.length,
        ),
      ),
    );
  }

  if (adapterId === 'aux-table') {
    const arrays = frames.map(asArray);
    check(`${label}：每帧都是数组帧`, arrays.every((a) => a !== null));
    /**
     * 字典/集合是这类题的主角，所以**必须**真的在变。
     * 静止的字典画出来就是一张表，读者学不到任何东西
     * （0560 前缀和计数这一类题的要点全在「哪个前缀和第一次出现」）。
     */
    const keyCounts = frames.map(
      (f) => (asArray(f)?.aux ?? []).map((a) => a.values.length).join(','),
    );
    check(
      `${label}：字典行数在变`,
      new Set(keyCounts).size >= 2,
      [...new Set(keyCounts)].slice(0, 6),
    );
    check(
      `${label}：aux 行的 states 与行等长`,
      frames.every((f) =>
        (asArray(f)?.aux ?? []).every(
          (a) => !a.states || a.states.length === a.values.length,
        ),
      ),
    );
  }

  if (adapterId === 'dp-counter') {
    const arrays = frames.map(asArray);
    check(`${label}：每帧都是数组帧`, arrays.every((a) => a !== null));
    // 首帧是「入参 + 状态量初值」，之后的帧才有转移过程。
    // 所以是「至少有一帧带状态量」，不是「每帧」。
    check(
      `${label}：至少有一帧带状态量（counters）`,
      frames.some((f) => Object.keys(asArray(f)?.counters ?? {}).length > 0),
    );
    /**
     * DP 的教学点就是状态转移，所以至少一个状态量必须**真的在变**。
     * 全程不变的量说明这题不是 DP，adapter 应该不画。
     */
    const counterNames = new Set(
      frames.flatMap((f) => Object.keys(asArray(f)?.counters ?? {})),
    );
    const varies = [...counterNames].some((k) => {
      const vals = new Set(frames.map((f) => asArray(f)?.counters?.[k]));
      return vals.size > 1;
    });
    check(`${label}：状态量有变化`, varies, [...counterNames]);
    const n = arrays[0]?.array.length ?? 0;
    check(
      `${label}：states 与数组等长`,
      arrays.every((a) => !a?.states || a.states.length === n),
    );
    /**
     * 指针不许越界。合成格子条（0070 爬楼梯、0007 整数反转）上
     * 「还剩几位」是可以等于格子数的（0007 最后一位被取走时 ci = 0，
     * 而 ci 也可能是 n 表示「全被取走」）—— 所以上界是**闭区间**。
     */
    const badPointer = frames
      .flatMap((f) => Object.entries(asArray(f)?.pointers ?? {}))
      .find(([, v]) => v < 0 || v > n);
    check(`${label}：渲染出的指针不越界`, badPointer === undefined, badPointer);
    /**
     * 「在长大」的数组（0338 的 `bits`、HJ150 的 `path`）必须**每帧都在**，
     * 短了用空格补齐。早先 dpCounter 直接 `raw.length !== n` 就跳过该帧，
     * 于是 0338 只剩 10 帧里的一小半，而且 `bits` 只有一格的那几帧被丢掉
     * —— 恰好是「表刚开始被填」的那几帧。
     */
    check(
      `${label}：每帧数组长度一致（短的补空格）`,
      arrays.every((a) => a?.array.length === n),
      [...new Set(arrays.map((a) => a?.array.length))],
    );
  }
}

// ============================================================
// 角色识别：指针不能是常量、循环上界或哈希表
// ============================================================

for (const file of files) {
  const trace = read(file);
  const roles = detectRoles(trace.events, {
    code: trace.code,
    overrideKey: trace.docKey,
    paramNames: trace.paramNames,
  });
  if (!roles) {
    continue;
  }
  const label = path.basename(file, '.json');

  // 指针必须真的动过 —— 不动的下标是常量（n、len）不是指针
  const movers = roles.pointerVars.filter((p) => {
    const vals = new Set(
      trace.events
        .map((e) => (e.locals as Record<string, unknown>)[p])
        .filter((v) => typeof v === 'number'),
    );
    return vals.size > 1;
  });
  check(`${label}：指针都在移动`, movers.length === roles.pointerVars.length);

  check(
    `${label}：指针不是数组本身`,
    !roles.pointerVars.includes(roles.arrayVar),
  );
  check(
    `${label}：指针不超过 3 个`,
    roles.pointerVars.length <= 3,
    roles.pointerVars,
  );

  /**
   * 指针取值应当**绝大多数**落在 [-1, len]。
   *
   * 这里刻意不断言「每一帧都合法」，只断言比例 >= 0.8 —— 与
   * roles.ts 的判据一致。因为真实的下标在个别帧上确实会越界：
   *
   * - 0438 找所有字母异位词：`left = right - k + 1`，窗口没凑满时
   *   left 是负数（代码里正是靠 `if left < 0: continue` 挡掉的）
   * - 0076 最小覆盖子串：`ans_left` 初值 -1（约定俗成的「还没找到」）
   * - 0647 回文子串：`i` 会取到 len（中心在末尾之外的情形）
   * - 0034/0035 二分：`right` 的初值就是 len（左闭右开写法）
   */
  const n = roles.values.length;
  const ratios = roles.pointerVars.map((p) => {
    const vals = trace.events
      .map((e) => (e.locals as Record<string, unknown>)[p])
      .filter((v): v is number => typeof v === 'number' && Number.isInteger(v));
    const ok = vals.filter((v) => v >= -1 && v <= n).length;
    return {p, ratio: vals.length ? ok / vals.length : 0};
  });
  const tooLoose = ratios.filter((r) => r.ratio < 0.8);
  check(
    `${label}：指针取值大部分落在 [-1, ${n}]（≥80%）`,
    tooLoose.length === 0,
    tooLoose,
  );

  /**
   * 主数组必须是长度稳定的那个 —— 哨兵填充（nums = [1] + nums + [1]）
   * 这类题会在画面上多出题面没有的格子，所以录制/识别阶段就该排除。
   */
  if (roles.arrayVar) {
    const lens = new Set(
      trace.events
        .map((e) => (e.locals as Record<string, unknown>)[roles.arrayVar])
        .filter((v) => Array.isArray(v) || typeof v === 'string')
        .map((v) =>
          typeof v === 'string' ? [...v].length : (v as unknown[]).length,
        ),
    );
    check(`${label}：主数组长度恒定`, lens.size === 1, [...lens]);
  }

  /**
   * 指针与画出来的数组之间**必须有源码上的关联**。
   *
   * 这是最容易出「看起来完全正常但其实画错」的一类问题：
   * 0079 单词搜索里 `i` / `j` 是 board（二维）的行列坐标，`k` 才是 word 的下标。
   * board 录成嵌套 list 被拒掉，于是主数组选中了 word ——
   * 偏偏 board 是 3×3、word 长度也是 3，i/j 的取值全都落在 word 的下标范围内，
   * 范围检查过得去、画面上有指针、指针还会动，**没有一项断言会失败**。
   * 但它标的是「board 的第几行第几列」，画在 word 的格子上，纯属误导。
   *
   * 合法的关联四种：数组下标（含算式）、enumerate 下标、区间边界、
   * 覆盖表显式指定。
   */
  const inBracket = (p: string): boolean =>
    new RegExp(
      `\\b${escapeRe(roles.arrayVar)}\\b\\s*\\[([^\\]]*\\b${escapeRe(p)}\\b[^\\]]*)\\]`,
    ).test(trace.code);
  const isBound = (p: string): boolean =>
    new RegExp(`while\\s+${escapeRe(p)}\\s*(?:<|<=|>|>=)\\s*\\w+\\s*:`).test(
      trace.code,
    ) ||
    new RegExp(`while\\s+\\w+\\s*(?:<|<=|>|>=)\\s*${escapeRe(p)}\\s*:`).test(
      trace.code,
    );
  const bogus = roles.pointerVars.filter(
    (p) =>
      !inBracket(p) &&
      !isEnumerateIndex(trace.code, p) &&
      !isBound(p) &&
      !(trace.docKey && OVERRIDES[trace.docKey]?.pointerVars.includes(p)),
  );
  check(
    `${label}：指针与画出来的数组 ${roles.arrayVar} 有源码关联`,
    bogus.length === 0,
    {bogus, arrayVar: roles.arrayVar},
  );
}

// ============================================================
// 双指针题的核心断言：必须存在「两个指针同时在数组范围内」的帧
// 这是双指针题唯一值得看的画面 —— 区间收缩
//
// 判据是**源码里的双指针写法**，不能对所有「碰巧认出两根指针」的题
// 都套这条：0207 课程表是 DFS 染色，`colors` 上挂着 `i`（外层）与 `x`（当前节点），
// 两根都在范围内、也都会移动，但它压根不是双指针算法 ——
// 拿双指针的不变式去要求它是拿错尺子量东西。
//
// 而且 `while a < b` 这个正则**本身也不够**：单指针题写的是
// `while i < n`（0394 解码字符串就是），形式上一样匹配。所以必须
// 两侧都是**已认出的指针**才算数 —— 0394 曾被这条误判成双指针题。
// ============================================================

function looksTwoPointer(code: string, pointers: string[]): boolean {
  const re = /while\s+(\w+)\s*(?:<|<=)\s*(\w+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (pointers.includes(m[1]) && pointers.includes(m[2])) {
      return true;
    }
  }
  // 没有 while 形式时看「两个指针各自只朝一个方向走」
  return pointers.length >= 2 && /\w+\s*\+=\s*1/.test(code) && /\w+\s*-=\s*1/.test(code);
}

const twoPointerFiles = files.filter((f) => {
  const trace = read(f);
  const roles = detectRoles(trace.events, {
    code: trace.code,
    overrideKey: trace.docKey,
    paramNames: trace.paramNames,
  });
  return (
    roles !== null &&
    roles.pointerVars.length >= 2 &&
    looksTwoPointer(trace.code, roles.pointerVars)
  );
});

check('语料里有双指针题可供断言', twoPointerFiles.length > 0, `${twoPointerFiles.length} 篇`);

for (const file of twoPointerFiles) {
  const trace = read(file);
  const label = path.basename(file, '.json');
  const {frames} = adapt(trace) ?? {frames: []};
  const n = asArray(frames[0])?.array.length ?? 0;

  const withTwo = frames.filter((f) => {
    const idx = Object.values(asArray(f)?.pointers ?? {});
    return idx.length >= 2 && idx.every((i) => i >= 0 && i < n);
  });
  check(`${label}：有同时显示两个指针的帧`, withTwo.length > 0);

  // 两个指针之间应当标成 active（候选区间）——
  // 这正是双指针题要让读者看见的东西
  const activeBetween = frames.some((f) => {
    const a = asArray(f);
    const idx = Object.values(a?.pointers ?? {});
    if (idx.length < 2 || !a?.states) {
      return false;
    }
    const lo = Math.min(...idx);
    const hi = Math.max(...idx);
    for (let i = lo; i <= hi; i++) {
      if (a.states[i] !== 'active') {
        return false;
      }
    }
    return true;
  });
  check(`${label}：指针之间标为 active（候选区间）`, activeBetween);
}

// ============================================================
// 覆盖表必须与轨迹一致
//
// 这是 OVERRIDES 的护栏。覆盖表是手写的，题解代码一改（比如把
// `left` 改名成 `l`），覆盖表就会指向一个不存在的变量 —— 画面上
// 少一根指针，而且没有任何报错。所以这里逐条核对。
// ============================================================

const keys = new Set(files.map((f) => path.basename(f, '.json')));
for (const key of Object.keys(OVERRIDES)) {
  check(`覆盖表 ${key}：有对应的录制产物`, keys.has(key));
  if (!keys.has(key)) {
    continue;
  }
  const trace = read(`${key}.json`);
  const seen = new Set<string>();
  trace.events.forEach((e) =>
    Object.keys(e.locals as Record<string, unknown>).forEach((k) => seen.add(k)),
  );
  const ov = OVERRIDES[key];
  if (ov.arrayVar) {
    check(
      `覆盖表 ${key}：arrayVar=${ov.arrayVar} 存在于轨迹`,
      seen.has(ov.arrayVar),
    );
  }
  for (const p of ov.pointerVars) {
    check(
      `覆盖表 ${key}：指针 ${p} 存在于轨迹`,
      seen.has(p),
      [...seen].join(','),
    );
  }
  // 反过来：写了覆盖表就必须真的生效（否则是死配置）
  check(`覆盖表 ${key}：确实被适配了`, adapt(trace) !== null);
}

// ============================================================
// 轨迹与题解代码是否已经脱节
//
// `trace:record` 是显式的一步（不进 Docusaurus 构建），所以
// 「改了题解代码但忘了重录」是必然会发生的。后果很隐蔽：
// 页面上照样有动画，只是播的是**旧代码**的执行过程 —— 而读者会以为
// 那就是当前题解在做什么。
//
// 轨迹里存了录制时的代码原文，这里直接与题解 md 里的 `## 完整代码实现`
// 比对，不一致就报错并给出重录命令。
// ============================================================

const docsRoot = path.join(__dirname, '../code-training/docs');

/** 与 recorder 的 canonCode 同一套规则：必须按小节取，不能全文取首个块 */
function canonCodeOf(md: string): string {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^##\s+完整代码实现\s*$/.test(l.trim()));
  if (start === -1) {
    return '';
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  const m = lines
    .slice(start + 1, end)
    .join('\n')
    .match(/```python\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : '';
}

/** 在 problems/ 下递归找同名 md（轨迹可能在 leetcode/、nowcoder/ 等子目录里） */
function findMd(root: string, name: string): string | null {
  if (!fs.existsSync(root)) {
    return null;
  }
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.name === `${name}.md`) {
        return full;
      }
    }
  }
  return null;
}

for (const file of files) {
  const name = path.basename(file, '.json');
  const mdPath = findMd(path.join(docsRoot, 'problems'), name);
  if (!mdPath) {
    check(`${name}：找不到对应的题解 md`, false);
    continue;
  }
  const mdCode = canonCodeOf(fs.readFileSync(mdPath, 'utf8'));
  if (!mdCode) {
    continue;
  }
  const trace = read(file);
  check(
    `${name}：轨迹里的代码与题解一致（改过题解要跑 pnpm trace:record ${name.slice(0, 4)}）`,
    trace.code.trim() === mdCode.trim(),
  );
}

// ============================================================
// 汇总
// ============================================================

console.log('\n--- 各 adapter 覆盖 ---');
for (const [id, list] of [...byAdapter.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${String(list.length).padStart(4)}  ${id}`);
}
console.log(
  `\n录制成功 ${files.length} 篇，适配 ${files.length - orphans.length} 篇` +
    `（${((files.length - orphans.length) / files.length * 100).toFixed(0)}%）`,
);
if (orphans.length > 0) {
  console.log(`未适配 ${orphans.length} 篇：${orphans.join(', ')}`);
}
console.log(`\n全部通过：${pass} 项`);
if (failures.length > 0) {
  console.error(`\n失败 ${failures.length} 项`);
  process.exit(1);
}

// 类型守卫用得到（避免 noUnusedLocals 把它们当成死代码）
void ({} as CellState);
void ({} as TableFrameWrapper);
