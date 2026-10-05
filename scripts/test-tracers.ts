/**
 * tracer 的纯逻辑单测。
 *
 * ## 为什么必须测
 *
 * tracer 的 `run()` 是「把算法跑一遍并记录状态」。最容易出的两类 bug：
 *
 * 1. 状态记录错了 —— 比如归并排序合并回写时错位，画面上元素会跳来跳去，
 *    但代码不报错，肉眼很难发现
 * 2. 算法本身写错了 —— 可视化反而会**掩盖**它（动画看起来很顺）
 *
 * 所以这里对**最后一帧的数组内容**做断言：它必须等于朴素实现的输出。
 * 等于用一份独立的参考实现反向校验 tracer。
 *
 * 跑法：pnpm test:tracers
 */

import fs from 'fs';
import path from 'path';
import {TRACERS} from '../src/components/training/visualizer/tracers/index';
import {INLINE_TRACER_PLACEMENT} from '../src/components/training/visualizer/inlinePlacement';
import type {
  ArrayFrame,
  Frame,
} from '../src/components/training/visualizer/types';

/** 窄化成数组帧，才能读 pointers */
function asArray(frame: Frame): ArrayFrame {
  return frame as ArrayFrame;
}

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

/**
 * 取最后一帧的数组（数组类 tracer 才有）。
 *
 * 返回 `Array<number | string>`：录制式 adapter 也会产出字符串帧
 * （0003 那类字符滑窗），这里跟着 `ArrayFrame.array` 的类型走。
 */
function lastArray(frames: Frame[]): Array<number | string> | undefined {
  const last = frames[frames.length - 1];
  return last && 'array' in last ? last.array : undefined;
}

function tracer(id: string) {
  const t = TRACERS.find((x) => x.id === id);
  if (!t) {
    throw new Error(`找不到 tracer: ${id}`);
  }
  return t;
}

// ============================================================
// 树：DFS 三种遍历
// ============================================================

const dfsT = tracer('tree-dfs');

interface RefNode {
  val: number;
  left: RefNode | null;
  right: RefNode | null;
}

/** 参考实现：按层序数组建树（与 tracer 无关的第二份实现） */
function refBuild(level: Array<number | null>): RefNode | null {
  if (level.length === 0 || level[0] === null) {
    return null;
  }
  const mk = (v: number | null): RefNode | null =>
    v === null ? null : {val: v, left: null, right: null};
  const nodes = level.map(mk);
  for (let i = 0; i < nodes.length; i++) {
    if (!nodes[i]) {
      continue;
    }
    nodes[i]!.left = nodes[2 * i + 1] ?? null;
    nodes[i]!.right = nodes[2 * i + 2] ?? null;
  }
  return nodes[0];
}

function refDfs(root: RefNode | null, order: 'pre' | 'in' | 'post'): number[] {
  const out: number[] = [];
  const walk = (n: RefNode | null): void => {
    if (!n) {
      return;
    }
    if (order === 'pre') {
      out.push(n.val);
    }
    walk(n.left);
    if (order === 'in') {
      out.push(n.val);
    }
    walk(n.right);
    if (order === 'post') {
      out.push(n.val);
    }
  };
  walk(root);
  return out;
}

/** 从末帧的 note 里把「访问顺序：a → b → c」抠出来 */
function dfsNoteOrder(note: string): string {
  const m = /访问顺序：([0-9 →]*)/.exec(note);
  return (m?.[1] ?? '').trim();
}

for (const tree of [
  [1, 2, 3, 4, 5, null, 7],
  [1, null, 2, 3],
  [5, 3, 8, 1, 4, null, 7],
] as Array<Array<number | null>>) {
  for (const order of ['pre', 'in', 'post'] as const) {
    const frames = dfsT.run({tree, order});
    const last = frames[frames.length - 1];
    const got = dfsNoteOrder(last.note);
    const want = refDfs(refBuild(tree), order).join(' → ');
    check(
      `树 DFS ${order} [${tree.join(',')}] = ${want}`,
      got === want,
      {got, want},
    );
    // 光标必须落在树内：层序下标越界说明树的层数算错了
    const badCursor = frames.some(
      (f) =>
        f.tree !== undefined &&
        f.tree.cursor !== undefined &&
        (f.tree.cursor < 0 || f.tree.cursor >= f.tree.cells.length),
    );
    check(`树 DFS ${order} [${tree.join(',')}] 光标不越界`, !badCursor);
  }
}

