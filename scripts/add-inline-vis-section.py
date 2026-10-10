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
    'patterns/dfs.md': (
        '三种遍历的差别只有「访问根」那一句放在哪。把输入的顺序改成前序 / 中序 / 后序，'
        '看访问序列怎么变 —— 中序在二叉搜索树上是有序的，这不是巧合。'
        '下面还有一个回溯（子集）播放器：「选 → 递归 → 撤销」三步一组，'
        '撤销那一步被漏掉时画面会立刻自相矛盾。'
    ),
    'patterns/backtracking.md': (
        '重点看每一次「撤销选择」之后 path 怎么退回上一层。'
        '漏掉撤销的话，同一层会把别的分支的数带进来 —— 画面上会立刻出现重复的答案。'
    ),
    'patterns/hash_map.md': (
        '`cnt[x] = cnt.get(x, 0) + 1` 一行做了两件事：没见过的键先按 0 算，'
        '所以不需要先判断「在不在表里」。画面上那一行就是词典本身，'
        '新键会亮起来。'
    ),
    'patterns/search.md': (
        '两个写法的差别全在边界：闭区间写法每次判断 `left <= right`，'
        '左闭右开写法判断 `left < right` 且 `right` 取 `len(nums)`。'
        '画面上能看到 `right` 初值就是数组长度这件事。'
    ),
    'data-structures/hash_table.md': (
        '平均 O(1) 的代价是什么：键的哈希冲突由 Python 的 dict 处理，'
        '而**插入顺序**被保留着 —— 所以词典那一行的顺序就是元素第一次出现的顺序。'
    ),
    'data-structures/linked_list.md': (
        '反转只需要 prev / cur / next 三个指针，关键是**先记住 next 再掉头**。'
        '画面上已反转的那一段一格一格长出来。'
    ),
    'data-structures/stack_queue_heap_unionfind.md': (
        '路径压缩与按大小合并一起做，均摊复杂度才是 O(α(n))。'
        '画面上能看到查找时经过的每个节点都直接指向祖父，树越用越扁。'
    ),
    'data-structures/binary_tree.md': (
        '三种遍历只差「访问根」的位置。空槽位用虚线小点画出来 —— '
        '它们是「这里没有孩子」，不是「这里看不见」。'
    ),
    'data-structures/tree.md': (
        'n 叉树与二叉树是同一套 DFS，差别只在「有几个孩子」这一项。'
    ),
    'data-structures/string.md': (
        '最长公共子序列的表格：行是 a 的前缀、列是 b 的前缀，'
        '所以「dp[i][j] 就是左上那一格」在画面上就是「往左上角看一眼」。'
    ),
    'data-structures/array.md': (
        '数组的下标连续，所以二维 DP 表天然就是一张网格 —— '
        '表格式与网格式的区别只在「行列各自代表一个前缀长度」。'
    ),
    'data-structures/graph.md': (
        '网格是最小的图：格子是顶点、可走的边是边。'
        '所以网格 BFS 的那些结论（先进先出 = 最短路、访问标记要入队时就打）'
        '在一般图上一样成立。'
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