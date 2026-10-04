/**
 * 二维网格类 adapter：岛屿数量、图像旋转、螺旋遍历、矩阵乘法、DP 填表。
 *
 * ## 为什么不能摊成一维数组
 *
 * 网格题（0200 岛屿数量）的关键信息是**四邻接**，摊平之后
 * 「上下左右」就变成了 `±cols` 与 `±1` 两种跳法，读者要在脑子里做换算，
 * 而这正是这题要理解的东西。一维 `boxes` 视图把这件事藏起来了。
 *
 * ## 网格题的几种形态，都归到这一条路
 *
 * - **原地 DFS/BFS**（0200、0073、0054、0048）：网格每帧在变
 * - **逐格填 DP**（0064 最小路径和、0074/0240 二维二分、0621、0118）：
 *   一个二维状态表，也用 grid 画 —— 与 TableView 的区别是
 *   grid 没有行/列标签，且格子是输入本身（不是「值 + 标签」对）
 * - **矩阵乘法 / 转置**（HJ69）：两三个矩阵，逐格算
 *
 * 帧是自包含的：每帧重新取网格，所以倒退/跳帧不需要重算。
 *
 * ## 状态怎么标
 *
 * - 正在看的格子（`r`/`c`/`i`/`j` 对应的位置）→ `active`
 * - 已经被访问/写过的格子 → `done`
 * - 队列/栈里排着但还没处理的 → `compare`（`frontier` 字段）
 * - 边界/不可达 → `excluded`
 */

import type {CellState, Frame, GridCell, GridFrame} from '../types';
import {MAX_FRAMES} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import type {AdapterResult} from './types';

/** 网格的行列数上限。超过就画不下了（12×12 已经占满正文宽度） */
const MAX_ROWS = 14;
const MAX_COLS = 14;

/** 源码行去掉注释与缩进 */
function lineText(code: string, line: number): string {
  return (code.split('\n')[line - 1] ?? '').replace(/#.*$/, '').trim();
}

/**
 * 从一个二维数组值认出网格。
 *
 * 要「每一行都是等长的标量数组」—— 不等长就不是网格（那是树）。
 * 网格可以是 `[[1,0,1],[0,1,0]]`（数字）也可以是
 * `[['1','0'],['0','1']]`（字符，0101/0079 的 board）。
 */
export function asGrid(v: unknown): GridFrame | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_ROWS) {
    return null;
  }
  const first = v[0];
  if (!Array.isArray(first) || first.length === 0 || first.length > MAX_COLS) {
    return null;
  }
  const cols = first.length;
  for (const row of v) {
    if (!Array.isArray(row) || row.length !== cols) {
      return null;
    }
    if (!row.every(isCellScalar)) {
      return null;
    }
  }
  return {
    rows: v.length,
    cols,
    cells: v.flatMap((row) =>
      (row as unknown[]).map((x) => ({
        value: String(x),
        state: 'idle' as CellState,
      })),
    ),
  };
}

function isCellScalar(v: unknown): boolean {
  return (
    typeof v === 'number' ||
    typeof v === 'string' ||
    typeof v === 'boolean' ||
    v === null
  );
}

/**
 * 从局部变量里找网格。
 *
 * 优先**入口参数**里的网格（题面描述的对象），其次按「出现帧数最多」。
 * 理由与 roles.ts 里主数组的选择同源：0300 的 nums 与 dp 分不出高下时
 * 选入参，网格题也一样 —— 0073 的 `matrix` 才是读者关心的那个。
 *
 * ## 判据：形状稳定 **或** 只增不减，且被读过
 *
 * 0015 三数之和的 `ans.append([nums[first], nums[second], nums[third]])`
 * 让 `res` 变成一个「列表的列表」。只看「是二维数组」会被它骗到 ——
 * 画面上一堆尺寸不同的方块，而这题真正的画面是三个指针在 `nums` 上夹出区间。
 *
 * 但也不能一刀切要求形状恒定：0118 杨辉三角的 `tri` 每行多一格，
 * 形状一直在长，而它恰恰是最该用网格画的一类（逐格填的 DP 表）。
 *
 * 所以判据是两条**同时**满足：
 *
 * 1. **只增不减**：出现过的形状按面积单调不减，且最终形状在末尾保持稳定
 * 2. **被读过**（`name[...]` 出现在源码里，或者是入口参数）
 *    —— 结果累加器（0015 的 `res`）只被 `.append`，从不被下标读
 *
 * 第 2 条是关键：网格是算法**反复访问**的状态，不是往里塞东西的出口。
 */
