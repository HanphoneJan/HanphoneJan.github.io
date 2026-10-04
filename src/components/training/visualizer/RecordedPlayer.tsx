/**
 * 录制式播放器：把 `static/traces/<name>.json` 播成逐帧动画。
 *
 * ## 为什么帧要在客户端再算一次
 *
 * `static/traces/` 里存的是**原始执行轨迹**（第几行 + 局部变量），
 * 不是成品帧。这是刻意的：轨迹与算法无关，换个 adapter 就能画成别的样子，
 * 而帧是 adapter 的产物，跟着 adapter 走更合理。
 *
 * 代价是每次展开都在浏览器里跑一次 adapter（27 帧级别的纯计算，
 * 毫秒级）。换来的是：帧不进 git 的静态资源体积、adapter 改进后
 * 旧轨迹立刻跟着变好，不用重录。
 *
 * ## 为什么不用 tracer 版的 AlgoPlayer
 *
 * 那个组件的输入框假设「输入可编辑，改完重跑 `run()`」。
 * 录制式的帧是固定的 —— 换输入要重新录制，那是构建期的事。
 * 硬塞给它只会得到一个「改了输入但画面不变」的假输入框。
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ArrayView} from './renderers/ArrayView';
import {GridView} from './renderers/GridView';
import {TableView} from './renderers/TableView';
import {TreeView} from './renderers/TreeView';
import {adapt} from './adapters';
import type {RawTrace} from './recorder/types';
import {
  isGridFrame,
  isTableFrame,
  isTreeFrame,
  type Frame,
} from './types';
import styles from './styles.module.css';
import type {VisTraceEntry} from '@site/plugins/vis-traces';

/** 播放速度档位（毫秒/帧）。比 tracer 版快一档：录制帧里有很多「同一状态的不同行」。 */
const SPEEDS = [
  {label: '0.5×', ms: 900},
  {label: '1×', ms: 450},
  {label: '2×', ms: 220},
  {label: '4×', ms: 90},
] as const;

type State =
  | {status: 'loading'}
  | {status: 'error'; message: string}
  | {status: 'ready'; frames: Frame[]; code: string};

export default function RecordedPlayer({
  entry,
}: {
  entry: VisTraceEntry;
}): React.ReactElement {
  const [state, setState] = useState<State>({status: 'loading'});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(entry.url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const trace = (await res.json()) as RawTrace;
        const adapted = adapt(trace);
        if (!adapted) {
          throw new Error('这份轨迹没有可用的 adapter');
        }
        if (!cancelled) {
          setState({
            status: 'ready',
            frames: adapted.frames,
            code: trace.code,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            status: 'error',
            message: (e as Error).message || String(e),
          });
        }
      }
    })();
    return () => {
      // 组件卸载或 entry 变了，别再 setState（React 18 会警告）
      cancelled = true;
    };
  }, [entry.url]);

  if (state.status === 'loading') {
    return <p className={styles.visHint}>正在取轨迹…</p>;
  }
  if (state.status === 'error') {
    return (
      <p className={styles.visError} role="alert">
        可视化加载失败：{state.message}
      </p>
    );
  }
  return <Player frames={state.frames} code={state.code} />;
}