// ============================================================
// 回溯：子集
// ============================================================

const bt = tracer('subset-backtrack');

/**
 * 参考实现：位掩码枚举。
 *
 * **按集合比，不按顺序比**：tracer 走的是 DFS（`[] [1] [1,2] [1,2,3] [1,3] [2] …`），
 * 位掩码枚举出来的顺序不一样（`[] [1] [2] [1,2] …`），
 * 但**两个集合完全一样**。子集是无序的，按序比就是在比一个没有意义的东西
 * —— 早先这么写，四组用例全红，而 tracer 一直是对的。
 */
function subsetsRef(nums: number[]): string {
  const out: string[] = [];
  for (let mask = 0; mask < 1 << nums.length; mask++) {
    const picked = nums.filter((_, i) => (mask >> i) & 1);
    out.push(picked.length ? `[${picked.join(',')}]` : '[]');
  }
  return out.sort().join(' ');
}

for (const nums of [[1, 2, 3], [1], [1, 2], [4, 2, 9]]) {
  const frames = bt.run(nums);
  const last = frames[frames.length - 1];
  const got = (/一共 \d+ 个子集：([^\n]*)/.exec(last.note)?.[1] ?? '').split(' ').sort().join(' ');
  const want = subsetsRef(nums);
  check(`回溯子集 [${nums.join(',')}] = ${want}`, got === want, {got, want});
  // 每一次「撤销」之后 path 必须退回上一层，否则会把别的分支带进来
  const undoFrames = frames.filter((f) => f.note.startsWith('撤销'));
  check(
    `回溯子集 [${nums.join(',')}] 撤销次数 = ${2 ** nums.length - 1}`,
    undoFrames.length === 2 ** nums.length - 1,
    undoFrames.length,
  );
}

// ============================================================
// 哈希表：词频统计
// ============================================================

const hc = tracer('hash-count');

/** 参考实现：Map 累加。注意输出的分隔符要跟 tracer 的 note 一致（`×` 而不是 `:`） */
function countRef(items: string[]): string {
  const cnt = new Map<string, number>();
  for (const x of items) {
    cnt.set(x, (cnt.get(x) ?? 0) + 1);
  }
  return [...cnt.entries()].map(([k, v]) => `${k}×${v}`).join('，');
}

for (const items of [
  ['a', 'b', 'a', 'c', 'b', 'a'],
  ['x'],
  ['a', 'b', 'c'],
  ['1', '2', '1', '3', '2', '1', '2'],
]) {
  const frames = hc.run(items);
  const last = frames[frames.length - 1];
  const got = /共 \d+ 个不同的键：([^\n]*)/.exec(last.note)?.[1] ?? '';
  const want = countRef(items);
  check(`词频 [${items.join(',')}] = ${want}`, got === want, {got, want});
  // 每个键出现时都必须有一帧（词典新增键是这一题的教学内容）
  const keys = new Set(items);
  check(
    `词频 [${items.join(',')}] 每个键都出现过一帧`,
    frames.filter((f) => f.note.includes('不在表里')).length === keys.size,
  );
}

// ============================================================
// 链表反转
// ============================================================

const lr = tracer('list-reverse');

for (const nums of [[1, 2, 3, 4, 5], [1, 2], [9, 8, 7, 6]]) {
  const frames = lr.run(nums);
  const last = frames[frames.length - 1];
  const got = /新的头：([0-9 →]*)/.exec(last.note)?.[1] ?? '';
  const want = [...nums].reverse().join(' → ');
  check(`链表反转 [${nums.join(',')}] = ${want}`, got === want, {got, want});
  // 主数组的值不能被改（链表是就地改指针，不是改值）
  const firstFrame = frames[0];
  check(
    `链表反转 [${nums.join(',')}] 主数组保持原样`,
    JSON.stringify(asArray(firstFrame).array) === JSON.stringify(nums),
  );
}

// ============================================================
// 并查集
// ============================================================

const uf = tracer('union-find');

