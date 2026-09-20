from typing import Optional

# class ListNode:
#     def __init__(self, x):
#         self.val = x
#         self.next = None

# 兼容本地运行：牛客/笔试环境已提供 ListNode，本地测试时再补定义
try:
    ListNode
except NameError:
    class ListNode:
        def __init__(self, x=0, next=None):
            self.val = x
            self.next = next

#
# Note: 类名、方法名、参数名已经指定，请勿修改
#
# 合并两个降序链表为一个升序链表
# @param l1 ListNode类  降序链表
# @param l2 ListNode类  降序链表
# @return ListNode类
#

# ================= 原始实现（保留作对比参考） =================
# 原解法想"先反转两条链表、再归并"，但存在两处致命错误：
#   1. `while tail1: tail1 = tail1.next` 会把 tail1 走成 None，
#      并没有真正找到并保存链表尾节点；
#   2. `self.ReverseList(head1)` 的返回值被丢弃，
#      反转后新的头节点没有被拿到，导致后续合并全部建立在错误指针上。
# 结果：任何非空输入都会返回空链表。
#
# class Solution:
#     def MergeList(self, l1, l2) :
#         head1 = l1
#         head2 = l2
#         if not head1 and not head2:
#             return head1
#         tail1 = head1
#         tail2 = head2
#         while tail1:
#             tail1 = tail1.next
#         while tail2:
#             tail2 = tail2.next
#         self.ReverseList(head1)
#         self.ReverseList(head2)
#         head1 = tail1
#         head2 = tail2
#         if head2 and not head1:
#             return head2
#         if head1 and not head2:
#             return head1
#         if head1.val > head2.val:
#             tmp = head1
#             head1 = head2
#             head2 = tmp
#         while head1 and head1.next and head2:
#             if head1.next.val>=head2.val:
#                 tmp = head2.next
#                 head2.next = head1.next
#                 head1.next = head2
#                 head1 = head1.next
#                 head2 = tmp
#             if head1.next.val < head2.val:
#                 head1=head1.next
#         if head2 and not head1.next:
#             head1.next = head2
#         return head1
#
#     def ReverseList(self,head):
#         if not head or not head.next:
#             return head
#         self.ReverseList(head.next)
#         head.next.next = head
#         head.next = None
#         return head
# ==============================================================


class Solution:
    """
    两个降序链表合并为一个升序链表

    核心思路：
    1. 两条链表都是降序的（从头到尾值递减）。直接做标准"归并"，
       每次取两条链表当前头节点中较大的一个接到结果链表末尾，
       得到一条全局降序链表；
    2. 最后把这条降序链表整体反转一次，就得到升序结果。

    为什么这样做是对的：
    - "每次取较大头" => 结果从头到尾递减，即降序；
    - 反转一次 => 从头到尾递增，即升序。
    整个过程只反转一次，且只复用原节点，空间开销为 O(1)。

    时间复杂度：O(n+m)，n、m 分别为两条链表的长度
    空间复杂度：O(1)
    """

    def MergeList(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        # 1. 归并两条降序链表 => 一条降序链表（每次取较大头）
        dummy = ListNode(0)          # 哑节点：统一处理头节点，避免特判
        cur = dummy                  # 结果链表末尾指针
        while l1 and l2:
            if l1.val >= l2.val:
                cur.next = l1        # 取 l1 的当前节点
                l1 = l1.next
            else:
                cur.next = l2        # 取 l2 的当前节点
                l2 = l2.next
            cur = cur.next

        # 某条链表已空，另一条链表的剩余部分直接接上（仍为降序）
        cur.next = l1 if l1 else l2

        # 2. 整体反转 => 升序链表
        return self._reverse(dummy.next)

    def _reverse(self, head: Optional[ListNode]) -> Optional[ListNode]:
        """迭代反转链表，返回反转后的新头节点"""
        prev = None
        cur = head
        while cur:
            nxt = cur.next           # 先保存后继，防止断链
            cur.next = prev          # 反转指针方向
            prev = cur               # prev 前移
            cur = nxt                # cur 前移
        return prev


if __name__ == "__main__":

    def _to_node(arr):
        """数组 -> 链表"""
        head = ListNode(0)
        cur = head
        for v in arr:
            cur.next = ListNode(v)
            cur = cur.next
        return head.next

    def _to_list(node):
        """链表 -> 数组"""
        res = []
        while node:
            res.append(node.val)
            node = node.next
        return res

    sol = Solution()

    tests = [
        # (l1 降序, l2 降序, 期望升序结果)
        ([5, 3, 1], [4, 2], [1, 2, 3, 4, 5]),
        ([4, 2], [5, 3, 1], [1, 2, 3, 4, 5]),
        ([], [], []),
        ([], [3, 1], [1, 3]),
        ([2, 1], [], [1, 2]),
        ([1], [1], [1, 1]),
        ([6, 4, 4, 2], [5, 3, 1], [1, 2, 3, 4, 4, 5, 6]),
    ]

    for l1, l2, expected in tests:
        result = _to_list(sol.MergeList(_to_node(l1), _to_node(l2)))
        status = "OK " if result == expected else "FAIL"
        print(f"[{status}] MergeList({l1}, {l2}) = {result}, expected = {expected}")
        assert result == expected, f"case failed: {l1}, {l2}"

    print("All tests passed!")