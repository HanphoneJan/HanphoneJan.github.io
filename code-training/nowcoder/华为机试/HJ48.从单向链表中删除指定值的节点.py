# @nc app=nowcoder id=f96cd47e812842269058d483a11ced4f topic=37 question=21271 lang=Python3
# 2026-04-28 12:06:04
# https://www.nowcoder.com/practice/f96cd47e812842269058d483a11ced4f?tpId=37&tqId=21271
# [HJ48] 从单向链表中删除指定值的节点

"""
HJ48. 从单向链表中删除指定值的节点 —— 链表操作

题目描述：
定义单向链表构造方法：先输入整数 n（节点总数），再输入头节点值，
随后输入 n-1 个二元组 (a, b) 表示"在值为 b 的节点后插入值为 a 的节点"。
保证节点值不重复。构造链表后，删除给定值节点，输出剩余链表。

输入格式：
一行输入：n（节点总数）、头节点值、n-1 个二元组 (a, b)、最后整数 target（待删除节点值）。
保证每个 b 已存在于链表中，每个 a 之前不存在于链表。

输出格式：
一行输出删除后剩余链表的节点值，每个值后跟一个空格。

核心思路：
由于本题只需要构造链表后输出，不涉及复杂的链表遍历操作，
可以用 Python 列表模拟链表，利用 list.index() 和 list.insert() 完成插入，
list.remove() 完成删除。时间复杂度 O(n^2) 但代码简洁。

若使用真实链表实现（见下方注释），时间复杂度 O(n^2)（查找节点需要遍历），
空间复杂度 O(n)。
"""

# @sample-start
"""
样例输入 1:
5 2 3 2 4 3 5 2 1 4 3

样例输出 1:
2 5 4 1

说明：
- n=5, head=2, 要删除 3
- 插入操作：3 插入到 2 后 → [2,3]；4 插入到 3 后 → [2,3,4]；5 插入到 2 后 → [2,5,3,4]；1 插入到 4 后 → [2,5,3,4,1]
- 删除 3 → [2,5,4,1]
"""
# @sample-end

# @sample-start
"""
样例输入 2:
6 2 1 2 3 2 5 1 4 5 7 2 2

样例输出 2:
7 3 1 5 4
"""
# @sample-end

# @nc code=start

import sys


def solve():
    """从单向链表中删除指定值的节点

    思路：用列表模拟链表操作：
    1. 读取所有整数数据
    2. 取出 n（节点总数）、head（头节点值）、target（待删除值）
    3. 从头节点开始构建列表
    4. 每两个一组 (a, b)：找到 b 的位置，在其后插入 a
    5. 删除 target 值
    6. 按顺序输出剩余节点
    """
    data = list(map(int, sys.stdin.readline().split()))
    n = data[0]               # 节点总数
    head = data[1]            # 头节点值
    target = data[-1]         # 要删除的节点值

    # 用列表模拟链表，先放入头节点
    lst = [head]

    # 从索引 2 开始，每两个一组执行插入操作
    # i 取值为 2, 4, 6, ..., 2*(n-1) = 2n-2
    for i in range(2, 2 * n, 2):
        a = data[i]           # 待插入节点的值
        b = data[i + 1]       # 目标节点的值（在 b 后面插入 a）
        # 找到 b 在列表中的索引位置，在其后插入 a
        index_b = lst.index(b)
        lst.insert(index_b + 1, a)

    # 删除指定值节点
    lst.remove(target)

    # 输出结果：每个数后加空格
    for val in lst:
        print(val, end=' ')
    print()


# 原始链表实现（保留作为参考）
# class ListNode:
#     def __init__(self, val):
#         self.val = val
#         self.next = None
#
# def solve_linked_list():
#     data = list(map(int, sys.stdin.readline().split()))
#     n, head_val, target = data[0], data[1], data[-1]
#
#     head = ListNode(head_val)
#     for i in range(2, 2 * n, 2):
#         a_val, b_val = data[i], data[i + 1]
#         cur = head
#         while cur and cur.val != b_val:
#             cur = cur.next
#         if cur:
#             new_node = ListNode(a_val)
#             new_node.next = cur.next
#             cur.next = new_node
#
#     # 删除节点
#     if head.val == target:
#         head = head.next
#     else:
#         cur = head
#         while cur.next and cur.next.val != target:
#             cur = cur.next
#         if cur.next:
#             cur.next = cur.next.next
#
#     cur = head
#     while cur:
#         print(cur.val, end=' ')
#         cur = cur.next
#     print()


# 嵌入测试用例（输入字符串, 期望输出）
test_cases = [
    ("5 2 3 2 4 3 5 2 1 4 3\n", "2 5 4 1 "),
    ("6 2 1 2 3 2 5 1 4 5 7 2 2\n", "7 3 1 5 4 "),
]


def run_tests():
    """运行嵌入的样例测试"""
    import io
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue()
        finally:
            sys.stdout = old_stdout

        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={repr(expected)}, 实际={repr(output)}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end
