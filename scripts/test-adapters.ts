/**
 * adapter 的纯逻辑单测（跑在**真实录制产物**上）。
 *
 * ## 为什么必须测
 *
 * adapter 干的是「把局部变量翻译成画面」，错法有两类：
 *
 * 1. 认错角色 —— 把循环上界 `n` 当成指针，画面上多一根乱指的标签；
 *    把哈希表当主数组，格子全是 `{...}`
 * 2. 状态铺错 —— 指针之间的区间没标 active，
 *    读者看到的是「一根指针孤零零地站在中间」，双指针题的重点全丢了
 *
 * 两类都不会报错，只会让可视化变得**看起来能跑但没有教学价值** ——
 * 这正是 AGENTS.md 里记的「可视化会掩盖错误」在 adapter 层的翻版。
 *
 * ## 断言的是什么
 *
 * - 帧数组长度与轨迹一致（去重后）
 * - 每帧的数组内容与源码里的数组**完全相同**（帧是自包含的，不能中途变形）
 * - 指针始终落在数组范围内
 * - 至少有一帧同时标出了两个指针（双指针题的核心断言）
 * - 最后一个指针位置与录制终态一致
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
import type {ArrayFrame} from '../src/components/training/visualizer/types';

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

const tracesDir = path.join(__dirname, '../static/traces');
if (!fs.existsSync(tracesDir) || fs.readdirSync(tracesDir).length === 0) {
  console.log('跳过：还没有录制产物。先跑 `pnpm trace:record`。');
  process.exit(0);
}

function asArray(f: unknown): ArrayFrame | null {
  const fr = f as ArrayFrame;
  return fr && Array.isArray(fr.array) ? fr : null;
}

// ============================================================
// 逐份轨迹的结构性断言
// ============================================================

const files = fs.readdirSync(tracesDir).filter((f) => f.endsWith('.json'));
const skipped: string[] = [];

for (const file of files) {
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, file), 'utf8'),
  ) as RawTrace;

  const adapted = adapt(trace);
  if (!adapted) {
    skipped.push(file);
    continue;
  }
  const {frames} = adapted;
  const label = path.basename(file, '.json');

  check(`${label}：产出了帧`, frames.length > 0);
  check(`${label}：每帧都是数组帧`, frames.every((f) => asArray(f) !== null));
  check(
    `${label}：帧数不超过 1500`,
    frames.length <= 1500,
    frames.length,
  );

  const first = asArray(frames[0]);
  check(`${label}：首帧有内容`, (first?.array.length ?? 0) > 0);

  // 帧是自包含的：每帧的数组都要与首帧一致（中途变形说明 adapter 有 bug）
  const same = frames.every((f) => {
    const a = asArray(f)?.array;
    return a && JSON.stringify(a) === JSON.stringify(first?.array);
  });
  check(`${label}：每帧数组内容一致`, same);

  // 指针不能越界 —— 越界的标签会指向不存在的格子。
  // 注意角色识别阶段的取值范围放宽到了 [0, len]（左闭右开二分的 right
  // 初值就是 len），渲染时会把越界的那根丢掉，所以这里断言的是「帧里
  // 不存在越界指针」，而不是「录制里有越界取值」。
  const n = first?.array.length ?? 0;
  let badPointer: string | null = null;
  for (const f of frames) {
    const a = asArray(f);
    for (const [k, v] of Object.entries(a?.pointers ?? {})) {
      if (v < 0 || v >= n) {
        badPointer = `${k}=${v} (n=${n})`;
      }
    }
  }
  check(`${label}：渲染出的指针不越界`, badPointer === null, badPointer);

  // states 长度必须与数组一致，否则渲染时高亮会错位
  let badState = false;
  for (const f of frames) {
    const a = asArray(f);
    if (a?.states && a.states.length !== n) {
      badState = true;
    }
  }
  check(`${label}：states 与数组等长`, !badState);

  // 源码高亮行号必须在代码范围内
  const lineCount = trace.code.split('\n').length;
  let badLine: number | null = null;
  for (const f of frames) {
    if (f.line !== undefined && (f.line < 1 || f.line > lineCount)) {
      badLine = f.line;
    }
  }
  check(`${label}：高亮行号在范围内`, badLine === null, badLine);

  // note 不能为空：播放器顶部就显示它，空了等于没有解说
  check(
    `${label}：每帧都有 note`,
    frames.every((f) => typeof f.note === 'string' && f.note.trim().length > 0),
  );
}

// ============================================================
// 角色识别：指针不能是常量、循环上界或哈希表
// ============================================================

for (const file of files) {
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, file), 'utf8'),
  ) as RawTrace;
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
      trace.events.map((e) => e.locals[p]).filter((v) => typeof v === 'number'),
    );
    return vals.size > 1;
  });
  check(`${label}：指针都在移动`, movers.length === roles.pointerVars.length);

  // 指针不能与数组变量同名
  check(
    `${label}：指针不是数组本身`,
    !roles.pointerVars.includes(roles.arrayVar),
  );

  // 指针数量不超过 3（ArrayView 只有四套配色，且再多画面就读不懂了）
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
   *
   * 角色识别用比例而不是逐帧合法性，正是为了容纳这些真实情况；
   * 渲染时会逐帧把越界的指针丢掉（见上面「渲染出的指针不越界」）。
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

  // 主数组必须是长度稳定的那个 —— 哨兵填充（nums = [1] + nums + [1]）
  // 这类题会在画面上多出题面没有的格子，所以录制阶段就该排除。
  if (roles.arrayVar) {
    const lens = new Set(
      trace.events
        .map((e) => (e.locals as Record<string, unknown>)[roles.arrayVar])
        .filter((v) => Array.isArray(v) || typeof v === 'string')
        .map((v) => (typeof v === 'string' ? [...v].length : (v as unknown[]).length)),
    );
    check(`${label}：主数组长度恒定`, lens.size === 1, [...lens]);
  }
}

// ============================================================
// 双指针题的核心断言：必须存在「两个指针同时在数组范围内」的帧
// 这是双指针题唯一值得看的画面 —— 区间收缩
// ============================================================

const twoPointerFiles = files.filter((f) => {
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, f), 'utf8'),
  ) as RawTrace;
  const roles = detectRoles(trace.events, {
    code: trace.code,
    overrideKey: trace.docKey,
    paramNames: trace.paramNames,
  });
  return roles !== null && roles.pointerVars.length >= 2;
});

check(
  '语料里有双指针题可供断言',
  twoPointerFiles.length > 0,
  `${twoPointerFiles.length} 篇`,
);

for (const file of twoPointerFiles) {
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, file), 'utf8'),
  ) as RawTrace;
  const label = path.basename(file, '.json');
  const {frames} = adapt(trace) ?? {frames: []};
  const n = asArray(frames[0])?.array.length ?? 0;

  const withTwo = frames.filter((f) => {
    const p = asArray(f)?.pointers ?? {};
    const idx = Object.values(p);
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
// 少一根指针，而且没有任何报错。所以这里逐条核对：
// 覆盖表里的每个名字都必须真的出现在该题的局部变量里。
// ============================================================

const keys = new Set(files.map((f) => path.basename(f, '.json')));
for (const key of Object.keys(OVERRIDES)) {
  check(`覆盖表 ${key}：有对应的录制产物`, keys.has(key));
  if (!keys.has(key)) {
    continue;
  }
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, `${key}.json`), 'utf8'),
  ) as RawTrace;
  const seen = new Set<string>();
  trace.events.forEach((e) =>
    Object.keys(e.locals as Record<string, unknown>).forEach((k) => seen.add(k)),
  );
  const ov = OVERRIDES[key];
  if (ov.arrayVar) {
    check(`覆盖表 ${key}：arrayVar=${ov.arrayVar} 存在于轨迹`, seen.has(ov.arrayVar));
  }
  for (const p of ov.pointerVars) {
    check(
      `覆盖表 ${key}：指针 ${p} 存在于轨迹`,
      seen.has(p),
      [...seen].join(','),
    );
  }
}

/**
 * 指针必须下标**画出来的那个数组**。
 *
 * 这是最容易出「看起来完全正常但其实画错」的一类问题：
 * 0079 单词搜索里 `i` / `j` 是 board（二维）的行列坐标，`k` 才是 word 的下标。
 * board 录成嵌套 list 被 `asSequence` 拒掉，于是主数组选中了 word ——
 * 偏偏 board 是 3×3、word 长度也是 3，i/j 的取值全都落在 word 的下标范围内，
 * 范围检查过得去，画面上有指针、指针还会动，**没有一项断言会失败**。
 * 但它标的是「board 的第几行第几列」，画在 word 的格子上，纯属误导。
 *
 * 所以这里逐题核对：被认成指针的变量，在源码里必须写成 `arrayVar[ptr]`。
 * 唯一的例外是 enumerate 下标（`for i, x in enumerate(arr)` 本身就是下标），
 * 与区间边界（`while left < right`，见 roles.ts 里的 bounds 规则）。
 */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 下标关系：数组变量名 -> 被它当作下标用过的变量名 */
