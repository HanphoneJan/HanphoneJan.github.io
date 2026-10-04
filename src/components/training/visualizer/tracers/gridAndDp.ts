/**
 * 网格与动态规划的 tracer。
 *
 * 这两类需要 GridView / TableView，所以它们的 Frame 走的是另外两条分支，
 * 正好用来验证渲染器的分派逻辑。
 */

import {
  TraceBuilder,
  type CellState,
  type Frame,
  type GridCell,
  type TableFrame,
  type Tracer,
} from '../types';
import {formatGrid, formatPairOfInts, parseGrid, parseKnapsack} from './shared';

// ============================================================
// 网格 BFS：最短路径
// ============================================================

const bfsCode = `from collections import deque

def shortest_path(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    dist = [[-1] * cols for _ in range(rows)]
    q = deque([(start[0], start[1])])
    dist[start[0]][start[1]] = 0
    while q:
        r, c = q.popleft()          # 先进先出 = 最短路的关键
        if (r, c) == goal:
            return dist[r][c]
        for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols \\
               and grid[nr][nc] != '#' and dist[nr][nc] == -1:
                dist[nr][nc] = dist[r][c] + 1   # 入队时就打标，不重复入队
                q.append((nr, nc))
    return -1`;

const OPEN = '0';
const WALL = '#';

export const gridBfs: Tracer<string[][]> = {
  id: 'grid-bfs',
  title: '网格 BFS 最短路',
  description:
    '0 = 可走，# = 墙。队列先进先出，所以逐层扩展 —— 第一次到达某个格子时的距离就是最短距离。入队时就要打 visited 标记，否则同一格子会被重复入队。',
  code: bfsCode,
  complexity: {time: 'O(rows×cols)', space: 'O(rows×cols)'},
  display: 'boxes',
  defaultInput: [
    ['0', '0', '0', '0'],
    ['#', '#', '#', '0'],
    ['0', '0', '0', '0'],
    ['0', '#', '0', '0'],
  ],
  formatInput: formatGrid,
  parseInput: parseGrid,
  relatedDocId: 'patterns/bfs.md',
  run(grid): Frame[] {
    const b = new TraceBuilder();
    const rows = grid.length;
    const cols = grid[0].length;
    const cells: GridCell[] = grid.flatMap((row) =>
      row.map((ch) => ({value: ch, state: ch === WALL ? 'excluded' : 'idle'})),
    );
    const dist: number[][] = Array.from({length: rows}, () =>
      new Array(cols).fill(-1),
    );
    const start: [number, number] = [0, 0];
    const goal: [number, number] = [rows - 1, cols - 1];

    // 起点若是墙就直接结束
    if (grid[0][0] === WALL || grid[rows - 1][cols - 1] === WALL) {
      b.push({
        note: '起点或终点是墙，不可达',
        grid: {rows, cols, cells},
      });
      return b.frames;
    }

    const queue: Array<[number, number]> = [[0, 0]];
    dist[0][0] = 0;
    cells[0].state = 'done';

    b.push({
      note: `网格 ${rows}×${cols}，从 (0,0) 到 (${rows - 1},${cols - 1}) 求最短路`,
      grid: {rows, cols, cells: cloneCells(cells), frontier: [...queue]},
      line: 4,
    });

    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let reached = false;

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      b.push({
        note: `出队 (${r},${c})，距离 ${dist[r][c]}。队列里还有 ${queue.length} 个`,
        grid: {
          rows,
          cols,
          cells: cloneCells(cells),
          cursor: [r, c],
          frontier: [...queue],
        },
        counters: {已访问: dist.flat().filter((d) => d >= 0).length},
        line: 9,
      });

      if (r === goal[0] && c === goal[1]) {
        reached = true;
        b.push({
          note: `到达终点 (${r},${c})，最短距离 = ${dist[r][c]}`,
          grid: {
            rows,
            cols,
            cells: cloneCells(cells),
            cursor: [r, c],
            frontier: [...queue],
          },
          line: 10,
        });
        break;
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
          continue;
        }
        if (grid[nr][nc] !== OPEN || dist[nr][nc] !== -1) {
          continue;
        }
        dist[nr][nc] = dist[r][c] + 1;
        cells[nr * cols + nc].state = 'done';
        queue.push([nr, nc]);
        b.push({
          note: `(${nr},${nc}) 可达 → dist=${dist[nr][nc]}，标记并入队`,
          grid: {
            rows,
            cols,
            cells: cloneCells(cells),
            cursor: [nr, nc],
            frontier: [...queue],
          },
          counters: {已访问: dist.flat().filter((d) => d >= 0).length},
          line: 15,
        });
      }
    }

    // 只有真的搜完整个队列还没到终点，才算不可达。
    // 无条件加这一帧，会在「已找到最短路」之后又补一句「不可达」，
    // 画面自相矛盾，读者会以为自己看错了。
    if (!reached) {
      b.push({
        note: '队列已空 —— 所有可达格子都访问过了，终点不可达',
        grid: {rows, cols, cells: cloneCells(cells)},
        counters: {已访问: dist.flat().filter((d) => d >= 0).length},
        line: 17,
      });
    }
    return b.frames;
  },
};

function cloneCells(cells: GridCell[]): GridCell[] {
  return cells.map((c) => ({...c}));
}

// ============================================================
// DP：爬楼梯
// ============================================================

const climbCode = `def climb_stairs(n):
    # dp[i] = 爬到第 i 级台阶的方法数
    # dp[0] = 1（原地不动，凑出 dp[1]）
    # dp[1] = 1
    dp = [0] * (n + 1)
    dp[0] = 1
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]`;

