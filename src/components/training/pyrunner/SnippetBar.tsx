/**
 * 代码块下方的运行条。
 *
 * ## 位置：为什么在下方而不是右上角
 *
 * 查了几家做「散文里跑代码」的成熟项目，位置约定高度一致：
 *
 * | 项目 | 入口位置 |
 * |---|---|
 * | Jupyter Book / MyST-NB（散文内嵌可执行 cell） | cell 下方 |
 * | PyScript | 代码正下方一条 Run 按钮带 |
 * | sphinx-execution | 每个代码块正下方一个 Play |
 * | docusaurus-theme-live-codeblock | `.playgroundToolbar`，块下方，opacity .5 → 悬停 1 |
 *
 * 右上角那排位置是复制/换行按钮的地盘，把运行塞进去会挤成一团；
 * 而且读者在代码块里的第一反应是「读完这段」，不是「点右上角」。
 *
 * ## 为什么渲染在 CodeBlock 容器内部
 *
 * 容器上带着 `--prism-background-color` / `--prism-color`，塞进去就自动
 * 跟随代码块配色，深浅色零维护；放到容器外面就得自己再实现一遍主题。
 *
 * ## 片段不给按钮
 *
 * 一篇题解平均 3.2 个代码块，其中约 55% 是易错点小节里的单行对比、
 * 带 `...` 的伪代码。给它们挂按钮，读者点下去只会看到 NameError，
 * 于是得出「这功能不可靠」的结论 —— 比没有更糟。留白本身就是信号。
 */

import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import type {PySample, StdinSample} from '@site/plugins/py-samples';
import {analyzeSnippet, samplesFit} from './snippet';
import {isUsableExpected} from './compare';
import {
  asCallArgument,
  usableSamples,
  type RunMode,
  type RunOutcome,
} from './runner';
import styles from './styles.module.css';

// CodeMirror 有几百 KB，且只有点「改代码」的人才需要 —— 动态加载，
// 不点的人一个字节都不下载。
const CodeEditor = lazy(() => import('./CodeEditor'));

/** Python 运行时自托管目录 */
const INDEX_URL_PATH = '/pyodide/';

interface Props {
  /** 代码块源码，来自 CodeBlock 的 metadata.code（已剥掉高亮注释） */
  code: string;
  samples: PySample[];
  stdinSamples: StdinSample[];
  /**
   * 这篇题解的入口方法名（取自「完整代码实现」小节）。
   *
   * 一篇里常有几个「别的函数」—— 0300 的 lengthOfLIS_with_path 收同样的参数，
   * 返回的却是那条递增子序列本身而不是长度。题面的样例只在调用的是
   * 这道题的入口时才成立，所以要把名字传进来对照，见 snippet.ts 的
   * `matchesDocEntry`。
   */
  entryName: string | null;
}

type Phase = 'idle' | 'loading' | 'running';

