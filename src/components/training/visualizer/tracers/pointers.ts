/**
 * 指针类算法的 tracer：两数之和、滑动窗口、二分查找。
 *
 * 这三个都用 boxes 形态渲染（而不是柱状图），因为它们的重点是
 * 「两个指针停在哪、搜索区间是多大」，而不是元素的大小关系。
 */

import {
  TraceBuilder,
  parseNumberList,
  type CellState,
  type Frame,
  type Tracer,
} from '../types';
import {
  formatNumberList,
  formatPair,
  highlight,
  markOne,
  markRange,
  parsePair,
  parseSearch,
} from './shared';

// ============================================================
// 双指针：两数之和
// ============================================================

const twoSumCode = `def two_sum(nums, target):
    seen = {}                       # 值 -> 下标
    for i, num in enumerate(nums):
        need = target - num
        if need in seen:            # 必须先查后存
            return [seen[need], i]
        seen[num] = i
    return []`;

export const twoSum: Tracer<{nums: number[]; target: number}> = {
  id: 'two-sum',
  title: '两数之和（双指针 / 哈希表）',
  description:
    '从左往右扫一遍，每到一个数就问「我要凑的那个数之前见过吗」。先查表再存数 —— 顺序反了会把当前元素当成答案。',
  code: twoSumCode,
  complexity: {time: 'O(n)', space: 'O(n)'},
  display: 'boxes',
  defaultInput: {nums: [2, 7, 11, 15], target: 9},
  formatInput: formatPair,
  parseInput: parsePair,
  relatedDocId: 'problems/leetcode/0001_two_sum.md',
  run({nums, target}): Frame[] {
    const b = new TraceBuilder();
    const n = nums.length;
    const states: CellState[] = new Array(n).fill('idle');
    const seen = new Map<number, number>();
    let i = 0;

    b.step({
      note: `nums=[${nums.join(', ')}]，target=${target}`,
      array: [...nums],
      states: [...states],
      line: 1,
    });

    for (; i < n; i++) {
      const num = nums[i];
      const need = target - num;
      b.step({
        note: `i=${i}：num=${num}，需要找 ${need}（${target} - ${num}）`,
        array: [...nums],
        states: highlight(states, [i], 'active'),
        pointers: {i},
        counters: {'哈希表大小': seen.size},
        line: 3,
      });
      b.step({
        note: `查表：${need} ${seen.has(need) ? '见过！' : '没见过'}`,
        array: [...nums],
        states: highlight(states, [i], 'compare'),
        pointers: {i},
        counters: {'哈希表大小': seen.size},
        line: 4,
      });
      if (seen.has(need)) {
        const j = seen.get(need)!;
        b.step({
          note: `命中！${num} + ${need} = ${target}，下标 ${j} 和 ${i}`,
          array: [...nums],
          states: highlight(states, [j, i], 'found'),
          pointers: {j, i},
          counters: {'哈希表大小': seen.size},
          line: 5,
        });
        break;
      }
      seen.set(num, i);
      b.step({
        note: `存 seen[${num}] = ${i}（先查后存，所以当前元素不会匹配到自己）`,
        array: [...nums],
        states: highlight(states, [i], 'done'),
        pointers: {i},
        counters: {'哈希表大小': seen.size},
        line: 6,
      });
    }

    if (i >= n) {
      b.step({
        note: '扫完整个数组都没找到，返回空',
        array: [...nums],
        states: new Array(n).fill('excluded'),
        line: 7,
      });
    }
    return b.frames;
  },
};

// ============================================================
// 滑动窗口
// ============================================================

const slidingCode = `def longest_unique(s):
    last = {}                    # 字符 -> 最近出现的位置
    left, ans, result = 0, 0, 0  # left 是「被排除的那个字符」的下标
    for i, ch in enumerate(s):
        if ch not in last:
            ans += 1                   # 窗口没冲突，直接变长
        else:
            left = max(left, last[ch])  # left 只能右移
            ans = i - left             # 是 i-left，不是 i-left+1
        last[ch] = i
        result = max(ans, result)
    return result`;

