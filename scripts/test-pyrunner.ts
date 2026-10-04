/**
 * 代码块运行链路的单测。
 *
 * ## 为什么必须有
 *
 * `snippet.ts` / `driver.ts` / `compare.ts` 都是纯函数，没有 UI 保护网，
 * 改错了不报错，只表现为「按钮点了没反应」或「样例全判失败」——
 * 而后者更阴险：读者会以为是自己的代码写错了。
 *
 * 这里断言四类东西：
 *
 * 1. **可运行性判定** —— 片段绝不能被当成可运行（否则满页 NameError）
 * 2. **入口签名** —— 参数顺序错 = 得到一个看起来合理的错误答案
 * 3. **样例适配** —— 参数个数对不上就不该出现「跑样例」
 * 4. **真实语料回归** —— 182 篇题解的实际统计数字变了要有人知道
 *
 * 跑法：pnpm test:pyrunner
 */

import fs from 'fs';
import path from 'path';
import {analyzeSnippet, parseParams, samplesFit, splitTopLevel} from '../src/components/training/pyrunner/snippet';
import {buildCallDriver, buildPrelude} from '../src/components/training/pyrunner/driver';
import {compare, isUsableExpected} from '../src/components/training/pyrunner/compare';
import {errorLinesOf} from '../src/components/training/pyrunner/exec';
import {
  crossCheckEntryName,
  extractSamples,
  extractSignature,
  extractStdinSamples,
} from '../plugins/py-samples';
import {
  asCallArgument,
  manualCase,
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

/* ---------------- 1. 参数解析 ---------------- */

eq('去掉类型标注与默认值', parseParams('nums: List[int], target: int = 9'), [
  'nums',
  'target',
]);
eq('去掉 *args 的星号', parseParams('self, *args, **kwargs'), ['args', 'kwargs']);
eq('括号里的逗号不切', parseParams('matrix: List[List[int]], n: int'), [
  'matrix',
  'n',
]);
eq(
  '顶层逗号切分忽略引号与括号',
  splitTopLevel('[2,7,11,15], "a,b", {k: 1}'),
  ['[2,7,11,15]', '"a,b"', '{k: 1}'],
);

/* ---------------- 2. 可运行性判定 ---------------- */

const leetcodeBlock = `from typing import List


class Solution:
    """两数之和"""

    def __init__(self):
        self.seen = {}

    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i, n in enumerate(nums):
            if target - n in self.seen:
                return [self.seen[target - n], i]
            self.seen[n] = i
        return []
`;

{
  const a = analyzeSnippet(leetcodeBlock);
  check('Solution 块可运行', a.runnable);
  eq('入口是 twoSum', a.entry?.name, 'twoSum');
  eq('跳过 __init__ 选中真正的入口', a.entry?.kind, 'method');
  eq('参数顺序', a.entry?.paramNames, ['nums', 'target']);
}

{
  const nowcoder = `import sys


def reverse_number(num_str: str) -> str:
    return num_str[::-1]


if __name__ == "__main__":
    for line in sys.stdin:
        print(reverse_number(line.strip()))
`;
  const a = analyzeSnippet(nowcoder);
  check('牛客的顶层函数可运行', a.runnable);
  eq('入口是顶层函数', a.entry?.kind, 'function');
  eq('参数名', a.entry?.paramNames, ['num_str']);
}

{
  // 易错点小节里最典型的片段：带 ... 的伪代码
  const fragment = `if target - num in hashtable:
    ...
hashtable[num] = i`;
  const a = analyzeSnippet(fragment);
  check('片段不可运行', !a.runnable);
  eq('片段没有入口', a.entry, null);
}

{
  const single = `ans = i - left  # 不是 i - left + 1`;
  check('单行片段不可运行', !analyzeSnippet(single).runnable);
}

{
  // 讲回溯骨架的中文伪代码：Python 3 允许中文标识符，语法合法但永远跑不通
  const pseudo = `def backtrack(路径, 选择列表):
    if 满足结束条件:
        收集结果
        return
    for 选择 in 选择列表:
        做选择
        backtrack(新路径, 新选择列表)
        撤销选择`;
  const a = analyzeSnippet(pseudo);
  check('中文伪代码不可运行', !a.runnable);
  check('理由说明是骨架代码', a.reason.includes('骨架'), a.reason);
}

{
  // 藏在函数体里的中文也算：0003 的 `while 需要收缩:` 就在 body 里
  const bodyPseudo = `def sliding_window(s):
    left = 0
    for right in range(len(s)):
        while 需要收缩:
            left += 1
        update_result()
`;
  check('函数体里的中文伪代码也不可运行', !analyzeSnippet(bodyPseudo).runnable);
}

{
  // 注释/docstring 里出现中文是正常的，不能误杀
  const withChineseComment = `class Solution:
    def f(self, nums):
        # 用哈希表记录已经见过的数字，路径要清楚
        return len(nums)
`;
  check('注释里的中文不影响可运行性', analyzeSnippet(withChineseComment).runnable);
}

{
  const withChineseDoc = `class Solution:
    def f(self, nums):
        """
        思路：把每个元素作为路径的起点。
        """
        return len(nums)
`;
  check('docstring 里的中文不影响可运行性', analyzeSnippet(withChineseDoc).runnable);
}

{
  // 0226 的前两个代码块：只有方法体、忘了 class 那一行。
  // Python 里这是 IndentationError，给按钮就是让读者看一串错误。
  const orphan = `    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        if not root:
            return None
        left = self.invertTree(root.left)
        right = self.invertTree(root.right)
        root.left, root.right = right, left
        return root`;
  const a = analyzeSnippet(orphan);
  check('缺 class 声明的方法块不可运行', !a.runnable);
  check('理由点名了缺 class', a.reason.includes('class'), a.reason);
}

{
  // 0215：partition(nums, left, right) 是辅助方法，不该被当成入口
  const helperFirst = `class Solution:
    def partition(self, nums, left, right):
        return left

    def findKthLargest(self, nums: List[int], k: int) -> int:
        return nums[k]
`;
  eq('跳过带区间参数的辅助方法', analyzeSnippet(helperFirst).entry?.name, 'findKthLargest');
}

{
  // 0062：m/n 是正常入参，不能被当成区间
  const normal = `class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        return m

    def uniquePathsByDP(self, m: int, n: int) -> int:
        return n
`;
  eq('m/n 这类正常入参不受影响', analyzeSnippet(normal).entry?.name, 'uniquePaths');
}

{
  // import numpy 在浏览器里必然失败，不该给按钮
  const ml = `import numpy as np


def kmeans(x, k):
    return np.array(x)
`;
  const a = analyzeSnippet(ml);
  check('依赖 numpy 的块不可运行', !a.runnable);
  check('理由里点名了 numpy', a.reason.includes('numpy'), a.reason);
}

{
  // 0300：同一篇里出现了「返回形态不同」的另一个函数。
  // lengthOfLIS_with_path 收同样的参数，返回的是那条递增子序列本身，
  // 而题面的期望值是长度 —— 拿题面样例去调它必然全判失败。
  const withPath = `def lengthOfLIS_with_path(nums):
    return [nums[0]]
`;
  const a = analyzeSnippet(withPath, 'lengthOfLIS');
  check('0300 的 lengthOfLIS_with_path 仍可运行（能给手动输入）', a.runnable);
  check('但不算这道题的入口', !a.matchesDocEntry);
  check(
    '没传入口名时一律算命中（老行为不变）',
    analyzeSnippet(withPath).matchesDocEntry,
  );
}

{
  // 名字一致 -> 命中
  const same = `def reverse_number(num_str):
    return num_str[::-1]
`;
  check('名字一致算命中', analyzeSnippet(same, 'reverse_number').matchesDocEntry);
}

{
  // 解法变体后缀仍然算这道题：moveZeroes_brute / rotate_left 算的还是那道题
  const variants = [
    ['def moveZeroes_brute(nums):\n    return nums\n', 'moveZeroes'],
    ['def maxSlidingWindow_heap(nums, k):\n    return []\n', 'maxSlidingWindow'],
    ['def searchMatrix_brute(matrix, target):\n    return False\n', 'searchMatrix_binary_search'],
    ['def numSquares_bfs(n):\n    return 0\n', 'numSquares'],
  ] as const;
  for (const [code, doc] of variants) {
    check(
      `解法变体 ${code.match(/def (\w+)/)![1]} 算命中`,
      analyzeSnippet(code, doc).matchesDocEntry,
    );
  }
}

{
  // 别的函数一律不算命中，否则会拿题面样例去调它并谎报失败
  for (const [name, doc] of [
    ['dfs', 'minDistance'],
    ['getRow', 'generate'],
    ['parse_expr', 'evaluate'],
    ['_read_input', 'min_refuel_stops'],
    ['moveNegatives', 'moveZeroes'],
    ['rotate_left', 'rotate'],
    ['coinChange_with_path', 'coinChange_memo'],
  ] as const) {
    check(
      `别的函数 ${name} 不算命中`,
      !analyzeSnippet(`def ${name}(x):\n    return x\n`, doc).matchesDocEntry,
    );
  }
}

{
  // 类里的多个方法：文档入口名要能选中正确的那个，
  // 哪怕它不是第一个（0215 的 partition 排在前面）。
  const multi = `class Solution:
    def helper(self, nums, left, right):
        return left

    def findKthLargest(self, nums: List[int], k: int) -> int:
        return nums[k]
`;
  const a = analyzeSnippet(multi, 'findKthLargest');
  check('类里按文档入口名选中方法', a.entry?.name === 'findKthLargest', a.entry?.name);
  check('命中时 matchesDocEntry 为真', a.matchesDocEntry);
}

{
  // __init__ 是唯一方法时不该被当成入口（没有参数）
  const onlyInit = `class Solution:
    def __init__(self):
        pass
`;
  check('只有 __init__ 的类不可运行', !analyzeSnippet(onlyInit).runnable);
}

/* ---------------- 3. 样例适配 ---------------- */

{
  const entry = {
    kind: 'method' as const,
    name: 'twoSum',
    className: 'Solution',
    paramNames: ['nums', 'target'],
    annotations: ['list[int]', 'int'],
    requiredCount: 2,
  };
  check('参数个数一致时可以跑样例', samplesFit(entry, [['[2,7]', '9']]));
  check(
    '参数个数不一致时不跑样例',
    !samplesFit(entry, [['[2,7]']]),
    '顺序/个数错了结果没有意义，宁可不给按钮',
  );
  check('没有样例时不跑样例', !samplesFit(entry, []));
}

/* ---------------- 3b. JS 字面量 -> Python ---------------- */

{
  // 力扣题面是 JavaScript 记法，null 会让 literal_eval 直接抛 ValueError
  eq('null 换成 None', toPythonLiteral('[3,9,20,null,null,15,7]'), '[3,9,20,None,None,15,7]');
  eq('true/false 原样（Python 同名同义）', toPythonLiteral('[true,false]'), '[true,false]');
  eq('字符串里的 null 不动', toPythonLiteral('"a null b"'), '"a null b"');
  eq('嵌套数组里的 null 也换', toPythonLiteral('[[7,null],[13,0]]'), '[[7,None],[13,0]]');
  eq('普通整数数组不动', toPythonLiteral('[1,2,3]'), '[1,2,3]');
  eq('字符串数组不动', toPythonLiteral('["ad","ae"]'), '["ad","ae"]');
  eq('负数不动', toPythonLiteral('[-10,9,20]'), '[-10,9,20]');
}

/* ---------------- 4. 驱动代码 ---------------- */

{
  const driver = buildCallDriver([['[2,7,11,15]', '9']], {
    expr: '__sol__.twoSum',
    instantiate: '__sol__ = Solution()',
  });
  check('驱动实例化 Solution', driver.includes('__sol__ = Solution()'));
  check('驱动用 literal_eval 还原参数', driver.includes('__ast__.literal_eval(x)'));
  check('节点结构按位置传给驱动', driver.includes('__kinds__ = ["none","none"]'));
  // 结尾必须是裸表达式：runPythonAsync 靠它把结果直接返回给 JS
  check(
    '驱动以裸表达式收尾（不是 print）',
    driver.trimEnd().endsWith('__json__.dumps(__r__, ensure_ascii=False)'),
  );
  check('逐条 try，单条失败不影响其它条', driver.includes('except Exception:'));
  check('调用结果经过编码器', driver.includes('__enc__('));
}

{
  const driver = buildCallDriver([['"abcabcbb"']], {
    expr: 'longest_substring',
    instantiate: null,
  });
  check('函数入口不实例化', !driver.includes('Solution()'));
  check('函数入口直接调用', driver.includes('longest_substring(*__p__)'));
}

{
  const prelude = buildPrelude({
    filename: 'snippet-1.py',
    code: 'a = 1\nb = 2',
    stdin: 'hello',
  });
  check('prelude 登记 linecache', prelude.includes('__lc__.cache['));
  check('prelude 用真实文件名', prelude.includes('"snippet-1.py"'));
  check(
    'prelude 接管 stdin',
    prelude.includes('__Stdin__(') && prelude.includes('class __Stdin__'),
  );
  // 文本视图与字节视图共用游标：ACM 题解里 `sys.stdin.buffer.read()` 很常见，
  // 而原生 StringIO 连属性都加不上
  check('stdin 带 buffer 能力', prelude.includes('self.buffer = __StdinBuf__(self)'));
  // 源码里的换行必须以 \n 字面量形式进 linecache，否则行号会错位
  check('prelude 逐行存源码', prelude.includes('"a = 1\\n"'), prelude);
}

{
  // traceback 行号解析：错误行必须能定位回编辑器
  const tb = [
    'Traceback (most recent call last):',
    '  File "snippet-3.py", line 7, in twoSum',
    '    if target - n in self.seen:',
    'KeyError: 5',
  ].join('\n');
  eq('从 traceback 里取行号', errorLinesOf(tb, 'snippet-3.py'), [7]);
  eq('别的文件不影响', errorLinesOf(tb, 'snippet-9.py'), []);
}

/* ---------------- 5. 期望值比较 ---------------- */

check('完全相同', compare('[0, 1]', '[0, 1]').ok);
check('JSON 空格差异不算错', compare('[0,1]', '[0, 1]').ok);
check('浮点格式差异不算错', compare('2.0', '2.00000').ok);
check('引号差异不算错', compare('abc', '"abc"').ok);
check('实际带引号期望不带（字符串返回值）', compare('"abc"', 'abc').ok);
check('前导零的字符串不会被当成数字', compare('"0006151"', '0006151').ok);
check('前导零真的不等时仍然判失败', !compare('"0007151"', '0006151').ok);
check('真的不同要判失败', !compare('[0, 2]', '[0, 1]').ok);
check('失败时给出原因', Boolean(compare('[0, 2]', '[0, 1]').reason));

{
  // 0049：题面写了「可以按任意顺序返回」，元素集合一样就该算通过。
  const expected = '[["bat"],["nat","tan"],["ate","eat","tea"]]';
  const actual = '[["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]';
  check(
    '任意顺序：分组顺序不同也算通过',
    compare(actual, expected, {orderAgnostic: true}).ok,
  );
  check(
    '默认仍然按序比（区间有序的题不能放宽）',
    !compare(actual, expected).ok,
  );
  check(
    '放宽了顺序也不放过「元素真的不同」',
    !compare('[["bat"],["nat","tan"],["ate","eat","XXX"]]', expected, {
      orderAgnostic: true,
    }).ok,
  );
  check(
    '0347 这种一维的也能按集合比',
    compare('[2, 1]', '[1, 2]', {orderAgnostic: true}).ok,
  );
}

{
  // ACM 文本模式下 Python 的 str(True) 是 `True`，题面写的是 `true`
  check('Python 的 True 与题面的 true 视为一致', compare('True', 'true').ok);
  check('False 同理', compare('False', 'false').ok);
  check('真的不一样仍然判失败', !compare('True', 'false').ok);
  check('数字不受这条影响', !compare('True', '1').ok);
}

{
  // 0297：期望值是层序，代码吐的是前序 + 末尾多几个 null。
  // 两边描述的是同一棵树，力扣的评测也是先反序列化再比的。
  check(
    '前序序列与层序期望值描述同一棵树时算通过',
    compare('"[1,2,null,null,3,4,null,null,5]"', '[1,2,3,null,null,4,5]').ok,
  );
  check(
    '带方括号/不带方括号都认',
    compare('"1,2,null,null,3,4,null,null,5"', '"[1,2,3,null,null,4,5]"').ok,
  );
  check(
    '真的是另一棵树时仍然判失败',
    !compare('"[1,2,null,null,3,4,null,null,9]"', '[1,2,3,null,null,4,5]').ok,
  );
  check('非树序列不走这条路', !compare('"[1,2]"', '[3,4]').ok);
  check(
    '0108：题面承认答案不唯一时只比节点值集合',
    compare('[0,-10,5,null,-3,null,9]', '[0,-3,9,-10,null,5]', {
      multiAnswer: true,
    }).ok,
  );
  check(
    '没开 multiAnswer 时形状不同就是失败',
    !compare('[0,-10,5,null,-3,null,9]', '[0,-3,9,-10,null,5]').ok,
  );
  check(
    '值集合真的不同仍然判失败',
    !compare('[0,1,2]', '[0,3,9]', {multiAnswer: true}).ok,
  );
}

{
  // 散文期望值（0095 的「5 棵不同的 BST」）不能参与判定
  check('散文期望值不可用', !isUsableExpected('5 棵不同的 BST'));
  check('省略号期望值不可用', !isUsableExpected('[0,1,2,...]'));
  check('正常字面量可用', isUsableExpected('[0,1]'));
  check('带 null 的数组可用', isUsableExpected('[1,2,null]'));
  check('字符串可用', isUsableExpected('"abc"'));
  check('true 可用', isUsableExpected('true'));
  check('负数可用', isUsableExpected('-42'));
  check('括号题的多层数组可用', isUsableExpected('["((()))","(()())"]'));
  check('空串不可用', !isUsableExpected('  '));
}

{
  // 0301 / 0022 的值里有括号，早先被 readValue 的截断规则砍掉过
  const s0301 = [
    '输入：s = ")("',
    '输出：[""]',
  ].join('\n');
  const got = extractSamples(s0301, ['s'], 1);
  eq('引号里的括号不会被当成散文', got[0]?.args[0], '")("');
  eq('方括号里的引号也不会', got[0]?.expected, '[""]');

  const s0022 = [
    '输入：n = 3',
    '输出：["((()))","(()())","(())()"]',
  ].join('\n');
  eq(
    '期望值里的括号与引号都保住',
    extractSamples(s0022, ['n'], 1)[0]?.expected,
    '["((()))","(()())","(())()"]',
  );

  const sProse = ['输入：n = 3', '输出：5 棵不同的 BST'].join('\n');
  const prose = extractSamples(sProse, ['n'], 1)[0];
  // **不能**把散文截成 `5`：0095 的 generateTrees(3) 返回的是 5 棵树而不是数字 5，
  // 截了就得到一个必然失败的样例。整段留着、判定阶段当散文丢掉才对。
  eq('散文期望值原样抽出（不被截成 5）', prose?.expected, '5 棵不同的 BST');
  check('并被判为不可用', !isUsableExpected(prose?.expected ?? ''));
}

{
  // 0148：入口是整篇的属性，不能只看「完整代码实现」里第一个方法
  const md0148 = [
    '## 完整代码实现',
    '',
    '```python',
    'class Solution:',
    '    def getListLength(self, head):',
    '        return 0',
    '',
    '    def sortList(self, head):',
    '        return head',
    '```',
    '',
    '## 暴力解法',
    '',
    '```python',
    'def sortList(head):',
    '    return head',
    '```',
  ].join('\n');
  eq(
    '别的块用顶层函数写过同一个名字 -> 那才是入口',
    crossCheckEntryName(
      md0148,
      'class Solution:\n    def getListLength(self, head):\n        return 0\n\n    def sortList(self, head):\n        return head',
      'getListLength',
    ),
    'sortList',
  );
  eq(
    '别处没提过就保持原样',
    crossCheckEntryName('## 其它\n\n无代码\n', 'class Solution:\n    def f(self, a):\n        return a', 'f'),
    null,
  );
}
check('省略号的期望值不可用', !isUsableExpected('[0, 1, 2, ...]'));
check('省略号（中文）也不可用', !isUsableExpected('前 3 个是 [0, 1, 2]…'));
check('正常期望值可用', isUsableExpected('[0, 1]'));

/* ---------------- 5b. 手动输入的引号补全 ---------------- */

{
  eq('str 标注的裸词自动加引号', quoteIfStr('1516000', 'str'), '"1516000"');
  eq('str 标注的 None 也加引号（标注说了算，不猜长相）', quoteIfStr('None', 'str'), '"None"');
  eq('已经带引号的不动', quoteIfStr('"abc"', 'str'), '"abc"');
  eq("单引号也不动", quoteIfStr("'abc'", 'str'), "'abc'");
  eq('裸 f-string 不动', quoteIfStr('f"abc"', 'str'), 'f"abc"');
  eq('int 标注不动', quoteIfStr('1516000', 'int'), '1516000');
  eq('没有标注不动', quoteIfStr('abc'), 'abc');
  eq('复合字面量不动（用户显然在写表达式）', quoteIfStr('[1, 2]', 'str'), '[1, 2]');
  eq('optional[str] 也算 str', quoteIfStr('abc', 'optional[str]'), '"abc"');
  eq('引号内的双引号被转义', quoteIfStr('a"b', 'str'), '"a\\"b"');
}

{
  // 自己输入的一行 -> 一组实参。
  // 「能自己输参数跑」是运行条的基本功能，两种平台的输入框都走这里。
  const entry = analyzeSnippet(
    `class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        return 0
`,
  ).entry!;
  eq(
    '树题的层序格式（力扣题面原样）能直接跑',
    manualCase('[3,9,20,null,null,15,7]', entry).join('|'),
    '[3,9,20,None,None,15,7]',
  );

  const strEntry = analyzeSnippet(
    `def reverse_number(num_str: str):
    return num_str[::-1]
`,
  ).entry!;
  eq(
    'str 参数敲裸数字自动加引号',
    manualCase('1516000', strEntry).join('|'),
    '"1516000"',
  );

  const noAnn = analyzeSnippet(
    `def last_word(line):
    return line
`,
  ).entry!;
  eq(
    '没标注时裸词按字符串处理（与 stdin 派生样例同一套判断）',
    manualCase('HelloNowcoder', noAnn).join('|'),
    '"HelloNowcoder"',
  );
  eq(
    '没标注时字面量不动',
    manualCase('[1,2,3]', noAnn).join('|'),
    '[1,2,3]',
  );

  const two = analyzeSnippet(
    `def two_sum(nums, target):
    return []
`,
  ).entry!;
  eq(
    '多参数按顶层逗号切，数组里的逗号不算',
    manualCase('[2,7,11,15], 9', two).join('|'),
    '[2,7,11,15]|9',
  );

  const strAnn = analyzeSnippet(
    `def f(a: str):
    return a
`,
  ).entry!;
  eq(
    'str 参数上的 null 是字符串 "null" 而不是 None',
    manualCase('null', strAnn).join('|'),
    '"null"',
  );
}

/* ---------------- 5c. stdin 样例 -> 调用实参 ---------------- */

{
  eq('str 标注的文本加引号', asCallArgument('HelloNowcoder', 'str'), '"HelloNowcoder"');
  eq('list 标注原样传', asCallArgument('1 2 3', 'list[int]'), '1 2 3');
  eq('int 标注原样传', asCallArgument('5', 'int'), '5');
  // 解题思路里的纯函数大多没有标注，靠「能不能当字面量解析」来判断
  eq('无标注的裸词当文本', asCallArgument('HelloNowcoder'), '"HelloNowcoder"');
  eq('无标注的数字当数字', asCallArgument('5'), '5');
  eq('无标注的数组原样传', asCallArgument('[1,2,3]'), '[1,2,3]');
  eq('无标注的带空格文本加引号', asCallArgument('   fly me   to   the moon'), '"   fly me   to   the moon"');
  eq('已经带引号的不重复加', asCallArgument('"abc"', 'str'), '"abc"');
  eq('无标注的 None 原样传', asCallArgument('None'), 'None');
}

/* ---------------- 6. stdin 样例抽取（真实语料） ---------------- */

{
  // 牛客题的主力写法。`**输入：**` 的冒号后还有收尾的 `**`，
  // 正则少写一个 (?:\*\*)? 就一条都匹配不到（构建日志里 0 篇）。
  const md = [
    '## 示例',
    '',
    '### 示例 1',
    '',
    '**输入：**',
    '```',
    'Hello World',
    '```',
    '',
    '**输出：**',
    '```',
    '5',
    '```',
    '',
    '### 示例 2',
    '',
    '**输入：**',
    '```',
    'abc',
    '```',
    '',
    '**输出：**',
    '```',
    '3',
    '```',
  ].join('\n');
  eq('stdin 样例抽取', extractStdinSamples(md), [
    {stdin: 'Hello World', expected: '5'},
    {stdin: 'abc', expected: '3'},
  ]);
}

{
  const md = ['## 示例', '', '**输入：**', '```', '1 2', '```'].join('\n');
  eq('只有输入没有输出时丢掉', extractStdinSamples(md), []);
  eq('没有示例小节时为空', extractStdinSamples(undefined), []);
}

{
  const md = [
    '## 示例',
    '',
    '**输入：**',
    '```',
    '1 2 ...',
    '```',
    '',
    '**输出：**',
    '```',
    '3 ...',
    '```',
  ].join('\n');
  eq('含省略号的 stdin 样例丢掉', extractStdinSamples(md), []);
}

/* ---------------- 6b. 样例的各种写法（真实语料回归） ---------------- */

{
  // 全角逗号当分隔符：只认半角的话 0010 整篇抽不到样例。
  // 注意引号里的全角逗号不能被切开。
  const md = [
    '**示例：**',
    '- 输入：s = "你好，世界"，p = "a"，输出：true',
    '- 输入：nums = [1,2,3]，target = 6，输出：[1,2]',
  ].join('\n');
  eq(
    '全角逗号也当分隔符',
    extractSamples(md, ['s', 'p'], 2),
    [{args: ['"你好，世界"', '"a"'], expected: 'true'}],
  );
}

{
  // 输入输出写在同一行，用 → 分隔
  const md = ['- 输入：`nums = [-1,0,1,2,-1,-4]` → 输出：`[[-1,-1,2],[-1,0,1]]`'].join(
    '\n',
  );
  eq(
    '同一行的「输入 → 输出」',
    extractSamples(md, ['nums'], 1),
    [
      {
        args: ['[-1,0,1,2,-1,-4]'],
        expected: '[[-1,-1,2],[-1,0,1]]',
      },
    ],
  );
}

{
  // 位置参数写法（没有 k = v）
  const md = ['输入: [1,2,3,1]', '输出: 4'].join('\n');
  eq(
    '位置参数按签名顺序对上',
    extractSamples(md, ['nums'], 1),
    [{args: ['[1,2,3,1]'], expected: '4'}],
  );
}

{
  // 数组给位置、k 按名字给（0215 的写法）
  const md = ['输入: [3,2,1,5,6,4], k = 2', '输出: 5'].join('\n');
  eq(
    '位置值与命名值混用',
    extractSamples(md, ['nums', 'k'], 2),
    [{args: ['[3,2,1,5,6,4]', '2'], expected: '5'}],
  );
}

{
  // `**输入：**` 后面跟的是围栏块 —— 那是 stdin 样例，不是调用样例。
  // 不挡掉的话会造出 {args:['**']} 这种必然失败的垃圾样例（踩过：牛客题全中）。
  const md = [
    '**输入：**',
    '```',
    '1516000',
    '```',
    '',
    '**输出：**',
    '```',
    '0006151',
    '```',
  ].join('\n');
  eq('围栏形式的输入不产生调用样例', extractSamples(md, ['num_str'], 1), []);
  eq(
    '同一样例走 stdin 通道',
    extractStdinSamples(md),
    [{stdin: '1516000', expected: '0006151'}],
  );
}

{
  // 输出后面跟着解释时要截断
  const md = ['输入：s = "aa"，p = "a*"', '输出：true（"a*" 可以匹配零个或多个）'].join(
    '\n',
  );
  eq(
    '输出后面的括号解释被截掉',
    extractSamples(md, ['s', 'p'], 2),
    [{args: ['"aa"', '"a*"'], expected: 'true'}],
  );
}

/* ---------------- 7. 入口签名（插件侧） ---------------- */

{
  // __init__ 必须跳过，否则入口参数个数对不上，所有样例都失效
  const code = [
    'class Solution:',
    '    def __init__(self):',
    '        pass',
    '',
    '    def twoSum(self, nums, target):',
    '        return []',
  ].join('\n');
  eq('跳过 __init__', extractSignature(code), {
    method: 'twoSum',
    paramNames: ['nums', 'target'],
    requiredCount: 2,
  });
}

{
  const code =
    'def reverse_number(num_str: str) -> str:\n    return num_str[::-1]';
  eq('牛客题顶层函数签名', extractSignature(code), {
    method: 'reverse_number',
    paramNames: ['num_str'],
    requiredCount: 1,
  });
}

/* ---------------- 8. 真实语料回归 ---------------- */

const docsRoot = path.join(__dirname, '../code-training/docs/problems');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...walk(full));
    } else if (e.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

if (fs.existsSync(docsRoot)) {
  const files = walk(docsRoot);
  let blocks = 0;
  let runnable = 0;
  let fragments = 0;
  let solutions = 0;
  let docsWithStdin = 0;

  for (const f of files) {
    const md = fs.readFileSync(f, 'utf8');
    const re = /```python\s*\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md)) !== null) {
      blocks++;
      const a = analyzeSnippet(m[1]);
      if (a.runnable) {
        runnable++;
        if (a.entry?.kind === 'method') {
          solutions++;
        }
      } else {
        fragments++;
      }
    }

    const code = md.match(
      /## 完整代码实现[\s\S]*?```python\s*\n([\s\S]*?)```/,
    );
    const sampleSection = md.split(/^##\s+/m).find((s) =>
      s.startsWith('示例'),
    );
    if (code && sampleSection) {
      const stdinSamples = extractStdinSamples(sampleSection);
      if (stdinSamples.length > 0 && extractSignature(code[1]).method) {
        docsWithStdin++;
      }
    }
  }

  console.log(
    `\n语料：${files.length} 篇 / ${blocks} 个 python 块` +
      `（可运行 ${runnable}，其中 Solution 方法 ${solutions}；片段 ${fragments}）` +
      `；可跑 stdin 样例的题解 ${docsWithStdin} 篇`,
  );

  // 这些数字是「页面有多满」的基线。掉了说明判定规则被改坏了。
  check('语料里有足够的题解（>=170 篇）', files.length >= 170, files.length);
  // 339/239 是实测基线（中文伪代码与缺 class 的方法体都算进片段）
  check('可运行块数量在预期区间（300~460）', runnable >= 300 && runnable <= 460, runnable);
  check('片段数量在预期区间（150~290）', fragments >= 150 && fragments <= 290, fragments);
  check('Solution 块数量在预期区间（190~240）', solutions >= 190 && solutions <= 240, solutions);
  // 牛客题那批要是 0，就说明 `**输入：**` 的收尾 ** 又把正则挡掉了
  check('stdin 样例能抽到（>=15 篇）', docsWithStdin >= 15, docsWithStdin);
}

console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length > 0) {
  process.exit(1);
}