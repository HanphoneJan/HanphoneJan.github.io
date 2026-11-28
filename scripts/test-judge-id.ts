import assert from 'node:assert/strict'
import {judgeIdOf} from '../src/components/training/judge/id'

const cases: Array<[Record<string, unknown>, string, string]> = [
  [{platform: 'LeetCode', id: 1}, 'problems/leetcode/0001_two_sum.md', 'leetcode-1'],
  [{platform: 'NowCoder', id: 'HJ80'}, 'problems/nowcoder/华为机试/HJ80.整型数组合并.md', 'nowcoder-hj80'],
  [{platform: 'CodeFun2000', id: 'P5522'}, 'problems/codefun2000/huawei-ai/P5522.md', 'codefun2000-p5522'],
  [{platform: '顺丰科技', id: 'sf_tiling'}, 'problems/sf/sf_tiling_1x2_2x2.md', 'sf-sf-tiling'],
  [{platform: '自定义'}, 'problems/misc/balance_paths.md', 'custom-balance-paths'],
]

for (const [fm, docId, expected] of cases) {
  const actual = judgeIdOf(fm, docId)
  assert.equal(actual, expected, `${docId}: ${actual} != ${expected}`)
  assert.match(actual, /^[a-z0-9][a-z0-9-]*$/, `${actual} 不是合法 judge id`)
}

console.log(`✔ test:judge 通过（${cases.length} 项）`)
