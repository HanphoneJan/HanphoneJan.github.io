# @nc app=nowcoder id=184edec193864f0985ad2684fbc86841 topic=37 question=21243 lang=Python3
# 2026-09-29 01:05:08
# https://www.nowcoder.com/practice/184edec193864f0985ad2684fbc86841?tpId=37&tqId=21243
# [HJ20] 密码验证合格程序

"""
HJ20. 密码验证合格程序 —— 字符串 / 模拟

题目描述：
判断输入的密码是否满足以下全部条件：
1. 长度超过 8 位；
2. 包含大写字母、小写字母、数字、其他符号四类中至少三类；
3. 不能有长度大于等于 2 的相同子串重复（即任意两个长度相同的子串不能相同）。

输入格式：
多行，每行一个密码。

输出格式：
每行输出该密码是否合格："OK" 或 "NG"。

核心思路：
- 条件1：len(pwd) > 8。
- 条件2：用集合统计字符类型种数。
- 条件3：检查所有长度为 3 的连续子串是否有重复即可（若存在长度 ≥3 的重复子串，
  则其中必有长度为 3 的重复子串）。
"""

# @sample-start
"""
样例输入 1:
021Abc9000
021Abc9Abc1
021ABC9000
021$bc9000

样例输出 1:
OK
NG
NG
OK
"""
# @sample-end

# @nc code=start

import sys


def is_valid(pwd: str) -> bool:
    """判断单个密码是否合格"""
    # 条件1：长度超过 8 位
    if len(pwd) <= 8:
        return False

    # 条件2：四类字符至少占三类
    kinds = 0
    if any(c.islower() for c in pwd):
        kinds += 1
    if any(c.isupper() for c in pwd):
        kinds += 1
    if any(c.isdigit() for c in pwd):
        kinds += 1
    if any(not c.isalnum() for c in pwd):
        kinds += 1
    if kinds < 3:
        return False

    # 条件3：任意长度 >= 2 的子串不能重复。
    # 只需检查所有长度为 3 的子串是否有重复即可。
    seen = set()
    for i in range(len(pwd) - 2):
        sub = pwd[i:i + 3]
        if sub in seen:
            return False
        seen.add(sub)

    return True


def solve() -> None:
    """主求解函数"""
    for line in sys.stdin:
        pwd = line.strip()
        print("OK" if is_valid(pwd) else "NG")


def run_tests() -> None:
    """运行嵌入的样例测试"""
    import io

    test_cases = [
        ("021Abc9000\n021Abc9Abc1\n021ABC9000\n021$bc9000\n",
         "OK\nNG\nNG\nOK"),
        ("123\n", "NG"),              # 太短
        ("12345678aA\n", "OK"),       # 三类字符
        ("aaaaaaaaaa\n", "NG"),       # 只有一类字符
        ("abc123abc\n", "NG"),        # abc 重复
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