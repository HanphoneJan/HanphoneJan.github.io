/**
 * 题解页内嵌的算法可视化。
 *
 * ## 位置：`## 完整代码实现` 那一节的标题下面
 *
 * 早先它渲染在 `</DocItemContent>` 之后（`DocItem/Layout`），也就是页面最底部
 * —— 离它逐帧回放的那段代码隔了「示例推演 / 复杂度 / 易错点 / 相关题目 / 自测」几节。
 * 现在由 `@theme/MDXComponents` 的 `h2` 接到那一节的标题下面
 * （为什么不能挂到代码块下面、那条路踩过哪些坑，见那个文件头）。
 *
 * **没有独立的 TOC 条目**：播放器是「完整代码实现」这一节的一部分，
 * 那一节标题本来就在右侧导航里，再补一条「算法可视化」只是同一个位置的第二个入口。
 *
 * ## 为什么要按需加载
 *
 * 播放器 + 三个 renderer + 帧数据约 100KB。题解有 126 篇，
 * 若全部打进主 bundle，每个读者都要为用不到的那几篇付费。
 *
 * 所以拆成两层：
 *
 * - `<details>` 折叠壳（只有几十行 JSX，几乎零成本）
 * - 点开时才 `import('./RecordedPlayer')` 与 `fetch('/traces/x.json')`
 *
 * 读者不点就零下载 —— 与 CodeMirror 在 SnippetBar 里的处理一致。
 *
 * ## SSR 阶段画不出画面
 *
 * fetch 发生在 `onToggle` 里（纯客户端交互），SSR 阶段这个组件
 * 就是一个折叠的 `<summary>`。这是刻意的：播放器要按帧数算进度条与
 * 按钮禁用状态，服务器上没有数据可算。
 *
 * 与 tracer 版 `AlgoPlayer` 的区别：那个组件用 `useEffect` 取数据，
 * 所以首屏会闪一下「0 帧」。这里改成用户主动点开，没有闪烁问题。
 */

import React, {Suspense, lazy, useMemo, useState} from 'react';
import styles from './styles.module.css';
import type {VisTraceEntry} from '@site/plugins/vis-traces';

/**
 * 折叠壳的 id。
 *
 * 保留它有两个用处：读者可以直接链到「这道题的可视化」，
 * 以及 `pnpm check:vis` 在构建产物里靠 `id="visualizer"` 找出全部页面
 * ——那份清单是扫出来的，不是维护出来的。
 *
 * **它不再进 TOC**：位置由「完整代码实现」那一节的标题承担。
 */
export const VIS_ANCHOR = 'visualizer';

/**
 * 播放器本体。
 *
 * 刻意**不复用** tracer 版的 `AlgoPlayer`：那个组件假设「输入可编辑，
 * 改输入就重跑 `run()`」。录制式的帧是固定的 —— 换输入要重录，
 * 那是构建期的事，页面上做不到。所以另写一个只管播放的组件。
 *
 * 渲染器与样式仍然复用（styles.module.css 是同一个文件）。
 */
const RecordedPlayer = lazy(() => import('./RecordedPlayer'));

interface Props {
  entry: VisTraceEntry;
}

export default function InlineVisualizer({entry}: Props): React.ReactElement {
  const [open, setOpen] = useState(false);

  const body = useMemo(
    () =>
      open ? (
        <Suspense
          fallback={<p className={styles.visHint}>正在载入播放器…</p>}>
          <RecordedPlayer entry={entry} />
        </Suspense>
      ) : null,
    [open, entry],
  );

  return (
    <details
      // 显式 id：读者可以直接链到「这道题的可视化」，
      // `pnpm check:vis` 也靠它在构建产物里扫出全部页面。
      // 不能指望 @theme/Heading 从 <summary> 生成锚点 —— summary 不是标题元素。
      id={VIS_ANCHOR}
      className={styles.visBox}
      // 不直接用 onToggle + 懒加载组件：那会让 `<details>` 第一次被程序化
      // 展开（点 TOC 锚点）时拿不到数据。用受控 open 更可控。
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className={styles.visSummary}>
        算法可视化 · 逐帧回放这道题的代码
        <span className={styles.visMeta}>
          {entry.frameCount} 帧 · 录制输入 {entry.args.join(', ')}
        </span>
      </summary>
      <div className={styles.visBody}>{body}</div>
    </details>
  );
}
