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

  /**
   * 整棵树的层序：**取一次，全程复用**。
   *
   * 树题的递归里 `root` 会被重新绑定成当前子树，所以同一批节点在不同帧
   * 会被编成**不同长度**的结构（0104 第一帧 7 格、第二层 1 格）。
   * 早先每帧现扫「哪个局部变量是 `$:'tree'` 就用它」，于是画面上
   * **树在递归中越缩越小** —— 而这题根本没有删节点。
   *
   * 录制器已经修成锚定入口实参（`_tbuild_nmap` 的 anchor），节点下标是
   * 整棵树里的稳定坐标；这里就配套地**只认入参那一棵树**，别再用别的。
   * 取「最长的那棵」而不是「第一棵」是为了兼容锚定前的旧轨迹。
   */
  const full = (() => {
    let best: Json[] | null = null;
    for (const e of trace.events) {
      for (const [name, v] of Object.entries(e.locals)) {
        if (nodeKindOf(v) !== 'tree') {
          continue;
        }
        const s = nodeSequence(v) as Json[] | null;
        if (!s || s.length === 0) {
          continue;
        }
        const fromParam = trace.paramNames.includes(name);
        if (
          best === null ||
          s.length > best.length ||
          (s.length === best.length && fromParam)
        ) {
          best = s;
        }
      }
      if (best && trace.paramNames.some((p) => nodeKindOf(e.locals[p]) === 'tree')) {
        break;
      }
    }
    return best;
  })();
  if (!full) {
    return null;
  }
  const cells: TreeCell[] = full.map(toCell);

  for (const e of trace.events) {
    /**
     * 只需要「这一帧有哪些节点变量」，不再需要结构本身 ——
     * 结构恒为整棵树（见上面）。
     */
    const seq = full;

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
     * 一个节点变量都没有时，用**递归深度**说明这一帧。
     *
     * 深度是唯一能讲清递归过程的信息（0104 每层都只有一个 `root`，
     * 光看局部变量分不出「现在是第几层」），所以它必须出现在 note 里。
     *
     * 但**不能拿它当光标**去高亮某一格。0108 是自底向上**造**树：
     * `root = TreeNode(nums[mid])` 造出来的新节点不在入参那棵树里，
     * 坐标越界（`idx >= seq.length` 被上面挡掉了），于是 `cursorKeys`
     * 为空。早先的兜底是 `cursors.root = 0` —— 也就是**恒定高亮第 0 格**。
     * 而画面上永远指着根，读者读到的是「我一直在根节点」，
     * 与 note 里写的「递归深度 5」直接矛盾。
     *
     * 指着一个明知不对的位置，比不指更糟 —— 所以深度只进 note。
     */
    const depthNote =
      cursorKeys.length === 0 && (e.depth ?? 1) > 1 ? `递归深度 ${e.depth}` : null;
    if (cursorKeys.length === 0 && !depthNote) {
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

    const note = [
      ...Object.entries(cursors).map(
        ([k, v]) => `${k}=第${v}格(${cellText(cells[v])})`,
      ),
      ...(depthNote ? [depthNote] : []),
    ].join('，');
    const noteText = `${note}：${lineText(trace.code, e.line) || `第 ${e.line} 行`}`;

    b.push({
      note: noteText,
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
