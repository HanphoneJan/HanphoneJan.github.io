/**
 * 二叉树视图：把层序数组画成一棵树。
 *
 * ## 为什么按层序画而不是摊平成网格
 *
 * 力扣题面的树就是层序数组 `[1,2,3,null,5]`。摊平成网格有两个问题：
 *
 * - 摊平后看不出父子关系 —— `[1,2,3,null,5]` 摊成一行就是「1 2 3 空 5」，
 *   读者不知道 5 是 2 的孩子
 * - 空位占格子，`[1,2,3,null,5,null,6]` 在网格里要留 6 个空格，
 *   画面稀疏且看不出「空 = 没孩子」这个语义
 *
 * 所以按层画：每行 2^h 个槽位，槽位之间留连接线，
 * **空槽位画成虚线**指向父节点 —— 读者一眼能看出「这里本来没有左孩子」。
 *
 * ## 层序下标与几何位置的对应
 *
 * 力扣的层序数组是**0 起**的：`[1,2,3,null,5]` 里下标 0 就是根。
 * 元素 i 的位置由 `i + 1` 的二进制决定：去掉最高位的 1，
 * 剩下的位从高位到低位，0 = 左、1 = 右。所以可以纯算，不用建树：
 *
 * ```
 * 层序下标  i      i+1 的二进制    位置
 *          0      1        -> 第 0 层第 0 个槽位（根）
 *          1,2    = 10,11   -> 第 1 层（左右孩子）
 *          3..6   = 100..111 -> 第 2 层
 * ```
 *
 * **必须是 0 起**：录制器 `recorder.ts` 的 `_tlayer_order` 从 0 开始编号
 * （`index[id(node)] = len(order)`，根落在 0），力扣题面的数组也是 0 起。
 * 早先这里按 1 起算（`if (i < 1) return null`），结果根节点被跳过、
 * 整棵树往上错了一层，而且 `data-cursor` 永远匹配不上 ——
 * 页面上树能画出来但没有任何一格被高亮。
 */

import React from 'react';
import styles from '../styles.module.css';
import type {TreeCell, TreeCellKind, TreeFrameWrapper} from '../types';

/** 层数上限。超过就截断并提示 —— 12 层 = 4095 个槽位，画面没法看 */
const MAX_DEPTH = 5;

/** 每层槽位数 = 2^h。全树宽度按最深的层算。 */
function slotsAt(depth: number): number {
  return 2 ** depth;
}

/**
 * 第 i 个层序下标落在哪一层的第几个槽位。**0 起**，与力扣题面一致。
 *
 * 深度 = `(i+1)` 的二进制位数减一，槽位 = `(i+1)` 去掉最高位 1 后的值。
 */
function positionOf(i: number): {depth: number; slot: number} | null {
  if (i < 0) {
    return null;
  }
  const one = i + 1;
  const bits = one.toString(2).length - 1; // 去掉最高位的 1
  return {depth: bits, slot: one - 2 ** bits};
}

/**
 * 一层最多能显示多少个节点。
 *
 * 2^5 = 32 个槽位已经超出题解页正文的宽度（正文约 700px，一个槽位
 * 要 20px 才好读）。超过就截断并在末尾提示。
 */
const MAX_SLOTS = slotsAt(MAX_DEPTH);

/** 槽位宽（px）。乘 2^MAX_DEPTH 之后正好填满正文。 */
const SLOT = 26;

export function TreeView({frame}: {frame: TreeFrameWrapper}): React.ReactElement {
  const {cells, cursor} = frame.tree;

  // 按层分组，只保留非空的（null 槽位要占位置，所以先建全宽再过滤显示）
  const byDepth = new Map<number, Array<{index: number; cell: TreeCell}>>();
  for (let i = 0; i < cells.length; i++) {
    const pos = positionOf(i);
    if (!pos || pos.depth > MAX_DEPTH) {
      continue;
    }
    const list = byDepth.get(pos.depth) ?? [];
    list.push({index: i, cell: cells[i]});
    byDepth.set(pos.depth, list);
  }
  const depthCount = byDepth.size;
  const usedSlots = slotsAt(Math.max(0, depthCount - 1));
  // 0 起编号：下标 i 的深度是 (i+1) 的位数减一，所以「超过 MAX_DEPTH」
  // 的判据是 i+1 >= 2^(MAX_DEPTH+1)，即 i >= 2^(MAX_DEPTH+1) - 1
  const truncated = cells.length > 0 && deepestIndex(cells) + 1 >= 2 ** (MAX_DEPTH + 1);

  return (
    <div className={styles.treeWrap} data-testid="tree-view">
      {Array.from({length: depthCount}, (_, depth) => (
        <div key={depth} className={styles.treeLevel} data-testid="tree-level">
          {(byDepth.get(depth) ?? []).map(({index, cell}) => {
            const pos = positionOf(index)!;
            // 在本层 2^depth 个槽位里的位置 -> 居中偏移
            const leftPct =
              ((pos.slot + 0.5) / slotsAt(depth) - 0.5) * 100;
            // 0 起编号下，第 i 个节点的父节点是第 (i-1)/2 个（根没有父）
            const parentIndex = index === 0 ? -1 : Math.floor((index - 1) / 2);
            return (
              <div
                key={index}
                className={styles.treeSlot}
                style={{
                  // 上层格子之间的连线：留 1/2 槽位的偏移量
                  marginLeft: `${leftPct + 100 / slotsAt(depth) / 2}%`,
                  width: SLOT,
                }}
                data-testid="tree-node"
                data-cursor={cursor === index ? 'true' : undefined}>
                {depth > 0 && (
                  <span
                    className={styles.treeLink}
                    aria-hidden="true"
                    data-parent={parentIndex}
                  />
                )}
                <TreeCellBox cell={cell} isCursor={cursor === index} />
                <span className={styles.treeIndex}>{index}</span>
              </div>
            );
          })}
        </div>
      ))}
      {usedSlots > MAX_SLOTS && (
        <p className={styles.visHint}>
          树太深，只画了上面 {MAX_DEPTH} 层
        </p>
      )}
      {truncated && (
        <p className={styles.visHint}>
          树有 {cells.length} 个节点（层序下标最大 {deepestIndex(cells)}），
          超过第 {MAX_DEPTH} 层的部分没画
        </p>
      )}
    </div>
  );
}

/** 最后一个非空节点的层序下标，用来判断是否被截断 */
function deepestIndex(cells: TreeCell[]): number {
  for (let i = cells.length - 1; i >= 0; i--) {
    if (cells[i].kind === 'number' || cells[i].kind === 'string') {
      return i;
    }
  }
  return 0;
}

function TreeCellBox({
  cell,
  isCursor,
}: {
  cell: TreeCell;
  isCursor: boolean;
}): React.ReactElement {
  const kind: TreeCellKind = cell.kind;
  const cls =
    kind === 'null' || kind === 'empty'
      ? styles.treeGhost
      : isCursor
        ? styles.treeCursor
        : styles.treeBox;
  return (
    <div
      className={cls}
      title={
        kind === 'null'
          ? '空位：这里没有孩子'
          : kind === 'empty'
            ? '空字符串：算法把这个格子清空了（DFS 标记已访问）'
            : `节点 ${String(cell.value)}`
      }>
      {kind === 'number' || kind === 'string' ? cell.value : '·'}
    </div>
  );
}
