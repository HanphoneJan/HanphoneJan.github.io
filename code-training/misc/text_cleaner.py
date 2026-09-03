#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
数据清洗引擎 – 文档过滤与去重

某数据清洗系统需要对输入文档进行多阶段过滤与去重处理，规则如下：

1. 空格规范化：将文档中所有连续空白字符（空格、制表符、换行等）替换为单个空格，并去除首尾空格。
2. 长度过滤：规范化后的文档长度必须在 [L, R] 范围内（包含端点），否则丢弃。
3. 语义单词提取：从规范化文档中提取所有连续字母数字序列作为语义单词（保留大小写用于显示，判断时用小写）。
4. 黑名单拦截：如果文档中存在任何语义单词出现在黑名单中（大小写不敏感），整篇文档丢弃。
5. 3-gram 复读惩罚：将文档的语义单词序列按连续3个一组划分（3-gram），
   如果某个 3-gram 出现次数超过 M 次，则整篇文档丢弃。
6. 规范化语义去重：将文档的语义单词全部转为小写，如果该序列已出现过，则丢弃。

输入格式：
- 第1行：5个整数 N L R M K（文档数、最小长度、最大长度、3-gram阈值、黑名单词数）
- 第2行：K 个黑名单词（空格分隔，K=0 时可能无此行）
- 接下来 N 行：每行一篇原始文档

输出格式：
- 过滤后保留的所有文档，每行一篇，按原始顺序输出

时间复杂度：O(N * W^2)，W 为单篇文档单词数
空间复杂度：O(N * W)
"""

import sys
import re
from collections import defaultdict

def solve() -> None:
    data = sys.stdin
    first_line = data.readline()
    if not first_line:
        return
    N, L, R, M, K = map(int, first_line.split())

    blacklist = set()
    if K > 0:
        blackline = data.readline()
        blacklist = set(blackline.strip().split())

    docs = []
    for _ in range(N):
        line = data.readline()
        docs.append(line.rstrip('\n'))

    seen_sequences = set()
    output_lines = []

    for raw in docs:
        # 1. 空格规范化
        normalized = re.sub(r'\s+', ' ', raw).strip()
        if not (L <= len(normalized) <= R):
            continue

        # 2. 语义单词提取
        words = re.findall(r'[A-Za-z0-9]+', normalized)
        words_lower = [w.lower() for w in words]

        # 3. 独立黑名单拦截
        if any(w in blacklist for w in words_lower):
            continue

        # 4. 3-gram 复读惩罚
        if len(words_lower) >= 3:
            counter = defaultdict(int)
            too_many = False
            for i in range(len(words_lower) - 2):
                gram = (words_lower[i], words_lower[i+1], words_lower[i+2])
                counter[gram] += 1
                if counter[gram] > M:
                    too_many = True
                    break
            if too_many:
                continue

        # 5. 规范化语义去重
        seq_tuple = tuple(words_lower)
        if seq_tuple in seen_sequences:
            continue
        seen_sequences.add(seq_tuple)

        output_lines.append(normalized)

    sys.stdout.write("\n".join(output_lines))

def test() -> None:
    import io

    test_cases = [
        # 样例1 (修正期望输出，去掉句点)
        (
            "3 10 100 2 1\n"
            "spam\n"
            "Buy cheap SPAM!!!\n"
            "He is a spammer\n"
            "He is, A! Spammer.\n",
            "He is a spammer"
        ),
        # 样例2
        (
            "2 10 200 2 0\n"
            "a b c a b c a b c\n"
            "a b c a b c\n",
            "a b c a b c"
        ),
        # 长度过滤：规范化后"a b"长度为3，在[3,10]内，应输出
        (
            "1 3 10 1 0\n"
            "   a   b   \n",
            "a b"
        ),
        # 黑名单精确匹配
        (
            "2 1 100 1 2\n"
            "spam ham\n"
            "I like spam\n"
            "I like spammer\n",
            "I like spammer"
        ),
        # 3-gram复读惩罚：第一篇合法（无重复3-gram），第二篇非法
        (
            "2 1 100 1 0\n"
            "a b c d e\n"
            "a b c a b c a b c\n",
            "a b c d e"
        ),
        # 语义去重
        (
            "3 1 100 1 0\n"
            "Hello, world!\n"
            "hello   world\n"
            "HELLO WORLD\n",
            "Hello, world!"
        ),
        # 混合规则：展示所有过滤步骤
        (
            "5 10 200 1 1\n"
            "badword\n"
            "This is a badword test\n"
            "A B C A B C A B C\n"
            "Hello, world! How are you?\n"
            "hello   world   how   are   you\n"
            "Another good doc\n",
            "Hello, world! How are you?\nAnother good doc"
        ),
        # 边界：M=0时，任何3-gram出现>0即非法（即不能有任何重复的三元组）
        (
            "2 1 100 0 0\n"
            "a b c d\n"          # 3-gram (a,b,c)和(b,c,d)各出现1次，>0，应丢弃
            "a b c a b c\n",     # 3-gram (a,b,c)出现2次，>0，应丢弃
            ""                   # ✅ 修正后，此处预期输出应为空
        ),
        # ✅ 新增：M=0 且文档长度小于3，无3-gram应通过
        (
            "1 1 100 0 0\n"
            "hello world\n",     # 只有2个单词，没有3-gram，应通过
            "hello world"
        ),
        # 空输出情况：所有文档均被过滤
        (
            "2 1 100 1 0\n"
            "a b c a b c d\n"    # 3-gram (a,b,c)出现2次>1
            "x y z x y z\n",     # (x,y,z)出现2次>1
            ""
        ),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        sys.stdin = io.StringIO(inp)
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            solve()
            out = sys.stdout.getvalue().strip()
        finally:
            sys.stdout = old_stdout

        expected = expected.strip()
        status = "✓" if out == expected else "✗"
        print(f"测试用例 {i}: {status}")
        if out != expected:
            print(f"  期望:\n{expected if expected else '(空)'}")
            print(f"  实际:\n{out if out else '(空)'}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        test()
    else:
        solve()