export const slidingWindow: Tracer<number[]> = {
  id: 'sliding-window',
  title: '滑动窗口（最长无重复子串）',
  description:
    '窗口 (left, i] 始终不含重复字符。注意 left 指向「被排除的那个重复字符」本身，所以窗口长度是 i - left 而不是 i - left + 1 —— 这个 +1 的差别正是这题最常见的错误。',
  code: slidingCode,
  complexity: {time: 'O(n)', space: 'O(字符集大小)'},
  display: 'boxes',
  defaultInput: [1, 2, 3, 2, 2, 1, 4],
  formatInput: formatNumberList,
  parseInput: parseNumberList,
  relatedDocId:
    'problems/leetcode/0003_longest_substring_without_repeating_characters.md',
  run(nums): Frame[] {
    const b = new TraceBuilder();
    const n = nums.length;
    const last = new Map<number, number>();
    let left = 0;
    let ans = 0;
    let result = 0;

    b.step({
      note: `输入 [${nums.join(', ')}]（数字当作字符看待）`,
      array: [...nums],
      line: 1,
    });

    for (let i = 0; i < n; i++) {
      const ch = nums[i];
      if (!last.has(ch)) {
        ans += 1;
        b.step({
          note: `i=${i}：${ch} 没出现过，窗口直接变长，ans = ${ans}`,
          array: [...nums],
          states: markRange(n, left + 1, i, 'active'),
          pointers: {left, i},
          counters: {当前窗口: ans, 最优: result},
          line: 4,
        });
      } else {
        const prev = last.get(ch)!;
        const newLeft = Math.max(left, prev);
        b.step({
          note: `i=${i}：${ch} 上次出现在 ${prev}，left = max(${left}, ${prev}) = ${newLeft}`,
          array: [...nums],
          states: highlight(markRange(n, left + 1, i, 'active'), [prev], 'swap'),
          pointers: {left, i, prev},
          counters: {当前窗口: ans, 最优: result},
          line: 6,
        });
        left = newLeft;
        ans = i - left;
        b.step({
          note: `ans = i - left = ${i} - ${left} = ${ans}（不是 ${i} - ${left} + 1）`,
          array: [...nums],
          states: markRange(n, left + 1, i, 'done'),
          pointers: {left, i},
          counters: {当前窗口: ans, 最优: result},
          line: 7,
        });
      }
      last.set(ch, i);
      const newResult = Math.max(result, ans);
      b.step({
        note: `${ch} 的位置记为 ${i}，result = max(${result}, ${ans}) = ${newResult}`,
        array: [...nums],
        states: markRange(n, left + 1, i, 'done'),
        pointers: {left, i},
        counters: {当前窗口: ans, 最优: newResult},
        line: 9,
      });
      result = newResult;
    }

    b.step({
      note: `扫描结束，最长无重复子串长度 = ${result}`,
      array: [...nums],
      states: new Array(n).fill('done'),
      counters: {最优: result},
      line: 10,
    });
    return b.frames;
  },
};

// ============================================================
// 二分查找
// ============================================================

const binaryCode = `def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2   # 防溢出
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`;

export const binarySearch: Tracer<{nums: number[]; target: number}> = {
  id: 'binary-search',
  title: '二分查找',
  description:
    '在「有序」数组上，每次比较都能丢掉一半候选。注意两件事：区间用闭区间 [left, right] 且条件是 <=；mid 用 left + (right-left)//2 避免 left+right 溢出。',
  code: binaryCode,
  complexity: {time: 'O(log n)', space: 'O(1)'},
  display: 'boxes',
  defaultInput: {nums: [1, 3, 5, 7, 9, 11, 13], target: 7},
  formatInput: formatPair,
  parseInput: parseSearch,
  relatedDocId: 'templates/binary_search_template.md',
  run({nums, target}): Frame[] {
    const b = new TraceBuilder();
    const n = nums.length;
    let left = 0;
    let right = n - 1;
    let steps = 0;
    let found = false;

    b.step({
      note: `在 [${nums.join(', ')}] 里找 ${target}（数组必须有序）`,
      array: [...nums],
      line: 1,
    });

    while (left <= right) {
      steps++;
      const mid = left + Math.floor((right - left) / 2);
      // 区间外的元素标 excluded，让「丢掉一半」这件事看得见
      const states: CellState[] = new Array(n).fill('excluded');
      for (let i = left; i <= right; i++) {
        states[i] = 'active';
      }
      b.step({
        note: `第 ${steps} 轮：搜索区间 [${left}, ${right}]，mid = ${left} + (${right}-${left})//2 = ${mid}`,
        array: [...nums],
        states,
        pointers: {left, right, mid},
        counters: {比较次数: steps},
        line: 3,
      });
      b.step({
        note: `比较 nums[${mid}]=${nums[mid]} 与 ${target}`,
        array: [...nums],
        states: highlight(states, [mid], 'compare'),
        pointers: {left, right, mid},
        counters: {比较次数: steps},
        line: 4,
      });
      if (nums[mid] === target) {
        found = true;
        b.step({
          note: `找到！下标 ${mid}。总共比较 ${steps} 次 —— 对 ${n} 个元素只查了 ${steps} 次`,
          array: [...nums],
          states: highlight(states, [mid], 'found'),
          pointers: {mid},
          counters: {比较次数: steps},
          line: 5,
        });
        break;
      }
      if (nums[mid] < target) {
        b.step({
          note: `${nums[mid]} < ${target} → 目标在右半边，left = ${mid} + 1 = ${mid + 1}（丢掉 ${mid - left + 1} 个候选）`,
          array: [...nums],
          states: [...states],
          pointers: {left, right, mid},
          counters: {比较次数: steps},
          line: 7,
        });
        left = mid + 1;
      } else {
        b.step({
          note: `${nums[mid]} > ${target} → 目标在左半边，right = ${mid} - 1 = ${mid - 1}（丢掉 ${right - mid + 1} 个候选）`,
          array: [...nums],
          states: [...states],
          pointers: {left, right, mid},
          counters: {比较次数: steps},
          line: 9,
        });
        right = mid - 1;
      }
    }

    if (!found) {
      b.step({
        note: `left(${left}) > right(${right})，区间为空 —— ${target} 不在数组里`,
        array: [...nums],
        states: new Array(n).fill('excluded'),
        counters: {比较次数: steps},
        line: 11,
      });
    }
    return b.frames;
  },
};

