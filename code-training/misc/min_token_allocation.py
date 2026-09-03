"""
最小 Token 分配 - 贪心双遍历

给定一个任务优先级列表 priorities，其中 priorities[i] 表示第 i 个任务的优先级。
现在需要为每个任务分配 token，规则如下：
1. 每个正优先级任务至少分配 1 个 token。
2. 优先级为 0 或负数的任务不需要 token。
3. 对于连续的正优先级任务，如果某个任务的优先级高于其相邻任务，则它需要比相邻任务更多的 token。

目标是计算满足上述条件所需的最小 token 总数。

输入格式：
- 一行：逗号分隔的整数 priorities

输出格式：
- 一个整数，表示最小 token 总数

核心思路（双遍历贪心）：
1. 将 priorities 分成若干连续正数段（0 或负数作为分隔）
2. 对每个正数段，先从左到右遍历：如果右侧优先级更高，则右侧 token = 左侧 + 1
3. 再从右到左遍历：如果左侧优先级更高，则左侧 token = max(当前值, 右侧 + 1)
4. 累加所有 token

本质：经典的"分发糖果"（Candy）问题的 ACM 变体

时间复杂度：O(N)
空间复杂度：O(N)
"""

import sys

# @sample-start
"""
样例输入 1:
1,2,2

样例输出 1:
4
说明：三个任务都需 token，分配 [1,2,1]，总计 4
"""
# @sample-end

# @sample-start
"""
样例输入 2:
1,0,2

样例输出 2:
3
说明：中间任务优先级为0，不需 token，分配 [1,0,1]，总计 2
"""
# @sample-end

def min_total_tokens(priorities):
    """计算满足条件的最小 token 总数"""
    n = len(priorities)
    tokens = [0] * n

    i = 0
    while i < n:
        # 跳过非正数任务
        if priorities[i] <= 0:
            i += 1
            continue

        # 找到一个连续的正数段
        start = i
        while i < n and priorities[i] > 0:
            i += 1
        end = i  # 不包含end

        # 处理这一段 [start, end)
        seg_len = end - start
        seg_tokens = [1] * seg_len

        # 从左到右：右侧优先级更高时递增
        for j in range(start + 1, end):
            if priorities[j] > priorities[j-1]:
                seg_tokens[j - start] = seg_tokens[j - start - 1] + 1

        # 从右到左：左侧优先级更高时取最大值
        for j in range(end - 2, start - 1, -1):
            if priorities[j] > priorities[j+1]:
                seg_tokens[j - start] = max(seg_tokens[j - start], seg_tokens[j - start + 1] + 1)

        # 赋值回原数组
        for j in range(start, end):
            tokens[j] = seg_tokens[j - start]

    return sum(tokens)

def run_tests():
    """运行嵌入的样例测试"""
    import io
    test_cases = [
        ("1,2,2\n", 4),      # 经典样例：分配 [1,2,1]
        ("1,0,2\n", 2),      # 中间为0，不需 token
        ("1,2,2,5,0,-1,3\n", 9),  # 混合正负数
        ("5,4,3,2,1\n", 15), # 严格递减 [5,4,3,2,1]
        ("1,2,3,4,5\n", 15), # 严格递增 [1,2,3,4,5]
        ("0,0,0\n", 0),      # 全为0
        ("3\n", 1),          # 单任务
        ("-1,-2,-3\n", 0),   # 全负数
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        line = sys.stdin.readline().strip()
        priorities = list(map(int, line.split(',')))
        actual = min_total_tokens(priorities)
        status = "✓" if actual == expected else "✗"
        print(f"样例 {i}: 期望={expected}, 实际={actual} {status}")

def main():
    """主函数：读取输入并输出结果"""
    line = sys.stdin.readline().strip()
    if not line:
        print(0)
        return
    priorities = list(map(int, line.split(',')))
    result = min_total_tokens(priorities)
    print(result)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        main()
