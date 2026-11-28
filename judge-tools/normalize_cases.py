"""把 LeetCodeDataset 的 Python 字面量输出转成 JSON 文本。

数据集里的 output 形如 `[0, 1]`、`None`、`True`；服务端比较器读的是 JSON，
所以统一转成 `[0,1]`、`null`、`true`。解析失败时原样返回，由生成器丢弃该用例。
"""

import ast
import json
import sys


def main() -> None:
    raw = json.load(sys.stdin)
    out = []
    for value in raw:
        try:
            out.append(
                json.dumps(
                    ast.literal_eval(value),
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )
        except Exception:
            out.append(value)
    json.dump(out, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
