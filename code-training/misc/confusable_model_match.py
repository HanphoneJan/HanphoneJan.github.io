#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
芯片型号模糊匹配 —— 易混字符加权编辑距离

客户在 QQ 上发来的询盘里，型号是手打的，最常见的手误是把数字打成形近字母：
O 和 0、I 和 1、S 和 5 混着打。给一个询盘型号和一个标准型号库，
找出库里与它最接近的那一个。

距离规则：
- 比较时大小写不敏感；
- 易混字符互相替换代价为 0.5（O/0、I/1、S/5，两个方向都算）；
- 其它字符的替换、插入、删除代价都是 1；
- 距离超过阈值的型号不算匹配。

返回 (最小距离, 全部并列型号)；并列按库中顺序；无匹配返回 (None, [])。

核心思路：
1. 两个字符串都转小写，易混对按小写形式记录；
2. 代价集只有 {0, 0.5, 1}，全部 ×2 存成整数 {0, 1, 2}，
   阈值也 ×2，最后结果 ÷2 —— 加法、比较、并列判断全在整数上做；
3. 每个型号跑一次加权编辑距离，滚动数组把空间压到 O(m)；
4. 长度差超阈值直接跳过；距离超过阈值不进入候选；
5. 扫库时维护 best / hits，d == best 的型号全部追加。

时间复杂度：O(K · n · m)，K 为型号库大小，n 为询盘长度，m 为型号长度
空间复杂度：O(m)
"""

CONFUSABLE = {frozenset(pair) for pair in (('o', '0'), ('i', '1'), ('s', '5'))}


def _sub_cost(x: str, y: str) -> int:
    """替换代价；全部 ×2 存成整数：0 / 1 / 2 分别代表 0 / 0.5 / 1。"""
    if x == y:
        return 0
    return 1 if frozenset((x, y)) in CONFUSABLE else 2


def _distance_x2(a: str, b: str) -> int:
    """加权编辑距离 ×2（a、b 已转小写）。"""
    n, m = len(a), len(b)
    prev = [2 * j for j in range(m + 1)]          # a 为空：插入 j 个字符
    for i in range(1, n + 1):
        cur = [2 * i] + [0] * m                   # b 为空：删除 i 个字符
        for j in range(1, m + 1):
            cur[j] = min(
                prev[j] + 2,                                  # 删 a[i-1]
                cur[j - 1] + 2,                               # 插 b[j-1]
                prev[j - 1] + _sub_cost(a[i - 1], b[j - 1]),  # 替换 / 相同
            )
        prev = cur
    return prev[m]


def find_most_likely(query: str, library: list[str], threshold: float):
    """返回 (最小距离, 并列的型号列表)；没有匹配返回 (None, [])。"""
    q = query.lower()
    limit = int(threshold * 2)                    # 阈值也换成「半格」为单位
    best, hits = None, []

    for model in library:
        m = model.lower()
        if abs(len(q) - len(m)) * 2 > limit:      # 长度差已经超阈值，跳过
            continue
        d = _distance_x2(q, m)
        if d > limit:                             # 「超过」才丢；等于阈值仍匹配
            continue
        if best is None or d < best:
            best, hits = d, [model]
        elif d == best:                           # 并列：全要
            hits.append(model)

    return (None, []) if best is None else (best / 2, hits)


def test() -> None:
    """用题面样例与边界情况验证函数正确性。"""
    stm32_lib = [
        'STM32F103C8T6',
        'STM32F103CBT6',
        'STM32F101C8T6',
        'STM32F103RCT6',
    ]
    cases = [
        # 题面样例 1：O/0 易混替换 0.5
        ('STM32F1O3C8T6', stm32_lib, 2, (0.5, ['STM32F103C8T6']), '示例1：唯一最小'),
        # 题面样例 2：大小写不敏感 + 并列按库中顺序
        (
            'stm32f103c8t6',
            ['STM32F103C8T5', 'STM32F103C8T7'],
            2,
            (1.0, ['STM32F103C8T5', 'STM32F103C8T7']),
            '示例2：小写询盘 + 并列',
        ),
        # 题面样例 3：长度差超阈值 + 距离超阈值 -> 空结果
        ('STM32F1O3C8T6', ['ATMEGA328P', 'STM32F103RCT6'], 2, (None, []), '示例3：无匹配'),
        # 边界：距离正好等于阈值仍然算匹配（题目说「超过」才不算）
        (
            'STM32F103C8T6',
            ['STM32F101C8T5', 'STM32F103RCT6'],
            2,
            (2.0, ['STM32F101C8T5', 'STM32F103RCT6']),
            '边界：距离 == 阈值',
        ),
        # 三个易混对都走一遍：O/0、I/1、S/5 各 0.5
        ('OIS', ['015'], 2, (1.5, ['015']), '三组易混对'),
        # 普通替换与易混替换的排序：手误（0.5）胜过真差一位（1）
        (
            'STM32F103C8T6',
            ['STM32F103C8T5', 'STM32F1O3C8T6'],
            2,
            (0.5, ['STM32F1O3C8T6']),
            '排序：易混替换优先',
        ),
        # 阈值 0：只剩大小写不敏感后的完全相同
        (
            'abc123',
            ['ABC123', 'ABC124'],
            0,
            (0.0, ['ABC123']),
            '阈值 0：只认完全相同',
        ),
        # 空库
        ('STM32F103C8T6', [], 2, (None, []), '空库'),
        # 长度差过滤：短串不可能在阈值内补齐
        ('ABC', ['ABCDEFG'], 2, (None, []), '长度差超阈值'),
        # 阈值 1.9 向下取到 1.5：距离 1.0 能进，2.0 不能
        ('ABCD', ['ABCE', 'ABXY'], 1.9, (1.0, ['ABCE']), '阈值向下取整'),
        # 易混对是双向的：库里是字母、询盘是数字也要按 0.5 算
        ('STM32F103C8T6', ['STM32F1O3C8T6'], 2, (0.5, ['STM32F1O3C8T6']), '双向易混'),
        # 重复型号原样返回
        ('ABC', ['ABD', 'ABD'], 2, (1.0, ['ABD', 'ABD']), '重复型号'),
    ]

    failed = 0
    for i, (query, library, threshold, expected, desc) in enumerate(cases, 1):
        actual = find_most_likely(query, library, threshold)
        ok = actual == expected
        if not ok:
            failed += 1
        print(f'用例 {i}: {desc} {"✓" if ok else "✗"}')
        print(f'  询盘: {query}')
        print(f'  库: {library}  阈值: {threshold}')
        print(f'  预期: {expected}')
        print(f'  实际: {actual}')
    print(f'\n共 {len(cases)} 组，通过 {len(cases) - failed} 组，失败 {failed} 组。')
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    test()