function pickGrid(
  events: RawTrace['events'],
  paramNames: string[] | undefined,
  code: string,
): string | undefined {
  /** 名字 -> 按出现顺序记录形状 */
  const shapes = new Map<string, number[]>();
  /** 名字 -> 出现帧数 */
  const count = new Map<string, number>();
  for (const e of events) {
    for (const [name, v] of Object.entries(e.locals)) {
      const g = asGrid(v);
      if (!g) {
        continue;
      }
      count.set(name, (count.get(name) ?? 0) + 1);
      const list = shapes.get(name) ?? [];
      const area = g.rows * g.cols;
      // 只记「面积变大」的那一刻，连续同形状的帧不重复记
      if (list.length === 0 || list[list.length - 1] < area) {
        list.push(area);
      }
      shapes.set(name, list);
    }
  }
  const params = new Set(paramNames ?? []);
  const candidates = [...shapes.entries()].filter(([name, areas]) => {
    // 只增不减：面积序列里不能有回退
    for (let i = 1; i < areas.length; i++) {
      if (areas[i] < areas[i - 1]) {
        return false;
      }
    }
    // 被读过：入口参数，或者源码里出现过 name[...]
    if (params.has(name)) {
      return true;
    }
    return new RegExp(`\\b${name}\\s*\\[`).test(code);
  });
  if (candidates.length === 0) {
    return undefined;
  }
  return candidates
    .sort((a, b) => {
      const p = (params.has(b[0]) ? 1 : 0) - (params.has(a[0]) ? 1 : 0);
      return p !== 0 ? p : (count.get(b[0]) ?? 0) - (count.get(a[0]) ?? 0);
    })[0][0];
}

/**
 * 光标：从局部变量里认行/列下标。
 *
 * 网格题的行列变量命名很杂（`r`/`c`、`i`/`j`、`x`/`y`、`row`/`col`），
 * 所以按**值的范围**来认：一个整数落在 `[0, rows)` 当行，
 * 另一个落在 `[0, cols)` 当列。两个都合法且 rows != cols 时才有歧义。
 */
function pickCursor(
  locals: Record<string, unknown>,
  rows: number,
  cols: number,
): {r?: number; c?: number} {
  let r: number | undefined;
  let c: number | undefined;
  for (const [name, v] of Object.entries(locals)) {
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      continue;
    }
    // 先到先得：网格题的局部变量里通常只有 1~2 个这样的整数
    // （`len(x)` 之类不会作为局部变量留下来）
    const inRows = v >= 0 && v < rows;
    const inCols = v >= 0 && v < cols;
    if (r === undefined && inRows && !inCols) {
      r = v;
    } else if (c === undefined && inCols && !inRows) {
      c = v;
    } else if (r === undefined && c === undefined && inRows) {
      // 行 == 列（正方形网格）时先记 r，第二个当 c
      r = v;
    } else if (c === undefined && inCols) {
      c = v;
    }
  }
  return {r, c};
}

/**
 * 「已经访问过的格子」怎么认。
 *
 * 三种形态，逐个试：
 *
 * 1. 局部变量里有一个**布尔/数字的 visited 二维表**（0200 的 `visited`）
 * 2. 网格里有 0/1 或 '#'/'.' 这类「已访问标记」—— 0104/0079 把格子改掉
 * 3. 都没有：只标当前光标
 *
 * 认不出来就只标光标。这比猜一个「大概已经走过的区域」诚实 ——
 * 画面上多标一堆 `done` 格子会让人以为算法走过那里。
 */