/** 参考实现：朴素的「每个元素一个集合」写法 */
function ufRef(n: number, pairs: Array<[number, number]>): string {
  const groups: number[][] = Array.from({length: n}, (_, i) => [i]);
  const findG = (x: number): number => groups.findIndex((g) => g.includes(x));
  for (const [a, b] of pairs) {
    const ra = findG(a);
    const rb = findG(b);
    if (ra !== rb) {
      groups[ra].push(...groups[rb]);
      groups.splice(rb, 1);
    }
  }
  // 每个元素归到哪个集合（用最小元素当代表，与按大小合并的根未必相同，
  // 所以断言的是「集合的划分」而不是根是谁）
  const sets = new Set(groups.map((g) => g.slice().sort((x, y) => x - y).join(',')));
  return [...sets].sort().join(' | ');
}

function ufSetsOf(note: string, n: number): string {
  const m = /还剩 \d+ 个集合（([^）]*)）/.exec(note);
  if (!m) {
    return '';
  }
  // 末帧的 note 只列了根；这一步改用主数组反推更可靠
  return m[1];
}

for (const [n, pairs] of [
  [6, [[0, 1], [1, 2], [3, 4], [0, 3], [2, 4]]],
  [4, [[0, 1]]],
  [5, [[0, 1], [1, 2], [2, 3], [3, 4]]],
] as Array<[number, Array<[number, number]>]>) {
  const frames = uf.run({n, pairs});
  const last = frames[frames.length - 1];
  const finalParent = asArray(last).array as number[];
  /** 由末帧的 parent 数组反推集合划分 */
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    // 沿 parent 一路往上跳
    let r = i;
    while (parentChain(finalParent, r) !== r) {
      r = parentChain(finalParent, r);
    }
    if (!groups.has(r)) {
      groups.set(r, []);
    }
    groups.get(r)!.push(i);
  }
  const got = [...groups.values()]
    .map((g) => g.sort((x, y) => x - y).join(','))
    .sort()
    .join(' | ');
  const want = ufRef(n, pairs);
  check(`并查集 n=${n} 合并 ${pairs.length} 对 → ${want}`, got === want, {got, want});
  void ufSetsOf(last.note, n);
}

/** parent[i] 就是 i 的父亲 */
function parentChain(parent: number[], i: number): number {
  return parent[i] >= 0 && parent[i] < parent.length ? parent[i] : i;
}

// ============================================================
// 二维 DP 表：最长公共子序列
// ============================================================

const lcsT = tracer('lcs-table');

/** 参考实现：滚动数组的朴素 LCS */
function lcsRef(a: string[], b: string[]): number {
  const prev = new Array<number>(b.length + 1).fill(0);
  for (const x of a) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      cur[j] =
        x === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    for (let j = 0; j <= b.length; j++) {
      prev[j] = cur[j];
    }
  }
  return prev[b.length];
}

for (const [a, b] of [
  ['abcde', 'ace'],
  ['abc', 'abc'],
  ['abc', 'def'],
  ['aggt', 'atgt'],
  ['ab', 'ba'],
] as Array<[string, string]>) {
  const frames = lcsT.run({a: [...a], b: [...b]});
  const last = frames[frames.length - 1];
  const table = last.table;
  const got = table ? table.values[a.length][b.length] : undefined;
  const want = lcsRef([...a], [...b]);
  check(`LCS(${a}, ${b}) = ${want}`, got === want, got);
  // 第一行第一列必须全 0（空串与任何串的 LCS 为 0）
  check(
    `LCS(${a}, ${b}) 首行首列为 0`,
    table !== undefined &&
      table.values[0].every((v) => v === 0) &&
      table.values.every((row) => row[0] === 0),
  );
}

// ============================================================
// 排序：结果必须等于朴素 sort 的输出
// ============================================================

const bubble = tracer('bubble-sort');
const merge = tracer('merge-sort');
const quick = tracer('quick-sort');

const SORT_INPUTS: number[][] = [
  [5, 2, 9, 1, 5, 6, 3],
  [1],
  [2, 1],
  [3, 3, 3],
  [-1, 5, -3, 0, 2],
  [9, 8, 7, 6, 5],
  [4, 4, 2, 2, 7, 1],
];

