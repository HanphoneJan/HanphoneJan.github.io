/**
 * 二叉树类 adapter：把 `{"$":"tree"}` 结构画成树。
 *
 * ## 与数组 adapter 的关系
 *
 * 同链表：树题里没有 `nums[i]`，指针是**节点对象**
 * （`root` / `node` / `left` / `right` / `cur`），
 * `roles.ts` 的取值范围判据完全不适用。
 *
 * 录制器把节点编成 `{"$":"n","i":2}`，`i` 是**层序下标**，
 * 与力扣题面的 `[1,2,3,null,5]` 里的下标一一对应。所以这里只要：
 *
 * 1. 找一个 `{"$":"tree"}` 的局部变量当结构（每帧各找一次 ——
 *    翻转/删除的题树每帧都在变）
 * 2. 收集所有 `{"$":"n","i":k}` 的局部变量当光标
 *
 * ## 画面上标什么
 *
 * 树题的核心是「递归走到哪了」，所以：
 *
 * - 当前访问的节点（`node` / `root` / `cur`）→ `active`
 * - 已算完的子树（0104 的深度、0124 的路径和会打标记）→ `done`
 * - **被 DFS 标记过的格子**（代码里置 `'#'` 或 `''`）→ `empty`，
 *   画成虚线小点。这一条很重要：0104、0114、0226 靠「把走过的格子改掉」
 *   来避免重复访问，画面上必须看得出「这格被改过了」，
 *   否则读者以为算法走回了同一个节点
 * - 空孩子（层序里的 null）→ 不标，保持 `idle`
 *
 * ## 为什么用 TreeView 而不是摊平成网格
 *
 * 树是不完全满的。摊平成网格的话 `[1,2,3,null,5]` 里 5 会紧贴 3，
 * 读者看不出 5 是 2 的孩子。详见 renderers/TreeView.tsx 的文件头。
 */

import type {CellState, Frame, TreeCell} from '../types';
import {MAX_FRAMES, TraceBuilder} from '../types';
import type {Json, RawTrace} from '../recorder/types';
import {nodeIndex, nodeKindOf, nodeSequence} from './roles';
import type {AdapterResult} from './types';

/** 「当前正在处理的节点」最常用的变量名 */
const CURSOR_NAMES = new Set([
  'node', 'root', 'cur', 'curr', 'current', 'p', 'q', 'x', 'y', 'n',
  'parent', 'parent_node', 'u', 'v',
]);
/** 「已经算完的节点」—— 名字里带 done/visited/ret 之类 */
const DONE_NAMES = new Set([
  'done', 'visited', 'seen', 'ret', 'depth', 'best', 'res', 'result', 'ans',
]);

