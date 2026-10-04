/**
 * 通用算法播放器。
 *
 * 所有 tracer 共用这一个组件 —— 这是整个可视化的价值所在：
 * 新增算法只需写 trace 函数，播放/暂停/单步/回退/调速/换输入全部免费获得。
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Heading from '@theme/Heading';
import styles from '../styles.module.css';
import {ArrayView} from '../renderers/ArrayView';
import {GridView} from '../renderers/GridView';
import {TableView} from '../renderers/TableView';
import {TreeView} from '../renderers/TreeView';
import {
  MAX_FRAMES,
  isGridFrame,
  isTableFrame,
  isTreeFrame,
  type Frame,
  type Tracer,
} from '../types';

/** 播放速度档位（毫秒/帧） */
const SPEEDS = [
  {label: '0.5×', ms: 1200},
  {label: '1×', ms: 600},
  {label: '2×', ms: 300},
  {label: '4×', ms: 120},
] as const;

interface Props {
  tracer: Tracer<unknown>;
  /** 单行输入框的提示文案 */
  inputLabel?: string;
  /** 输入说明，展示在输入框下方 */
  inputHint?: string;
}

export default function AlgoPlayer({
  tracer,
  inputLabel,
  inputHint,
}: Props): React.ReactElement {
  const [rawInput, setRawInput] = useState(() => formatInput(tracer));
  const [error, setError] = useState<string>('');

  const [frames, setFrames] = useState<Frame[]>([]);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const timer = useRef<number | undefined>(undefined);

  // tracer 切换时重置
  useEffect(() => {
    const seed = formatInput(tracer);
    setRawInput(seed);
    const result = tracer.parseInput(seed);
    if (result.ok === false) {
      setError(result.error);
      setFrames([]);
    } else {
      setError('');
      setFrames(tracer.run(result.value));
    }
    setCursor(0);
    setPlaying(false);
  }, [tracer]);

  // 播放循环
  useEffect(() => {
    if (!playing) {
      return;
    }
    timer.current = window.setInterval(() => {
      setCursor((c) => {
        if (c >= frames.length - 1) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, SPEEDS[speed].ms);
    return () => window.clearInterval(timer.current);
  }, [playing, speed, frames.length]);

  const applyInput = useCallback(() => {
    const result = tracer.parseInput(rawInput);
    if (result.ok === false) {
      setError(result.error);
      // 清空旧帧：留着上一组输入的结果、只在旁边加一条报错，
      // 会让人误以为那些帧是当前输入算出来的
      setFrames([]);
      setCursor(0);
      setPlaying(false);
      return;
    }
    setError('');
    const next = tracer.run(result.value);
    setFrames(next);
    setCursor(0);
    setPlaying(false);
  }, [rawInput, tracer]);

  const reset = useCallback(() => {
    setCursor(0);
    setPlaying(false);
  }, []);

  const frame = frames[cursor];
  const total = frames.length;

  // 键盘：左右单步、空格播放/暂停
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return;
      }
      if (e.key === 'ArrowRight') {
        setCursor((c) => Math.min(total - 1, c + 1));
        setPlaying(false);
      } else if (e.key === 'ArrowLeft') {
        setCursor((c) => Math.max(0, c - 1));
        setPlaying(false);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  const counters = useMemo(
    () => (frame ? ('counters' in frame ? frame.counters : undefined) : undefined),
    [frame],
  );

  return (
    <section className={styles.player} data-testid="player">
      <div className={styles.head}>
        <Heading as="h2" className={styles.title}>
          {tracer.title}
        </Heading>
        <p className={styles.desc}>{tracer.description}</p>
        <div className={styles.badges}>
          <span className={styles.badge}>时间 {tracer.complexity.time}</span>
          <span className={styles.badge}>空间 {tracer.complexity.space}</span>
          {total > 0 && (
            <span className={styles.badge}>
              {total} 帧{total >= MAX_FRAMES ? '（已截断）' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ---- 输入区 ---- */}
      <div className={styles.inputRow}>
        <label className={styles.inputLabel}>
          {inputLabel ?? '输入'}
          <input
            type="text"
            className={styles.input}
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              if (error) {
                setError('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applyInput();
              }
            }}
            aria-label={inputLabel ?? '输入'}
          />
        </label>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={applyInput}>
          运行
        </button>
      </div>
      {inputHint && <p className={styles.inputHint}>{inputHint}</p>}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {/* ---- 视图区 ---- */}
      {frame && <FrameView frame={frame} display={tracer.display} />}

      {frame && (
        <p className={styles.note} data-testid="note">
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

      {/* ---- 播放控制 ---- */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={reset}
          disabled={total === 0}
          aria-label="重置">
          ⏮
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setCursor((c) => Math.max(0, c - 1));
            setPlaying(false);
          }}
          disabled={total === 0 || cursor === 0}
          aria-label="上一步">
          ◀
        </button>
        <button
          type="button"
          className={styles.playButton}
          onClick={() => setPlaying((v) => !v)}
          disabled={total === 0}
          data-testid="play">
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setCursor((c) => Math.min(total - 1, c + 1));
            setPlaying(false);
          }}
          disabled={total === 0 || cursor >= total - 1}
          aria-label="下一步">
          ▶
        </button>

        <input
          type="range"
          className={styles.scrubber}
          min={0}
          max={Math.max(0, total - 1)}
          value={cursor}
          onChange={(e) => {
            setCursor(Number(e.target.value));
            setPlaying(false);
          }}
          disabled={total === 0}
          aria-label="进度"
        />
        <span className={styles.stepCount}>
          {total === 0 ? '0 / 0' : `${cursor + 1} / ${total}`}
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

      {/* ---- 源码 ---- */}
      <CodePanel code={tracer.code} line={frame?.line} />

      <p className={styles.kbd}>
        快捷键：空格播放/暂停，← → 单步
      </p>
    </section>
  );
}

/**
 * Frame 是 union，类型守卫在 types.ts 里（两个播放器共用，
 * 见 isGridFrame 处的注释：optional + never 的组合不会自动收窄）。
 */
function FrameView({
  frame,
  display,
}: {
  frame: Frame;
  display: 'bars' | 'boxes';
}): React.ReactElement {
  if (isGridFrame(frame)) {
    return <GridView frame={frame.grid} />;
  }
  if (isTableFrame(frame)) {
    return <TableView frame={frame.table} />;
  }
  if (isTreeFrame(frame)) {
    return <TreeView frame={frame} />;
  }
  return <ArrayView frame={frame} display={display} />;
}

function CodePanel({
  code,
  line,
}: {
  code: string;
  line?: number;
}): React.ReactElement {
  const lines = code.split('\n');
  return (
    <details className={styles.codeBox}>
      <summary>源码（{lines.length} 行）</summary>
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

function formatInput(tracer: Tracer<unknown>): string {
  // 交给 tracer 自己格式化。输入类型有数字数组、带目标的数组、网格、两个整数，
  // 播放器猜不出格式 —— 曾用 String(value) 兜底，结果对象输入变成
  // "[object Object]"，defaultInput 解析必然失败，首屏 0 帧。
  return tracer.formatInput(tracer.defaultInput);
}