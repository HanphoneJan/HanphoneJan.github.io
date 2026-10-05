#!/usr/bin/env python3
"""给内嵌了播放器的文档追加「## 算法可视化」小节。

播放器渲染在 `</DocItemContent>` 之后（`DocItem/Layout`），所以 md 里只需要
一个**普通 Markdown 标题**当入口：它会出现在右侧 TOC 里，读者点进来就看到
紧跟着的折叠播放器。不需要 MDX 组件 —— 这批文档走 `format: 'detect'`，
实测被当作 CommonMark 解析（`<X />` 会被小写成 `<x/>`）。

幂等：已经有这个小节的文档会被跳过（按 `## 算法可视化` 精确匹配）。
"""

import re
import sys
from pathlib import Path

DOCS = Path(__file__).resolve().parents[1] / 'code-training' / 'docs'

# docId -> 这一节里放哪几个播放器（与 inlinePlacement.ts 同步）
PLACEMENT = {
    'patterns/two_pointers.md': (
        '把下面的数组改成 `1,2,3,4` 之类就能看到两根指针怎么走；'
        '注意「找到就返回」时右指针**不再前进**，而这正是它比暴力快的原因。'
    ),
    'patterns/sliding_window.md': (
        '窗口长度是 `i - left` 而不是 `i - left + 1` —— '
        '这一点在画面上看得很清楚：left 指的是**被排除**的那个字符。'
        '换个输入试试重复字符多的情况。'
    ),
    'patterns/sorting.md': (
        '三个算法各有各的「已确定边界」：冒泡是右侧已排好的后缀，'
        '归并是左右两段各自的已合并部分，快排是 pivot 落位后的左右区间。'
        '播放器里输入一个已排序的数组，冒泡会提前结束 —— 那正是它的最好情况。'
    ),
    'patterns/dynamic_programming.md': (
        '注意观察状态量是怎么一步步被覆盖的：爬楼梯只留两个变量（空间优化），'
        '而背包要留一整张表 —— 因为容量那一维不能省。'
        '背包的内层循环**必须倒序**，把容量档位调大就能看到重复使用同一件物品的后果。'
    ),
    'patterns/bfs.md': (
        '「待访问队列」是 BFS 的本质：先进先出决定了扩展顺序，'
        '而顺序又决定了第一次到达某格时距离就是最短。'
        '换个有障碍的地图，能看到它绕路而不是穿墙。'
    ),
    'templates/binary_search_template.md': (
        '两个写法的差别全在边界：闭区间写法每次判断 `left <= right`，'
        '左闭右开写法判断 `left < right` 且 `right` 取 `len(nums)`。'
        '画面上能看到 `right` 初值就是数组长度这件事。'
    ),
    'templates/bfs_template.md': (
        '多源 BFS 与单源 BFS 的差别只在一行：把所有起点一起塞进初始队列。'
        '网格 BFS 里每格的状态就是队列的出队顺序。'
    ),
}

HEADING = '## 算法可视化'


def append_section(md_path: Path, body: str) -> bool:
    text = md_path.read_text(encoding='utf-8')
    if re.search(rf'^{re.escape(HEADING)}\s*$', text, re.M):
        print(f'  已有小节，跳过：{md_path.name}')
        return False
    stripped = text.rstrip('\n')
    new = (
        f'{stripped}\n\n---\n\n{HEADING}\n\n'
        '下面的播放器可以**改输入后重跑**：把数组换成你自己的，\n'
        f'逐步看每一帧的状态怎么变。{body}\n'
    )
    md_path.write_text(new, encoding='utf-8')
    print(f'  已追加：{md_path.name}')
    return True


def main() -> int:
    changed = 0
    for rel, body in PLACEMENT.items():
        p = DOCS / rel
        if not p.exists():
            print(f'  找不到 {rel}', file=sys.stderr)
            return 1
        changed += 1 if append_section(p, body) else 0
    print(f'{changed} 篇追加了「{HEADING}」小节（共 {len(PLACEMENT)} 篇）')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())