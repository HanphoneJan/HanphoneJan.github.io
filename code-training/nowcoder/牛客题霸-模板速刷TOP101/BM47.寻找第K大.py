# @nc app=nowcoder id=e016ad9b7f0b45048c58a9f27ba618bf topic=295 question=44581 lang=Python3
# 2026-10-15 20:05:43
# https://www.nowcoder.com/practice/e016ad9b7f0b45048c58a9f27ba618bf?tpId=295&tqId=44581
# [BM47] 寻找第K大

"""
BM47. 寻找第 K 大 —— 快速选择（Quickselect）

题目描述：
有一个整数数组 a，根据快速排序的思路找出数组中第 K 大的数。
给定数组 a、大小 n 和 K，返回第 K 大的数（包含重复元素，不去重）。
保证答案存在。

核心思路：
「第 K 大（含重复）」等价于「升序排序后第 n-K 个（0 基）」。
不必整体排序，用快速选择：
每次选一个基准 pivot，做一次三路划分，把数组分成「< pivot / == pivot / > pivot」
三段。看目标下标落在哪一段，只在那一侧继续划分，另一侧直接丢弃。
三路划分能正确处理大量重复元素。

平均时间复杂度：O(n)（期望）
最坏时间复杂度：O(n^2)（基准选得很差时）
空间复杂度：O(1)（原地划分）
"""

# @sample-start
"""
样例输入 1:
[1,3,5,2,2], 5, 3

样例输出 1:
2
"""
# @sample-end

# @sample-start
"""
样例输入 2:
[10,10,9,9,8,7,5,6,4,3,4,2], 12, 3

样例输出 2:
9
"""
# @sample-end

# @nc code=start

from typing import List


class Solution:
    def findKth(self, a: List[int], n: int, K: int) -> int:
        """原地快速选择，返回升序第 n-K 个元素（即第 K 大）"""
        target = n - K              # 第 K 大 == 升序里下标 n-K 的元素
        lo, hi = 0, n - 1
        while True:
            pivot = a[(lo + hi) // 2]
            lt, i, gt = lo, lo, hi   # 三路划分：<pivot 放左边，>pivot 放右边
            while i <= gt:
                if a[i] < pivot:
                    a[lt], a[i] = a[i], a[lt]
                    lt += 1
                    i += 1
                elif a[i] > pivot:
                    a[gt], a[i] = a[i], a[gt]
                    gt -= 1
                else:
                    i += 1
            if target < lt:
                hi = lt - 1
            elif target > gt:
                lo = gt + 1
            else:
                return pivot


def _run_tests() -> None:
    """运行嵌入的样例测试"""
    tests = [
        ([1, 3, 5, 2, 2], 5, 3, 2),
        ([10, 10, 9, 9, 8, 7, 5, 6, 4, 3, 4, 2], 12, 3, 9),
        ([1], 1, 1, 1),
        ([3, 3, 3, 3], 4, 2, 3),
    ]
    for i, (arr, n, k, expected) in enumerate(tests, 1):
        actual = Solution().findKth(list(arr), n, k)
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: {status} (期望={expected}, 实际={actual})")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        _run_tests()

# @nc code=end