for (const input of SORT_INPUTS) {
  const expected = [...input].sort((a, b) => a - b);
  const label = JSON.stringify(input);

  const bf = bubble.run(input);
  check(
    `冒泡 ${label}`,
    JSON.stringify(lastArray(bf)) === JSON.stringify(expected),
    lastArray(bf),
  );

  const mf = merge.run(input);
  check(
    `归并 ${label}`,
    JSON.stringify(lastArray(mf)) === JSON.stringify(expected),
    lastArray(mf),
  );

  const qf = quick.run(input);
  check(
    `快排 ${label}`,
    JSON.stringify(lastArray(qf)) === JSON.stringify(expected),
    lastArray(qf),
  );
}

// ============================================================
// 冒泡：已排序要提前结束；交换次数 = 逆序对数
// ============================================================

const sortedFrames = bubble.run([1, 2, 3, 4, 5]);
check(
  '冒泡对已排序数组提前结束',
  sortedFrames.some((f) => f.note.includes('提前结束')),
);

function inversions(a: number[]): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = i + 1; j < a.length; j++) {
      if (a[i] > a[j]) {
        c++;
      }
    }
  }
  return c;
}

const swapInput = [3, 1, 2];
const swapFrames = bubble.run(swapInput);
const swapCounters = swapFrames[swapFrames.length - 1].counters;
check(
  '冒泡交换次数 = 逆序对数',
  swapCounters?.['交换'] === inversions(swapInput),
  swapCounters,
);

// ============================================================
// 两数之和
// ============================================================

const twoSum = tracer('two-sum');
const tsHit = twoSum.run({nums: [2, 7, 11, 15], target: 9});
check('两数之和命中', tsHit.some((f) => f.note.includes('命中')), tsHit[tsHit.length - 1].note);

const tsMiss = twoSum.run({nums: [1, 2, 3], target: 100});
check(
  '两数之和找不到时返回空',
  tsMiss[tsMiss.length - 1].note.includes('返回空'),
  tsMiss[tsMiss.length - 1].note,
);

// ============================================================
// 滑动窗口：结果 + left 单调不减
// ============================================================

const sw = tracer('sliding-window');
// 经典用例 "abcbbad" 映射成 [1,2,3,2,2,1,4]，答案 3
const swFrames = sw.run([1, 2, 3, 2, 2, 1, 4]);
check(
  '滑动窗口 abcbbad 最优 = 3',
  swFrames[swFrames.length - 1].counters?.['最优'] === 3,
  swFrames[swFrames.length - 1].counters,
);
const lefts = swFrames
  .map(asArray)
  .filter((f) => f.pointers?.left !== undefined)
  .map((f) => f.pointers?.left ?? 0);
check(
  '滑动窗口 left 单调不减',
  lefts.every((v, i) => i === 0 || v >= (lefts[i - 1] ?? 0)),
  lefts,
);

// ============================================================
// 二分查找
// ============================================================

const bs = tracer('binary-search');
const BS_ARR = [1, 3, 5, 7, 9, 11, 13];
const bsHit = bs.run({nums: BS_ARR, target: 7});
check('二分找到 7', bsHit.some((f) => f.note.includes('找到')), bsHit[bsHit.length - 1].note);
check(
  '二分 n=7 比较次数 <= 3',
  Number(bsHit[bsHit.length - 1].counters?.['比较次数'] ?? 99) <= 3,
  bsHit[bsHit.length - 1].counters,
);
const bsMiss = bs.run({nums: BS_ARR, target: 8});
check(
  '二分找不到时报 -1',
  bsMiss[bsMiss.length - 1].note.includes('不在数组里'),
  bsMiss[bsMiss.length - 1].note,
);
check('二分空数组不崩', bs.run({nums: [], target: 5}).length > 0);
check('二分单元素命中', bs.run({nums: [1], target: 1}).some((f) => f.note.includes('找到')));
check('二分全部大于目标不崩', bs.run({nums: [10, 20, 30], target: 5}).length > 0);
check('二分全部小于目标不崩', bs.run({nums: [1, 2, 3], target: 99}).length > 0);

// 逐个目标值都应能找到（若存在）
for (const target of BS_ARR) {
  const frames = bs.run({nums: BS_ARR, target});
  check(
    `二分能找到 ${target}`,
    frames[frames.length - 1].note.includes('找到'),
    frames[frames.length - 1].note,
  );
}

// ============================================================
// lower_bound
// ============================================================

