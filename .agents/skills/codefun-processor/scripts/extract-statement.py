#!/usr/bin/env python3
"""Fetch a CodeFun2000 problem and print its official statement as Markdown.

Usage:
    python3 .agents/skills/codefun-processor/scripts/extract-statement.py P5948
    python3 .../extract-statement.py P5948 --out /tmp/P5948.md
    python3 .../extract-statement.py P5948 --html   # print raw content div

Why this exists:
    codefun2000.com/p/P#### is a login-gated IDE page.  The public statement is
    on codefun2000.com/new-p/P#### in div#content-ZhContent.  This script turns
    that div into Markdown, taking care of KaTeX (the MathML and HTML copies
    would otherwise duplicate every formula) and preserving span tails.

Requires: python3 + lxml.
"""
import argparse
import sys
import urllib.request
from lxml import html as LH

CACHE = None


def fetch(pid: str) -> str:
    url = f"https://codefun2000.com/new-p/{pid}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", "ignore")


def replace_katex(div):
    for span in div.xpath('.//span[contains(@class,"katex")]'):
        ann = span.xpath('.//annotation[@encoding="application/x-tex"]')
        tex = ann[0].text if ann and ann[0].text else ""
        new = LH.fragment_fromstring(f"<span>${tex}$</span>")
        new.tail = span.tail
        span.getparent().replace(span, new)


def inline(el) -> str:
    out = [el.text or ""]
    for child in el:
        tag = child.tag
        if tag == "strong":
            out.append("**" + inline(child).strip() + "**")
        elif tag == "em":
            out.append("*" + inline(child).strip() + "*")
        elif tag == "code":
            out.append("`" + inline(child).strip() + "`")
        elif tag == "br":
            out.append("\n")
        else:
            out.append(inline(child))
        out.append(child.tail or "")
    return "".join(out)


def table_md(el) -> str:
    rows = []
    for tr in el.xpath(".//tr"):
        cells = [inline(c).strip().replace("\n", " ") for c in tr.xpath("./th|./td")]
        if cells:
            rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    lines = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    for r in rows[1:]:
        lines.append("| " + " | ".join(r) + " |")
    return "\n".join(lines)


def to_markdown(div) -> str:
    replace_katex(div)
    blocks = []
    for el in div.iterchildren():
        tag = el.tag
        if tag in ("h1", "h2", "h3", "h4"):
            blocks.append("#" * (int(tag[1]) + 1) + " " + inline(el).strip())
        elif tag == "p":
            blocks.append(inline(el).strip())
        elif tag == "pre":
            code = el.text_content().rstrip("\n")
            lang = ""
            code_el = el.find("code")
            if code_el is not None:
                for cls in (code_el.get("class") or "").split():
                    if cls.startswith("language-"):
                        lang = cls.removeprefix("language-")
            blocks.append(f"```{lang}\n{code}\n```")
        elif tag in ("ul", "ol"):
            for i, li in enumerate(el.iterchildren("li"), 1):
                mark = f"{i}." if tag == "ol" else "-"
                blocks.append(f"{mark} {inline(li).strip()}")
        elif tag == "table":
            blocks.append(table_md(el))
        elif tag in ("div", "section", "blockquote"):
            inner = to_markdown(el)
            if inner:
                blocks.append(inner)
        else:
            text = inline(el).strip()
            if text:
                blocks.append(text)
    return "\n\n".join(b for b in blocks if b.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pid", help="problem id, e.g. P5948")
    ap.add_argument("--out", help="write to file instead of stdout")
    ap.add_argument("--html", action="store_true", help="print the raw content div HTML")
    args = ap.parse_args()
    pid = args.pid if args.pid.startswith("P") else "P" + args.pid
    try:
        page = fetch(pid)
    except Exception as e:
        sys.exit(f"fetch {pid} failed: {e}")
    root = LH.fromstring(page)
    div = root.get_element_by_id("content-ZhContent")
    if div is None:
        sys.exit(f"{pid}: no div#content-ZhContent (is this a choice question?)")
    if args.html:
        out = LH.tostring(div, encoding="unicode")
    else:
        out = to_markdown(div)
    if args.out:
        open(args.out, "w", encoding="utf-8").write(out + "\n")
        print(f"wrote {args.out} ({len(out)} chars)")
    else:
        print(out)


if __name__ == "__main__":
    main()
