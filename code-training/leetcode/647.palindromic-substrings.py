#
# @lc app=leetcode.cn id=647 lang=python3
# @lcpr version=30204
#
# [647] 回文子串
#


# @lcpr-template-start
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    回文子串 - Manacher算法

    核心思路：
    - 将字符串改造为t，在字符间插入#，首尾添加^和$
    - 这样所有回文子串都变成奇回文串（有确定的中心）
    - half_len[i]表示以t[i]为中心的最长回文子串的半径
    - 利用回文的对称性，避免重复计算

    为什么正确：
    - 改造后的字符串中，每个回文子串都有唯一的中心
    - 利用已计算过的回文区间，通过对称性推断新区间的初始值
    - 只需在超出已知范围时进行暴力扩展

    时间复杂度：O(n) - 每个字符最多被访问常数次
    空间复杂度：O(n) - 需要存储改造后的字符串和half_len数组
    """

    def countSubstrings(self, s: str) -> int:
        # Manacher 模板
        # 将 s 改造为 t，这样就不需要讨论 len(s) 的奇偶性，因为新串 t 的每个回文子串都是奇回文串（都有回文中心）
        # s 和 t 的下标转换关系：
        # (si+1)*2 = ti
        # ti/2-1 = si
        # ti 为偶数，对应奇回文串（从 2 开始）
        # ti 为奇数，对应偶回文串（从 3 开始）
        t = "#".join("^" + s + "$")

        # 定义一个奇回文串的回文半径=(长度+1)/2，即保留回文中心，去掉一侧后的剩余字符串的长度
        # half_len[i] 表示在 t 上的以 t[i] 为回文中心的最长回文子串的回文半径
        # 即 [i-half_len[i]+1, i+half_len[i]-1] 是 t 上的一个回文子串
        half_len = [0] * (len(t) - 2)
        half_len[1] = 1
        # box_r 表示当前右边界下标最大的回文子串的右边界下标+1
        # box_m 为该回文子串的中心位置，二者的关系为 r=mid+half_len[mid]
        ans = box_m = box_r = 0
        for i in range(2, len(half_len)):
            hl = 1
            if i < box_r:
                # 记 i 关于 box_m 的对称位置 i' = box_m * 2 - i
                # 若以 i' 为中心的最长回文子串范围超出了以 box_m 为中心的回文串的范围（即 i+half_len[i'] >= box_r）
                # 则 half_len[i] 应先初始化为已知的回文半径 box_r - i，然后再继续暴力匹配
                # 否则 half_len[i] 与 half_len[i'] 相等
                hl = min(half_len[box_m * 2 - i], box_r - i)

            # 暴力扩展
            # 算法的复杂度取决于这部分执行的次数
            # 由于扩展之后 box_r 必然会更新（右移），且扩展的的次数就是 box_r 右移的次数
            # 因此算法的复杂度 = O(len(t)) = O(n)
            while t[i - hl] == t[i + hl]:
                hl += 1
                box_m, box_r = i, i + hl

            half_len[i] = hl
            ans += hl // 2

        return ans

# 中心扩展解法（供参考）：
# for i in range(2 * n - 1):
#     l, r = i // 2, (i + 1) // 2
#     while l >= 0 and r < n and s[l] == s[r]:
#         ans += 1
#         l -= 1
#         r += 1
# 枚举每个中心（2n-1个，包括字符间），向两边扩展
# 时间复杂度 O(n^2)，空间复杂度 O(1)
# @lc code=end



#
# @lcpr case=start
# "abc"\n
# @lcpr case=end

# @lcpr case=start
# "aaa"\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        ("abc", 3),
        # "a", "b", "c" 三个单字符回文
        ("aaa", 6),
        # "a", "a", "a", "aa", "aa", "aaa" = 6个
        ("abba", 6),
        # "a", "b", "b", "a", "bb", "abba" = 6个
        ("abcba", 7),
        # "a", "b", "c", "b", "a", "bcb", "abcba" = 7个
    ]

    for s, expected in tests:
        result = sol.countSubstrings(s)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} countSubstrings('{s}') = {result}, expected = {expected}")
