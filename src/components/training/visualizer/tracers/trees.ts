/**
 * 树与回溯的 tracer。
 *
 * 覆盖 `templates/dfs_template.md`、`patterns/dfs.md`、`patterns/backtracking.md`、
 * `data-structures/binary_tree.md`、`data-structures/tree.md`。
 *
 * 录制式管线已经有树视图（15 篇题解），但那些题的**树是给定的**；
 * 这里演示的是树上的**算法**：访问顺序、以及回溯时怎么退回上一层。
 *
 * 两者用同一个 Frame 形态（`tree`），所以 TreeView 一份就够。
 */

import {
  TraceBuilder,
  type CellState,
  type Frame,
  type TreeCell,
  type Tracer,
} from '../types';

// ============================================================
// 树：层序数组 <-> 内部结构
// ============================================================

interface Node {
  val: number;
  left: Node | null;
  right: Node | null;
}

/**
 * 层序数组建树（力扣题面的写法：`[1,2,3,null,5]`）。
 *
 * 数组长度补到「满二叉树的节点数」（层数 d 就是 2^d - 1），
 * 否则渲染算不出空槽位在哪一层 —— 空位后面的节点会跳到左边。
 */
function buildTree(level: Array<number | null>): Node | null {
  if (level.length === 0 || level[0] === null) {
    return null;
  }
  const nodes: Array<Node | null> = level.map((v) =>
    v === null ? null : {val: v, left: null, right: null},
  );
  for (let i = 0; i < nodes.length; i++) {
    const cur = nodes[i];
    if (!cur) {
      continue;
    }
    if (2 * i + 1 < nodes.length) {
      cur.left = nodes[2 * i + 1];
    }
    if (2 * i + 2 < nodes.length) {
      cur.right = nodes[2 * i + 2];
    }
  }
  return nodes[0];
}

/** 满二叉树的节点数：层数 d -> 2^d - 1 */
function slotCount(n: number): number {
  return n <= 0 ? 1 : 2 ** Math.ceil(Math.log2(n + 1)) - 1;
}

/** 把结构拍回层序数组（长度补到 slotCount） */
function levelOrder(root: Node | null, slots: number): Array<number | null> {
  const out: Array<number | null> = new Array(slots).fill(null);
  if (!root) {
    return out;
  }
  const queue: Array<Node> = [root];
  let i = 0;
  while (queue.length > 0 && i < slots) {
    const cur = queue.shift() as Node;
    out[i++] = cur.val;
    if (cur.left) {
      queue.push(cur.left);
    }
    if (cur.right) {
      queue.push(cur.right);
    }
  }
  return out;
}

/** 层序数组 -> TreeCell（带 states） */
function treeCells(
  level: Array<number | null>,
  states: Map<number, CellState>,
): TreeCell[] {
  return level.map((v, i) => ({
    value: v === null ? '' : String(v),
    kind: v === null ? ('null' as const) : ('number' as const),
    state: states.get(i) ?? 'idle',
  }));
}

// ============================================================
// DFS 遍历（前序 / 中序 / 后序）
// ============================================================

const dfsCode = `def dfs(node, order):
    if not node:
        return
    if order == "pre":
        visit(node)      # 根
    dfs(node.left, order)
    if order == "in":
        visit(node)      # 根
    dfs(node.right, order)
    if order == "post":
        visit(node)      # 根`;

export type DfsOrder = 'pre' | 'in' | 'post';

interface DfsInput {
  tree: Array<number | null>;
  order: DfsOrder;
}