const lb = tracer('lower-bound');
const LB_ARR = [1, 3, 3, 5, 7];
for (const [target, expect] of [
  [0, 0],
  [1, 0],
  [3, 1],
  [4, 3],
  [7, 4],
  [9, 5],
] as Array<[number, number]>) {
  const frames = lb.run({nums: LB_ARR, target});
  const last = frames[frames.length - 1];
  check(
    `lower_bound(${target}) = ${expect}`,
    last.note.includes(`= ${expect}`),
    last.note,
  );
}

// ============================================================
// 网格 BFS
// ============================================================

const bfs = tracer('grid-bfs');
const GRID = [
  ['0', '0', '0', '0'],
  ['#', '#', '#', '0'],
  ['0', '0', '0', '0'],
  ['0', '#', '0', '0'],
];
const bfsFrames = bfs.run(GRID);
check(
  '网格 BFS 到达终点',
  bfsFrames.some((f) => f.note.includes('到达终点')),
  bfsFrames[bfsFrames.length - 1].note,
);
const cellCount = GRID.length * GRID[0].length;
const maxVisited = Math.max(
  ...bfsFrames.map((f) => f.counters?.['已访问'] ?? 0),
);
check('网格 BFS 无重复访问', maxVisited <= cellCount, {
  maxVisited,
  cellCount,
});
const blockedFrames = bfs.run([
  ['0', '#'],
  ['#', '0'],
]);
check(
  '网格被墙隔断时报不可达',
  blockedFrames[blockedFrames.length - 1].note.includes('不可达'),
  blockedFrames[blockedFrames.length - 1].note,
);

// ============================================================
// DP：爬楼梯
// ============================================================

const climb = tracer('climb-stairs');

