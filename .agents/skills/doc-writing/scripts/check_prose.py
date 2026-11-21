#!/usr/bin/env python3
"""检查正文里的裸编号引用与元话语。

这个脚本有通过线：裸编号引用是硬错误（退出码 1），元话语只报告（不影响退出码）。
它只管机械形状，不管句子好坏；声音仍然回范文对照。

用法：

    python3 check_prose.py <文件或目录> [...]

默认扫 docs/项目。跳过代码围栏与 frontmatter。

规则：

- 硬错误：正文出现读者点不动的编号引用，例如 `§7`、`§3.1`、`第 7 节`。
  写小节标题（「《检索与问答》的『降级清单』」），或者给一个可点击的跳转链接；
  链接文字里写编号是允许的，因为它能点。
- 不检查：标题带不带编号。`## 7. 降级清单` 允许保留。
- 只报告：元话语「本文」「本节」「这里不重复」「详见」。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

#: 正文里的编号引用。`§` 后面可以跟空格、数字，或一串 `§3、§7`。
SECTION_REF_RE = re.compile(r"§")
#: 「第 7 节」「3.1 节」这类换一种写法的编号引用。
ORDINAL_REF_RE = re.compile(r"(?:第\s*)?\d+(?:\.\d+)*\s*(?:节|小节)")
#: 「第 3 章」可能是引用书，不一定是站内节号，只报告。
CHAPTER_REF_RE = re.compile(r"第\s*\d+\s*章")
#: Markdown 链接与 <a> 标签。链接文字里的编号能点，检查前先剥掉。
LINK_RE = re.compile(r"\[[^\]]*\]\([^)]*\)|<a\b[^>]*>.*?</a>", re.IGNORECASE | re.DOTALL)
#: 元话语。命中不等于要删，回原文看它有没有提供信息。
META_RE = re.compile(r"本文|本节|这里不重复|详见")
FENCE_RE = re.compile(r"^\s*(```|~~~)")


def prose_lines(path: Path) -> list[tuple[int, str]]:
    """跳过 frontmatter 与代码围栏，返回 (行号, 原文)。"""
    lines = path.read_text("utf-8").splitlines()
    start = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                start = i + 1
                break
    out: list[tuple[int, str]] = []
    in_fence = False
    for number, raw in enumerate(lines, 1):
        if number <= start:
            continue
        if FENCE_RE.match(raw):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        out.append((number, raw))
    return out


def check_file(path: Path) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warns: list[str] = []
    for number, line in prose_lines(path):
        # 链接文字里的编号可以点，不算裸编号。
        bare = LINK_RE.sub("", line)
        if SECTION_REF_RE.search(bare):
            errors.append(f"{path}:{number}  裸编号引用  {line.strip()}")
        if ORDINAL_REF_RE.search(bare):
            errors.append(f"{path}:{number}  裸编号引用  {line.strip()}")
        if CHAPTER_REF_RE.search(bare):
            warns.append(f"{path}:{number}  章节引用（可能是书）  {line.strip()}")
        if META_RE.search(line):
            warns.append(f"{path}:{number}  元话语  {line.strip()}")
    return errors, warns


def collect(targets: list[str]) -> list[Path]:
    files: list[Path] = []
    for target in targets:
        path = Path(target)
        if path.is_dir():
            files.extend(sorted(path.rglob("*.md")))
        elif path.is_file():
            files.append(path)
        else:
            print(f"跳过不存在的路径：{target}", file=sys.stderr)
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("targets", nargs="*", default=["docs/项目"])
    args = parser.parse_args()

    files = collect(args.targets)
    if not files:
        print("没有找到 .md 文件", file=sys.stderr)
        return 1

    all_errors: list[str] = []
    all_warns: list[str] = []
    for path in files:
        errors, warns = check_file(path)
        all_errors.extend(errors)
        all_warns.extend(warns)

    print(f"扫描 {len(files)} 篇：{len(all_errors)} 个裸编号引用，{len(all_warns)} 个元话语候选")

    if all_errors:
        print("\n硬错误（正文里点不动的编号引用）：")
        for line in all_errors:
            print("  " + line)

    if all_warns:
        print("\n元话语候选（只报告，删不删看上下文）：")
        for line in all_warns:
            print("  " + line)

    return 1 if all_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