function doneCells(
  locals: Record<string, unknown>,
  gridName: string,
  rows: number,
  cols: number,
): boolean[] {
  const out = new Array(rows * cols).fill(false);
  for (const [name, v] of Object.entries(locals)) {
    if (name === gridName) {
      continue;
    }
    const g = asGrid(v);
    if (!g || g.rows !== rows || g.cols !== cols) {
      continue;
    }
    // 布尔表：True 表示访问过
    const anyTrue = g.cells.some((c) => c.value === 'True' || c.value === '1');
    if (anyTrue && !g.cells.some((c) => c.value === '0' || c.value === 'False')) {
      // 形状对得上且有 True：当作访问标记表
      for (let i = 0; i < g.cells.length; i++) {
        if (g.cells[i].value === 'True' || g.cells[i].value === '1') {
          out[i] = true;
        }
      }
      return out;
    }
  }
  return out;
}

export function adaptGrid(trace: RawTrace): AdapterResult | null {
  const gridName = pickGrid(trace.events, trace.paramNames, trace.code);
  if (!gridName) {
    return null;
  }
  const frames: Frame[] = [];
  let declared = false;
  /**
   * 网格**自己有没有变过，或者有没有光标**。
   *
   * 「是二维数组」不等于「是网格题」。0399 口袋算式的 `equations` 是
   * `[["a","b"],["b","c"]]` —— 形状不变、内容不变、也没有光标，
   * 画出来是一张 38 帧都不变的字母表，而这题真正在动的是带权并查集的
   * `parent` / `weight` 两个一维数组（路径压缩时它们一格一格改）。
   *
   * 两条里满足一条就行：
   *
   * - **格子变过** —— 置零、填岛、旋转、螺旋、铺砖、杨辉三角
   *   （逐行新建，形状在长），没有一条网格题是静止的。
   * - **有光标** —— 0221 最大正方形的 `matrix` 是**只读**的
   *   （真正在变的是滚动数组 `dp`），但光标沿着矩阵走，
   *   「算的是哪一格」正是这题要讲的，硬说它「没过程」就错了。
   *   0207 课程表同理：邻接表长成什么样不是重点，DFS 染色走到哪一格才是。
   */
  const shapes = new Set<string>();
  let sawCursor = false;

  const lastCursor = new Map<string, string>();

  for (const e of trace.events) {
    const grid = asGrid(e.locals[gridName]);
    if (!grid) {
      continue;
    }
    const {r, c} = pickCursor(e.locals, grid.rows, grid.cols);
    const src = lineText(trace.code, e.line);

    // 光标不动、状态也不动的帧跳过：内层循环里同一行反复执行，
    // 每一次都成帧会让动画变成几十帧静止画面
    const done = doneCells(e.locals, gridName, grid.rows, grid.cols);
    const key = `${e.line}|${r},${c}|${done.map((d) => (d ? 1 : 0)).join('')}`;
    if (lastCursor.get('k') === key) {
      continue;
    }
    lastCursor.set('k', key);

    if (!declared) {
      frames.push({
        note: `${gridName}：${grid.rows}×${grid.cols} 的${gridName}`,
        grid: {...grid},
        line: e.line,
      });
      declared = true;
    }

    const cells: GridCell[] = grid.cells.map((cell, i) => ({
      ...cell,
      state: done[i] ? 'done' : 'idle',
    }));
    const cursorPos: number[] | undefined =
      r !== undefined && c !== undefined ? [r, c] : undefined;
    if (cursorPos) {
      const [rr, cc] = cursorPos;
      const idx = rr * grid.cols + cc;
      if (idx >= 0 && idx < cells.length) {
        cells[idx] = {...cells[idx], state: 'active'};
      }
    }

    shapes.add(
      `${grid.rows}x${grid.cols}|${cells.map((c) => `${c.value}/${c.state}`).join(',')}`,
    );
    if (cursorPos) {
      sawCursor = true;
    }

    frames.push({
      note: cursorPos
        ? `${gridName}[${cursorPos[0]}][${cursorPos[1]}]：${src || `第 ${e.line} 行`}`
        : src || `第 ${e.line} 行`,
      grid: {rows: grid.rows, cols: grid.cols, cells, cursor: cursorPos},
      line: e.line,
    });
    if (frames.length >= MAX_FRAMES) {
      break;
    }
  }

  if (frames.length < 3 || (shapes.size < 2 && !sawCursor)) {
    return null;
  }
  return {frames, display: 'boxes'};
}

/** Json 里的数字/字符串，网格格子统一渲染成文本 */
export function gridText(v: Json): string {
  if (v === null || v === undefined) {
    return '';
  }
  return String(v);
}
