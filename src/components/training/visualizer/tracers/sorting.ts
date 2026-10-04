/**
 * 排序算法的 tracer：冒泡、归并、快速。
 *
 * 三者的对比本身就是教学内容 —— 同样是 O(n log n) 级，
 * 快排是原地且常数小、归并是稳定但要额外空间、冒泡是稳定但 O(n²)。
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
  highlight,
  markOne,
  markRange,
  range,
} from './shared';

// ============================================================
// 冒泡排序
// ============================================================

const bubbleCode = `def bubble_sort(nums):
    n = len(nums)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if nums[j] > nums[j + 1]:
                nums[j], nums[j + 1] = nums[j + 1], nums[j]
                swapped = True
        if not swapped:
            break
    return nums`;

export const bubbleSort: Tracer<number[]> = {
  id: 'bubble-sort',
  title: '冒泡排序',
  description:
    '相邻两两比较，把大的往右推。每轮把当前最大值「冒」到未排序区的末尾，因此第 i 轮结束后末尾 i 个已就位。',
  code: bubbleCode,
  complexity: {time: 'O(n²)', space: 'O(1)'},
  display: 'bars',
  defaultInput: [5, 2, 9, 1, 5, 6, 3],
  formatInput: formatNumberList,
  parseInput: parseNumberList,
  relatedDocId: 'patterns/sorting.md',
  run(input: number[]): Frame[] {
    const b = new TraceBuilder();
    const a = [...input];
    const n = a.length;
    const states: CellState[] = new Array(n).fill('idle');
    let comparisons = 0;
    let swaps = 0;
    const counters = () => ({比较: comparisons, 交换: swaps});

    b.step({note: `初始数组，长度 ${n}`, array: [...a], states: [...states], line: 1});

    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      b.step({
        note: `第 ${i + 1} 轮：只比未排序区 [0, ${n - 1 - i}]`,
        array: [...a],
        states: markRange(n, 0, n - 1 - i, 'active'),
        counters: counters(),
        line: 2,
      });

      for (let j = 0; j < n - 1 - i; j++) {
        comparisons++;
        b.step({
          note: `比较 nums[${j}]=${a[j]} 与 nums[${j + 1}]=${a[j + 1]}`,
          array: [...a],
          states: highlight(states, [j, j + 1], 'compare'),
          pointers: {j, 'j+1': j + 1},
          counters: counters(),
          line: 4,
        });
        if (a[j] > a[j + 1]) {
          const t = a[j];
          a[j] = a[j + 1];
          a[j + 1] = t;
          swaps++;
          swapped = true;
          b.step({
            note: `${t} > ${a[j]}，交换 → 下标 ${j} 现在是 ${a[j]}`,
            array: [...a],
            states: highlight(states, [j, j + 1], 'swap'),
            pointers: {j, 'j+1': j + 1},
            counters: counters(),
            line: 5,
          });
        }
      }

      states[n - 1 - i] = 'done';
      b.step({
        note: `第 ${i + 1} 轮结束：下标 ${n - 1 - i} 已就位`,
        array: [...a],
        states: [...states],
        counters: counters(),
        line: 8,
      });

      if (!swapped) {
        b.step({
          note: '整轮没有发生交换 —— 已经有序，提前结束（这也是冒泡的最优情况 O(n)）',
          array: [...a],
          states: new Array(n).fill('done'),
          counters: counters(),
          line: 7,
        });
        break;
      }
    }

    return b.frames;
  },
};

// ============================================================
// 归并排序
// ============================================================

const mergeCode = `def merge_sort(nums):
    if len(nums) <= 1:
        return nums
    mid = len(nums) // 2
    left = merge_sort(nums[:mid])
    right = merge_sort(nums[mid:])
    return merge(left, right)

def merge(a, b):
    res, i, j = [], 0, 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:   # <= 保证稳定
            res.append(a[i]); i += 1
        else:
            res.append(b[j]); j += 1
    res.extend(a[i:])
    res.extend(b[j:])
    return res`;

export const mergeSort: Tracer<number[]> = {
  id: 'merge-sort',
  title: '归并排序',
  description:
    '分治：先各自排好序，再「合并」两个有序序列。合并时只比两个指针指的元素，小的先出 —— 因此需要 O(n) 的额外空间。',
  code: mergeCode,
  complexity: {time: 'O(n log n)', space: 'O(n)'},
  display: 'bars',
  defaultInput: [5, 2, 9, 1, 5, 6, 3],
  formatInput: formatNumberList,
  parseInput: parseNumberList,
  relatedDocId: 'patterns/sorting.md',
  run(input: number[]): Frame[] {
    const b = new TraceBuilder();
    const a = [...input];

    b.step({note: `初始数组，长度 ${a.length}`, array: [...a], line: 1});

    function sort(lo: number, hi: number, depth: number): void {
      if (hi - lo <= 1) {
        b.step({
          note: `区间 [${lo}, ${hi}) 只剩 ${hi - lo} 个元素，天然有序`,
          array: [...a],
          states: markRange(a.length, lo, hi - 1, 'done'),
          line: 2,
        });
        return;
      }
      const mid = (lo + hi) >> 1;
      b.step({
        note: `对 [${lo}, ${hi}) 分治：从中间切开 → [${lo}, ${mid}) 和 [${mid}, ${hi})`,
        array: [...a],
        states: highlight(
          new Array(a.length).fill('idle'),
          range(lo, mid - 1),
          'pivot',
        ),
        line: 3,
      });
      sort(lo, mid, depth + 1);
      sort(mid, hi, depth + 1);

      const left = a.slice(lo, mid);
      const right = a.slice(mid, hi);
      const merged: number[] = [];
      let i = 0;
      let j = 0;

      b.step({
        note: `开始合并 [${lo}, ${mid}) 与 [${mid}, ${hi})`,
        array: [...a],
        states: highlight(
          new Array(a.length).fill('idle'),
          [...range(lo, mid - 1), ...range(mid, hi - 1)],
          'active',
        ),
        aux: [{label: 'left', values: left}, {label: 'right', values: right}],
        line: 7,
      });

      while (i < left.length && j < right.length) {
        b.step({
          note: `比 left[${i}]=${left[i]} 与 right[${j}]=${right[j]}`,
          array: [...a],
          states: highlight(
            new Array(a.length).fill('idle'),
            [lo + i, mid + j],
            'compare',
          ),
          aux: [
            {label: 'left', values: left, states: markRange(left.length, 0, i - 1, 'done')},
            {label: 'right', values: right, states: markRange(right.length, 0, j - 1, 'done')},
          ],
          pointers: {i, j},
          line: 9,
        });
        if (left[i] <= right[j]) {
          merged.push(left[i]);
          i++;
        } else {
          merged.push(right[j]);
          j++;
        }
      }
      while (i < left.length) {
        merged.push(left[i++]);
      }
      while (j < right.length) {
        merged.push(right[j++]);
      }

      for (let k = 0; k < merged.length; k++) {
        a[lo + k] = merged[k];
      }
      b.step({
        note: `合并结果写回 [${lo}, ${hi})：${merged.join(', ')}`,
        array: [...a],
        states: markRange(a.length, lo, hi - 1, 'done'),
        line: 15,
      });
    }

    sort(0, a.length, 0);
    b.step({note: '全部有序', array: [...a], states: new Array(a.length).fill('done'), line: 6});
    return b.frames;
  },
};

// ============================================================
// 快速排序
// ============================================================

const quickCode = `def quick_sort(nums, lo, hi):
    if lo >= hi:
        return
    p = partition(nums, lo, hi)
    quick_sort(nums, lo, p - 1)
    quick_sort(nums, p + 1, hi)

def partition(nums, lo, hi):
    pivot = nums[hi]
    i = lo - 1
    for j in range(lo, hi):
        if nums[j] <= pivot:
            i += 1
            nums[i], nums[j] = nums[j], nums[i]
    nums[i + 1], nums[hi] = nums[hi], nums[i + 1]
    return i + 1`;

export const quickSort: Tracer<number[]> = {
  id: 'quick-sort',
  title: '快速排序',
  description:
    '选一个基准（pivot），把比它小的都挪到左边、比它大的都挪到右边，基准就归位了 —— 然后对左右两段递归。原地进行，空间 O(log n)。',
  code: quickCode,
  complexity: {time: '平均 O(n log n) / 最坏 O(n²)', space: 'O(log n)'},
  display: 'bars',
  defaultInput: [5, 2, 9, 1, 5, 6, 3],
  formatInput: formatNumberList,
  parseInput: parseNumberList,
  relatedDocId: 'patterns/sorting.md',
  run(input: number[]): Frame[] {
    const b = new TraceBuilder();
    const a = [...input];

    b.step({note: `初始数组，长度 ${a.length}`, array: [...a], line: 1});

    function partition(lo: number, hi: number): number {
      const pivotVal = a[hi];
      let i = lo - 1;
      b.step({
        note: `选末尾 ${pivotVal} 为基准（pivot），区间 [${lo}, ${hi}]`,
        array: [...a],
        states: highlight(
          new Array(a.length).fill('idle'),
          [...range(lo, hi - 1), hi],
          'pivot',
        ),
        pointers: {pivot: hi},
        line: 6,
      });

      for (let j = lo; j < hi; j++) {
        b.step({
          note: `j=${j}：a[j]=${a[j]} ${a[j] <= pivotVal ? '≤' : '>'} pivot=${pivotVal}${a[j] <= pivotVal ? '，换到左侧' : '，跳过'}`,
          array: [...a],
          states: highlight(
            new Array(a.length).fill('idle'),
            [...range(lo, j - 1), j, hi],
            a[j] <= pivotVal ? 'swap' : 'compare',
          ),
          pointers: {j, pivot: hi, i: Math.max(lo, i + 1)},
          line: 8,
        });
        if (a[j] <= pivotVal) {
          i++;
          const t = a[i];
          a[i] = a[j];
          a[j] = t;
          b.step({
            note: `交换 a[${i}] ↔ a[${j}]，小于 pivot 的区间扩张到 [${lo}, ${i}]`,
            array: [...a],
            states: highlight(
              new Array(a.length).fill('idle'),
              [...range(lo, i), j, hi],
              'swap',
            ),
            pointers: {i, j, pivot: hi},
            line: 10,
          });
        }
      }
      const t = a[i + 1];
      a[i + 1] = a[hi];
      a[hi] = t;
      b.step({
        note: `把 pivot 换到下标 ${i + 1} —— 它的最终位置确定`,
        array: [...a],
        states: highlight(new Array(a.length).fill('idle'), [i + 1, hi], 'done'),
        pointers: {pivot: i + 1},
        line: 12,
      });
      return i + 1;
    }

    function sort(lo: number, hi: number): void {
      if (lo >= hi) {
        if (lo === hi) {
          b.step({
            note: `下标 ${lo} 已是单元素区间，天然就位`,
            array: [...a],
            states: markOne(a.length, lo, 'done'),
            line: 2,
          });
        }
        return;
      }
      b.step({
        note: `递归处理区间 [${lo}, ${hi}]`,
        array: [...a],
        states: markRange(a.length, lo, hi, 'active'),
        line: 4,
      });
      const p = partition(lo, hi);
      sort(lo, p - 1);
      sort(p + 1, hi);
    }

    sort(0, a.length - 1);
    b.step({note: '排序完成', array: [...a], states: new Array(a.length).fill('done'), line: 1});
    return b.frames;
  },
};
