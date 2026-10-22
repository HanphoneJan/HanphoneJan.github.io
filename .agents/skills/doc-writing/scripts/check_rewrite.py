#!/usr/bin/env python3
"""机械核对原文与改写稿：数字、行内代码、链接、标题、代码块、表格行、旧文重合。

用法：
    python3 check_rewrite.py <original.md> <rewritten.md>
    python3 check_rewrite.py --dir <originals/> <rewritten/>
    python3 check_rewrite.py --max-overlap 0.10 <original.md> <rewritten.md>

退出码 1 表示有数字、行内代码或链接丢失；标题/表格/代码块数量只报告，不判失败
（改写允许合并叙述性表格）。`--max-overlap` 是可选红线：旧文重合比例超过它才失败。
"""
import sys, os, re, glob, difflib
from collections import Counter


def load(p):
    t = open(p, encoding='utf8').read()
    m = re.match(r'^---\n(.*?)\n---\n', t, re.S)
    if m:
        t = t[m.end():]
    t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
    return t


def prose(t):
    """只留正文：去掉代码块、行内代码、链接目标、标题标记。"""
    t = re.sub(r'```.*?```', '', t, flags=re.S)
    t = re.sub(r'`[^`\n]*`', '', t)
    t = re.sub(r'\]\([^)]*\)', ']', t)
    t = re.sub(r'(?m)^#{1,6}\s*', '', t)
    t = re.sub(r'[|>*_~-]', '', t)
    return re.sub(r'\s+', '', t)


def numbers(t):
    body = '\n'.join(l for l in t.split('\n') if not l.startswith('#'))
    return Counter(re.findall(r'\d+(?:\.\d+)?', body))


def codes(t):
    return Counter(re.findall(r'`([^`\n]+)`', t))


def links(t):
    return Counter(re.findall(r'\]\(([^)]+)\)', t))


def stats(t):
    return {
        'headings': len(re.findall(r'(?m)^#{1,6} ', t)),
        'fences': len(re.findall(r'(?m)^```', t)) // 2,
        'table_rows': len([l for l in t.split('\n') if l.strip().startswith('|')]),
        'cjk': len(re.findall(r'[\u4e00-\u9fff]', t)),
    }


def diff(a, b):
    return {k: a[k] - b.get(k, 0) for k in a if b.get(k, 0) < a[k]}, \
           {k: b[k] - a.get(k, 0) for k in b if a.get(k, 0) < b[k]}


def overlap(orig, new, min_len=12):
    """旧文里有、新稿里也原样出现的连续片段。返回 (比例, 片段列表)。

    只比较正文、忽略代码与标点；连续 12 个汉字相同就当成复用。
    """
    a, b = prose(orig), prose(new)
    if not b:
        return 0.0, []
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    blocks = [x for x in matcher.get_matching_blocks() if x.size >= min_len]
    reused = sum(x.size for x in blocks)
    snippets = [b[x.b:x.b + x.size][:40] for x in sorted(blocks, key=lambda x: -x.size)[:3]]
    return reused / len(b), snippets


def check(orig, new, max_overlap=None):
    to, tn = load(orig), load(new)
    miss_n, add_n = diff(numbers(to), numbers(tn))
    miss_c, add_c = diff(codes(to), codes(tn))
    miss_l, _ = diff(links(to), links(tn))
    so, sn = stats(to), stats(tn)
    ratio, snippets = overlap(to, tn)
    print(f'== {os.path.basename(new)}')
    print(f"   汉字 {so['cjk']} -> {sn['cjk']} | 标题 {so['headings']} -> {sn['headings']} | "
          f"代码块 {so['fences']} -> {sn['fences']} | 表格行 {so['table_rows']} -> {sn['table_rows']}")
    if miss_n:
        print(f'   少了数字: {miss_n}')
    if add_n:
        print(f'   多了数字: {add_n}')
    if miss_c:
        print(f'   少了行内代码: {miss_c}')
    if add_c:
        print(f'   多了行内代码: {add_c}')
    if miss_l:
        print(f'   少了链接: {miss_l}')
    print(f'   旧文重合: {ratio:.1%}（连续 {12}+ 字）'
          + (f' 例如：{snippets}' if snippets else ''))
    ok = not (miss_n or miss_c or miss_l)
    if max_overlap is not None and ratio > max_overlap:
        print(f'   旧文重合超过红线 {max_overlap:.0%}：先按新提纲重写，不要改旧句')
        ok = False
    print('   机械检查: ' + ('通过' if ok else '未通过'))
    return ok


def main():
    args = sys.argv[1:]
    max_overlap = None
    if '--max-overlap' in args:
        i = args.index('--max-overlap')
        try:
            max_overlap = float(args[i + 1])
        except (IndexError, ValueError):
            print('--max-overlap 需要一个 0~1 的数字', file=sys.stderr)
            sys.exit(2)
        del args[i:i + 2]

    if len(args) == 2 and os.path.isfile(args[0]):
        sys.exit(0 if check(args[0], args[1], max_overlap) else 1)
    if len(args) == 3 and args[0] == '--dir':
        orig_dir, new_dir = args[1], args[2]
        bad = 0
        files = sorted(glob.glob(os.path.join(orig_dir, '*.md')))
        for o in files:
            n = os.path.join(new_dir, os.path.basename(o))
            if os.path.exists(n):
                bad += 0 if check(o, n, max_overlap) else 1
        print(f'\n{len(files)} 篇，未通过 {bad} 篇')
        sys.exit(0 if bad == 0 else 1)
    print(__doc__)
    sys.exit(2)


if __name__ == '__main__':
    main()