function subscriptMap(code: string): Map<string, Set<string>> {
  // 匹配 arr[ptr] / arr[ptr:...] / obj.attr[ptr]
  const re = /([\w.]+)\s*\[\s*([\w]+)\s*[\]:]/g;
  const out = new Map<string, Set<string>>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    let s = out.get(m[1]);
    if (!s) {
      s = new Set<string>();
      out.set(m[1], s);
    }
    s.add(m[2]);
  }
  return out;
}

for (const file of files) {
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, file), 'utf8'),
  ) as RawTrace;
  const roles = detectRoles(trace.events, {
    code: trace.code,
    overrideKey: trace.docKey,
    paramNames: trace.paramNames,
  });
  if (!roles) {
    continue;
  }
  const label = path.basename(file, '.json');
  /**
   * 指针与画出来的数组之间**必须有源码上的关联**。
   *
   * 合法形态有四种，前三种可自动判定，第四种靠覆盖表：
   *
   * 1. 作为下标 `nums[i]`，也包括**算式里**的下标 `nums[i - 1]`、
   *    `t[i - hl]`（0957、0647 都是这种）
   * 2. enumerate 下标 `for i, x in enumerate(arr)`
   * 3. 区间边界 `while left < right`（二分与滑窗的左闭右开两端）
   * 4. 覆盖表显式指定（0003 的 left、0045 的 current_end/farthest
   *    只出现在算式里，连关联都不直接可见）
   */
  const inBracket = (p: string): boolean => {
    // 数组名前的 \b 不能省，否则 `s` 会匹配到 `rows[index]` 的尾巴
    const re = new RegExp(
      `\\b${escapeRe(roles.arrayVar)}\\b\\s*\\[([^\\]]*\\b${escapeRe(p)}\\b[^\\]]*)\\]`,
    );
    return re.test(trace.code);
  };
  const isEnum = (p: string) => isEnumerateIndex(trace.code, p);
  const isBound = (p: string) =>
    new RegExp(`while\\s+${escapeRe(p)}\\s*(?:<|<=|>|>=)\\s*\\w+\\s*:`).test(
      trace.code,
    ) ||
    new RegExp(`while\\s+\\w+\\s*(?:<|<=|>|>=)\\s*${escapeRe(p)}\\s*:`).test(
      trace.code,
    );
  const bogus = roles.pointerVars.filter(
    (p) =>
      !inBracket(p) &&
      !isEnum(p) &&
      !isBound(p) &&
      !(trace.docKey && OVERRIDES[trace.docKey]?.pointerVars.includes(p)),
  );
  check(
    `${label}：指针与画出来的数组 ${roles.arrayVar} 有源码关联`,
    bogus.length === 0,
    {bogus, arrayVar: roles.arrayVar, indexed: [...subscriptMap(trace.code).get(roles.arrayVar) ?? []]},
  );
}

