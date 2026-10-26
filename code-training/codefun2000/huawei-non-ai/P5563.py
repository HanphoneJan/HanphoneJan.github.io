"""
P5563. 边缘模型清洗 - 注释感知的单遍扫描模拟

把 YANG 文本里 remark / preset / required 三个关键字所在的语句删掉，
注释原样保留。特殊的删除方式：从关键字第一个字符起删到本句结束的 ';'，
这段闭区间里的所有字符都丢掉，唯独换行符保留 —— 于是跨行语句的行数不变，
关键字左侧的缩进因为在区间外而照原样留下。

输入格式：
- 一段 YANG 文本（可能多行）。

输出格式：
- 清洗后的文本。

核心思路：
1. 单遍扫描。先认注释：遇到 // 抄到行尾、遇到 /* 抄到 */，注释内部
   不再找关键字 —— 这是注释保护的全部实现。
2. 正文里若当前位置正好以 remark / preset / required 之一开头，再核对
   两侧边界：左侧必须是行首、空格、制表符、{ 或 ;（否则像 myremark 一样
   当普通名字）；右侧必须是空格、制表符、换行或 ';'。
3. 两侧都合法时，找到后面第一个 ';'（题面保证语句内不夹注释、引号内
   不嵌关键字，因此直接找即可）。区间里逐字符检查，只有 '\n' 写进结果，
   表示"这些行的骨架还在"；扫描位置跳到分号之后。
4. 其余字符原样写入，前进一格。

时间复杂度：O(len)（每字符常数趟，关键字分发用元组循环，长度固定为 3）
空间复杂度：O(len)
"""

# https://codefun2000.com/p/P5563
import sys

KEYWORDS = ("remark", "preset", "required")

# @sample-start
"""
样例输入 1:
container node {
    leaf port {
        type string;
        remark "Edge port";
        preset "eth0";
    }
/*
块注释中出现 remark "fake";
整段都要留下
*/
    leaf flag {
        type string;
        remark
            "Line-a
            Line-b";
        required true;
    }
    leaf alias {
        type string;
        myremark "keep";
    }
}

样例输出 1:
container node {
    leaf port {
        type string;
[8 个空格]
[8 个空格]
    }
/*
块注释中出现 remark "fake";
整段都要留下
*/
    leaf flag {
        type string;
[8 个空格]
[空行]
[空行]
[8 个空格]
    }
    leaf alias {
        type string;
        myremark "keep";
    }
}
"""
# @sample-end

# @sample-start
"""
样例输入 2:
leaf y {
    remark "y";
}

样例输出 2:
leaf y {
[4 个空格]
}
"""
# @sample-end


def solve():
    text = sys.stdin.read()

    out = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        # 注释保护：整段照抄，内部不再找关键字
        if ch == "/" and text[i + 1 : i + 2] == "/":
            end = text.find("\n", i)
            if end == -1:
                end = n
            out.append(text[i:end])
            i = end
            continue
        if ch == "/" and text[i + 1 : i + 2] == "*":
            end = text.find("*/", i + 2)
            end = n if end == -1 else end + 2
            out.append(text[i:end])
            i = end
            continue

        # 关键字识别 + 两侧边界
        removed = False
        for kw in KEYWORDS:
            if text.startswith(kw, i):
                klen = len(kw)
                left = i == 0 or text[i - 1] in " \t{;\n"
                if i + klen < n:
                    right = text[i + klen] in " \t\n;"
                else:
                    right = True
                if left and right:
                    semi = text.find(";", i + klen)
                    if semi == -1:
                        # 题面保证分号存在；无分号时按普通文本对待
                        break
                    # 闭区间 [i, semi] 里只保留换行符：行的骨架不增不减
                    out.append("\n" * text.count("\n", i, semi + 1))
                    i = semi + 1
                    removed = True
                break
        if removed:
            continue

        out.append(ch)
        i += 1

    sys.stdout.write("".join(out))


