#
# @lc app=leetcode.cn id=28 lang=python3
# @lcpr version=30204
#
# [28] 找出字符串中第一个匹配项的下标
# 题目：返回 needle 在 haystack 中第一次出现的下标，不存在返回 -1
#

# @lcpr-template-start

# @lcpr-template-end
# @lc code=start
class Solution:
    def strStr(self, haystack: str, needle: str) -> int:
        """
        核心思想：滑动窗口 + 切片比较（朴素匹配）

        用长度为 len(needle) 的窗口在 haystack 上从左向右滑动，
        每次截取窗口与 needle 比较。首次相等的位置即答案。

        之所以从 0 滑到 length-window（含），是因为窗口右端不能越界：
        - 起点 left 满足 left + window <= length
        - 故 left 最大为 length - window

        时间复杂度：O(n·m)（朴素，最坏情况逐位比较）
        空间复杂度：O(1)
        """
        length = len(haystack)
        window = len(needle)

        # 空 needle 按 LeetCode 语义，匹配下标为 0
        if window == 0:
            return 0

        # needle 比 haystack 还长，不可能匹配
        if length < window:
            return -1

        # 滑动窗口比较
        for left in range(0, length - window + 1):
            if needle == haystack[left:left + window]:
                return left

        return -1
# @lc code=end


#
# @lcpr case=start
# "sadbutsad"\n"sad"\n
# @lcpr case=end

# @lcpr case=start
# "leetcode"\n"leeto"\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ("sadbutsad", "sad", 0),
        ("leetcode", "leeto", -1),
        ("hello", "ll", 2),
        ("aaaaa", "bba", -1),
        ("", "", 0),          # 空 needle，返回 0
        ("a", "", 0),         # 空 needle 在非空串中也返回 0
        ("a", "a", 0),
        ("abc", "abcd", -1),  # needle 更长
        ("mississippi", "issip", 4),
    ]

    for haystack, needle, expected in tests:
        result = sol.strStr(haystack, needle)
        status = "✓" if result == expected else "✗"
        print(f"strStr({haystack!r}, {needle!r}) = {result}, 期望={expected} {status}")