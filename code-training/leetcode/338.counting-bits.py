#
# @lc app=leetcode.cn id=338 lang=python3
# @lcpr version=30204
#
# [338] 比特位计数
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    比特位计数 - 动态规划（最高有效位）

    核心思路：
    - 利用已有的计算结果来推导新的结果
    - 找到小于等于i的最大2的幂（highBit），则 i 的1的个数 = bits[i - highBit] + 1

    为什么正确：
    - 任何正整数 i 都可以表示为 highBit + (i - highBit)，其中 highBit 是2的幂
    - 2的幂只有最高位是1，所以 i 比 (i - highBit) 多一个1
    - 例如：5 = 4 + 1，bits[5] = bits[1] + 1 = 1 + 1 = 2（5的二进制是101，有2个1）

    时间复杂度：O(n) - 只需遍历一次
    空间复杂度：O(1) - 只使用结果数组（不计入输出空间）
    """

    def countBits(self, n: int) -> List[int]:
        bits = [0]
        highBit = 0
        for i in range(1, n + 1):
            # i & (i - 1) == 0 判断 i 是否是2的整数次幂
            # 原理：2的幂只有一位是1，减1后低位全变1，与操作结果为0
            if i & (i - 1) == 0:
                highBit = i
            # i 比 (i - highBit) 多一个最高位的1
            bits.append(bits[i - highBit] + 1)
        return bits

# 其他解法参考：
# 方法1：i & (i - 1) 清除最低位的1
# bits[i] = bits[i & (i - 1)] + 1
# 原理：i & (i-1) 将i的最低位1变为0，所以i比它多一个1
#
# 方法2：i >> 1（右移一位）
# bits[i] = bits[i >> 1] + (i & 1)
# 原理：右移一位去掉最低位，再加上最低位的值
# @lc code=end



#
# @lcpr case=start
# 2\n
# @lcpr case=end

# @lcpr case=start
# 5\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        (2, [0, 1, 1]),
        # 0: 0b0 -> 0个1
        # 1: 0b1 -> 1个1
        # 2: 0b10 -> 1个1
        (5, [0, 1, 1, 2, 1, 2]),
        # 0: 0b0  -> 0
        # 1: 0b1  -> 1
        # 2: 0b10 -> 1
        # 3: 0b11 -> 2
        # 4: 0b100 -> 1
        # 5: 0b101 -> 2
        (0, [0]),
        (1, [0, 1]),
    ]

    for n, expected in tests:
        result = sol.countBits(n)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} countBits({n}) = {result}, expected = {expected}")