/** 「[1,2,3,null,5]; 中序」这种格式 */
function parseDfs(raw: string): {ok: true; value: DfsInput} | {ok: false; error: string} {
  const parts = raw.split(';').map((s) => s.trim());
  const orderPart = parts[1] ?? '';
  const order = (['pre', 'in', 'post'].find(
    (o) => o === orderPart || o === (orderPart === '前序' ? 'pre' : orderPart === '中序' ? 'in' : orderPart === '后序' ? 'post' : ''),
  ) ?? 'pre') as DfsOrder;
  const body = parts[0].replace(/[\[\](){}]/g, ' ').trim();
  if (body.length === 0) {
    return {ok: false, error: '树不能为空'};
  }
  const nums = body.split(/[\s,]+/).filter(Boolean);
  const tree = nums.map((t) => {
    if (t === 'null' || t === 'None' || t === '-') {
      return null;
    }
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  });
  if (tree.length < 1) {
    return {ok: false, error: '至少给一个节点'};
  }
  return {ok: true, value: {tree, order}};
}

function formatDfs(v: DfsInput): string {
  const label = v.order === 'pre' ? '前序' : v.order === 'in' ? '中序' : '后序';
  return `[${v.tree.map((x) => (x === null ? 'null' : String(x))).join(',')}]; ${label}`;
}

export const treeDfs: Tracer<DfsInput> = {
  id: 'tree-dfs',
  title: '树的 DFS 遍历（前序 / 中序 / 后序）',
  description:
    '三种遍历的差别只有「访问根」那一句放在哪：前序是根左右，中序是左右根，后序是左右根。前序第一个访问的是根，中序第一个访问的是最左的叶子（所以 BST 的中序遍历是有序的），后序第一个访问的是最深的叶子。',
  code: dfsCode,
  complexity: {time: 'O(n)', space: 'O(h) 递归栈'},
  display: 'boxes',
  defaultInput: {tree: [1, 2, 3, 4, 5, null, 7], order: 'pre'},
  formatInput: formatDfs,
  parseInput: parseDfs,
  relatedDocId: 'templates/dfs_template.md',
  run(input: DfsInput): Frame[] {
    const b = new TraceBuilder();
    const slots = slotCount(input.tree.length);
    const level = new Array(slots).fill(null);
    input.tree.forEach((v, i) => {
      level[i] = v;
    });
    const root = buildTree(input.tree);
    const states = new Map<number, CellState>();
    const label =
      input.order === 'pre' ? '前序（根左右）' : input.order === 'in' ? '中序（左右根）' : '后序（左右根）';

    b.push({
      note: `${label}。先看树的形状：${input.tree
        .map((v) => (v === null ? '空' : String(v)))
        .join(' ')}`,
      tree: {cells: treeCells(level, states)},
    });

    // 层序下标：和 buildTree 的 nodes 数组一一对应
    const idxOf = new Map<Node, number>();
    let k = 0;
    const queue: Array<Node> = root ? [root] : [];
    while (queue.length > 0) {
      const cur = queue.shift() as Node;
      idxOf.set(cur, k++);
      if (cur.left) {
        queue.push(cur.left);
      }
      if (cur.right) {
        queue.push(cur.right);
      }
    }

    const order: Array<number> = [];
    const walk = (node: Node | null, depth: number, src: number): void => {
      if (!node) {
        return;
      }
      const i = idxOf.get(node) ?? -1;
      if (input.order === 'pre') {
        states.set(i, 'active');
        order.push(node.val);
        b.push({
          note: `访问 ${node.val}（深度 ${depth}）：前序在这里访问根`,
          tree: {cells: treeCells(level, states), cursor: i},
          line: 4,
        });
        states.set(i, 'done');
      }
      walk(node.left, depth + 1, src + 1);
      if (input.order === 'in') {
        states.set(i, 'active');
        order.push(node.val);
        b.push({
          note: `访问 ${node.val}（深度 ${depth}）：中序在左子树回来之后访问根`,
          tree: {cells: treeCells(level, states), cursor: i},
          line: 7,
        });
        states.set(i, 'done');
      }
      walk(node.right, depth + 1, src + 2);
      if (input.order === 'post') {
        states.set(i, 'active');
        order.push(node.val);
        b.push({
          note: `访问 ${node.val}（深度 ${depth}）：后序在两棵子树都回来之后访问根`,
          tree: {cells: treeCells(level, states), cursor: i},
          line: 10,
        });
        states.set(i, 'done');
      }
    };
    walk(root, 1, 1);

    b.push({
      note: `${label}的访问顺序：${order.join(' → ')}`,
      tree: {cells: treeCells(level, states)},
    });
    return b.frames;
  },
};

