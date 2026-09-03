#
# @lc app=leetcode.cn id=328 lang=python3
# @lcpr version=30204
#
# [328] 奇偶链表
#


# @lcpr-template-start
from typing import Optional


# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


# @lcpr-template-end
# @lc code=start
class Solution:
    """
    奇偶链表 - 双指针分组重组

    核心思想：
    将链表按节点位置的奇偶性分成两组，奇数位置的节点连在一起，
    偶数位置的节点连在一起，最后把偶数组接到奇数组末尾。

    关键点：这里说的"奇偶"是指节点的位置序号（第1个、第2个...），
    而不是节点值本身的奇偶性。

    为什么不用额外空间？
    链表节点的 next 指针天然可以重新连接，只需改变指针指向即可，
    不需要创建新节点。

    时间复杂度：O(n)，遍历链表一次
    空间复杂度：O(1)，只使用常数个指针
    """

    def oddEvenList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        """
        解法：双指针原地重组

        思路：
        1. 用 odd 指针遍历奇数位置的节点
        2. 用 even 指针遍历偶数位置的节点
        3. 用 even_head 保存偶数链表的头节点（用于最后拼接）
        4. 遍历结束后，将 even_head 接到 odd 链表末尾

        终止条件：
        even 为 None（链表长度为偶数）或 even.next 为 None（链表长度为奇数）
        """
        # 空链表或只有一个节点，直接返回
        if not head or not head.next:
            return head

        # odd 指向第1个节点（奇数位置）
        odd = head
        # even 指向第2个节点（偶数位置）
        even = head.next
        # 保存偶数链表的头节点
        even_head = even

        # 遍历链表，每次移动两个位置
        # 终止条件：even 为空（链表长度为偶数）或 even.next 为空（链表长度为奇数）
        while even and even.next:
            # odd 的下一个应该是 even 的下一个（即下一个奇数位置节点）
            odd.next = even.next
            odd = odd.next  # odd 前进一步

            # even 的下一个应该是 odd 的下一个（即下一个偶数位置节点）
            even.next = odd.next
            even = even.next  # even 前进一步

        # 将偶数链表接到奇数链表末尾
        odd.next = even_head

        return head


# @lc code=end



#
# @lcpr case=start
# [1,2,3,4,5]\n
# @lcpr case=end

# @lcpr case=start
# [2,1,3,5,6,4,7]\n
# @lcpr case=end

#

# ========== 示例推演：head = [1,2,3,4,5] ==========
#
# 初始状态：
#   odd -> 1 -> 2 -> 3 -> 4 -> 5 -> None
#   even -> 2 -> 3 -> 4 -> 5 -> None
#   even_head -> 2
#
# 第1轮（even=2, even.next=3 存在）：
#   odd.next = even.next = 3   →  odd -> 1 -> 3
#   odd = odd.next = 3
#   even.next = odd.next = 4   →  even -> 2 -> 4
#   even = even.next = 4
#
# 第2轮（even=4, even.next=5 存在）：
#   odd.next = even.next = 5   →  odd -> 3 -> 5
#   odd = odd.next = 5
#   even.next = odd.next = None →  even -> 4 -> None
#   even = even.next = None
#
# 循环结束（even 为 None）
# odd.next = even_head = 2    →  5 -> 2
#
# 最终结果：1 -> 3 -> 5 -> 2 -> 4 -> None
#
# ========== 示例推演：head = [2,1,3,5,6,4,7] ==========
#
# 初始状态：
#   odd -> 2 -> 1 -> 3 -> 5 -> 6 -> 4 -> 7 -> None
#   even -> 1 -> 3 -> 5 -> 6 -> 4 -> 7 -> None
#   even_head -> 1
#
# 第1轮（even=1, even.next=3 存在）：
#   odd.next = 3, odd = 3
#   even.next = 5, even = 5
#
# 第2轮（even=5, even.next=6 存在）：
#   odd.next = 6, odd = 6
#   even.next = 4, even = 4
#
# 第3轮（even=4, even.next=7 存在）：
#   odd.next = 7, odd = 7
#   even.next = None, even = None
#
# 循环结束（even 为 None）
# odd.next = even_head = 1    →  7 -> 1
#
# 最终结果：2 -> 3 -> 6 -> 7 -> 1 -> 5 -> 4 -> None


# 辅助函数：将列表转换为链表
def build_linked_list(nums):
    """将列表转换为链表，返回头节点"""
    if not nums:
        return None
    head = ListNode(nums[0])
    cur = head
    for val in nums[1:]:
        cur.next = ListNode(val)
        cur = cur.next
    return head


# 辅助函数：将链表转换为列表
def linked_list_to_list(head):
    """将链表转换为列表"""
    result = []
    while head:
        result.append(head.val)
        head = head.next
    return result


if __name__ == "__main__":
    sol = Solution()

    tests = [
        # (输入列表, 期望输出列表)
        ([1, 2, 3, 4, 5], [1, 3, 5, 2, 4]),
        ([2, 1, 3, 5, 6, 4, 7], [2, 3, 6, 7, 1, 5, 4]),
        # 边界：空链表
        ([], []),
        # 边界：单个节点
        ([1], [1]),
        # 边界：两个节点
        ([1, 2], [1, 2]),
        # 边界：三个节点
        ([1, 2, 3], [1, 3, 2]),
    ]

    for i, (nums, expected) in enumerate(tests):
        head = build_linked_list(nums)
        result_head = sol.oddEvenList(head)
        result = linked_list_to_list(result_head)
        status = "✓" if result == expected else "✗"
        print(f"Test {i+1}: {status} oddEvenList({nums}) = {result}, expected = {expected}")
