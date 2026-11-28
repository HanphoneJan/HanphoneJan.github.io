/**
 * 提交评测：按钮与结果。
 *
 * ## 为什么拆成 useJudge / JudgeSubmit / JudgeReport
 *
 * 提交按钮要排在运行条的主操作行最右边（与「跑样例」同一行、中间一道分隔），
 * 而提交结果是卡片，得排在本地运行结果下面。一个组件同时出现在两个位置，
 * 只能把状态提到 hook 里：
 *
 * - `useJudge` 只负责「这个 judgeId 有没有题目包」+ 提交/轮询；
 * - `JudgeSubmit` 渲染按钮与测试点数，没有题目包时返回 `null`；
 * - `JudgeReport` 渲染 verdict、失败用例、错误。
 *
 * 页面上的挂载点仍然是运行条（`SnippetBar`），布局换了一行，行为没变。
 */

import React, {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {
  fetchJudgeProblems,
  submitCode,
  waitForSubmission,
  type JudgeProblem,
  type JudgeResult,
} from './client';
import styles from './styles.module.css';

export interface JudgeController {
  /** 服务不可用 / 这个题没有评测包 → null，UI 整体不出现 */
  problem: JudgeProblem | null;
  phase: 'idle' | 'submitting' | 'running';
  result: JudgeResult | null;
  error: string;
  submit: (code: string) => Promise<void>;
}

const VERDICT_LABEL: Record<string, string> = {
  AC: '通过',
  WA: '答案错误',
  TLE: '超时',
  MLE: '内存超限',
  RE: '运行错误',
  CE: '编译错误',
  OLE: '输出超限',
  IE: '评测机错误',
};

type Tone = 'pass' | 'fail' | 'warn';

function verdictTone(verdict: string | null | undefined): Tone {
  if (verdict === 'AC') return 'pass';
  if (verdict === 'TLE' || verdict === 'MLE' || verdict === 'OLE') return 'warn';
  return 'fail';
}

const TONE_CLASS: Record<Tone, string> = {
  pass: styles.pass,
  fail: styles.fail,
  warn: styles.warn,
};

/**
 * 查一次 `/v1/problems`，只保留这个页面对应的题。
 *
 * 服务端不在线时 `fetchJudgeProblems` 返回 null —— 这是设计好的：
 * 文档站不硬依赖评测服务，按钮静默消失，构建与离线阅读都不受影响。
 */
export function useJudge(judgeId: string | null): JudgeController {
  const [problem, setProblem] = useState<JudgeProblem | null>(null);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'running'>('idle');
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!judgeId) {
      return;
    }
    let alive = true;
    void fetchJudgeProblems().then((problems) => {
      if (!alive) return;
      setProblem(problems?.find((p) => p.id === judgeId) ?? null);
    });
    return () => {
      alive = false;
      controller.current?.abort();
    };
  }, [judgeId]);

  const submit = async (code: string): Promise<void> => {
    if (!judgeId || !problem) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError('当前处于离线状态，提交评测需要联网。');
      return;
    }
    controller.current?.abort();
    controller.current = new AbortController();
    setError('');
    setResult(null);
    setPhase('submitting');
    try {
      const {id} = await submitCode(judgeId, code);
      setPhase('running');
      const final = await waitForSubmission(
        id,
        (partial) => setResult(partial),
        controller.current.signal,
      );
      setResult(final);
    } catch (e) {
      const err = e as Error & {retryAfter?: number};
      setError(
        err.retryAfter
          ? `${err.message}，请 ${err.retryAfter} 秒后重试。`
          : err.message || '提交失败',
      );
    } finally {
      setPhase('idle');
    }
  };

  return {problem, phase, result, error, submit};
}

function supported(problem: JudgeProblem | null): problem is JudgeProblem {
  return Boolean(problem && problem.languages.includes('python'));
}

