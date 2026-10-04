/**
 * 用**真 Pyodide** 验证执行协议。
 *
 * ## 为什么必须有这层
 *
 * `exec.ts` 里全是「协议」而不是「算法」：linecache 登记对不对、
 * dedent 有没有生效、三步是不是真的共用 globals、驱动以裸表达式收尾时
 * `runPythonAsync` 到底返不返回值。这些用 mock 一测就废 —— 而它们错了的
 * 表现是「traceback 里没有源码行」「结果永远是 undefined」，
 * 在页面上看起来就是「按钮点了没反应」，极难定位。
 *
 * 所以这里不 mock：直接起一个真的 Pyodide，把题解里真实的代码块喂进去。
 *
 * 跑法：pnpm test:pyodide
 * 需要先 `pnpm sync:pyodide` 下载运行时（13MB，gitignore）。
 * 没下载就跳过并给出提示，不算失败 —— CI 里不跑这一条。
 */

import fs from 'fs';
import path from 'path';
import {buildCallDriver} from '../src/components/training/pyrunner/driver';
import {execPython, type ExecResult} from '../src/components/training/pyrunner/exec';
import type {PyodideRuntime} from '../src/components/training/pyrunner/runtime';
import {
  analyzeSnippet,
  callTarget,
  nodeParams,
} from '../src/components/training/pyrunner/snippet';
import {compare} from '../src/components/training/pyrunner/compare';
import {
  quoteIfStr,
  toPythonLiteral,
} from '../src/components/training/pyrunner/runner';

let pass = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    const suffix = detail === undefined ? '' : ` → ${JSON.stringify(detail)}`;
    failures.push(`✗ ${name}${suffix}`);
    console.log(`✗ ${name}${suffix}`);
  }
}

const eq = (name: string, actual: unknown, expected: unknown): void =>
  check(
    name,
    JSON.stringify(actual) === JSON.stringify(expected),
    {actual, expected},
  );

const runtimeDir = path.join(__dirname, '../static/pyodide');
if (!fs.existsSync(path.join(runtimeDir, 'pyodide.mjs'))) {
  console.log('跳过：还没下载 Pyodide 运行时。先跑 `pnpm sync:pyodide`。');
  process.exit(0);
}

/* 真实代码块：从题解里原样取，避免「测试里的代码和页面上的不一样」 */
const docsRoot = path.join(__dirname, '../code-training/docs/problems');

function codeBlockOf(relPath: string, index: number): string {
  const md = fs.readFileSync(path.join(docsRoot, relPath), 'utf8');
  const blocks = [...md.matchAll(/```python\s*\n([\s\S]*?)```/g)];
  if (!blocks[index]) {
    throw new Error(`${relPath} 里没有第 ${index} 个 python 块`);
  }
  return blocks[index][1];
}

