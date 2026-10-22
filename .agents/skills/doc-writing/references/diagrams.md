# 图：draw.io

## 什么时候画

- 架构、部署、数据流、时序、状态机、权限判定、删除/失败路径：用 draw.io。
- **每篇讲流程或结构的文档至少一张图。** 一篇长文只有一张“方框+箭头”通常不够：入口与进程边界、状态迁移、异常路径可以拆成不同的图。
- 三行以内的流程、纯对照、能从表格直接读出的：不画，写成句子。
- 一张图只表达一件事。表达两件事就拆两张。

## 先写 diagram brief

动笔前先用文字写清这四行，再画：

```text
标题：一次上传
一句话：文件从上传到 ready，中间经过 worker 的五个阶段。
节点：upload / blob(sha256) / documents(pending) / ingest job / parse / chunk / embed / ready
边：upload→blob→documents→ingest job→parse→chunk→embed→ready
分组：API 侧（upload、documents）、worker 侧（ingest job 之后）
```

## 用 draw.io 的完整能力

不要只摆同一种矩形。按内容选形态：

| 内容 | 形态 |
|---|---|
| 多进程/多角色协作 | 泳道（lane），一条泳道一个进程 |
| 分层系统 | container 分组（API / worker / 存储） |
| 请求时序 | 生命线 + 消息箭头 |
| 任务/文档状态 | 状态节点 + 迁移边，终态用不同颜色 |
| 删除、失败、降级 | 主路径实线，可选/降级/异步虚线 |
| 权限判定 | 决策树，分支上写判据 |
| 表结构/集合 | 分组框 + 字段列表，不画成普通流程图 |

一张合格的图至少有：明确的阅读方向、图例、编号或阶段名、边界说明。颜色不超过三类（主路径、派生/异步、失败/降级），并在图例里写清楚。

## 文件约定

| 类型 | 位置 |
|---|---|
| 源文件 | `static/diagrams/src/<slug>.drawio` |
| 导出 | `static/diagrams/<slug>.svg` 或 `.png` |
| 正文引用 | `![图注](/diagrams/<slug>.svg)`（或 `.png`） |

- `<slug>` 用 kebab-case，语义化：`ingest-pipeline`、`retrieval-legs`、`delete-flow`。
- 没有 `static/` 的项目放 `docs/diagrams/src/` 与 `docs/diagrams/`，在写作方案里写明。
- `.drawio` 源文件必须进仓库；只提交 SVG/PNG 视为不合格。

## 导出 SVG 还是 PNG

**由实测决定，不默认 SVG。**

draw.io CLI 在导出中文标签时，经常把文字栅格化成 `<image>`。结果是“SVG”里没有可搜索的文字，体积却有 200–400 KB，页面加载明显变慢。

**先做一个 3 节点探针，再决定整批格式。** 实测：3 个中文节点导 SVG 是 39 KB、含 3 个 `<image>`；同一张图导 PNG 2x 只有 23 KB。所以中文标签默认 PNG 2x，只有纯英文/数字标签才值得再试 SVG。

导出后按**出现次数**检查，不要用 `grep -c`——它数的是行数，一张图的多个 `<image>` 可能挤在同一行，会少报：

```bash
grep -o '<image' static/diagrams/<slug>.svg | wc -l
ls -lh static/diagrams/<slug>.svg
```

判断规则：

- 探针干净（纯英文/数字标签）、体积 ≤150 KB → 用 SVG。文字可搜索、缩放不糊。
- 含 `<image>` 或 >150 KB → 改导 PNG 2x，或拆成两张图。PNG 2x 通常只有 30–80 KB，加载更快。
- 同一张图不要同时提交 SVG 和 PNG；正文只引用实际使用的那一份。
- 导出 PNG 加 `--scale 2`，避免高分屏发虚；暗色模式用浅色节点 + 透明/中性背景。

```bash
# SVG
drawio -x --no-sandbox -f svg -o static/diagrams/<slug>.svg static/diagrams/src/<slug>.drawio

# PNG 2x（中文标签被栅格化时的首选）
drawio -x --no-sandbox -f png --scale 2 -o static/diagrams/<slug>.png static/diagrams/src/<slug>.drawio
```

无头环境会打印 GPU/DRM 警告，只要产物存在且非空就是成功。

## 暗色模式

- 导出透明背景，节点填中性色（`#f5f5f5` / `#333333`），描边用 `#666666`。
- 不要用纯白底、高饱和品牌色；暗色主题下会刺眼。
- 文字放在浅色节点或浅色标签背景上；透明背景上的深色文字在暗色主题下读不出来。
- 需要精细控制时导出两版：`<slug>.svg` 和 `<slug>.dark.svg`，用 `<picture>` 或 CSS 切换。默认先做透明背景一版。

## 检查

1. SVG/PNG 能在浏览器打开，文字没有被裁切；页面缩放到 100% 与 150% 都清楚。
2. 箭头方向对，连线没有穿过文字；跨泳道的边从边界进出。
3. 图例、编号、虚线含义与正文一致。
4. 暗色主题下能读。
5. 正文里的「下图」和图对得上，每张图有 alt 文本。
6. 体积达标：单张 ≤150 KB；整篇的图加起来不超过约 500 KB。

## 硬规则

- 不用 Mermaid。
- 最终文档不留 ASCII 图；ASCII 只作为中间稿，转换后删除。
- 每个「下图」必须有对应图片；没有图就删掉这句话。
- 每张图必须有 alt 文本，写清这张图在讲什么。
- 图的源文件必须进仓库。

## 导出脚本

```bash
bash .agents/skills/doc-writing/scripts/export_drawio.sh --format svg
bash .agents/skills/doc-writing/scripts/export_drawio.sh --format png
# 或指定目录
bash .agents/skills/doc-writing/scripts/export_drawio.sh --format svg static/diagrams/src static/diagrams
```

脚本会遍历 `src/` 下所有 `.drawio`，按 `--format` 导出同名 `.svg` 或 `.png`。