function Player({
  frames,
  code,
}: {
  frames: Frame[];
  code: string;
}): React.ReactElement {
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const boxRef = useRef<HTMLDivElement>(null);

  const atEnd = cursor >= frames.length - 1;

  // 播放循环
  useEffect(() => {
    if (!playing) {
      return;
    }
    const t = window.setInterval(() => {
      setCursor((c) => {
        if (c >= frames.length - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, SPEEDS[speed].ms);
    return () => window.clearInterval(t);
  }, [playing, speed, frames.length]);

  /**
   * 键盘只在播放器聚焦时生效。
   *
   * 这是内嵌到正文里必须付的代价：题解页很长，读者滚动正文、按空格翻页
   * 是常态。若像独立页那样在 window 上监听，整个页面的方向键与空格
   * 都会被播放器抢走。独立页独占整个页面所以没这个问题。
   *
   * `onKeyDown` 挂在容器上（而不是 document），配合 tabIndex 让它可聚焦，
   * 焦点不在这里时按键自然落到页面其它地方。
   */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCursor((c) => Math.min(frames.length - 1, c + 1));
        setPlaying(false);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
        setPlaying(false);
      } else if (e.key === ' ') {
        // 不 preventDefault 的话空格会同时把 details 折叠掉
        e.preventDefault();
        setPlaying((v) => !v);
      }
    },
    [frames.length],
  );

  // 点「播放」时把焦点收进容器，这样紧接着按空格就能继续控制
  const startPlaying = useCallback(() => {
    boxRef.current?.focus();
    setPlaying((v) => !v);
  }, []);

  const frame = frames[cursor];
  const counters = useMemo(
    () => (frame && 'counters' in frame ? frame.counters : undefined),
    [frame],
  );

  return (
    <div
      ref={boxRef}
      className={styles.player}
      data-testid="vis-player"
      tabIndex={0}
      onKeyDown={onKeyDown}>
      {frame && <FrameView frame={frame} />}

      {frame && (
        <p className={styles.note} data-testid="vis-note">
          {frame.note}
        </p>
      )}

      {counters && Object.keys(counters).length > 0 && (
        <div className={styles.counters}>
          {Object.entries(counters).map(([k, v]) => (
            <span key={k} className={styles.counter}>
              {k} <strong>{v as number}</strong>
            </span>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            boxRef.current?.focus();
            setCursor(0);
            setPlaying(false);
          }}
          aria-label="回到开头">
          ⏮
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setCursor((c) => Math.max(0, c - 1));
            setPlaying(false);
          }}
          disabled={cursor === 0}
          aria-label="上一步">
          ◀
        </button>
        <button
          type="button"
          className={styles.playButton}
          onClick={startPlaying}
          disabled={atEnd && !playing}
          data-testid="vis-play">
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setCursor((c) => Math.min(frames.length - 1, c + 1));
            setPlaying(false);
          }}
          disabled={atEnd}
          aria-label="下一步">
          ▶
        </button>

        <input
          type="range"
          className={styles.scrubber}
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={cursor}
          onChange={(e) => {
            setCursor(Number(e.target.value));
            setPlaying(false);
          }}
          aria-label="进度"
        />
        <span className={styles.stepCount}>
          {cursor + 1} / {frames.length}
        </span>
        <select
          className={styles.speed}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          aria-label="速度">
          {SPEEDS.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <TraceCode code={code} line={frame?.line} />

      <p className={styles.kbd}>
        点播放器聚焦后：<kbd>空格</kbd> 播放/暂停，<kbd>←</kbd> <kbd>→</kbd>{' '}
        单步
      </p>
    </div>
  );
}

/**
 * Frame 是 union，类型守卫在 types.ts 里（与 tracer 版共用同一份）。
 */
function FrameView({frame}: {frame: Frame}): React.ReactElement {
  if (isGridFrame(frame)) {
    return <GridView frame={frame.grid} />;
  }
  if (isTableFrame(frame)) {
    return <TableView frame={frame.table} />;
  }
  if (isTreeFrame(frame)) {
    return <TreeView frame={frame} />;
  }
  // 数组帧一律 boxes：指针类算法要看的是「指针停在哪」而不是「值的大小关系」
  return <ArrayView frame={frame} display="boxes" />;
}

/** 题解源码，高亮当前帧对应的行。行号直接来自录制，一定对得上。 */
function TraceCode({
  code,
  line,
}: {
  code: string;
  line?: number;
}): React.ReactElement {
  const lines = useMemo(() => code.split('\n'), [code]);
  return (
    <details className={styles.codeBox}>
      <summary>题解源码（{lines.length} 行）</summary>
      <pre className={styles.code}>
        {lines.map((l, i) => (
          <div
            key={i}
            className={line === i + 1 ? styles.codeLineActive : styles.codeLine}>
            <span className={styles.codeNo}>{i + 1}</span>
            <span className={styles.codeText}>{l || ' '}</span>
          </div>
        ))}
      </pre>
    </details>
  );
}
