#!/usr/bin/env python3
"""检查 draw.io 图是否符合文档规范。

用法：
    python3 check_diagrams.py [路径 ...]

默认扫 static/img。路径可以是目录或单个 .drawio 文件。规则来自
references/diagrams.md：画布 <= 700px、文字 >= 14px、导出 2x、单张 <= 150KB。

退出码：有 ERROR 时 1，否则 0。
"""

from __future__ import annotations

import argparse
import base64
import re
import struct
import sys
import zlib
from pathlib import Path
from xml.etree import ElementTree as ET

ERROR = "ERROR"
WARN = "WARN"

FONT_RE = re.compile(r"(?:^|;)fontSize=([0-9.]+)")
TAG_RE = re.compile(r"<[^>]+>")


def _text(value: str | None) -> str:
    if not value:
        return ""
    return TAG_RE.sub("", value).replace("&nbsp;", " ").strip()


def _pages(root: ET.Element) -> list[ET.Element]:
    """返回 mxGraphModel 节点；兼容 drawio 的压缩 diagram。"""
    models: list[ET.Element] = []
    for diagram in root.iter("diagram"):
        model = diagram.find("mxGraphModel")
        if model is not None:
            models.append(model)
            continue
        payload = (diagram.text or "").strip()
        if not payload:
            continue
        try:
            raw = zlib.decompress(base64.b64decode(payload), -15)
            wrapped = ET.fromstring(raw.decode("utf-8"))
            if wrapped.tag == "mxGraphModel":
                models.append(wrapped)
            else:
                inner = wrapped.find("mxGraphModel")
                if inner is not None:
                    models.append(inner)
        except Exception:
            continue
    if not models:
        # 有些文件把 mxGraphModel 直接作为根
        if root.tag == "mxGraphModel":
            models.append(root)
        else:
            inner = root.find("mxGraphModel")
            if inner is not None:
                models.append(inner)
    return models


def _png_size(path: Path) -> tuple[int, int] | None:
    data = path.read_bytes()[:24]
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def check_file(path: Path, args: argparse.Namespace) -> list[tuple[str, str]]:
    issues: list[tuple[str, str]] = []
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        return [(ERROR, f"无法解析 XML：{exc}")]

    models = _pages(root)
    if not models:
        return [(ERROR, "找不到 mxGraphModel；可能是 drawio 压缩格式，请用 drawio 另存为未压缩 XML")]

    max_width = 0.0
    for model in models:
        raw_width = model.get("pageWidth")
        if raw_width is None:
            issues.append((WARN, "mxGraphModel 没有 pageWidth，无法检查画布宽度"))
            continue
        try:
            width = float(raw_width)
        except ValueError:
            issues.append((ERROR, f"pageWidth 不是数字：{raw_width}"))
            continue
        max_width = max(max_width, width)
        if width > args.max_width:
            issues.append(
                (ERROR, f"画布宽 {width:g}px > {args.max_width}px；正文栏约 673px，字会被缩小")
            )

        for cell in model.iter("mxCell"):
            value = _text(cell.get("value"))
            if not value:
                continue
            style = cell.get("style") or ""
            match = FONT_RE.search(style)
            if match is None:
                issues.append(
                    (ERROR, f"文字单元格没有显式字号（默认 12px）：{value[:24]!r}")
                )
                continue
            size = float(match.group(1))
            if size < args.min_font:
                issues.append(
                    (ERROR, f"字号 {size:g}px < {args.min_font}px：{value[:24]!r}")
                )

    stem = path.with_suffix("")
    png = (path.parent.parent / (stem.name + ".png")) if path.parent.name == "src" else stem.with_suffix(".png")
    svg = (path.parent.parent / (stem.name + ".svg")) if path.parent.name == "src" else stem.with_suffix(".svg")

    target = png if png.exists() else (svg if svg.exists() else None)
    if target is None:
        issues.append((ERROR, f"找不到导出文件：{png.name} 或 {svg.name}"))
        return issues

    size_kb = target.stat().st_size / 1024
    if size_kb > args.max_kb:
        issues.append((ERROR, f"{target.name} 体积 {size_kb:.0f}KB > {args.max_kb}KB"))

    if target.suffix == ".png":
        dims = _png_size(target)
        if dims is None:
            issues.append((ERROR, f"{target.name} 不是合法 PNG"))
        elif max_width:
            expected = max_width * args.scale
            tolerance = max(8.0, expected * 0.05)
            if abs(dims[0] - expected) > tolerance:
                issues.append(
                    (
                        ERROR,
                        f"{target.name} 宽 {dims[0]}px，画布 {max_width:g}px 的 {args.scale:g}x 应为约 {expected:.0f}px",
                    )
                )
    else:
        text = target.read_text("utf-8", errors="replace")
        if "<image" in text:
            issues.append((ERROR, f"{target.name} 含 <image>：中文标签被栅格化，改导 PNG 2x"))

    if target.exists() and path.stat().st_mtime > target.stat().st_mtime + 1:
        issues.append((WARN, f"{target.name} 比 .drawio 旧，可能忘了重新导出"))

    return issues


def collect(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        path = Path(raw)
        if path.is_file() and path.suffix == ".drawio":
            files.append(path)
        elif path.is_dir():
            files.extend(sorted(path.rglob("*.drawio")))
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 draw.io 图的画布、字号、导出与体积")
    parser.add_argument("paths", nargs="*", default=["static/img"], help="目录或 .drawio 文件")
    parser.add_argument("--max-width", type=float, default=700.0, help="画布最大宽度（默认 700）")
    parser.add_argument("--min-font", type=float, default=14.0, help="最小字号（默认 14）")
    parser.add_argument("--max-kb", type=float, default=150.0, help="单张图最大体积 KB（默认 150）")
    parser.add_argument("--scale", type=float, default=2.0, help="导出倍率（默认 2）")
    args = parser.parse_args()

    files = collect(args.paths)
    if not files:
        print(f"没有找到 .drawio：{' '.join(args.paths)}")
        return 0

    errors = 0
    warnings = 0
    for path in files:
        issues = check_file(path, args)
        if not issues:
            print(f"OK    {path}")
            continue
        print(f"FAIL  {path}")
        for level, message in issues:
            print(f"      {level}: {message}")
            if level == ERROR:
                errors += 1
            else:
                warnings += 1

    print(f"\n{len(files)} 张图：{errors} 个错误，{warnings} 个警告")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
