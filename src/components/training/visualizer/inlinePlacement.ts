/**
 * 「哪篇文档内嵌哪些手写 tracer」的放置表。
 *
 * ## 为什么需要这张表
 *
 * 手写 tracer（`tracers/` 下的十个：双指针、滑动窗口、二分、排序、网格 BFS、
 * DP）本来只在独立页 `/code-training/visualizer` 上。现在它们**内嵌到讲这些
 * 算法的那篇文档里** —— 读者在「滑动窗口」这一页读到窗口怎么收缩时，顺手
 * 就能把输入调大调小重跑一遍，而不是跳去另一个页面从头找。
 * 独立页因此可以删掉（`src/pages/code-training/visualizer.tsx`）。
 *
 * ## 为什么这张表不能 import tracer 本身
 *
 * `tracers/index.ts` 里每个条目都带着 `run()` 的实现。放在这里 import 就等于
 * 把它打进**每一篇**文档的主 bundle —— 与题解页「播放器必须懒加载」同一个
 * 理由（见 `InlineVisualizer.tsx` 的文件头）。所以表里只有**字符串**，
 * 真正的 tracer 在 `InlineTracerVisualizer` 懒加载时按 id 查。
 *
 * ## 位置：正文末尾的小节之下
 *
 * md 里加的是**普通 Markdown 标题**（`## 算法可视化`），播放器渲染在
 * `</DocItemContent>` 之后 —— 也就是紧跟那个小节。不试图插到某一节中间：
 *
 * - 这些文档走 `markdown.format: 'detect'`，实测**被当作 CommonMark 解析**
 *   （`<ProbeMarker />` 被小写成 `<probemarker>`，加一行 `import` 也一样）。
 *   换成 `format: 'mdx'` 就能用 JSX 组件，但那是 200 多篇文档的解析方式，
 *   为了摆播放器去改它不划算 —— 里面还有大段含 `{` 与 `<` 的散文。
 * - 自定义 remark 插件在这套配置下**压根不会被调用**（见 AGENTS.md）。
 *
 * 键是 docId（相对 `code-training/docs/` 的路径），不是 permalink：
 * permalink 会被 `numberPrefixParser` 改写，而这套键与自测题库、
 * 录制轨迹用的是同一把钥匙（`metadata.source` 去掉前缀）。
 */

/** 一篇文档里的一个播放器 */
export interface Placement {
  /** tracer 的 id（`tracers/index.ts` 的 `TRACERS[].id`） */
  readonly tracerId: string;
  /** 折叠壳上显示的标题；不写就用 tracer 自己的 `title` */
  readonly title?: string;
}

export const INLINE_TRACER_PLACEMENT: Record<string, readonly Placement[]> = {
  // ── 算法模式 ────────────────────────────────────────────────────────
  'patterns/two_pointers.md': [{tracerId: 'two-sum', title: '两数之和'}],
  'patterns/sliding_window.md': [
    {tracerId: 'sliding-window', title: '滑动窗口（最长无重复子串）'},
  ],
  'patterns/sorting.md': [
    {tracerId: 'bubble-sort', title: '冒泡排序'},
    {tracerId: 'merge-sort', title: '归并排序'},
    {tracerId: 'quick-sort', title: '快速排序'},
  ],
  'patterns/dynamic_programming.md': [
    {tracerId: 'climb-stairs', title: '动态规划：爬楼梯'},
    {tracerId: 'zero-one-knapsack', title: '动态规划：0-1 背包'},
    {tracerId: 'lcs-table', title: '二维 DP 表：最长公共子序列'},
  ],
  'patterns/bfs.md': [{tracerId: 'grid-bfs', title: '网格 BFS 最短路'}],
  'patterns/dfs.md': [
    {tracerId: 'tree-dfs', title: '树的 DFS 遍历（前序 / 中序 / 后序）'},
  ],
  'patterns/backtracking.md': [
    {tracerId: 'subset-backtrack', title: '回溯：子集'},
  ],
  'patterns/hash_map.md': [{tracerId: 'hash-count', title: '哈希表：就地统计出现次数'}],

  // ── 代码模板 ────────────────────────────────────────────────────────
  'templates/binary_search_template.md': [
    {tracerId: 'binary-search', title: '二分查找'},
    {tracerId: 'lower-bound', title: 'lower_bound（左闭右开写法）'},
  ],
  'templates/bfs_template.md': [{tracerId: 'grid-bfs', title: '网格 BFS 最短路'}],
  'templates/dfs_template.md': [
    {tracerId: 'tree-dfs', title: '树的 DFS 遍历（前序 / 中序 / 后序）'},
    {tracerId: 'subset-backtrack', title: '回溯：子集'},
  ],

  // ── 数据结构 ────────────────────────────────────────────────────────
  'data-structures/hash_table.md': [
    {tracerId: 'hash-count', title: '哈希表：就地统计出现次数'},
  ],
  'data-structures/linked_list.md': [
    {tracerId: 'list-reverse', title: '链表反转：三个指针'},
  ],
  'data-structures/stack_queue_heap_unionfind.md': [
    {tracerId: 'union-find', title: '并查集：路径压缩 + 按大小合并'},
  ],
  'data-structures/binary_tree.md': [
    {tracerId: 'tree-dfs', title: '树的 DFS 遍历（前序 / 中序 / 后序）'},
  ],
  'data-structures/tree.md': [
    {tracerId: 'tree-dfs', title: '树的 DFS 遍历（前序 / 中序 / 后序）'},
  ],
  'data-structures/string.md': [
    {tracerId: 'lcs-table', title: '二维 DP 表：最长公共子序列'},
  ],
  'data-structures/array.md': [
    {tracerId: 'lcs-table', title: '二维 DP 表：最长公共子序列'},
  ],
  'data-structures/graph.md': [{tracerId: 'grid-bfs', title: '网格 BFS 最短路'}],
};

/** 这篇文档该内嵌哪些 tracer；没有就返回空数组 */
export function placementsOf(docId: string | undefined): readonly Placement[] {
  return docId ? (INLINE_TRACER_PLACEMENT[docId] ?? []) : [];
}