# judge-tools

测试数据生成/导入工具。**不是**站点运行时代码，不参与 `pnpm build`。

## 数据来源

### LeetCodeDataset

```bash
git clone --depth 1 https://github.com/newfacade/LeetCodeDataset.git /tmp/opencode/lcd-repo
# 生成器默认读：
# /tmp/opencode/lcd-repo/data/LeetCodeDataset-v0.3.1-train.jsonl.gz
```

字段（v0.3.1）：

- `task_id`：题目标题 slug，如 `two-sum`
- `question_id`：力扣题号，如 `1`
- `entry_point`：如 `Solution().twoSum`
- `prompt`：公共前缀（typing/ListNode/TreeNode）
- `completion`：正确解法
- `input_output`：`[{"input": "nums = [3,3], target = 6", "output": "[0, 1]"}]`
- `test`：checker 断言；生成器用作交叉验证参考

许可证：HF 数据集卡标 Apache-2.0，GitHub 仓库代码标 MIT；以实际下载页为准。
数据只放服务端，不提交到公开仓库，不再分发。

## 生成

```bash
# 在文档站仓库根目录
python3 judge-tools/normalize_cases.py < outputs.json > normalized.json

pnpm judge:gen -- \
  --dataset /tmp/opencode/lcd-repo/data/LeetCodeDataset-v0.3.1-train.jsonl.gz \
  --out /home/hanphone/develop-projects/hanphone-blog/judge-server/data/problems \
  --only leetcode-1
```

生成器会：

1. 按 `question_id` / `task_id` 匹配文档题解；
2. 把 `input_output` 的 `name = value` 拆成入口参数；
3. 用数据集 `prompt + completion` 参考解跑一遍，丢掉参考解不通过的用例；
4. 用文档里的 Python 解再跑一遍，丢掉文档解不通过的用例；
5. 写出 `meta.json`、`harness.py`、`tests/*.json`。

真实数据默认只取前 25 个测试点进 active set，全量保留；服务端一次提交只跑 active。

## 非 LeetCode：先用题面样例

```bash
pnpm judge:gen-docs -- --out /home/.../judge-server/data/problems
pnpm judge:inventory
```

- stdin 题取 `## 示例` 的 stdin/stdout，先跑一遍文档解，通过的才留下；
- 函数题取 `samples`（没有就尝试把 `grid = [...]` 这类围栏输入转成单参数调用），
  用现有 driver 生成 harness；
- 这一步只覆盖题面可见样例，`provenance.source` 是 `docs-samples`。

## 专用 harness 与隐藏测试

```bash
# 链表/类 API/Shopee 等不适合通用函数的题
pnpm judge:gen-custom -- --out <judge-server/data/problems>

# 给 docs-samples 包补 fuzz 隐藏测试（stdin 变异 / 函数参数变异）
pnpm judge:gen-hidden -- --data <judge-server/data/problems>

# 专用 harness 的随机隐藏测试
python3 judge-tools/gen_custom_hidden.py \
  --docs code-training/docs/problems \
  --data <judge-server/data/problems>
```

隐藏测试的期望值由文档解现场算出；`provenance.hidden` / `hiddenCustom` 记录数量。
ML23 已支持：judge 镜像安装 `python3-numpy`，`meta.numpyRepr=true` 会把
`np.float64(1.0)` 归一成 `1.0` 再比较。

