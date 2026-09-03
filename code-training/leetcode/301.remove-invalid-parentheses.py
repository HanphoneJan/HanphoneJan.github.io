#
# @lc app=leetcode.cn id=301 lang=python3
# @lcpr version=30204
#
# [301] 删除无效的括号
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    删除无效的括号 - 回溯法

    核心思路：
    - 先统计需要删除的左括号数和右括号数
    - 使用回溯法，依次尝试删除多余的括号
    - 跳过连续相同的括号以避免重复结果

    为什么正确：
    - 通过统计lremove和rremove，我们知道了最少需要删除多少个括号
    - 回溯法枚举所有删除方案，isValid函数验证结果是否合法
    - 跳过连续相同字符的剪枝策略避免生成重复结果

    时间复杂度：O(2^n) - 最坏情况需要尝试所有子集
    空间复杂度：O(n) - 递归栈深度
    """

    def removeInvalidParentheses(self, s: str) -> List[str]:
        res = []
        lremove, rremove = 0, 0
        # 统计需要删除的左括号和右括号数量
        for c in s:
            if c == '(':
                lremove += 1
            elif c == ')':
                if lremove == 0:
                    rremove += 1
                else:
                    lremove -= 1

        def isValid(str):
            cnt = 0
            for c in str:
                if c == '(':
                    cnt += 1
                elif c == ')':
                    cnt -= 1
                    if cnt < 0:
                        return False
            return cnt == 0

        def helper(s, start, lremove, rremove):
            if lremove == 0 and rremove == 0:
                if isValid(s):
                    res.append(s)
                return

            for i in range(start, len(s)):
                if i > start and s[i] == s[i - 1]:
                    continue
                # 如果剩余的字符无法满足去掉的数量要求，直接返回
                if lremove + rremove > len(s) - i:
                    break
                # 尝试去掉一个左括号
                if lremove > 0 and s[i] == '(':
                    helper(s[:i] + s[i + 1:], i, lremove - 1, rremove)
                # 尝试去掉一个右括号
                if rremove > 0 and s[i] == ')':
                    helper(s[:i] + s[i + 1:], i, lremove, rremove - 1)

        helper(s, 0, lremove, rremove)
        return res

# BFS解法（供参考）：
# 思路：逐层删除括号，第一次遇到合法字符串时即为最少删除
# 1. 将初始字符串加入集合
# 2. 对集合中每个字符串，检查是否合法，合法则加入答案
# 3. 如果有答案，返回（保证删除数量最少）
# 4. 否则，对每个字符串生成删除一个括号后的所有字符串，进入下一层
# @lc code=end



#
# @lcpr case=start
# "()())()"\n
# @lcpr case=end

# @lcpr case=start
# "(a)())()"\n
# @lcpr case=end

# @lcpr case=start
# ")("\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ("()())()", ["(())()", "()()()"]),
        ("(a)())()", ["(a())()", "(a)()()"]),
        (")(", [""]),
    ]

    for s, expected in tests:
        result = sorted(sol.removeInvalidParentheses(s))
        expected_sorted = sorted(expected)
        status = "[OK]" if result == expected_sorted else "[FAIL]"
        print(f"{status} removeInvalidParentheses('{s}') = {result}, expected = {expected_sorted}")
