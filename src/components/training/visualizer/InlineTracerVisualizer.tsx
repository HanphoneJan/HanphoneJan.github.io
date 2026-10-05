/**
 * 文档内嵌的**手写 tracer**（滑动窗口、二分、排序、网格 BFS、DP…）。
 *
 * 与 `InlineVisualizer`（题解页的录制式）是两个组件，但壳是一样的：
 * `<details>` 折叠 + 显式 id + 点开才 `React.lazy`。
 *
 * ## 为什么不复用 `AlgoPlayer` 的懒加载边界
 *
 * `AlgoPlayer` 是播放器的**本体**（含四个 renderer 与全部交互）。
 * 这里 `lazy(() => import('./AlgoPlayer'))` 一次性把它与
 * `tracers/index.ts` 一起拉进来 —— 十个 tracer 里有九个只在这一个页面用到，
 * 不点开就不该下载。
 *
 * ## SSR 阶段同样只渲染折叠壳
 *
 * 播放器要按帧数算进度条与按钮禁用状态，服务器上没有帧可算；
 * 而 `parseInput` + `run` 是在 `useEffect` 里跑的。
 * 所以这一层在 SSR 就是一个 `<summary>`，与录制式那条路径一致。
 *
 * ## 折叠壳上为什么先显示 tracerId
 *
 * 壳是同步渲染的（要在 SSR 里出现），而 tracer 的 `title` 在懒加载的模块里。
 * 放置表允许给每一条写 `title`，没写就退化成 id —— 一个可读性小瑕疵，
 * 换来壳不必依赖懒加载模块。
 */

import React, {Suspense, lazy, useEffect, useState} from 'react';
import styles from './styles.module.css';
import type {Tracer} from './types';
import type {Placement} from './inlinePlacement';

const AlgoPlayer = lazy(() => import('./AlgoPlayer'));
const tracersMod = () => import('./tracers');

/** 折叠壳的 id。同一篇文档里放多个时靠 `placement.tracerId` 区分。 */
export function tracerAnchorId(tracerId: string): string {
  return `vis-${tracerId}`;
}

interface Props {
  placement: Placement;
}

/**
 * 一篇文档里的**全部**播放器，按放置表渲染。
 *
 * 每个播放器各自是折叠壳：读者默认看到的是那几行标题，
 * 想看哪一个点开哪一个 —— 排序那一页有三个算法，全展开就没法读了。
 */
export default function InlineTracerSection({
  placements,
}: {
  placements: readonly Placement[];
}): React.ReactElement | null {
  if (placements.length === 0) {
    return null;
  }
  return (
    <>
      {placements.map((p) => (
        <InlineTracerVisualizer key={p.tracerId} placement={p} />
      ))}
    </>
  );
}

/** 单个播放器的折叠壳 */
function InlineTracerVisualizer({placement}: Props): React.ReactElement {
  const {tracerId, title} = placement;
  const [open, setOpen] = useState(false);
  return (
    <details
      id={tracerAnchorId(tracerId)}
      className={styles.visBox}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary className={styles.visSummary}>
        算法可视化 · {title ?? tracerId}
        <span className={styles.visMeta}>可改输入后重跑</span>
      </summary>
      <div className={styles.visBody}>
        {open ? (
          <Suspense
            fallback={<p className={styles.visHint}>正在载入播放器…</p>}>
            <LazyTracerPlayer tracerId={tracerId} />
          </Suspense>
        ) : null}
      </div>
    </details>
  );
}

/**
 * 按 id 取 tracer 并渲染。
 *
 * 为什么要再分一层：`tracers/index.ts` 必须**动态** import 才不会进主 bundle，
 * 而组件只能在渲染后才能拿数据 —— 所以这里用 `useEffect` + state。
 * 代价是首帧空白一格，与 `AlgoPlayer` 自己 `useEffect` 取帧的行为一致。
 */
function LazyTracerPlayer({tracerId}: {tracerId: string}): React.ReactElement {
  const [tracer, setTracer] = useState<Tracer<unknown> | null>(null);
  const [hint, setHint] = useState<{label?: string; hint?: string}>({});
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    tracersMod().then((mod) => {
      if (!alive) {
        return;
      }
      const found = mod.findTracer(tracerId);
      if (!found) {
        setMissing(true);
        return;
      }
      setTracer(found);
      setHint(mod.INPUT_HINTS[tracerId] ?? {});
    });
    return () => {
      alive = false;
    };
  }, [tracerId]);

  if (missing) {
    return (
      <p className={styles.visHint}>
        找不到 tracer <code>{tracerId}</code> —— 放置表与{' '}
        <code>tracers/index.ts</code> 对不上。
      </p>
    );
  }
  if (!tracer) {
    return <p className={styles.visHint}>正在载入…</p>;
  }
  return (
    <AlgoPlayer
      tracer={tracer}
      inputLabel={hint.label}
      inputHint={hint.hint}
    />
  );
}

export type {Placement};