async function main(): Promise<void> {
  // Node 里的 Pyodide 用 CJS 入口（浏览器用的 mjs 是 webpackIgnore 加载的）
  const {loadPyodide} = require('pyodide') as {
    loadPyodide: (o: unknown) => Promise<PyodideRuntime>;
  };
  const py = await loadPyodide({indexURL: runtimeDir});

  let seq = 0;
  const run = (
    code: string,
    opts: {stdin?: string; driver?: string; asMain?: boolean} = {},
  ): Promise<ExecResult> =>
    execPython(py, {code, filename: `snippet-${++seq}.py`, ...opts});

  /* ---- 1. 驱动以裸表达式收尾，runPythonAsync 要真的返回值 ---- */
  {
    const code = `class Solution:
    def twoSum(self, nums, target):
        m = {}
        for i, n in enumerate(nums):
            if target - n in m:
                return [m[target - n], i]
            m[n] = i
        return []
`;
    const entry = analyzeSnippet(code).entry!;
    const target = callTarget(entry);
    const res = await run(code, {
      driver: buildCallDriver(
        [
          ['[2,7,11,15]', '9'],
          ['[3,2,4]', '6'],
        ],
        target,
      ),
    });
    check('代码本身没有报错', !res.error, res.error);
    const rows = JSON.parse(String(res.value)) as Array<{v: string}>;
    eq('驱动返回值原样传回 JS', rows.map((r) => r.v), ['[0, 1]', '[1, 2]']);
    check('与期望值比较通过', compare(rows[0].v, '[0,1]').ok);
  }

  /* ---- 2. traceback 必须带出源码行（linecache 登记对了） ---- */
  {
    // 必须是**顶层**语句才会抛：写在方法体里的错只有被调用时才发生，
    // 而这里不传 driver（第一版就是这么写错的，测了个寂寞）
    const code = `nums = [1, 2, 3]
total = nums[9] + 1
print(total)
`;
    const res = await run(code);
    check('越界会报错', Boolean(res.error), res);
    check(
      'traceback 里带出了那一行的源码',
      res.error.includes('total = nums[9] + 1'),
      res.error,
    );
    check(
      'traceback 里的文件名是我们给的（不是 <exec>）',
      res.error.includes(`snippet-${seq}.py`),
      res.error,
    );
    eq('出错行号定位正确', res.errorLines, [2]);
  }

  /* ---- 3. 每次运行都要干净隔离 ---- */
  {
    const first = await run('__leak__ = 1\nprint("first ok")');
    check('第一次没有报错', !first.error, first.error);
    const second = await run('print(__leak__)');
    check(
      '上一轮定义的变量不会漏进这一轮',
      second.error.includes('NameError'),
      second.error,
    );
  }

  /* ---- 4. `if __name__ == "__main__"` 那段永远不执行 ---- */
  {
    const code = `def add(a, b):
    return a + b


if __name__ == "__main__":
    import sys
    for line in sys.stdin:
        print("不该打印这行", line)
`;
    const entry = analyzeSnippet(code).entry!;
    const res = await run(code, {
      driver: buildCallDriver([['1', '2']], callTarget(entry)),
    });
    check('自测块没被执行（否则会读 stdin 卡住）', !res.stdout.includes('不该打印'), res.stdout);
    eq('入口函数照样能调', JSON.parse(String(res.value))[0].v, '3');
  }

  /* ---- 5. 单条样例出错不影响其它条 ---- */
  {
    const code = `class Solution:
    def f(self, x):
        if x == 2:
            raise ValueError("样例 2 故意炸")
        return x * 2
`;
    const entry = analyzeSnippet(code).entry!;
    const res = await run(code, {
      driver: buildCallDriver([['1'], ['2'], ['3']], callTarget(entry)),
    });
    const rows = JSON.parse(String(res.value)) as Array<{v?: string; e?: string}>;
    eq('三条都有结果', rows.length, 3);
    eq('第一条的值', rows[0].v, '2');
    check('第二条是异常', Boolean(rows[1].e), rows[1]);
    check(
      '异常信息里带出了那一行源码',
      (rows[1].e ?? '').includes('raise ValueError("样例 2 故意炸")'),
      rows[1].e,
    );
    eq('第三条不受影响', rows[2].v, '6');
  }

  /* ---- 6. 链表题：入参构造成 ListNode，返回值还原成数组 ---- */
  {
    // 直接用题解 0002 的真实完整代码
    const code = codeBlockOf('leetcode/0002_add_two_numbers.md', 1);
    const entry = analyzeSnippet(code).entry!;
    eq('0002 的入口是 addTwoNumbers', entry.name, 'addTwoNumbers');
    // 签名是 (l1, l2, carry=0)，样例只给两个 —— 必填个数必须算成 2
    eq('带默认值的参数不算必填', entry.requiredCount, 2);
    eq(
      '类型标注里的 ListNode 被认出来',
      nodeParams(entry, code),
      ['list', 'list', 'none'],
    );

    const res = await run(code, {
      driver: buildCallDriver(
        [
          ['[2,4,3]', '[5,6,4]'],
          ['[0]', '[0]'],
        ],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    check('链表题能跑起来', !res.error, res.error);
    const rows = JSON.parse(String(res.value)) as Array<{v?: string; e?: string}>;
    // 题解里期望值写的是 [7,0,8] / [0]
    check(
      '入参被构造成 ListNode，返回值被还原成数组',
      rows[0]?.v === '[7, 0, 8]' && rows[1]?.v === '[0]',
      rows,
    );
    check('链表结果与期望值比较通过', compare(rows[0].v ?? '', '[7,0,8]').ok);
  }

  /* ---- 6b. 普通数组参数不能被当成链表 ---- */
  {
    // 有 ListNode 类，但入口收的是普通数组 —— 标注说了算
    const code = `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class Solution:
    def f(self, nums: List[int], k: int) -> int:
        return sum(nums) + k
`;
    const entry = analyzeSnippet(code).entry!;
    eq('普通数组参数不被当成节点', nodeParams(entry, code), ['none', 'none']);
    const res = await run(code, {
      driver: buildCallDriver([['[1,2,3]', '4']], callTarget(entry), nodeParams(entry, code)),
    });
    eq('普通数组照常传进去', JSON.parse(String(res.value))[0].v, '10');
  }

  /* ---- 6e. 题面是 JS 记法 + 力扣的层序树格式 ---- */
  {
    // 直接用题解 0104 的真实完整代码与真实样例
    // `root = [3,9,20,null,null,15,7]` 是 JavaScript 记法，
    // 而且是**层序**（不是 [left,val,right]）
    const code = codeBlockOf('leetcode/0104_maximum_depth_of_binary_tree.md', 0);
    const entry = analyzeSnippet(code).entry!;
    eq('树题参数被认成 tree', nodeParams(entry, code), ['tree']);

    // 不翻译时确实会炸 —— 先确认这个坑是真的
    const raw = await run(code, {
      driver: buildCallDriver(
        [['[3,9,20,null,null,15,7]']],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    const rawRows = JSON.parse(String(raw.value)) as Array<{e?: string}>;
    check('不翻译 null 时确实会炸', Boolean(rawRows[0]?.e), rawRows[0]?.e);

    const ok = await run(code, {
      driver: buildCallDriver(
        [
          [toPythonLiteral('[3,9,20,null,null,15,7]')],
          [toPythonLiteral('[1,null,2]')],
        ],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    const rows = JSON.parse(String(ok.value)) as Array<{v?: string; e?: string}>;
    eq('层序树第一组样例正确', rows[0]?.v, '3');
    eq('层序树第二组样例正确', rows[1]?.v, '2');
    check('两组都与题解期望值一致', compare(rows[0]?.v ?? '', '3').ok && compare(rows[1]?.v ?? '', '2').ok);
  }

  {
    // 层序 vs 递归格式的区分很重要：长度都是 3，但只有层序能对上
    // 用 0226 的真实代码块（它依赖平台预置的 TreeNode，签名也不带标注）
    const code = codeBlockOf('leetcode/0226_invert_binary_tree.md', 2);
    const entry = analyzeSnippet(code).entry!;
    eq('靠访问的属性认出是树', nodeParams(entry, code), ['tree']);
    const res = await run(code, {
      driver: buildCallDriver(
        [
          // 完全二叉树 [1,2,3] 层序：根 1，左右是 2 和 3
          [toPythonLiteral('[1,2,3]')],
        ],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    const rows = JSON.parse(String(res.value)) as Array<{v?: string; e?: string}>;
    // [1,2,3] 翻转后层序是 [1,3,2]；输出成递归格式或保留尾部 null 都会判失败
    eq('层序输出且去掉了尾部 null', rows[0]?.v, '[1, 3, 2]');
  }

  {
    // 0226 的真实样例：期望值本身就是层序
    const code = codeBlockOf('leetcode/0226_invert_binary_tree.md', 2);
    const entry = analyzeSnippet(code).entry!;
    const res = await run(code, {
      driver: buildCallDriver(
        [
          // 0226 的真实样例（题面给的输入是层序）
          [toPythonLiteral('[4,2,7,1,3,6,9]')],
          [toPythonLiteral('[2,1,3]')],
        ],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    const rows = JSON.parse(String(res.value)) as Array<{v?: string; e?: string}>;
    check('树题的期望值格式对得上（0226 第一组）', compare(rows[0]?.v ?? '', '[4,7,2,9,6,3,1]').ok, rows[0]);
    check('树题的期望值格式对得上（0226 第二组）', compare(rows[1]?.v ?? '', '[2,3,1]').ok, rows[1]);
  }

/* ---- 6c. 题解没定义 ListNode 时，平台预置的类要顶上 ---- */
  {
    // 0002 的**第一个**代码块只用了 ListNode，没带定义 —— 真平台上力扣给好了。
    // 读者看到的代码在真平台跑得通，我们不能让他看到 NameError。
    // 这也顺带验证了 13 篇「用了节点但没标注」的题解能跑。
    const code = codeBlockOf('leetcode/0002_add_two_numbers.md', 0);
    const entry = analyzeSnippet(code).entry!;
    eq('签名没标注也能认出链表参数', nodeParams(entry, code), ['list', 'list']);
    const res = await run(code, {
      driver: buildCallDriver(
        [
          ['[2,4,3]', '[5,6,4]'],
          ['[0]', '[0]'],
        ],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    check('没定义 ListNode 也能跑', !res.error && !res.driverError, res);
    const rows = JSON.parse(String(res.value)) as Array<{v?: string; e?: string}>;
    eq('平台预置的 ListNode 生效，结果正确', rows[0]?.v, '[7, 0, 8]');
    check('与题解的期望值一致', compare(rows[0]?.v ?? '', '[7,0,8]').ok);
  }

  {
    // 题解自己定义了 ListNode 时以题解为准（它的 __init__ 可能带额外字段）
    const code = `class ListNode:
    def __init__(self, val=0, next=None, tag='mine'):
        self.val = val
        self.next = next
        self.tag = tag


class Solution:
    def f(self, head: ListNode):
        return head.tag
`;
    const entry = analyzeSnippet(code).entry!;
    eq('块内自己定义了节点类时不靠猜（标注说了算）', nodeParams(entry, code), ['list']);
    const res = await run(code, {
      driver: buildCallDriver(
        // 传一个数组字面量，让 __mk_value__ 走 ListNode 分支
        [["['abc']"]],
        callTarget(entry),
        nodeParams(entry, code),
      ),
    });
    const rows = JSON.parse(String(res.value)) as Array<{v?: string; e?: string}>;
    eq('题解自己的类定义优先于平台预置（额外字段还在）', rows[0]?.v, '"mine"');
  }

/* ---- 6d. 手动输入时按标注补引号 ---- */
  {
    const code = `def reverse_number(num_str: str) -> str:
    return num_str[::-1]
`;
    const entry = analyzeSnippet(code).entry!;
    // 模拟读者在输入框敲 1516000（没加引号）
    const res = await run(code, {
      driver: buildCallDriver(
        [[quoteIfStr('1516000', entry.annotations[0])]],
        callTarget(entry),
      ),
    });
    const got = JSON.parse(String(res.value))[0].v as string;
    eq('str 参数的裸输入自动补引号后跑通', got, '"0006151"');
    check('与题解期望值一致', compare(got, '0006151').ok);
  }

  /* ---- 7b. stdout 文本 vs 返回值 JSON（ACM 题） ---- */
  {
    // 牛客题「输入 0 / 输出 0」：函数返回字符串 "0"、程序打印 0。
    // 按 JSON 比会判成不一致，而代码其实是对的。
    const code = codeBlockOf('nowcoder/华为机试/HJ11.数字颠倒.md', 2);
    const entry = analyzeSnippet(code).entry!;
    const target = callTarget(entry);

    const asJson = await run(code, {
      driver: buildCallDriver([['"0"']], target, nodeParams(entry, code)),
    });
    const jsonRow = JSON.parse(String(asJson.value))[0] as {v: string};
    eq('默认按 JSON 序列化', jsonRow.v, '"0"');

    const asText = await run(code, {
      driver: buildCallDriver(
        [['"0"']],
        target,
        nodeParams(entry, code),
        true,
      ),
    });
    const textRow = JSON.parse(String(asText.value))[0] as {v: string};
    eq('textCompare 按程序打印的样子', textRow.v, '0');
    check('与题面写的期望值一致', compare(textRow.v, '0').ok);
  }

  {
    // 列表返回时也不能变成 JSON 那种写法
    const code = 'def f(x):\n    return [len(x), x]\n';
    const entry = analyzeSnippet(code).entry!;
    const res = await run(code, {
      driver: buildCallDriver(
        [['"abc"']],
        callTarget(entry),
        nodeParams(entry, code),
        true,
      ),
    });
    const row = JSON.parse(String(res.value))[0] as {v: string};
    eq('文本模式下列表用 Python 字面量写法', row.v, '[3, abc]');
  }


  /* ---- 7. stdin 模式（牛客题形态） ---- */
  {
    // block 2 是 HJ11 的「完整代码实现」，也是唯一带 __main__ 的块
    const code = codeBlockOf('nowcoder/华为机试/HJ11.数字颠倒.md', 2);
    const analysis = analyzeSnippet(code);
    check('带 __main__ 的块被认成程序', analysis.isProgram);
    const res = await run(code, {stdin: '1516000', asMain: true});
    check('stdin 题能跑起来', !res.error, res.error);
    check('读到 stdin 并输出', res.stdout.trim() === '0006151', res.stdout);
    check('输出与题解的期望值一致', compare(res.stdout, '0006151').ok);
  }

  {
    // block 0 是解题思路里的纯函数定义，没有 __main__
    const code = codeBlockOf('nowcoder/华为机试/HJ11.数字颠倒.md', 0);
    const analysis = analyzeSnippet(code);
    check('纯函数块不算程序', !analysis.isProgram);
    check('但仍然可运行（可以手动传参）', analysis.runnable);
    // 手动参数：直接调函数也能得到正确答案
    const entry = analysis.entry!;
    const res = await run(code, {
      driver: buildCallDriver([['"1516000"']], callTarget(entry), nodeParams(entry, code)),
    });
    const got = JSON.parse(String(res.value))[0].v as string;
    eq('手动传参同样得到期望结果', got, '"0006151"');
    check('与题解的期望值比较通过（前导零没被当成数字）', compare(got, '0006151').ok);
  }

  /* ---- 8. stdin 为空时不会挂住（牛客题的 for line in sys.stdin） ---- */
  {
    const code = `import sys


def double(s):
    return s * 2


if __name__ == "__main__":
    for line in sys.stdin:
        if line.strip():
            print(double(line.strip()))
`;
    const res = await run(code, {asMain: true});
    check('没有输入时正常结束', !res.error, res.error);
    eq('没有输入时没有输出', res.stdout.trim(), '');

  {
    // HJ24 直接用 sys.stdin.buffer.read() —— 原生 StringIO 没有 buffer
    const code = codeBlockOf('nowcoder/华为机试/HJ24.合唱队.md', 1);
    const res = await run(code, {
      stdin: '8\n186 186 150 200 160 130 197 200',
      asMain: true,
    });
    check('stdin.buffer 可用（StringIO 子类带 buffer）', !res.error, res.error);
    check('多行 stdin 的程序跑出结果', res.stdout.trim().length > 0, res.stdout);
  }

  {
    // 直接验证 shim 的三个能力：文本读、字节读、input()
    const res = await run(
      'import sys\nprint(sys.stdin.read().strip())\nprint(repr(sys.stdin.buffer.read()))\n',
      {stdin: 'a\nb', asMain: true},
    );
    eq(
      'stdin 的文本与字节共用游标',
      res.stdout.trim().split('\n').map((l) => l.trim()),
      // 文本读和字节读共用游标：先 read() 读光了，buffer.read() 只能拿到空
      ['a', 'b', "b''"],
    );
  }

  }

  /* ---- 9. 语法错误的提示要指向用户自己的代码 ---- */
  {
    const res = await run('class Solution:\n    def f(self)\n        return 1\n');
    check('语法错误被捕获', Boolean(res.error), res);
    check('错误里出现我们的文件名', res.error.includes('.py'), res.error);
    check('错误里出现用户那行代码', res.error.includes('def f(self)'), res.error);
  }

  /* ---- 10. 缩进代码不会被 dedent 改写 ---- */
  {
    // Pyodide 的 runPythonAsync 默认 dedent=true，统一缩进的代码会被改写
    const code = 'class Solution:\n    def f(self):\n        return 42\n';
    const entry = analyzeSnippet(code).entry!;
    const res = await run(code, {
      driver: buildCallDriver([[]], callTarget(entry)),
    });
    eq('带缩进的类方法正常执行', JSON.parse(String(res.value))[0].v, '42');
  }

  console.log(`\n${pass} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    process.exit(1);
  }
}

void main();