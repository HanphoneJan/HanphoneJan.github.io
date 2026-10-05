/**
 * 数据结构的 tracer。
 *
 * 覆盖 `patterns/hash_map.md`、`data-structures/hash_table.md`、
 * `data-structures/linked_list.md`、`data-structures/stack_queue_heap_unionfind.md`、
 * `data-structures/string.md`。
 *
 * 这些页面讲的是「这个结构自己怎么用」，不是某道题 —— 而结构的行为
 * 恰好就是几行循环，画出来比讲清楚更快。
 */

import {
  TraceBuilder,
  type CellState,
  type Frame,
  type TableFrame,
  type Tracer,
} from '../types';
import {markOne, range} from './shared';

// ============================================================
// 哈希表：就地词频统计
// ============================================================

const countCode = `from collections import Counter

def count_items(items):
    cnt = {}                      # 键是元素，值是出现次数
    for x in items:
        cnt[x] = cnt.get(x, 0) + 1   # 没见过的键先给 0，再加 1
    return cnt`;

export const hashCount: Tracer<string[]> = {
  id: 'hash-count',
  title: '哈希表：就地统计出现次数',
  description:
    'cnt[x] = cnt.get(x, 0) + 1 这一行做了两件事：没见过的键先按 0 算，所以不需要先判断「在不在表里」；见过的键直接在原值上加 1。Python 的字典保序，所以键的插入顺序就是它被第一次遇到的顺序。',
  code: countCode,
  complexity: {time: 'O(n)', space: 'O(k) 不同元素个数'},
  display: 'boxes',
  defaultInput: ['a', 'b', 'a', 'c', 'b', 'a'],
  formatInput: (v) => v.join(','),
  parseInput: (raw) => {
    const body = raw.trim();
    if (!body) {
      return {ok: false, error: '至少给一个元素'};
    }
    // 允许 `a,b,a` 与 `"a","b","a"` 两种写法
    const items = body
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => t.replace(/^["']|["']$/g, ''));
    if (items.length === 0) {
      return {ok: false, error: '至少给一个元素'};
    }
    if (items.length > 30) {
      return {ok: false, error: '超过 30 个元素画面太长'};
    }
    return {ok: true, value: items};
  },
  relatedDocId: 'data-structures/hash_table.md',
  run(items: string[]): Frame[] {
    const b = new TraceBuilder();
    const cnt = new Map<string, number>();
    b.push({
      note: `逐个累加计数。表一开始是空的`,
      array: [...items],
      states: new Array(items.length).fill('idle') as CellState[],
      aux: [{label: 'cnt（词频表）', values: ['空']}],
      line: 4,
    });

    items.forEach((x, i) => {
      const had = cnt.has(x);
      const prev = cnt.get(x) ?? 0;
      cnt.set(x, prev + 1);
      b.push({
        note: had
          ? `${x} 在表里：${prev} → ${prev + 1}`
          : `${x} 不在表里：cnt.get(${x}, 0) 取到 0，加 1 得 1（键是新插入的）`,
        array: [...items],
        states: markOne(items.length, i, 'active'),
        aux: [
          {
            label: 'cnt（词频表）',
            values: [...cnt.entries()].map(([k, v]) => `${k}:${v}`),
            states: [...cnt.keys()].map((k) => (k === x ? 'active' : 'done')) as CellState[],
          },
        ],
        line: 6,
      });
    });

    b.push({
      note: `共 ${cnt.size} 个不同的键：${[...cnt.entries()].map(([k, v]) => `${k}×${v}`).join('，')}`,
      array: [...items],
      states: new Array(items.length).fill('done') as CellState[],
      aux: [{label: 'cnt（词频表）', values: [...cnt.entries()].map(([k, v]) => `${k}:${v}`)}],
    });
    return b.frames;
  },
};

// ============================================================
// 链表：反转（三个指针）
// ============================================================

const reverseCode = `def reverse(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next      # 先记住下一个
        cur.next = prev     # 掉头
        prev = cur          # prev 跟进
        cur = nxt           # cur 跟进
    return prev             # 新的头是走完的 prev`;

export const listReverse: Tracer<number[]> = {
  id: 'list-reverse',
  title: '链表反转：三个指针',
  description:
    '反转链表只需要 prev / cur / next 三个指针。关键是**先记住 next 再掉头** —— 反过来写就永久丢失了后面那一段。每走一步，已反转的部分（prev 那一串）就长一格。',
  code: reverseCode,
  complexity: {time: 'O(n)', space: 'O(1)'},
  display: 'boxes',
  defaultInput: [1, 2, 3, 4, 5],
  formatInput: (v) => v.join(','),
  parseInput: (raw) => {
    const nums = raw
      .replace(/[\[\](){}]/g, ' ')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (nums.length < 2) {
      return {ok: false, error: '至少给两个节点（只有一个节点反转前后一样）'};
    }
    if (nums.length > 20) {
      return {ok: false, error: '超过 20 个节点画面太长'};
    }
    return {ok: true, value: nums};
  },
  relatedDocId: 'data-structures/linked_list.md',
  run(nums: number[]): Frame[] {
    const b = new TraceBuilder();
    const n = nums.length;
    // 反转后每个节点指向谁（-1 表示 null）
    let next = new Array(n).fill(n);
    for (let i = 0; i < n - 1; i++) {
      next[i] = i + 1;
    }
    next[n - 1] = -1;
    let prev = -1;
    let cur = 0;

    b.push({
      note: `链 1 → 2 → 3 → 4 → 5。prev = None，cur 指向第一个`,
      array: [...nums],
      pointers: {cur: 0},
      line: 2,
    });

    while (cur !== -1) {
      const nxt = next[cur];
      const state: CellState[] = new Array(n).fill('idle');
      // 已反转的一段：prev 到 cur 之间的节点
      for (let i = prev; i !== -1; i = next[i]) {
        state[i] = 'done';
      }
      b.push({
        note: `cur = ${nums[cur]}，next = ${nxt === -1 ? 'None' : nums[nxt]}，prev = ${
          prev === -1 ? 'None' : nums[prev]
        }。把 cur.next 指向 prev（掉头）`,
        array: [...nums],
        states: state,
        pointers: {cur, ...(prev !== -1 ? {prev} : {}), ...(nxt !== -1 ? {next: nxt} : {})},
        line: 5,
      });
      next[cur] = prev;
      prev = cur;
      cur = nxt;
      b.push({
        note: `掉头后 ${nums[prev]} → ${
          next[prev] === -1 ? 'None' : nums[next[prev]]
        }。prev 跟进到 ${nums[prev]}，cur 跟进到 ${
          cur === -1 ? 'None（走完了）' : nums[cur]
        }`,
        array: [...nums],
        states: (() => {
          const s: CellState[] = new Array(n).fill('idle');
          for (let i = prev; i !== -1; i = next[i]) {
            s[i] = 'done';
          }
          return s;
        })(),
        pointers: {prev, ...(cur !== -1 ? {cur} : {})},
        line: 7,
      });
    }

    b.push({
      note: `走完了。prev 指向新的头：${nums.slice().reverse().join(' → ')}`,
      array: [...nums],
      states: new Array(n).fill('done') as CellState[],
      line: 8,
    });
    return b.frames;
  },
};

// ============================================================
// 并查集：路径压缩
// ============================================================

const unionFindCode = `def find(parent, x):
    while parent[x] != x:      # 不是根就继续往上走
        parent[x] = parent[parent[x]]   # 路径压缩：跳到祖父
        x = parent[x]
    return x

def union(parent, size, a, b):
    ra, rb = find(parent, a), find(parent, b)
    if ra == rb:
        return False           # 已经同属一个集合
    if size[ra] < size[rb]:    # 小的挂到大的下面
        ra, rb = rb, ra
    parent[rb] = ra
    size[ra] += size[rb]
    return True`;

interface UnionInput {
  n: number;
  pairs: Array<[number, number]>;
}

function parseUnion(raw: string): {ok: true; value: UnionInput} | {ok: false; error: string} {
  const parts = raw.split(';');
  const head = parts[0].trim();
  const tail = (parts[1] ?? '').trim();
  const pairs: Array<[number, number]> = [];
  if (tail) {
    for (const chunk of tail.split(/[,;]/)) {
      const m = chunk.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (m) {
        pairs.push([Number(m[1]), Number(m[2])]);
      }
    }
  }
  const n = Number(head);
  if (!Number.isInteger(n) || n < 2 || n > 12) {
    return {ok: false, error: '格式：n; 合并对，如 `6; 0-1, 1-2, 3-4`（n 取 2~12）'};
  }
  if (pairs.length === 0) {
    return {ok: false, error: '至少给一对合并，如 `6; 0-1, 1-2`'};
  }
  if (pairs.length > 10) {
    return {ok: false, error: '合并对超过 10 组画面太长'};
  }
  return {ok: true, value: {n, pairs}};
}

function formatUnion(v: UnionInput): string {
  return `${v.n}; ${v.pairs.map(([a, b]) => `${a}-${b}`).join(', ')}`;
}

export const unionFind: Tracer<UnionInput> = {
  id: 'union-find',
  title: '并查集：路径压缩 + 按大小合并',
  description:
    '每个集合用一棵树表示，根就是代表元。路径压缩让查找时经过的每个节点都直接指向祖父，树因此越用越扁；按大小合并保证树高是 O(log n)。两件事一起做，均摊 O(α(n))，实际上就是常数。',
  code: unionFindCode,
  complexity: {time: 'O(α(n))', space: 'O(n)'},
  display: 'boxes',
  defaultInput: {n: 6, pairs: [[0, 1], [1, 2], [3, 4], [0, 3], [2, 4]]},
  formatInput: formatUnion,
  parseInput: parseUnion,
  relatedDocId: 'data-structures/stack_queue_heap_unionfind.md',
  run({n, pairs}): Frame[] {
    const b = new TraceBuilder();
    const parent = Array.from({length: n}, (_, i) => i);
    const size = new Array(n).fill(1);

    b.push({
      note: `${n} 个元素，各自是一个集合。parent[i] = i 表示 i 是根`,
      array: [...parent],
      pointers: {},
      aux: [{label: 'size（集合大小）', values: [...size]}],
      line: 1,
    });

    const find = (x: number, why: string): number => {
      let cur = x;
      const hops: number[] = [];
      while (parent[cur] !== cur) {
        hops.push(cur);
        b.push({
          note: `find(${why})：parent[${cur}] = ${parent[cur]} ≠ ${cur}，继续往上`,
          array: [...parent],
          pointers: {x: cur},
          aux: [{label: 'size（集合大小）', values: [...size]}],
          line: 2,
        });
        // 路径压缩：跳到祖父
        parent[cur] = parent[parent[cur]];
        b.push({
          note: `路径压缩：parent[${cur}] 直接改成祖父 ${parent[cur]}（原来是 ${hops.length ? '父亲' : '自己'}）`,
          array: [...parent],
          pointers: {x: cur},
          aux: [{label: 'size（集合大小）', values: [...size]}],
          line: 3,
        });
        cur = parent[cur];
      }
      b.push({
        note: `find(${why}) 停在根 ${cur}`,
        array: [...parent],
        pointers: {x: cur},
        states: markOne(n, cur, 'active'),
        aux: [{label: 'size（集合大小）', values: [...size]}],
        line: 5,
      });
      return cur;
    };

    for (const [a, c] of pairs) {
      b.push({
        note: `union(${a}, ${c})：先各自 find`,
        array: [...parent],
        aux: [{label: 'size（集合大小）', values: [...size]}],
        line: 10,
      });
      const ra = find(a, String(a));
      const rb = find(c, String(c));
      if (ra === rb) {
        b.push({
          note: `两个根都是 ${ra}，已经同属一个集合，这次合并是空操作`,
          array: [...parent],
          states: markOne(n, ra, 'done'),
          aux: [{label: 'size（集合大小）', values: [...size]}],
          line: 12,
        });
        continue;
      }
      const small = size[ra] < size[rb] ? ra : rb;
      const big = small === ra ? rb : ra;
      b.push({
        note: `按大小合并：${size[big]} ≥ ${size[small]}，把小的 ${small} 挂到大的 ${big} 下面`,
        array: [...parent],
        aux: [{label: 'size（集合大小）', values: [...size]}],
        line: 15,
      });
      parent[small] = big;
      size[big] += size[small];
      b.push({
        note: `parent[${small}] = ${big}，size[${big}] = ${size[big]}。现在 ${a} 与 ${c} 连在一起了`,
        array: [...parent],
        states: markOne(n, small, 'done'),
        aux: [{label: 'size（集合大小）', values: [...size]}],
        line: 17,
      });
    }

    const roots = new Set(parent);
    b.push({
      note: `全部合并完：还剩 ${roots.size} 个集合（${[...roots].sort((x, y) => x - y).join('、')}）`,
      array: [...parent],
      states: parent.map((_, i) => (parent[i] === i ? 'active' : 'done')) as CellState[],
      aux: [{label: 'size（集合大小）', values: [...size]}],
    });
    return b.frames;
  },
};

// ============================================================
// 二维 DP 表：最长公共子序列
// ============================================================

const lcsCode = `def lcs(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1   # 相同：左上 + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    return dp[m][n]`;

interface LcsInput {
  a: string[];
  b: string[];
}

function parseLcs(raw: string): {ok: true; value: LcsInput} | {ok: false; error: string} {
  const parts = raw.split(';');
  const clean = (s: string): string[] =>
    s
      .replace(/[\[\](){}"']/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  const a = clean(parts[0] ?? '');
  const b = clean(parts[1] ?? '');
  if (a.length === 0 || b.length === 0) {
    return {ok: false, error: '格式：`abcde; ace`，两串用分号隔开'};
  }
  if (a.length > 8 || b.length > 8) {
    return {ok: false, error: '两串都超过 8 个字符时表格太大'};
  }
  return {ok: true, value: {a, b}};
}

function formatLcs(v: LcsInput): string {
  return `${v.a.join('')}; ${v.b.join('')}`;
}

export const lcsTable: Tracer<LcsInput> = {
  id: 'lcs-table',
  title: '二维 DP 表：最长公共子序列',
  description:
    'dp[i][j] = a 的前 i 个与 b 的前 j 个的最长公共子序列长度。两个字符相同就取左上 + 1；不同就取「去掉 a[i-1]」与「去掉 b[j-1]」两种里更大的。行是 a 的前缀，列是 b 的前缀 —— 表格的行列各自对应一个前缀长度。',
  code: lcsCode,
  complexity: {time: 'O(m·n)', space: 'O(m·n)'},
  display: 'boxes',
  defaultInput: {a: [...'abcde'], b: [...'ace']},
  formatInput: formatLcs,
  parseInput: parseLcs,
  relatedDocId: 'data-structures/string.md',
  run({a, b}): Frame[] {
    const builder = new TraceBuilder();
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({length: m + 1}, () => new Array(n + 1).fill(0));

    const table = (active?: [number, number]): TableFrame => ({
      rowLabels: ['∅', ...a.map((ch, i) => `${ch}(${i})`)],
      colLabels: ['∅', ...b.map((ch, j) => `${ch}(${j})`)],
      values: dp.map((row) => row.slice()),
      active,
    });

    builder.push({
      note: `a = ${a.join('')}，b = ${b.join('')}。第一行与第一列都是 0（空串与任何串的 LCS 长度为 0）`,
      table: table(),
      line: 3,
    });

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const same = a[i - 1] === b[j - 1];
        builder.push({
          note: same
            ? `a[${i - 1}]='${a[i - 1]}' 与 b[${j - 1}]='${b[j - 1]}' 相同 → dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${
                dp[i - 1][j - 1]
              } + 1`
            : `两者不同 → dp[${i}][${j}] = max(dp[${i - 1}][${j}]=${dp[i - 1][j]}, dp[${i}][${j - 1}]=${dp[
                i
              ][j - 1]})`,
          table: table([i, j]),
          line: same ? 6 : 8,
        });
        dp[i][j] = same ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        builder.push({
          note: `dp[${i}][${j}] = ${dp[i][j]}`,
          table: table([i, j]),
          line: same ? 6 : 8,
        });
      }
    }
    builder.push({
      note: `算完。dp[${m}][${n}] = ${dp[m][n]}，LCS 的长度`,
      table: table([m, n]),
    });
    void range;
    return builder.frames;
  },
};