export const climbStairs: Tracer<{n: number}> = {
  id: 'climb-stairs',
  title: '动态规划：爬楼梯',
  description:
    'dp[i] 表示「爬到第 i 级的方案数」。最后一步只有两种可能：从 i-1 迈一步上来，或从 i-2 迈两步上来 —— 所以 dp[i] = dp[i-1] + dp[i-2]。这张表就是整个 DP 的全部状态。',
  code: climbCode,
  complexity: {time: 'O(n)', space: 'O(n)'},
  display: 'boxes',
  defaultInput: {n: 8},
  formatInput: (v) => String(v.n),
  parseInput: (raw) => {
    const t = raw.trim();
    const n = Number(t);
    if (!Number.isInteger(n)) {
      return {ok: false, error: '请输入台阶数（整数）'};
    }
    if (n < 1 || n > 20) {
      return {ok: false, error: '台阶数在 1~20 之间'};
    }
    return {ok: true, value: {n}};
  },
  relatedDocId: 'problems/leetcode/0070_climbing_stairs.md',
  run({n}): Frame[] {
    const b = new TraceBuilder();
    const dp = new Array(n + 1).fill(0);
    dp[0] = 1;
    dp[1] = 1;

    const table = (active?: [number, number]): TableFrame => ({
      rowLabels: ['dp'],
      colLabels: Array.from({length: n + 1}, (_, i) => `${i}`),
      values: [dp.map((v) => (v === 0 ? '-' : v))],
      active,
    });

    b.push({
      note: `要爬 ${n} 级台阶。先写初始状态：dp[0]=1、dp[1]=1`,
      table: table(),
      line: 5,
    });
    b.push({
      note: 'dp[0]=1 表示「站在原地也算一种方案」，这样 dp[1] 才等于 1（迈一步）',
      table: table([0, 0]),
      line: 5,
    });
    b.push({
      note: 'dp[1]=1：只有迈一步这一种走法',
      table: table([0, 1]),
      line: 6,
    });

    for (let i = 2; i <= n; i++) {
      b.push({
        note: `算 dp[${i}]：来源是 dp[${i - 1}]=${dp[i - 1]} 和 dp[${i - 2}]=${dp[i - 2]}`,
        table: table(),
        line: 8,
      });
      dp[i] = dp[i - 1] + dp[i - 2];
      b.push({
        note: `dp[${i}] = ${dp[i - 1]} + ${dp[i - 2]} = ${dp[i]}`,
        table: table([0, i]),
        line: 8,
      });
    }

    b.push({
      note: `答案：爬到第 ${n} 级有 ${dp[n]} 种方法`,
      table: table([0, n]),
      line: 10,
    });
    return b.frames;
  },
};

// ============================================================
// DP：0-1 背包
// ============================================================

const knapsackCode = `def knapsack(n, cap):
    # 物品：重量 = 价值 = 1..n
    # dp[c] = 容量为 c 时能装下的最大物品数
    dp = [0] * (cap + 1)
    for w in range(1, n + 1):
        for c in range(cap, w - 1, -1):   # 倒序！
            dp[c] = max(dp[c], dp[c - w] + 1)
    return dp[cap]`;

export const zeroOneKnapsack: Tracer<{n: number; cap: number}> = {
  id: 'zero-one-knapsack',
  title: '动态规划：0-1 背包',
  description:
    'dp[c] = 容量 c 下能装的最大物品数。容量必须「倒序」枚举 —— 正序会让同一个物品被重复装入，变成完全背包。这一个「倒序」是这题全部的难点。',
  code: knapsackCode,
  complexity: {time: 'O(n·cap)', space: 'O(cap)'},
  display: 'boxes',
  defaultInput: {n: 4, cap: 5},
  formatInput: formatPairOfInts,
  parseInput: parseKnapsack,
  run({n, cap}): Frame[] {
    const b = new TraceBuilder();
    const dp = new Array(cap + 1).fill(0);

    const table = (active?: [number, number], states?: CellState[][]): TableFrame => ({
      rowLabels: ['dp'],
      colLabels: Array.from({length: cap + 1}, (_, c) => `${c}`),
      values: [dp.map((v) => (v === 0 ? '-' : v))],
      active,
      states,
    });

    b.push({
      note: `物品 1..${n}（重量=价值），背包容量 ${cap}。dp 初始全 0`,
      table: table(),
      line: 4,
    });

    for (let w = 1; w <= n; w++) {
      b.push({
        note: `处理物品 ${w}：容量从 ${cap} 倒序枚举到 ${w}`,
        table: table(),
        line: 6,
      });
      for (let c = cap; c >= w; c--) {
        b.push({
          note: `c=${c}：不装 ${w} 是 dp[${c}]=${dp[c]}，装 ${w} 是 dp[${c - w}]+1=${dp[c - w] + 1}`,
          table: table(),
          line: 7,
        });
        const best = Math.max(dp[c], dp[c - w] + 1);
        dp[c] = best;
        b.push({
          note: `dp[${c}] = max(${best === dp[c - w] + 1 ? best : dp[c]}, …) = ${best}`,
          table: table([0, c]),
          line: 7,
        });
      }
      b.push({
        note: `物品 ${w} 处理完，当前 dp = [${dp.join(', ')}]`,
        table: table(),
        line: 7,
      });
    }

    b.push({
      note: `答案：容量 ${cap} 时最多装 ${dp[cap]} 个物品`,
      table: table([0, cap]),
      line: 9,
    });
    return b.frames;
  },
};