// ============================================================
// 有序数组中找最左插入位（lower_bound）
// ============================================================

const lowerBoundCode = `def lower_bound(nums, target):
    left, right = 0, len(nums)   # 左闭右开
    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left                   # 循环结束时 left 即答案`;

export const lowerBound: Tracer<{nums: number[]; target: number}> = {
  id: 'lower-bound',
  title: 'lower_bound（左闭右开写法）',
  description:
    '找「第一个 ≥ target 的位置」。与普通二分的差别在两处：区间是左闭右开 [left, right)，循环条件是 left < right —— 这样「插入位」语义天然成立，不需要额外特判。',
  code: lowerBoundCode,
  complexity: {time: 'O(log n)', space: 'O(1)'},
  display: 'boxes',
  defaultInput: {nums: [1, 3, 3, 5, 7, 9], target: 4},
  formatInput: formatPair,
  parseInput: parseSearch,
  relatedDocId: 'templates/binary_search_template.md',
  run({nums, target}): Frame[] {
    const b = new TraceBuilder();
    const n = nums.length;
    let left = 0;
    let right = n;
    let steps = 0;

    b.step({
      note: `在 [${nums.join(', ')}] 里找第一个 ≥ ${target} 的位置`,
      array: [...nums],
      line: 1,
    });
    b.step({
      note: `初始区间 [${left}, ${right}) —— 注意 right 是「开区间」，所以等于 ${n}（不是 ${n - 1}）`,
      array: [...nums],
      states: markRange(n, left, right - 1, 'active'),
      pointers: {left, right},
      line: 2,
    });

    while (left < right) {
      steps++;
      const mid = left + Math.floor((right - left) / 2);
      const states: CellState[] = new Array(n).fill('excluded');
      for (let i = left; i < right; i++) {
        states[i] = 'active';
      }
      b.step({
        note: `第 ${steps} 轮：区间 [${left}, ${right})，mid=${mid}`,
        array: [...nums],
        states,
        pointers: {left, right, mid},
        counters: {比较次数: steps},
        line: 4,
      });
      b.step({
        note: `nums[${mid}]=${nums[mid]} ${nums[mid] < target ? '<' : '≥'} ${target}`,
        array: [...nums],
        states: highlight(states, [mid], 'compare'),
        pointers: {left, right, mid},
        counters: {比较次数: steps},
        line: 5,
      });
      if (nums[mid] < target) {
        b.step({
          note: `< target → left = mid+1 = ${mid + 1}`,
          array: [...nums],
          states,
          pointers: {left, right, mid},
          counters: {比较次数: steps},
          line: 6,
        });
        left = mid + 1;
      } else {
        b.step({
          note: `≥ target → right = mid = ${mid}（不排除 mid 自己，因为它可能就是答案）`,
          array: [...nums],
          states,
          pointers: {left, right, mid},
          counters: {比较次数: steps},
          line: 8,
        });
        right = mid;
      }
    }

    b.step({
      note: `循环结束，left = right = ${left}，即第一个 ≥ ${target} 的插入位`,
      array: [...nums],
      states: markOne(n, left, left < n ? 'found' : 'idle'),
      pointers: {left},
      counters: {比较次数: steps},
      line: 10,
    });
    return b.frames;
  },
};

// 保留：parseNumberList 供其它 tracer 复用时从这里导出
export {parseNumberList};