"""给专用 harness 的题目补一批随机隐藏测试。

这些题不能用通用 fuzz：链表题要构造环/交点，类 API 要生成操作序列。
期望值由文档解现场算出；脚本只追加，不覆盖已有可见样例。

用法：
  python3 judge-tools/gen_custom_hidden.py \
    --docs /home/.../HanphoneJan.github.io/code-training/docs/problems \
    --data /home/.../judge-server/data/problems
"""

import argparse
import json
import random
from pathlib import Path

random.seed(20261129)


def load_code(path: Path) -> str:
    md = path.read_text(encoding="utf8")
    start = md.index("## 完整代码实现")
    rest = md[start:]
    fence = rest.index("```python") + len("```python")
    end = rest.index("```", fence)
    return rest[fence:end].strip()


def ns_for(code: str):
    ns = {"__name__": "__judge__"}
    exec(compile(code, "<doc>", "exec"), ns)
    return ns


def append_cases(data_dir: Path, pid: str, cases):
    pdir = data_dir / pid
    meta_path = pdir / "meta.json"
    old_meta = json.loads(meta_path.read_text(encoding="utf8"))
    if old_meta.get("provenance", {}).get("hiddenCustom"):
        print(f"= {pid}: 已有 custom hidden，跳过")
        return
    tests = pdir / "tests"
    existing = [
        int(p.stem)
        for p in tests.iterdir()
        if p.suffix in (".json", ".in") and p.stem.isdigit()
    ]
    seq = max(existing, default=0) + 1
    for args, expected in cases:
        (tests / f"{seq:04d}.json").write_text(
            json.dumps({"args": args, "expected": expected}, ensure_ascii=False, indent=2)
            + "\n",
            encoding="utf8",
        )
        seq += 1
    meta = old_meta
    meta["fullTestCount"] = max(meta["fullTestCount"], seq - 1)
    meta["activeTestCount"] = min(25, meta["fullTestCount"])
    meta.setdefault("provenance", {})["hiddenCustom"] = len(cases)
    meta_path.write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf8"
    )
    print(f"+ {pid}: +{len(cases)} (active {meta['activeTestCount']}/{meta['fullTestCount']})")


def linked_case(ns, values, pos, mode):
    cls = ns["ListNode"]
    nodes = [cls(v) for v in values]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if pos >= 0 and nodes:
        nodes[-1].next = nodes[pos]
    head = nodes[0] if nodes else None
    if mode == "cycle":
        return bool(ns["Solution"]().hasCycle(head))
    node = ns["Solution"]().detectCycle(head)
    return None if node is None else node.val


def intersection_case(ns, a, b, sa, sb):
    cls = ns["ListNode"]
    shared_vals = a[sa:]
    shared = [cls(v) for v in shared_vals]
    for x, y in zip(shared, shared[1:]):
        x.next = y
    left = [cls(v) for v in a[:sa]]
    for x, y in zip(left, left[1:]):
        x.next = y
    if left and shared:
        left[-1].next = shared[0]
    right = [cls(v) for v in b[:sb]]
    for x, y in zip(right, right[1:]):
        x.next = y
    if right and shared:
        right[-1].next = shared[0]
    head_a = left[0] if left else (shared[0] if shared else None)
    head_b = right[0] if right else (shared[0] if shared else None)
    node = ns["Solution"]().getIntersectionNode(head_a, head_b)
    return None if node is None else node.val


def gen_141_142(docs: Path, data: Path):
    for pid, path, mode in [
        ("leetcode-141", docs / "leetcode/0141_linked_list_cycle.md", "cycle"),
        ("leetcode-142", docs / "leetcode/0142_linked_list_cycle_ii.md", "entry"),
    ]:
        ns = ns_for(load_code(path))
        cases = []
        for _ in range(10):
            n = random.randint(1, 8)
            values = [random.randint(-5, 9) for _ in range(n)]
            pos = random.choice([-1] + list(range(n)))
            expected = linked_case(ns, values, pos, mode)
            cases.append(
                [
                    [json.dumps(values), json.dumps(pos)],
                    "null" if expected is None else json.dumps(expected),
                ]
            )
        append_cases(data, pid, cases)


def gen_160(docs: Path, data: Path):
    ns = ns_for(load_code(docs / "leetcode/0160_intersection_of_two_linked_lists.md"))
    cases = []
    for _ in range(10):
        shared_len = random.randint(0, 4)
        shared = [random.randint(0, 9) for _ in range(shared_len)]
        a = [random.randint(0, 9) for _ in range(random.randint(0, 3))] + shared
        b = [random.randint(0, 9) for _ in range(random.randint(0, 3))] + shared
        sa = len(a) - shared_len
        sb = len(b) - shared_len
        expected = intersection_case(ns, a, b, sa, sb)
        cases.append(
            [
                [json.dumps(a), json.dumps(b), json.dumps(sa), json.dumps(sb)],
                "null" if expected is None else json.dumps(expected),
            ]
        )
    append_cases(data, "leetcode-160", cases)