def _clean(text):
    """对任意输入文本跑一遍清洗逻辑，供自测复用。"""
    import io, sys as _sys

    old_in, old_out = _sys.stdin, _sys.stdout
    _sys.stdin = io.TextIOWrapper(io.BytesIO(text.encode("utf-8")))
    _sys.stdout = io.StringIO()
    try:
        solve()
        return _sys.stdout.getvalue()
    finally:
        _sys.stdin, _sys.stdout = old_in, old_out


def run_tests():
    """官方样例 + 边界/变形用例。空格行按题面说明的真实字节数书写。"""
    SP8 = " " * 8
    SP4 = " " * 4

    sample1_in = (
        "container node {\n"
        "    leaf port {\n"
        "        type string;\n"
        '        remark "Edge port";\n'
        '        preset "eth0";\n'
        "    }\n"
        "/*\n"
        '块注释中出现 remark "fake";\n'
        "整段都要留下\n"
        "*/\n"
        "    leaf flag {\n"
        "        type string;\n"
        "        remark\n"
        '            "Line-a\n'
        "            Line-b\";\n"
        "        required true;\n"
        "    }\n"
        "    leaf alias {\n"
        "        type string;\n"
        '        myremark "keep";\n'
        "    }\n"
        "}\n"
    )
    sample1_out = (
        "container node {\n"
        "    leaf port {\n"
        "        type string;\n"
        f"{SP8}\n"  # remark 行：缩进留、语句删
        f"{SP8}\n"  # preset 行同上
        "    }\n"
        "/*\n"
        '块注释中出现 remark "fake";\n'
        "整段都要留下\n"
        "*/\n"
        "    leaf flag {\n"
        "        type string;\n"
        f"{SP8}\n"  # 跨行 remark 的第一行
        "\n"  # Line-a 整行落在区间里
        "\n"  # Line-b 同上
        f"{SP8}\n"  # required 行
        "    }\n"
        "    leaf alias {\n"
        "        type string;\n"
        '        myremark "keep";\n'
        "    }\n"
        "}\n"
    )

    sample2_in = "leaf y {\n    remark \"y\";\n}\n"
    sample2_out = "leaf y {\n" f"{SP4}\n" "}\n"

    test_cases = [
        # 官方样例 1 / 2（空格行按说明写明个数：8、0、0、8 与 4）
        (sample1_in, sample1_out),
        (sample2_in, sample2_out),
        # 左边界保护：;remark 前是分号、{preset 前是花括号，都算合法左侧，会删
        ("a {;remark \"x\";\n{preset y;\n}\n", "a {;\n{\n}\n"),
        # 左边界不合法：字母、数字、下划线后面的关键字当普通名字
        ("myremark \"keep\";\nx remark2 \"k\";\n_required \"k\";\n", "myremark \"keep\";\nx remark2 \"k\";\n_required \"k\";\n"),
        # 右边界保护：remark2 / remarkable 这种后接字母/数字的不删
        ("remarkable \"keep\";\nremark  \"del\";\n", 'remarkable "keep";\n\n'),
        # 单行注释里的关键字不动，行注释结构整体保留
        ("type string; // remark \"keep\"\nremark \"del\";\n", "type string; // remark \"keep\"\n\n"),
        # 跨行语句：换行保留、每个被删字符的行数不变
        ("leaf a {\n    required\n        true\n        ;\n}\n", "leaf a {\n    \n\n\n}\n"),
        # 关键字后紧跟分号：整句就是一个关键字 + 分号
        ("required;\nremark;\n", "\n\n"),
    ]

    for i, (inp, expected) in enumerate(test_cases, 1):
        got = _clean(inp)
        status = "✓" if got == expected else "✗"
        if got != expected:
            print(f"样例 {i}: 期望={expected!r}, 实际={got!r} {status}")
        else:
            print(f"样例 {i} ✓")


if __name__ == "__main__":
    import sys as _s

    if len(_s.argv) > 1 and _s.argv[1] == "--test":
        run_tests()
    else:
        solve()
