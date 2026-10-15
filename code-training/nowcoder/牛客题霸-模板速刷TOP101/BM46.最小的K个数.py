# @nc app=nowcoder id=6a296eb82cf844ca8539b57c23e6e9bf topic=295 question=23263 lang=Python3
# 2026-10-15 20:05:52
# https://www.nowcoder.com/practice/6a296eb82cf844ca8539b57c23e6e9bf?tpId=295&tqId=23263
# [BM46] 最小的K个数

"""
BM46. 最小的 K 个数 —— 堆 / 快速选择

题目描述：
给定一个长度为 n 的、可能有重复值的数组，找出其中不去重的最小的 k 个数。
例如数组元素是 4,5,1,6,2,7,3,8，则最小的 4 个数字是 1,2,3,4。
返回顺序不限。

核心思路：
1. 排序取前 k 个：O(n log n)，最简单但不是最优。
2. 大顶堆维护「当前最小的 k 个」：堆里始终保存已见过元素中最小的 k 个，
   堆顶是这 k 个里最大的。新元素只要比堆顶小，就替换掉堆顶。
   遍历一遍，时间 O(n log k)，空间 O(k)。
3. 快速选择（quickselect）：平均 O(n)。

本题给出大顶堆写法（Python 用负数模拟大顶堆）。

时间复杂度：O(n log k)
空间复杂度：O(k)
"""

# @sample-start
"""
样例输入 1:
[4,5,1,6,2,7,3,8], 4

样例输出 1:
[1,2,3,4]
"""
# @sample-end

# @nc code=start

from typing import List
import heapq


class Solution:
    def GetLeastNumbers_Solution(self, input: List[int], k: int) -> List[int]:
        """用大顶堆维护最小的 k 个数（堆内用负数模拟大顶堆）"""
        if k <= 0:
            return []
        if k >= len(input):
            return list(input)

        # 取前 k 个建大顶堆（存负值，堆顶是绝对值最大的 = 这 k 个里最大的）
        heap = [-x for x in input[:k]]
        heapq.heapify(heap)
        for x in input[k:]:
            if x < -heap[0]:          # 比当前堆顶（k 个里最大的）还小 → 换掉它
                heapq.heapreplace(heap, -x)
        return [-x for x in heap]


def _run_tests() -> None:
    """运行嵌入的样例测试（返回顺序不限，按多重集比较）"""
    tests = [
        ([4, 5, 1, 6, 2, 7, 3, 8], 4, [1, 2, 3, 4]),
        ([1], 0, []),
        ([0, 1, 2, 1, 2], 3, [0, 1, 1]),
        ([3, 1], 2, [1, 3]),
    ]
    for i, (arr, k, expected) in enumerate(tests, 1):
        actual = Solution().GetLeastNumbers_Solution(arr, k)
        ok = sorted(actual) == sorted(expected)
        status = "✓" if ok else "✗"
        print(f"样例 {i}: {status} (期望={sorted(expected)}, 实际={sorted(actual)})")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        _run_tests()

# @nc code=end
