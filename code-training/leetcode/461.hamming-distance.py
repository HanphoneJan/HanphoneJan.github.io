#
# @lc app=leetcode.cn id=461 lang=python3
# @lcpr version=30204
#
# [461] 汉明距离
#


# @lcpr-template-start
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    汉明距离 - 位运算

    核心思路：
    - 两个整数的汉明距离 = 它们二进制表示中不同位的个数
    - 先对两个数进行异或运算(xor)，xor中为1的位就是不同的位
    - 然后统计xor中1的个数

    三种统计方法：
    1. bin().count('1')：Python内置方法，最简洁
    2. 逐位检查：循环检查最低位，右移
    3. Brian Kernighan算法：每次清除最低位的1，循环次数等于1的个数

    时间复杂度：O(1) - 整数位数固定(32位)
    空间复杂度：O(1)
    """

    # 方法1：内置函数 bin() 和 count()，最简洁
    def hammingDistance(self, x: int, y: int) -> int:
        return bin(x ^ y).count('1')

    # 方法2：位运算逐位检查（使用移位），自己造轮子
    def hammingDistance2(self, x: int, y: int) -> int:
        xor = x ^ y
        distance = 0
        while xor:
            distance += xor & 1  # 检查最低位是否为1
            xor >>= 1            # 右移一位
        return distance

    # 方法3：Brian Kernighan算法（更高效，只循环1的个数次）
    def hammingDistance3(self, x: int, y: int) -> int:
        xor = x ^ y
        distance = 0
        while xor:
            xor &= xor - 1  # 清除最低位的1
            distance += 1
        return distance

# @lc code=end



#
# @lcpr case=start
# 1\n4\n
# @lcpr case=end

# @lcpr case=start
# 3\n1\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        (1, 4, 2),
        # 1: 0b001
        # 4: 0b100
        # xor: 0b101 = 5, 有2个1
        (3, 1, 1),
        # 3: 0b11
        # 1: 0b01
        # xor: 0b10 = 2, 有1个1
        (0, 0, 0),
        (2147483647, 0, 31),
        # 2147483647 = 0b1111111111111111111111111111111, 有31个1
    ]

    for x, y, expected in tests:
        result = sol.hammingDistance(x, y)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} hammingDistance({x}, {y}) = {result}, expected = {expected}")
        # 验证三种方法结果一致
        r2 = sol.hammingDistance2(x, y)
        r3 = sol.hammingDistance3(x, y)
        assert result == r2 == r3, f"三种方法结果不一致: {result}, {r2}, {r3}"