export default function SnippetBar({
  code,
  samples,
  stdinSamples,
  entryName,
}: Props): ReactNode {
  const indexUrl = useBaseUrl(INDEX_URL_PATH);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RunOutcome | null>(null);
  /** 用户改过的代码；null 表示「没改过，跑的就是页面上的源码」 */
  const [edited, setEdited] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  /**
   * 输入框初值：程序块给第一组样例的 stdin，其余给第一组样例的参数。
   * 只在首次挂载时填（下面的 useEffect），读者改过之后不要覆盖回去。
   */
  const [customText, setCustomText] = useState('');

  const analysis = useMemo(
    () => analyzeSnippet(code, entryName),
    [code, entryName],
  );
  const entry = analysis.entry;

  // 位置参数的样例（`输入: [1,2,3,1]` 而不是 `nums = [1,2,3,1]`）
  // 也要能用：按入口签名的顺序对上就行。只有 6 篇题解这么写。
  const argSamples = useMemo(() => {
    const usable = usableSamples(samples);
    if (!entry || usable.length === 0 || entry.paramNames.length === 0) {
      return usable;
    }
    const positional = usable.filter(
      (s) => s.args.length === 1 && entry.paramNames.length > 1,
    );
    if (positional.length === 0) {
      return usable;
    }
    // 一个顶层数组拆成多个参数；`[1,2,3]` 配 (nums, k) 时 nums=[1,2,3]
    const positionalSet = new Set(positional);
    const rewritten = usable.map((s) =>
      positionalSet.has(s)
        ? {...s, args: s.args[0].slice(1, -1).split(',').filter(Boolean)}
        : s,
    );
    return samplesFit(entry, rewritten.map((s) => s.args))
      ? rewritten
      : usable;
  }, [samples, entry]);
  const usableStdin = useMemo(
    () => stdinSamples.filter((s) => s.expected.trim().length > 0),
    [stdinSamples],
  );

  /**
   * 牛客/ACM 题：把 stdin 样例当成调用参数。
   *
   * ## 为什么需要
   *
   * ACM 题的样例天然是 stdin/stdout（`输入：1516000` → `输出：0006151`），
   * 但一篇题解里通常有好几个块共享同一个函数：解题思路里的纯函数定义，
   * 以及完整代码实现里那个带 `__main__` 的。
   *
   * 带 `__main__` 的块跑 stdin 模式没问题；纯函数块就只能手动输参 ——
   * 于是同一页上三个块里两个是「▶ 运行」，读起来像「这题没法一键跑」。
   *
   * ## 规则刻意收得很紧
   *
   * 只有「入口恰好 1 个必填参数」+「样例输入恰好 1 行」时才转。
   * 参数多于一行就说明那道题是多行输入的批处理程序（而不是一个函数），
   * 硬按行拆会得到一个与代码对错无关的判定。
   *
   * 引号交给 `quoteIfStr` 按类型标注决定，和手动模式是同一套规则。
   */
  const derivedCallSamples = useMemo(() => {
    if (argSamples.length > 0 || !entry || analysis.isProgram) {
      return argSamples;
    }
    if (entry.requiredCount !== 1) {
      return argSamples;
    }
    return usableStdin
      .filter((s) => !s.stdin.includes('\n') && isUsableExpected(s.expected))
      .map((s) => ({
        args: [asCallArgument(s.stdin, entry.annotations[0])],
        expected: s.expected,
        // 期望值是程序打印的文本，不是返回值的 JSON 表示
        textCompare: true,
      }));
  }, [argSamples, entry, analysis.isProgram, usableStdin]);

  // 参数个数对不上就别跑样例 —— 顺序错会得到一个看起来很合理的错误答案，
  // 那比不给按钮有害得多。
  //
  // `matchesDocEntry` 是另一道闸：这个块里的函数根本不是这道题的解法时，
  // 样例的期望值对不上它返回的东西（0300 的 lengthOfLIS_with_path 返回
  // 子序列本身，题面要的是长度）。
  const canRunSamples =
    entry && analysis.matchesDocEntry
      ? samplesFit(entry, derivedCallSamples.map((s) => s.args))
      : false;

  // 只有「程序」（带 __main__ 的块）才能用 stdin 模式。解题思路里那些
  // 同名函数的纯定义块喂 stdin 的话输出恒为空 —— 点了跟没点一样。
  const canRunStdin = analysis.isProgram && usableStdin.length > 0;

  /**
   * 「跑自带样例」与「自己输参数」是**两个独立动作**，不是同一个按钮的两种状态。
   *
   * 之前只有 samples / stdin / manual 三选一，结果抽到样例的页面**完全没有输入框** ——
   * 想试个自己的输入都试不了。那是设计缺陷：读者看题解时最常做的事就是
   * 「拿自己的例子试一下」，它不该被「已有样例」顶掉。
   *
   * 对应力扣自己的 Run / Submit：跑样例是「验证」，自己输是「探索」。
   */
  const sampleMode: RunMode | null = useMemo(() => {
    if (!entry) {
      return null;
    }
    if (canRunSamples) {
      return {
        type: 'samples',
        samples: derivedCallSamples,
        textCompare: derivedCallSamples[0]?.textCompare === true,
      };
    }
    if (canRunStdin) {
      return {
        type: 'stdin',
        stdin: usableStdin[0].stdin,
        expected: usableStdin[0].expected,
      };
    }
    return null;
  }, [entry, canRunSamples, derivedCallSamples, canRunStdin, usableStdin]);

  /**
   * 输入框里那行文本对应的运行方式。
   *
   * 程序块（带 __main__）收的是 stdin 文本，其余是调用参数 ——
   * 由读者填的内容决定，不猜。
   */
  const customMode: RunMode = useMemo(
    () =>
      canRunStdin
        ? {type: 'stdin', stdin: customText, expected: ''}
        : {type: 'manual', argsText: customText},
    [canRunStdin, customText],
  );

  /**
   * 输入框预填第一组样例 —— 让读者一进来就看到「这个框该填什么」，
   * 而不是面对一个空框猜格式。填过之后不再覆盖（用 ref 记住是否动过）。
   */
  const touchedRef = useRef(false);
  const prefill = useMemo(() => {
    // 只有「这篇真的提供 stdin 样例」才按 stdin 处理。
    // 有些力扣题解的完整代码也带 `if __name__ == "__main__":` 自测块，
    // 仅凭 isProgram 就走 stdin 会得到一个空的输入框。
    if (canRunStdin) {
      return usableStdin[0]?.stdin ?? '';
    }
    const first = derivedCallSamples[0];
    return first ? first.args.join(', ') : '';
  }, [canRunStdin, usableStdin, derivedCallSamples]);
  useEffect(() => {
    if (!touchedRef.current && prefill !== '') {
      setCustomText(prefill);
    }
  }, [prefill]);

  const runLabel = canRunSamples
    ? `▶ 跑样例（${derivedCallSamples.length}）`
    : '▶ 跑样例';

  const doRun = useCallback(
    async (runMode: RunMode) => {
      setPhase('loading');
      setResult(null);
      // runner 也是动态 import：CodeBlock/Layout 是全站共用的，
      // 不该让每个访问 docs 的人先下载 Pyodide 加载器
      const {runSnippet} = await import('./runner');
      const outcome = await runSnippet({
        code: edited ?? code,
        entry,
        mode: runMode,
        indexUrl,
        onPhase: setPhase,
      });
      setResult(outcome);
      setPhase('idle');
    },
    [code, edited, entry, indexUrl],
  );

  // 不可运行的片段：什么都不渲染
  if (!analysis.runnable || !entry) {
    return null;
  }

  const busy = phase !== 'idle';
  const modified = edited !== null && edited !== code;
  // 这两个依赖 entry，必须放在上面的守卫之后 —— 片段的 entry 是 null
  const showCustomInput = entry.paramNames.length > 0 || canRunStdin;
  /**
   * 自己输入时空着就别让读者点出一个
   * `missing 1 required positional argument` 的 traceback —— 那看着像代码写错了。
   * 零参数函数（HJ150 的 `def backtrack():`）本来就不需要填，按钮必须可点。
   */
  const needCustom =
    customMode.type === 'manual' &&
    entry.requiredCount > 0 &&
    !customText.trim();
  const showOutput =
    result !== null && result.rows.length === 0 && Boolean(result.output);

  return (
    <div className={styles.bar} data-testid="snippet-bar">
      <div className={styles.actions}>
        {sampleMode && (
          <button
            type="button"
            className={styles.runButton}
            onClick={() => void doRun(sampleMode)}
            disabled={busy}
            data-testid="run">
            {busy ? (phase === 'loading' ? '加载中…' : '运行中…') : runLabel}
          </button>
        )}

        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}>
          {editing ? '收起代码' : '改代码'}
        </button>
        {modified && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => setEdited(null)}>
            还原
          </button>
        )}

      </div>

      {/* 自己输一行参数/输入跑一下 —— 与「跑样例」并存，不互相顶替 */}
      {showCustomInput && (
        <div className={styles.custom}>
          {/*
            多行输入要用 textarea。

            HJ24 的 stdin 样例是
                8
                186 186 150 200 160 130 197 200
            —— `<input type="text">` 装不下换行，值会变成
            `8186 186 150 ...`（第一行的 8 和第二行首尾粘在一起），
            于是 `int(data[0])` 读到 8186，程序直接炸。
          */}
          {canRunStdin ? (
            <textarea
              className={styles.stdin}
              value={customText}
              rows={Math.min(4, customText.split('\n').length || 1)}
              placeholder={'stdin 内容，如 1516000\n（可多行）'}
              spellCheck={false}
              onChange={(e) => {
                touchedRef.current = true;
                setCustomText(e.target.value);
              }}
              aria-label="标准输入"
            />
          ) : (
            <input
              type="text"
              className={styles.args}
              value={customText}
              placeholder={
                entry.paramNames.length === 1
                  ? `${entry.paramNames[0]}，如 "abcabcbb"`
                  : `依次填 ${entry.paramNames.join(', ')}`
              }
              onChange={(e) => {
                touchedRef.current = true;
                setCustomText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !needCustom) {
                  void doRun(customMode);
                }
              }}
              aria-label="调用参数"
            />
          )}
          <button
            type="button"
            className={styles.customRun}
            onClick={() => void doRun(customMode)}
            disabled={busy || needCustom}
            title={needCustom ? '先填内容' : undefined}
            data-testid="run-custom">
            {busy ? '运行中…' : '▶ 运行'}
          </button>
        </div>
      )}

      {editing && (
        <Suspense fallback={<p className={styles.loading}>正在加载编辑器…</p>}>
          <CodeEditor
            value={edited ?? code}
            errorLines={result?.errorLines ?? []}
            onChange={setEdited}
            // 编辑器里的 Cmd+Enter 跑「跑样例」；没有样例时退到自定义输入
            onRun={
              busy
                ? undefined
                : sampleMode
                  ? () => void doRun(sampleMode)
                  : needCustom
                    ? undefined
                    : () => void doRun(customMode)
            }
          />
        </Suspense>
      )}

      {result !== null && result.rows.length > 0 && (
        <div className={styles.results}>
          <p className={styles.summary}>
            {result.passCount} / {result.total} 组通过
          </p>
          <ul className={styles.list}>
            {result.rows.map((row, i) => (
              <li key={i} className={styles.row}>
                <span
                  className={`${styles.mark} ${
                    row.verdict === 'pass' ? styles.pass : styles.fail
                  }`}>
                  {row.verdict === 'pass' ? '✓' : '✗'}
                </span>
                <div className={styles.rowBody}>
                  <code className={styles.call}>{row.call}</code>
                  {row.note && <div className={styles.note}>{row.note}</div>}
                  {row.verdict !== 'pass' && row.expected !== '' && (
                    <div className={styles.diff}>
                      <span className={styles.diffLabel}>期望</span>
                      <code>{row.expected}</code>
                      <span className={styles.diffLabel}>实际</span>
                      <code className={styles.bad}>{row.actual}</code>
                    </div>
                  )}
                  {row.verdict !== 'pass' && row.reason && (
                    <pre className={styles.reason}>
                      <code>{row.reason}</code>
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showOutput && (
        <pre className={styles.output}>
          <code>{result.output}</code>
        </pre>
      )}

      {result?.error && (
        <pre className={styles.error}>
          <code>{result.error}</code>
        </pre>
      )}
      {result?.driverError && (
        <pre className={styles.error}>
          <code>{result.driverError}</code>
        </pre>
      )}
    </div>
  );
}