/** 源码行去掉注释与缩进 */
function lineText(code: string, line: number): string {
  return (code.split('\n')[line - 1] ?? '').replace(/#.*$/, '').trim();
}

export function adaptTree(trace: RawTrace): AdapterResult | null {
  const b = new TraceBuilder();
  let declared = false;
  let anyCursor = false;
  /** 见过「被标记过」的格子，用来决定要不要在 note 里提一句 */
  const marked = new Set<number>();

  for (const e of trace.events) {
    let seq: Json[] | null = null;
    for (const v of Object.values(e.locals)) {
      if (nodeKindOf(v) === 'tree') {
        seq = nodeSequence(v) as Json[];
        break;
      }
    }
    if (!seq || seq.length === 0) {
      continue;
    }
    const cells: TreeCell[] = seq.map(toCell);

    if (!declared) {
      // 首帧只放「入参」的结构说明，不给 states —— 递归还没开始，
      // 高亮任何一格都是假的
      b.push({
        note: `树（层序）长度 ${seq.length}：${cells.map(cellText).join(' ')}`,
        tree: {cells},
      });
      declared = true;
    }

    // 光标：所有节点局部变量
    const cursors: Record<string, number> = {};
    for (const [name, v] of Object.entries(e.locals)) {
      const idx = nodeIndex(v);
      if (idx === undefined || idx < 0 || idx >= seq.length) {
        continue;
      }
      // 空孩子（null 槽位）也会被编成 {"$":"n"}，
      // 但它不是「正在访问的节点」，跳过
      if (cells[idx].kind === 'null') {
        continue;
      }
      cursors[name] = idx;
    }
    const cursorKeys = Object.keys(cursors);
    /**
     * 一个节点变量都没有时，用**递归深度**当这一帧的内容。
     *
     * 0104 二叉树的最大深度每一层都只有一个 `root`，而 `root` 就是
     * 当前这棵子树 —— 满树时每层的长度完全一样，光看局部变量分不出
     * 「现在是第几层」。深度是唯一能讲清递归过程的信息，所以拿它当
     * 光标：画面上高亮根格，note 里写「递归深度 N」。
     *
     * 反过来说，这也是「这题确实在递归」的判据 —— 没有深度也没有节点
     * 变量的题，树视图画出来只是一棵静止的树，没有过程。
     */
    if (cursorKeys.length === 0 && (e.depth ?? 1) > 1) {
      cursors.root = 0;
      cursors[`递归深度 ${e.depth}`] = 0;
    }
    if (Object.keys(cursors).length === 0) {
      continue;
    }
    anyCursor = true;

    const states: CellState[] = new Array(seq.length).fill('idle');
    // DFS 标记过的格子保持 excluded 的视觉（已处理、别再进）
    for (const i of marked) {
      if (i < seq.length && cells[i].kind !== 'null' && cells[i].kind !== 'empty') {
        states[i] = 'done';
      }
    }
    const cursorIdxs = new Set<number>();
    for (const [name, idx] of Object.entries(cursors)) {
      states[idx] = CURSOR_NAMES.has(name.toLowerCase())
        ? 'active'
        : DONE_NAMES.has(name.toLowerCase())
          ? 'done'
          : 'compare';
      cursorIdxs.add(idx);
    }

    const note = `${Object.entries(cursors)
      .map(([k, v]) => `${k}=第${v}格(${cellText(cells[v])})`)
      .join('，')}：${lineText(trace.code, e.line) || `第 ${e.line} 行`}`;

    b.push({
      note,
      states,
      // cursor 是单值：树题同屏常有 root/node/parent 三根，
      // TreeView 只画一个聚焦框，取「最像主光标」的那个（见 pickPrimaryCursor）
      tree: {cells, cursor: pickPrimaryCursor(cursors)},
      line: e.line,
    });

    if (b.frames.length >= MAX_FRAMES) {
      break;
    }
  }

  if (!anyCursor || b.frames.length < 3) {
    return null;
  }
  void marked;
  return {frames: b.frames, display: 'boxes'};
}

/**
 * 主光标：优先叫 `node`/`root`/`cur` 的，其次下标最小的。
 *
 * 下标最小优先是因为 DFS 从根开始，读者最先要看的是根。
 */
function pickPrimaryCursor(cursors: Record<string, number>): number | undefined {
  const preferred = ['node', 'root', 'cur', 'curr', 'current', 'p', 'q'];
  for (const name of preferred) {
    if (cursors[name] !== undefined) {
      return cursors[name];
    }
  }
  const vals = Object.values(cursors);
  return vals.length > 0 ? Math.min(...vals) : undefined;
}

/** 层序值 -> 树格子 */
function toCell(v: Json): TreeCell {
  if (v === null || v === undefined) {
    return {value: null, kind: 'null'};
  }
  if (typeof v === 'number' || typeof v === 'string') {
    // 空串是 DFS 的「已访问」标记，要与「没孩子」区分开
    return v === ''
      ? {value: '', kind: 'empty'}
      : {value: v, kind: typeof v === 'number' ? 'number' : 'string'};
  }
  return {value: '·', kind: 'string'};
}

function cellText(c: TreeCell): string {
  if (c.kind === 'null') {
    return '空';
  }
  if (c.kind === 'empty') {
    return '·';
  }
  return String(c.value);
}
