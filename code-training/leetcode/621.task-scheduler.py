#
# @lc app=leetcode.cn id=621 lang=python3
# @lcpr version=30204
#
# [621] 任务调度器
#


# @lcpr-template-start
from typing import List
import collections
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    任务调度器 - 贪心模拟

    核心思路：
    - 每次选择"冷却已结束"且"剩余任务最多"的任务执行
    - 用nextValid记录每种任务下次可执行的时间
    - 用rest记录每种任务的剩余数量

    为什么正确：
    - 优先执行剩余最多的任务，可以最小化总时间
    - 因为冷却期间必须等待或执行其他任务，优先处理高频任务避免最后拖时间

    时间复杂度：O(任务数 * 任务种类数)
    空间复杂度：O(任务种类数)
    """

    def leastInterval(self, tasks: List[str], n: int) -> int:
        freq = collections.Counter(tasks)

        # 任务种类数
        m = len(freq)
        nextValid = [1] * m  # 每种任务下次可执行的时间
        rest = list(freq.values())  # 每种任务的剩余数量

        time = 0
        for i in range(len(tasks)):
            time += 1
            # 找到冷却已结束的任务中，下次可执行的最早时间
            minNextValid = min(nextValid[j] for j in range(m) if rest[j] > 0)
            time = max(time, minNextValid)

            # 在可执行的任务中，选择剩余数量最多的
            best = -1
            for j in range(m):
                if rest[j] and nextValid[j] <= time:
                    if best == -1 or rest[j] > rest[best]:
                        best = j

            nextValid[best] = time + n + 1
            rest[best] -= 1

        return time

# 数学公式解法（供参考）：
# maxExec = max(freq.values())  # 最多的执行次数
# maxCount = sum(1 for v in freq.values() if v == maxExec)  # 具有最多执行次数的任务数量
# return max((maxExec - 1) * (n + 1) + maxCount, len(tasks))
# 原理：最多执行次数的任务决定了框架，其他任务填充间隙
# @lc code=end



#
# @lcpr case=start
# ["A","A","A","B","B","B"]\n2\n
# @lcpr case=end

# @lcpr case=start
# ["A","C","A","B","D","B"]\n1\n
# @lcpr case=end

# @lcpr case=start
# ["A","A","A","B","B","B"]\n3\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        (["A", "A", "A", "B", "B", "B"], 2, 8),
        # A _ _ A _ _ A, B填充空白
        # A B _ A B _ A B = 8
        (["A", "C", "A", "B", "D", "B"], 1, 6),
        # n=1, 可以交替执行，无需等待：A C A B D B = 6
        (["A", "A", "A", "B", "B", "B"], 3, 10),
        # A _ _ _ A _ _ _ A
        # A B _ _ A B _ _ A B = 10
        (["A", "A", "A", "B", "B", "B"], 0, 6),
        # n=0, 无需冷却，直接执行 = 6
    ]

    for tasks, n, expected in tests:
        result = sol.leastInterval(tasks, n)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} leastInterval({tasks}, n={n}) = {result}, expected = {expected}")
