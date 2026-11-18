#!/usr/bin/env python3
"""列出每篇文档里反引号术语的第一次出现，供“读者模型检查”使用。

用法：
    python3 list_terms.py docs/项目/<name>
    python3 list_terms.py docs/项目/<name>/导读.md

它只做清单，不判断对错：拿到每个术语的第一次出现和上下文后，人工确认
第一次出现有没有解释、是不是项目内名词、有没有先用了再解释。
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

TERM_RE = re.compile(r"`([^`\n]+)`")
FENCE_RE = re.compile(r"^\s*(```|~~~)")


def prose_lines(path: Path) -> list[tuple[int, str]]:
    lines: list[tuple[int, str]] = []
    in_fence = False
    for number, raw in enumerate(path.read_text("utf-8").splitlines(), 1):
        if FENCE_RE.match(raw):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        lines.append((number, raw))
    return lines


def first_terms(path: Path) -> list[tuple[int, str, str]]:
    seen: dict[str, tuple[int, str]] = {}
    for number, line in prose_lines(path):
        for match in TERM_RE.finditer(line):
            term = match.group(1).strip()
            if not term or len(term) > 60:
                continue
            if term not in seen:
                seen[term] = (number, line.strip())
    return sorted(((number, term, text) for term, (number, text) in seen.items()), key=lambda item: item[0])


def collect(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        path = Path(raw)
        if path.is_file() and path.suffix == ".md":
            files.append(path)
        elif path.is_dir():
            files.extend(sorted(path.rglob("*.md")))
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description="列出反引号术语的第一次出现")
    parser.add_argument("paths", nargs="*", default=["docs/项目"], help="目录或 .md 文件")
    args = parser.parse_args()

    files = collect(args.paths)
    if not files:
        print(f"没有找到 .md：{' '.join(args.paths)}")
        return 0

    total = 0
    for path in files:
        terms = first_terms(path)
        if not terms:
            continue
        print(f"\n## {path}")
        for number, term, text in terms:
            print(f"{number:>4}  `{term}`")
            print(f"      {text[:160]}")
            total += 1

    print(f"\n{len(files)} 篇，{total} 个术语首次出现。逐条确认：项目内名词有没有解释，通用词是不是只解释一次。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