/** 参考实现：斐波那契数列 */
function climbRef(n: number): number {
  if (n <= 1) {
    return 1;
  }
  let a = 1;
  let b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

for (const n of [1, 2, 3, 5, 10, 20]) {
  const frames = climb.run({n});
  const table = frames[frames.length - 1].table;
  const got = table ? table.values[0][n] : undefined;
  check(`爬楼梯 n=${n} = ${climbRef(n)}`, String(got) === String(climbRef(n)), got);
}

// ============================================================
// DP：0-1 背包
// ============================================================

const knap = tracer('zero-one-knapsack');

/** 参考实现：经典 0-1 背包，重量=价值=1..n */
function knapsackRef(n: number, cap: number): number {
  const dp = new Array<number>(cap + 1).fill(0);
  for (let w = 1; w <= n; w++) {
    for (let c = cap; c >= w; c--) {
      dp[c] = Math.max(dp[c], dp[c - w] + 1);
    }
  }
  return dp[cap];
}

for (const [n, cap] of [
  [4, 5],
  [1, 1],
  [3, 2],
  [10, 20],
] as Array<[number, number]>) {
  const frames = knap.run({n, cap});
  const table = frames[frames.length - 1].table;
  const got = table ? table.values[0][cap] : undefined;
  const expect = knapsackRef(n, cap);
  check(`背包 n=${n} cap=${cap} = ${expect}`, String(got) === String(expect), got);
}

// ============================================================
// 帧数上限
// ============================================================

const bigInput = Array.from({length: 50}, (_, i) => (i * 37) % 50);
const bigFrames = quick.run(bigInput);
check('大输入帧数不超过上限', bigFrames.length <= 1500, bigFrames.length);
// 只有真正超过上限时才该出现提示帧，这里用更大的输入验证
const hugeFrames = quick.run(
  Array.from({length: 60}, (_, i) => (i * 37) % 60),
);
if (hugeFrames.length >= 1500) {
  check('超限时给出提示帧', hugeFrames.some((f) => f.note.includes('截断')));
} else {
  // 60 个元素也压不满 1500 帧，说明上限设置合理，跳过该断言
  console.log('· 跳过「截断提示」断言（60 元素仅 ' + hugeFrames.length + ' 帧，未触顶）');
}

// ============================================================
// 输入解析
// ============================================================

check('两数之和解析标准输入', twoSum.parseInput('2,7,11,15;9').ok);
check('两数之和拒绝缺分号', !twoSum.parseInput('2,7,11,15').ok);
check('两数之和拒绝非数字', !twoSum.parseInput('a,b;9').ok);
check('两数之和拒绝超长数组', !twoSum.parseInput(`${Array(80).fill(1).join(',')};3`).ok);
check('网格解析分号分行', bfs.parseInput('0,0;#,0').ok);
check('网格拒绝超大', !bfs.parseInput(`${Array(15).fill('0,0').join(',')};${Array(15).fill('0,0').join(',')}`).ok);
check('冒泡解析带空格', bubble.parseInput('1, 2, 3').ok);
check('冒泡解析中英文标点', bubble.parseInput('1，2、3').ok);
check('排序拒绝空输入', !bubble.parseInput('   ').ok);

// ============================================================

// ============================================================
// 输入往返：formatInput(defaultInput) 必须能被 parseInput 解析回来
//
// 这条断言是为了防住一个真实的 bug：播放器曾在内部用 String(value) 兜底格式化，
// 对象类型的 defaultInput 变成 "[object Object]"，解析失败 -> 首屏 0 帧。
// 契约要求 tracer 自带 formatInput，这里逐个验证它和 parseInput 自洽。
// ============================================================

for (const t of TRACERS) {
  const text = t.formatInput(t.defaultInput);
  const parsed = t.parseInput(text);
  check(`${t.id}: formatInput(defaultInput) 能被 parseInput 解析`, parsed.ok, {
    text,
    error: parsed.ok === false ? parsed.error : undefined,
  });
  check(`${t.id}: formatInput 产出非空字符串`, text.trim().length > 0, text);
}

// ============================================================
// 放置表：每个 tracer 都必须落在某篇文档里
//
// ## 为什么这条断言不可省
//
// 手写 tracer 已经从独立页 `/code-training/visualizer` 搬到各篇文档里
// （那个页面删掉了）。于是「读者还能不能看到某个算法的动画」这件事
// 变成了**两张表的交集**：`TRACERS`（注册了什么）与 `INLINE_TRACER_PLACEMENT`
// （放到了哪篇文档）。
//
// 少写一行放置表，`test:tracers` 与 `test:adapters` 全都绿，
// 而那个算法从此在任何页面上都不出现 —— **没有任何单测会失败**。
// 唯一能守住的就是这条：注册表里有的，放置表里必须也有。
// ============================================================

{
  const placed = new Set(
    Object.values(INLINE_TRACER_PLACEMENT).flatMap((list) =>
      list.map((p) => p.tracerId),
    ),
  );
  for (const t of TRACERS) {
    check(`${t.id}: 已放到某篇文档（${docOf(t.id) ?? '未知'}）`, placed.has(t.id));
  }
  for (const id of placed) {
    check(`${id}: 放置表里的 id 都注册过`, TRACERS.some((t) => t.id === id));
  }

  // 放置表的键必须真的是存在的文档（写错路径的表现是播放器永不出现）
  const docsRoot = path.join(process.cwd(), 'code-training', 'docs');
  for (const [docId, list] of Object.entries(INLINE_TRACER_PLACEMENT)) {
    const md = path.join(docsRoot, docId);
    check(
      `${docId}: 文件存在`,
      fs.existsSync(md),
      fs.existsSync(md) ? undefined : md,
    );
    // 播放器渲染在正文末尾，所以 md 里必须有个 `## 算法可视化` 小节当入口
    // （否则右侧 TOC 里没有条目，读者滚到底也不知道有动画）
    if (fs.existsSync(md)) {
      check(
        `${docId}: 有「## 算法可视化」小节`,
        /^##\s+算法可视化\s*$/m.test(fs.readFileSync(md, 'utf8')),
      );
    }
    check(`${docId}: 至少放了一个播放器`, list.length > 0);
    const titles = list.map((p) => p.title ?? '');
    check(
      `${docId}: 每条都写了可读标题（折叠壳是同步渲染的，拿不到 tracer.title）`,
      titles.every((t) => t.trim().length > 0),
    );
  }
}

/** tracer id -> 它被放在哪篇文档里（失败时打印用） */
function docOf(tracerId: string): string | undefined {
  for (const [docId, list] of Object.entries(INLINE_TRACER_PLACEMENT)) {
    if (list.some((p) => p.tracerId === tracerId)) {
      return docId;
    }
  }
  return undefined;
}

console.log('');
if (failures.length > 0) {
  console.log('--- 失败 ---');
  failures.forEach((f) => console.log(f));
  console.log(`\n通过 ${pass}/${pass + failures.length}`);
  process.exit(1);
}
console.log(`全部通过：${pass} 项`);