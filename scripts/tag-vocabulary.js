#!/usr/bin/env node
/**
 * 标签词表：`tags` 的归一化映射与 `tag -> patterns` 映射。
 *
 * ## 为什么单独一个文件
 *
 * 三个脚本共用同一套口径，分开写必然漂移：
 *   - `fetch-leetcode-tags.js` 补官方 tag 时要归一化
 *   - `normalize-tags.js` 把历史题解里的 `BFS`/`DFS` 这类缩写统一掉
 *   - `gen-patterns.js` 从 tags 推 `patterns`
 *
 * `.agents/skills/leetcode-processor/SKILL.md` 的「标签词表」是它的文档版，
 * 改这里记得同步那边。
 */

/** 同义/缩写 -> 规范写法（skill 词表的「禁止使用」列） */
const SYNONYMS = {
  BFS: '广度优先搜索',
  DFS: '深度优先搜索',
  dp: '动态规划',
  DP: '动态规划',
  HashMap: '哈希表',
  哈希查找: '哈希表',
  哈希计数: '哈希表',
  双指针法: '双指针',
  滑动窗: '滑动窗口',
  '堆（优先队列）': '堆',
  优先队列: '堆',
  记忆化: '记忆化搜索',
  '0-1 背包': '0/1背包',
  '0-1背包': '0/1背包',
  '树形 DP': '树形DP',
  '区间 DP': '区间DP',
  摩尔投票算法: 'Boyer-Moore 投票算法',
  'Brute-Force Search': '暴力搜索',
  'Binary Lifting': '倍增',
  Floyd判圈: 'Floyd 判圈算法',
  Manacher: 'Manacher 算法',
  正则: '正则表达式',
  最长递增子序列: '最长上升子序列',
};

/** tag -> pattern slug（`code-training/docs/patterns/<slug>.md`） */
const TAG_TO_PATTERNS = {
  双指针: ['two_pointers'],
  滑动窗口: ['sliding_window'],
  哈希表: ['hash_map'],
  原地哈希: ['hash_map'],
  动态规划: ['dynamic_programming'],
  '0/1背包': ['dynamic_programming'],
  完全背包: ['dynamic_programming'],
  分组背包: ['dynamic_programming'],
  背包问题: ['dynamic_programming'],
  区间DP: ['dynamic_programming'],
  树形DP: ['dynamic_programming'],
  递推: ['dynamic_programming'],
  最长上升子序列: ['dynamic_programming'],
  记忆化搜索: ['dynamic_programming', 'recursion'],
  回溯: ['backtracking'],
  组合: ['backtracking'],
  广度优先搜索: ['bfs'],
  '多源 BFS': ['bfs'],
  拓扑排序: ['bfs'],
  深度优先搜索: ['dfs'],
  'Flood Fill': ['dfs'],
  贪心: ['greedy'],
  'Boyer-Moore 投票算法': ['greedy'],
  二分查找: ['search'],
  快速选择: ['search'],
  'Floyd 判圈算法': ['two_pointers'],
  排序: ['sorting'],
  归并排序: ['sorting'],
  桶排序: ['sorting'],
  冒泡排序: ['sorting'],
  快速排序: ['sorting'],
  递归: ['recursion'],
  分治: ['recursion'],
  迭代: ['recursion'],
};

module.exports = {SYNONYMS, TAG_TO_PATTERNS};