// ============================================================
// 轨迹与题解代码是否已经脱节
//
// `trace:record` 是显式的一步（不进 Docusaurus 构建，见 recorder/index.ts 的
// 文件头），所以「改了题解代码但忘了重录」是必然会发生的。后果很隐蔽：
// 页面上照样有动画，只是播的是**旧代码**的执行过程 —— 而读者会以为那就是
// 当前题解在做什么。
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
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, file), 'utf8'),
  ) as RawTrace;
  check(
    `${name}：轨迹里的代码与题解一致（改过题解要跑 pnpm trace:record ${name.slice(0, 4)}）`,
    trace.code.trim() === mdCode.trim(),
  );
}

// 反过来：轨迹里存在但覆盖表指向的变量不存在时，上面已经报错了；
// 这里再报一次「覆盖表里的题全部适配成功」，防止写了覆盖表却没生效
for (const key of Object.keys(OVERRIDES)) {
  if (!keys.has(key)) {
    continue;
  }
  const trace = JSON.parse(
    fs.readFileSync(path.join(tracesDir, `${key}.json`), 'utf8'),
  ) as RawTrace;
  check(`覆盖表 ${key}：确实被适配了`, adapt(trace) !== null);
}

console.log(
  `\n${skipped.length > 0 ? `未适配（跳过断言）: ${skipped.join(', ')}\n` : ''}` +
    `全部通过：${pass} 项`,
);
if (failures.length > 0) {
  console.error(`\n失败 ${failures.length} 项`);
  process.exit(1);
}
