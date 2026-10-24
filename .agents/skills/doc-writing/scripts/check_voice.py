#!/usr/bin/env python3
"""量一份中文技术文档的行文指标，和范文对照。

它是一面镜子，不是尺子：只打印数字和命中的句子，不做判定，不设通过线。
指标本身也会误伤（列表行、引用块、代码注释都会影响统计），所以命中的句子
要人自己看上下文再决定删不删。

用法：

    python3 check_voice.py <文件或目录> [--baseline reference|reasoning|tutorial]

默认基线是 exemplars/reference（参考手册体）。同一批文档换了文体，就换基线。
"""

import argparse
import re
import statistics as st
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
EXEMPLARS = SKILL_ROOT / "exemplars"

# 判决句候选。命中不等于要删：要看它是不是在替读者下结论、排优先级。
JUDGEMENT_PATTERNS = [
    r"这不是",
    r"这不只是",
    r"不只是一?种",
    r"不是[^，。；\n]{0,20}，而是",
    r"等于",
    r"相当于",
    r"也就是说",
    r"换句话说",
    r"本质上",
    r"说到底",
    r"说白了",
    r"真正的问题",
    r"真正重要的是",
    r"这才是",
    r"一等公民",
    r"迟早",
    r"必然",
    r"永远",
    r"绝不会",
    r"极难",
    r"根本不会",
    r"全盘",
    r"唯一.{0,6}(办法|出路|实现|来源)",
]
JUDGEMENT_RE = re.compile("|".join(JUDGEMENT_PATTERNS))

CODE_FENCE = re.compile(r"```[\s\S]*?```")
FRONTMATTER = re.compile(r"\A---\n[\s\S]*?\n---\n")
IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
HTML_TAG = re.compile(r"<[^>]+>")
INLINE_CODE = re.compile(r"`[^`\n]*`")
QUOTED = re.compile(r"[“\"]([^”\"\n]{2,12})[”\"]")
# 范文文件在正文之后有一段「这份范文治什么」，那不是样本，要切掉。
SAMPLE_END = re.compile(r"\n---\n+\s*范文来源")


def strip_for_metrics(text: str) -> str:
    text = FRONTMATTER.sub("", text)
    text = CODE_FENCE.sub("", text)
    text = IMAGE.sub("", text)
    text = HTML_TAG.sub("", text)
    return text


def body_sentences(text: str):
    """只取正文段落的句子：跳过表格行、列表、标题、引用，避免列表拼接污染统计。

    当前指标不用句长（参考手册体的表格/列表会让它严重失真），这个函数留给
    以后要加句长之类的指标时复用。
    """
    out = []
    for line in text.splitlines():
        s = line.strip()
        if not s or s[0] in "|#>-*+":
            continue
        if re.match(r"^\d+[.、]", s):
            continue
        s = INLINE_CODE.sub("", s)
        for part in re.split(r"[。！？]", s):
            part = part.strip()
            if len(part) > 2:
                out.append(part)
    return out


def metrics(text: str) -> dict:
    body = strip_for_metrics(text)
    chars = max(len(body), 1)
    return {
        "千字": chars / 1000,
        "分号": body.count("；") / chars * 1000,
        "引号口语": len(QUOTED.findall(body)) / chars * 1000,
        "破折号": body.count("——") / chars * 1000,
        "加粗": len(re.findall(r"\*\*.+?\*\*", body)) / chars * 1000,
    }


def judgement_hits(text: str):
    hits = []
    in_code = False
    for no, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith("```"):
            in_code = not in_code
            continue
        if in_code or not line.strip():
            continue
        for m in JUDGEMENT_RE.finditer(line):
            hits.append((no, m.group(0), line.strip()))
            break
    return hits


def load_samples(group: str):
    files = sorted((EXEMPLARS / group).glob("*.md"))
    texts = []
    for f in files:
        t = f.read_text(encoding="utf-8")
        texts.append(SAMPLE_END.split(t)[0])
    return texts


def collect(target: Path):
    if target.is_dir():
        return sorted(target.rglob("*.md"))
    return [target]


def fmt(v, unit=""):
    if unit == "%":
        return f"{v:5.0f}%"
    return f"{v:5.1f}"


def main():
    ap = argparse.ArgumentParser(description="行文指标对照（只报告，不判定）")
    ap.add_argument("target", help="文件或目录")
    ap.add_argument(
        "--baseline",
        default="reference",
        choices=sorted(p.name for p in EXEMPLARS.iterdir() if p.is_dir()),
        help="对照哪组范文，默认 reference",
    )
    ap.add_argument(
        "--quiet",
        action="store_true",
        help="只打印汇总，不列判决句候选",
    )
    args = ap.parse_args()

    base_texts = load_samples(args.baseline)
    if not base_texts:
        raise SystemExit(f"找不到范文：{EXEMPLARS / args.baseline}")
    base = {k: st.mean([metrics(t)[k] for t in base_texts]) for k in metrics(base_texts[0])}

    files = collect(Path(args.target))
    rows = []
    all_hits = []
    for f in files:
        text = f.read_text(encoding="utf-8")
        m = metrics(text)
        rows.append((f, m))
        if not args.quiet:
            all_hits.extend((f, no, word, line) for no, word, line in judgement_hits(text))

    if not rows:
        raise SystemExit(f"没有找到 .md：{args.target}")

    print(f"基线：exemplars/{args.baseline}（{len(base_texts)} 篇）\n")
    header = f"{'指标':<14}{'本文':>8}{'基线':>8}"
    print(header)
    print("-" * 30)
    for key in ["分号", "引号口语", "破折号", "加粗"]:
        own = st.mean([m[key] for _, m in rows])
        print(f"{key + ' / 千字':<14}{fmt(own):>8}{fmt(base[key]):>8}")

    if len(rows) > 1:
        print("\n逐篇：")
        for f, m in rows:
            print(
                f"  {str(f):<52} 分号 {m['分号']:.1f}  引号 {m['引号口语']:.1f}"
                f"  加粗 {m['加粗']:.1f}"
            )

    if all_hits:
        print(f"\n判决句候选 {len(all_hits)} 处（按行号列出，删不删看上下文）：")
        for f, no, word, line in all_hits:
            snippet = line if len(line) <= 90 else line[:90] + "…"
            print(f"  {f}:{no}  [{word}]  {snippet}")

    print(
        "\n这些数字只做对照。分号密度最可信：一个分号串两个论点、第二个论点是升华，"
        "是演讲腔最稳的指纹。引号口语会误伤（引用术语、讨论一个说法都会推高），"
        "命中要回原文看，不要按分数验收。"
    )


if __name__ == "__main__":
    main()
