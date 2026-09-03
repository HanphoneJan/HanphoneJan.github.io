# @nc app=nowcoder id=12e081cd10ee4794a2bd70c7d68f5507 topic=37 question=21308 lang=Python3
# 2026-04-28 12:24:48
# https://www.nowcoder.com/practice/12e081cd10ee4794a2bd70c7d68f5507?tpId=37&tqId=21308
# [HJ85] 最长回文子串

"""
HJ85. 最长回文子串 —— 双指针/中心扩展

题目描述：
求小写字母字符串的最长回文子串长度。
子串为连续选择一段字符（可全选、可不选），
回文串即"从左往右读和从右往左读是相同的"。

输入格式：
一行上输入一个长度为 n、仅由小写字母构成的字符串

输出格式：
输出一个整数，表示字符串的最长回文子串的长度

核心思路：
中心扩展法 —— 枚举每个可能的回文中心，向两边扩展：
1. 奇数长度回文：中心为单个字符，左右指针从同一位置开始
2. 偶数长度回文：中心为两个相同字符之间，左右指针从相邻位置开始

时间复杂度：O(n^2)，每个中心最多扩展 n 次
空间复杂度：O(1)，只使用常数额外空间
"""

# @sample-start
"""
样例输入 1:
cdabbacc

样例输出 1:
4

说明："abba" 是最长回文子串
"""
# @sample-end

# @sample-start
"""
样例输入 2:
a

样例输出 2:
1
"""
# @sample-end

# @nc code=start

import sys


def longest_palindrome(s: str) -> int:
    """求字符串的最长回文子串长度（中心扩展法）

    思路：
    回文串关于中心对称。枚举每个字符作为回文中心，向两边扩展：
    - 奇数长度：中心是一个字符，left = right = i
    - 偶数长度：中心是两个字符之间，left = i, right = i + 1
    每次扩展时比较 s[left] == s[right]，相等则继续，否则停止。
    记录过程中遇到的最大长度。

    Args:
        s: 输入字符串，仅由小写字母构成

    Returns:
        最长回文子串的长度
    """
    n = len(s)
    if n <= 1:
        return n

    ans = 1  # 至少单个字符是回文

    for i in range(n):
        # 情况一：奇数长度回文，中心为 s[i]
        left = right = i
        while left >= 0 and right < n and s[left] == s[right]:
            ans = max(ans, right - left + 1)
            left -= 1
            right += 1

        # 情况二：偶数长度回文，中心在 s[i] 和 s[i+1] 之间
        left, right = i, i + 1
        while left >= 0 and right < n and s[left] == s[right]:
            ans = max(ans, right - left + 1)
            left -= 1
            right += 1

    return ans


# 嵌入测试用例
test_cases = [
    ("cdabbacc", 4),
    ("a", 1),
    ("aa", 2),
    ("abcba", 5),
    ("abba", 4),
    ("abcdef", 1),
    ("aaaa", 4),
]


def run_tests():
    """运行嵌入的样例测试"""
    for i, (inp, expected) in enumerate(test_cases, 1):
        result = longest_palindrome(inp)
        status = "✓" if result == expected else "✗"
        print(f"样例 {i}: {status} 输入={repr(inp)}, 期望={expected}, 实际={result}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        for line in sys.stdin:
            s = line.strip()
            if s:
                print(longest_palindrome(s))


# @nc code=end
