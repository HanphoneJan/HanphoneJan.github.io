import React, {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {
  fetchJudgeProblems,
  submitCode,
  waitForSubmission,
  type JudgeProblem,
  type JudgeResult,
} from './client';
import styles from './styles.module.css';

interface Props {
  judgeId: string;
  code: string;
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

function verdictClass(verdict: string | null | undefined): string {
  if (verdict === 'AC') return styles.pass;
  if (verdict === 'WA') return styles.fail;
  if (verdict === 'TLE' || verdict === 'MLE' || verdict === 'OLE') {
    return styles.warn;
  }
  return styles.error;
}

export default function JudgePanel({judgeId, code}: Props): ReactNode {
  const [problem, setProblem] = useState<JudgeProblem | null | undefined>(
    undefined,
  );
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'running'>('idle');
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchJudgeProblems().then((problems) => {
      if (!alive) return;
      if (!problems) {
        setProblem(null);
        return;
      }
      setProblem(problems.find((p) => p.id === judgeId) ?? null);
    });
    return () => {
      alive = false;
      controller.current?.abort();
    };
  }, [judgeId]);

  const firstFailure = useMemo(
    () => result?.cases.find((c) => c.verdict !== 'AC'),
    [result],
  );

  if (problem === undefined || problem === null) return null;
  if (!problem.languages.includes('python')) return null;

  const busy = phase !== 'idle';

  const submit = async (): Promise<void> => {
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

  return (
    <div className={styles.panel} data-testid="judge-panel">
      <div className={styles.row}>
        <button
          type="button"
          className={styles.submit}
          onClick={() => void submit()}
          disabled={busy}
          data-testid="judge-submit">
          {busy
            ? phase === 'submitting'
              ? '提交中…'
              : '评测中…'
            : '提交评测'}
        </button>
        <span className={styles.meta}>
          {problem.platform} · {problem.activeTestCount}/{problem.fullTestCount}{' '}
          个测试点 · Python
        </span>
      </div>
      <p className={styles.privacy}>
        提交会把代码发送到 hanphone.cn 评测；匿名提交按 IP 限额。
      </p>
      {problem.provenance?.source === 'docs-samples' &&
        !problem.provenance?.hidden &&
        !problem.provenance?.hiddenCustom && (
          <p className={styles.source}>
            当前使用题面可见样例，隐藏测试待补。
          </p>
        )}

      {result && result.submission.status === 'done' && (
        <div className={styles.result} data-testid="judge-result">
          <div className={styles.summary}>
            <span
              className={`${styles.badge} ${verdictClass(
                result.submission.verdict,
              )}`}>
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
                  <span className={styles.label}>输入</span>
                  <pre>{firstFailure.input_excerpt || '（未记录）'}</pre>
                </div>
                <div>
                  <span className={styles.label}>期望</span>
                  <pre>{firstFailure.expected_excerpt || '（未记录）'}</pre>
                </div>
                <div>
                  <span className={styles.label}>实际</span>
                  <pre>{firstFailure.actual_excerpt || '（未记录）'}</pre>
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
          已排队/运行中（{result.submission.status === 'running' ? '运行中' : '排队中'}）…
        </p>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