def gen_class(docs: Path, data: Path, pid: str, path: Path, factory, gen_ops, limit=10):
    ns = ns_for(load_code(path))
    cases = []
    for _ in range(limit):
        ops, args, outs = gen_ops(ns, factory)
        cases.append(
            [
                [json.dumps(ops), json.dumps(args)],
                json.dumps(outs, ensure_ascii=False),
            ]
        )
    append_cases(data, pid, cases)


def gen_146(ns, factory):
    cap = random.randint(1, 4)
    obj = ns[factory](cap)
    ops = [factory]
    args = [[cap]]
    outs = [None]
    keys = list(range(6))
    for _ in range(14):
        op = random.choice(["put", "get"])
        if op == "put":
            k = random.choice(keys)
            v = random.randint(1, 20)
            ops.append("put")
            args.append([k, v])
            outs.append(getattr(obj, "put")(k, v))
        else:
            k = random.choice(keys)
            ops.append("get")
            args.append([k])
            outs.append(getattr(obj, "get")(k))
    return ops, args, outs


def gen_155(ns, factory):
    obj = ns[factory]()
    ops = [factory]
    args = [[]]
    outs = [None]
    depth = 0
    for _ in range(15):
        op = "push" if depth == 0 else random.choice(["push", "push", "pop", "top", "getMin"])
        if op == "push":
            v = random.randint(-5, 9)
            ops.append("push")
            args.append([v])
            outs.append(getattr(obj, "push")(v))
            depth += 1
        else:
            ops.append(op)
            args.append([])
            outs.append(getattr(obj, op)())
            if op == "pop":
                depth -= 1
    return ops, args, outs


def gen_208(ns, factory):
    obj = ns[factory]()
    ops = [factory]
    args = [[]]
    outs = [None]
    words = ["app", "apple", "ap", "banana", "band", "cat"]
    for _ in range(15):
        op = random.choice(["insert", "search", "startsWith"])
        w = random.choice(words)
        ops.append(op)
        args.append([w])
        outs.append(getattr(obj, op)(w))
    return ops, args, outs


def gen_295(ns, factory):
    obj = ns[factory]()
    ops = [factory]
    args = [[]]
    outs = [None]
    first = random.randint(-10, 20)
    ops.append("addNum")
    args.append([first])
    outs.append(obj.addNum(first))
    for _ in range(15):
        if random.random() < 0.65:
            v = random.randint(-10, 20)
            ops.append("addNum")
            args.append([v])
            outs.append(getattr(obj, "addNum")(v))
        else:
            ops.append("findMedian")
            args.append([])
            outs.append(getattr(obj, "findMedian")())
    return ops, args, outs


def gen_p5493(docs: Path, data: Path):
    path = docs / "codefun2000/huawei-non-ai/P5493.md"
    ns = ns_for(load_code(path))
    cases = []
    for _ in range(8):
        file_cap = random.randint(4, 9)
        total_cap = random.randint(file_cap + 5, file_cap + 25)
        obj = ns["FileLogger"](file_cap, total_cap)
        exprs = [f"FileLogger({file_cap}, {total_cap})"]
        outs = [None]
        for _ in range(10):
            if random.random() < 0.85:
                mid = random.randint(1, 4)
                size = random.randint(1, file_cap - 1)
                exprs.append(f"putLog({mid}, {size})")
                outs.append(obj.putLog(mid, size))
            else:
                exprs.append("totalSize()")
                outs.append(obj.totalSize())
        exprs.append("listFiles()")
        outs.append(obj.listFiles())
        cases.append([[json.dumps(exprs)], json.dumps(outs, ensure_ascii=False)])
    append_cases(data, "codefun2000-p5493", cases)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--docs", type=Path, required=True)
    ap.add_argument("--data", type=Path, required=True)
    a = ap.parse_args()
    gen_141_142(a.docs, a.data)
    gen_160(a.docs, a.data)
    gen_class(a.docs, a.data, "leetcode-146", a.docs / "leetcode/0146_lru_cache.md", "LRUCache", gen_146)
    gen_class(a.docs, a.data, "leetcode-155", a.docs / "leetcode/0155_min_stack.md", "MinStack", gen_155)
    gen_class(a.docs, a.data, "leetcode-208", a.docs / "leetcode/0208_implement_trie_prefix_tree.md", "Trie", gen_208)
    gen_class(a.docs, a.data, "leetcode-295", a.docs / "leetcode/0295_find_median_from_data_stream.md", "MedianFinder", gen_295)
    gen_p5493(a.docs, a.data)


if __name__ == "__main__":
    main()