/** 主操作行最右边那一组：提交按钮 + 测试点数 */
export function JudgeSubmit({
  judge,
  code,
}: {
  judge: JudgeController;
  code: string;
}): ReactNode {
  const {problem, phase} = judge;
  if (!supported(problem)) {
    return null;
  }
  const busy = phase !== 'idle';
  return (
    <>
      <button
        type="button"
        className={styles.submit}
        onClick={() => void judge.submit(code)}
        disabled={busy}
        data-busy={busy || undefined}
        data-testid="judge-submit">
        {busy ? (phase === 'submitting' ? '提交中…' : '评测中…') : '提交评测'}
      </button>
      <span className={styles.meta}>
        {problem.platform} · {problem.activeTestCount}/{problem.fullTestCount}{' '}
        测试点
      </span>
    </>
  );
}

/** 提交结果：与本地「跑样例」同一套卡片语言（一行摘要 + 一条用例一行） */
export function JudgeReport({judge}: {judge: JudgeController}): ReactNode {
  const {problem, result, error} = judge;
  const firstFailure = useMemo(
    () => result?.cases.find((c) => c.verdict !== 'AC'),
    [result],
  );

  if (!supported(problem)) {
    return null;
  }

  const showSource =
    problem.provenance?.source === 'docs-samples' &&
    !problem.provenance?.hidden &&
    !problem.provenance?.hiddenCustom;

  if (!result && !error && !showSource) {
    return null;
  }

  return (
    <div className={styles.report} data-testid="judge-panel">
      {showSource && (
        <p className={styles.source}>当前使用题面可见样例，隐藏测试待补。</p>
      )}

      {result && result.submission.status === 'done' && (
        <div className={styles.card} data-testid="judge-result">
          <div className={styles.summary}>
            <span
              className={`${styles.badge} ${
                TONE_CLASS[verdictTone(result.submission.verdict)]
              }`}>
              {result.submission.verdict ?? 'IE'}
            </span>
            <strong>
              {VERDICT_LABEL[result.submission.verdict ?? 'IE'] ??
                result.submission.verdict}
            </strong>
            <span className={styles.count}>
              {result.submission.passed} / {result.submission.total} 组通过
            </span>
            {result.submission.time_ms != null && (
              <span className={styles.count}>
                {result.submission.time_ms} ms ·{' '}
                {Math.round((result.submission.memory_kb ?? 0) / 1024)} MB
              </span>
            )}
          </div>

          {result.submission.message && (
            <p className={styles.message}>{result.submission.message}</p>
          )}

          {firstFailure && (
            <details className={styles.detail}>
              <summary>查看第一组失败用例</summary>
              <div className={styles.case}>
                <div>
                  <span className={styles.caseLabel}>输入</span>
                  <pre>{firstFailure.input_excerpt || '（未记录）'}</pre>
                </div>
                <div>
                  <span className={styles.caseLabel}>期望</span>
                  <pre>{firstFailure.expected_excerpt || '（未记录）'}</pre>
                </div>
                <div>
                  <span className={styles.caseLabel}>实际</span>
                  <pre className={styles.bad}>
                    {firstFailure.actual_excerpt || '（未记录）'}
                  </pre>
                </div>
                {firstFailure.message && (
                  <p className={styles.caseMessage}>{firstFailure.message}</p>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {result && result.submission.status !== 'done' && (
        <p className={styles.running}>
          已排队/运行中（
          {result.submission.status === 'running' ? '运行中' : '排队中'}）…
        </p>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}

/**
 * 独立使用的整块（按钮 + 结果）—— 运行条用的是上面两个具名组件，
 * 这里留着给「不在代码块下方」的场合。
 */
export default function JudgePanel({
  judgeId,
  code,
}: {
  judgeId: string;
  code: string;
}): ReactNode {
  const judge = useJudge(judgeId);
  return (
    <>
      <JudgeSubmit judge={judge} code={code} />
      <JudgeReport judge={judge} />
    </>
  );
}
