# @nc app=nowcoder id=8e400fd9905747e4acc2aeed7240978b topic=37 question=21291 lang=Python3
# 2026-09-25 15:42:03
# https://www.nowcoder.com/practice/8e400fd9905747e4acc2aeed7240978b?tpId=37&tqId=21291
# [HJ68] 成绩排序

"""
HJ68. 成绩排序 —— 稳定排序

题目描述：
输入若干学生的姓名和成绩，按成绩排序。
- 排序方式 flag=0：按成绩从高到低（降序）
- 排序方式 flag=1：按成绩从低到高（升序）
成绩相同时，按照输入顺序排列（稳定排序）。

输入格式：
- 第1行：学生人数 n
- 第2行：排序方式 flag（0 降序，1 升序）
- 第 n 行：每行 姓名 成绩

输出格式：
排序后的 n 行，每行 姓名 成绩。

核心思路：
- 记录学生顺序，按成绩排序，成绩相同保持输入顺序 → 稳定排序。
- Python 的 list.sort / sorted 默认稳定，直接按成绩作为 key 排序即可。
- 降序用 reverse=True。
"""

# @sample-start
"""
样例输入 1:
3
0
fang 90
yang 50
ning 70

样例输出 1:
fang 90
ning 70
yang 50
"""
# @sample-end

# @sample-start
"""
样例输入 2:
3
1
fang 90
yang 50
ning 70

样例输出 2:
yang 50
ning 70
fang 90
"""
# @sample-end

# @nc code=start

import sys


def solve() -> None:
    """主求解函数"""
    data = sys.stdin.buffer.read().split()
    it = iter(data)

    n = int(next(it))
    flag = int(next(it))  # 0 降序，1 升序

    students = []
    for _ in range(n):
        name = next(it)
        if isinstance(name, bytes):
            name = name.decode()
        score = int(next(it))
        students.append((name, score))

    # 稳定排序：成绩相同保持输入顺序
    students.sort(key=lambda x: x[1], reverse=(flag == 0))

    out = "\n".join(f"{name} {score}" for name, score in students)
    sys.stdout.write(out + "\n")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("3\n0\nfang 90\nyang 50\nning 70\n",
         "fang 90\nning 70\nyang 50"),
        ("3\n1\nfang 90\nyang 50\nning 70\n",
         "yang 50\nning 70\nfang 90"),
        ("4\n0\na 70\nb 70\nc 60\nd 80\n",
         "d 80\na 70\nb 70\nc 60"),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        class FakeStdin:
            def __init__(self, s):
                self.buffer = io.BytesIO(s.encode())
        sys.stdin = FakeStdin(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected}, 实际={output}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end