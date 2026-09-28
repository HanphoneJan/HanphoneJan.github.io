# @nc app=nowcoder id=e5b39c9034a84bf2a5e026b2b9b973d0 topic=37 question=46409 lang=Python3
# 2026-09-29 01:16:36
# https://www.nowcoder.com/practice/e5b39c9034a84bf2a5e026b2b9b973d0?tpId=37&tqId=46409
# [HJ144] 小红书推荐系统

"""
HJ144. 小红书推荐系统 —— 哈希计数 / 排序

题目描述：
给定小红的搜索记录（分词后的结果），单词出现次数不少于 3 次的即为"关键词"。
请按搜索频次从高到低输出所有关键词；频次相同则按字典序升序输出。

输入格式：
一行字符串，仅由小写字母和空格组成。

输出格式：
每行一个关键词，按频次降序、同频字典序升序输出。

核心思路：
- 用 Counter 统计每个单词出现次数。
- 过滤出次数 >= 3 的单词。
- 排序：先按次数降序，再按单词字典序升序。
"""

# @sample-start
"""
样例输入 1:
kou red game red ok who game red karaoke yukari kou red red nani kou can koukou ongakugame game

样例输出 1:
red
game
kou
"""
# @sample-end

# @nc code=start

import sys
from collections import Counter


def solve() -> None:
    """主求解函数"""
    s = sys.stdin.readline().strip()
    words = s.split()
    cnt = Counter(words)

    # 过滤出现 >= 3 次的单词
    keywords = [(w, c) for w, c in cnt.items() if c >= 3]
    # 频次降序，同频字典序升序
    keywords.sort(key=lambda x: (-x[1], x[0]))

    for w, _ in keywords:
        print(w)


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("kou red game red ok who game red karaoke yukari kou red red nani kou can koukou ongakugame game\n",
         "red\ngame\nkou"),
        ("a a a\n", "a"),
        ("a a a b b b\n", "a\nb"),
        ("a b c\n", ""),
    ]
    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            output = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout
        status = "✓" if output == expected else "✗"
        print(f"样例 {i}: {status} 期望={expected!r}, 实际={output!r}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        solve()


# @nc code=end