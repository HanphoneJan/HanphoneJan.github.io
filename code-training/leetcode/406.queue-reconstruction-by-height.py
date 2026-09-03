#
# @lc app=leetcode.cn id=406 lang=python3
# @lcpr version=30204
#
# [406] 根据身高重建队列
#


# @lcpr-template-start
from typing import List
# @lcpr-template-end
# @lc code=start
class Solution:
    """
    根据身高重建队列 - 贪心算法

    核心思路：
    - 先按身高降序排列，身高相同的按前面人数升序排列
    - 然后依次将每个人插入到结果列表的指定位置

    为什么正确：
    - 身高高的人插入时，前面已经插入的都是身高更高或相等的人
    - 所以当前人前面的人数恰好等于其在队列中的位置
    - 身高矮的人后插入，不会影响身高高的人的相对位置

    时间复杂度：O(n log n) - 排序
    空间复杂度：O(n) - 结果列表
    """

    def reconstructQueue(self, people: List[List[int]]) -> List[List[int]]:
        # 按身高降序，身高相同则按前面人数升序
        people.sort(key=lambda x: (-x[0], x[1]))
        ans = list()
        for person in people:
            # 将当前人插入到 ans[person[1]] 位置
            # 前面已经插入的都是身高 >= 当前人的人
            ans[person[1]:person[1]] = [person]  # 等价于 ans.insert(person[1], person)
        return ans

# @lc code=end



#
# @lcpr case=start
# [[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]]\n
# @lcpr case=end

# @lcpr case=start
# [[6,0],[5,0],[4,0],[3,2],[2,2],[1,4]]\n
# @lcpr case=end

#

if __name__ == "__main__":
    sol = Solution()

    tests = [
        (
            [[7,0],[4,4],[7,1],[5,0],[6,1],[5,2]],
            [[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]]
        ),
        # 排序后：[7,0],[7,1],[6,1],[5,0],[5,2],[4,4]
        # 插入过程：
        # [7,0] -> [[7,0]]
        # [7,1] -> [[7,0],[7,1]]
        # [6,1] -> [[7,0],[6,1],[7,1]]
        # [5,0] -> [[5,0],[7,0],[6,1],[7,1]]
        # [5,2] -> [[5,0],[7,0],[5,2],[6,1],[7,1]]
        # [4,4] -> [[5,0],[7,0],[5,2],[6,1],[4,4],[7,1]]
        (
            [[6,0],[5,0],[4,0],[3,2],[2,2],[1,4]],
            [[4,0],[5,0],[2,2],[3,2],[1,4],[6,0]]
        ),
    ]

    for people, expected in tests:
        result = sol.reconstructQueue(people)
        status = "[OK]" if result == expected else "[FAIL]"
        print(f"{status} reconstructQueue({people}) = {result}, expected = {expected}")