// ============================================================
// 回溯：子集
// ============================================================

const subsetCode = `def subsets(nums):
    res, path = [], []
    def backtrack(start):
        res.append(path[:])          # 每一层都是一个答案
        for i in range(start, len(nums)):
            path.append(nums[i])      # 选
            backtrack(i + 1)
            path.pop()               # 撤销选择 —— 这就是「回溯」
    backtrack(0)
    return res`;

export const subsetBacktrack: Tracer<number[]> = {
  id: 'subset-backtrack',
  title: '回溯：子集',
  description:
    '每一层递归都把当前 path 当成一个答案记下来，然后试着往后多选一个数。选完必须撤销（pop）—— 撤销之后同一层才能试下一个候选。漏掉撤销就会把别的分支的数带进这一层。',
  code: subsetCode,
  complexity: {time: 'O(2ⁿ)', space: 'O(n)'},
  display: 'boxes',
  defaultInput: [1, 2, 3],
  formatInput: (v) => v.join(','),
  parseInput: (raw) => {
    const body = raw.replace(/[\[\](){}]/g, ' ').trim();
    if (!body) {
      return {ok: false, error: '至少给一个数'};
    }
    const nums = body
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (nums.length === 0) {
      return {ok: false, error: '至少给一个数'};
    }
    if (nums.length > 8) {
      return {ok: false, error: '子集是 2ⁿ 个，超过 8 个元素帧数会爆'};
    }
    return {ok: true, value: nums};
  },
  relatedDocId: 'patterns/backtracking.md',
  run(input: number[]): Frame[] {
    const b = new TraceBuilder();
    const nums = input;
    const n = nums.length;
    const path: number[] = [];
    const res: number[][] = [];
    // 用「已选/未选/正在看」三态把回溯画出来
    const states = new Array(n).fill('idle') as CellState[];

    b.push({
      note: `从 ${nums.length} 个数里选子集，一共 2^${nums.length} = ${2 ** nums.length} 个。空集也是答案。`,
      array: [...nums],
      states: [...states],
    });

    const backtrack = (start: number): void => {
      res.push([...path]);
      b.push({
        note: `当前 path = [${path.join(', ')}]，记为一个答案（共 ${res.length} 个）`,
        array: [...nums],
        states: [...states],
        aux: [{label: 'path（已选）', values: path.length ? [...path] : ['空']}],
        line: 2,
      });
      for (let i = start; i < n; i++) {
        states[i] = 'active';
        b.push({
          note: `试着选 nums[${i}] = ${nums[i]}`,
          array: [...nums],
          states: [...states],
          aux: [{label: 'path（已选）', values: [...path, nums[i]]}],
          line: 4,
        });
        path.push(nums[i]);
        backtrack(i + 1);
        path.pop();
        states[i] = 'done';
        b.push({
          note: `撤销 nums[${i}] = ${nums[i]}，path 退回 [${path.join(', ')}]，这一层接着试下一个候选`,
          array: [...nums],
          states: [...states],
          aux: [{label: 'path（已选）', values: path.length ? [...path] : ['空']}],
          line: 6,
        });
      }
    };
    backtrack(0);

    b.push({
      note: `一共 ${res.length} 个子集：${res
        .map((s) => (s.length ? `[${s.join(',')}]` : '[]'))
        .join(' ')}`,
      array: [...nums],
      states: new Array(n).fill('done') as CellState[],
      aux: [
        {
          label: '全部答案',
          values: res.map((s) => (s.length ? `[${s.join(',')}]` : '[]')),
        },
      ],
    });
    return b.frames;
  },
};