/**
 * 在浏览器里跑 Python（Pyodide）。
 *
 * ## 交互设计
 *
 * 折叠态只显示一行「在浏览器里跑代码（首次约 13MB）」——
 * 13MB 不该在用户没表达意图时就下载。点开后才加载运行时。
 *
 * 运行时是**模块级单例**：同一页面里第一次加载付 13MB 的钱，
 * 之后每次运行都是瞬时的（解释器不重建）。
 *
 * ## 为什么不内置编辑器
 *
 * 题解里的代码在构建期已经抽好（见 `plugins/py-samples`），
 * 直接预填即可。只有用户想改代码时才需要编辑器，所以做成可折叠的
 * 「编辑代码」区域，默认收起 —— 免得一大段 textarea 抢走注意力。
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {usePluginData} from '@docusaurus/useGlobalData';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';
import type {PySamplesData} from '@site/plugins/py-samples';
import {
  loadPyodideRuntime,
  normalizeCode,
  PYODIDE_SIZE_HINT,
  runCode,
  type PyodideRuntime,
} from './runtime';

interface Props {
  /** 题解 md 相对 code-training/docs 的路径 */
  docId: string;
}

/** 结果面板里一行样例的状态 */
type SampleVerdict = 'pending' | 'pass' | 'fail' | 'error';

interface SampleResult {
  index: number;
  args: string[];
  expected: string;
  actual: string;
  verdict: SampleVerdict;
  /** 失败时的原因（解析失败、断言异常等） */
  reason?: string;
}

const MARKER = '__PYRUNNER_RESULTS__';

export default function PyRunner({docId}: Props): React.ReactElement | null {
  const data = usePluginData('py-samples') as unknown as
    | PySamplesData
    | undefined;
  const entry = data?.entries[docId];

  const [open, setOpen] = useState(false);
  const [runtime, setRuntime] = useState<PyodideRuntime | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [code, setCode] = useState('');
  const [manualArgs, setManualArgs] = useState('');
  const [results, setResults] = useState<SampleResult[] | null>(null);
  const [runError, setRunError] = useState('');
  const [stdout, setStdout] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const indexUrl = useBaseUrl('/pyodide/');
  const initialized = useRef(false);

  // 展开时才加载
  useEffect(() => {
    if (!open || runtime || loadError) {
      return;
    }
    let cancelled = false;
    loadPyodideRuntime({
      indexUrl,
      onProgress: (m) => {
        if (!cancelled) {
          setLoadingMsg(m);
        }
      },
    })
      .then((py) => {
        if (!cancelled) {
          setRuntime(py);
          initialized.current = true;
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setLoadError(e.message || String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, runtime, loadError, indexUrl]);

  // 预填题解里的代码
  useEffect(() => {
    if (entry && code === '') {
      setCode(entry.code);
    }
  }, [entry, code]);

  const samples = entry?.samples ?? [];
  const hasSamples = samples.length > 0;

  const runSamples = useCallback(async () => {
    if (!runtime || !entry?.method) {
      return;
    }
    setBusy(true);
    setRunError('');
    setStdout('');
    setResults(null);

    // 生成驱动代码：每个样例调一次，把结果 JSON 化打到标记行后面。
    // 用 JSON 是为了让 JS 侧能结构化比较，避免字符串 repr 的空格差异。
    const calls = samples
      .map(
        (s) =>
          `    __append__(__s__.${entry.method}(${s.args.join(', ')}))`,
      )
      .join('\n');
    const driver = `
import json as __json__
__out__ = []
def __append__(v):
    __out__.append(__json__.dumps(v, default=str, ensure_ascii=False))

__s__ = Solution()
try:
${calls}
except Exception:
    import traceback
    print(${JSON.stringify(MARKER)} + __json__.dumps({"error": traceback.format_exc()}, ensure_ascii=False))
    raise
else:
    print(${JSON.stringify(MARKER)} + __json__.dumps(__out__, ensure_ascii=False))
`;

    const {stdout: out, stderr, error} = await runCode(
      runtime,
      `${code}\n${driver}`,
    );
    setBusy(false);
    setStdout(out);

    if (error) {
      setRunError(error);
      return;
    }

    const line = out.split('\n').find((l) => l.startsWith(MARKER));
    if (!line) {
      setRunError(
        stderr
          ? `代码抛错：\n${stderr}`
          : '没有拿到运行结果（代码里可能有裸 except 吞掉了异常，或提前 return）',
      );
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(line.slice(MARKER.length));
    } catch {
      setRunError('结果解析失败');
      return;
    }

    if (Array.isArray(payload) && typeof payload === 'object' && 'error' in payload) {
      setRunError(
        String((payload as {error: string}).error),
      );
      return;
    }

    const values = payload as string[];
    setResults(
      samples.map((s, i) => {
        const actual = values[i] ?? '（没有返回值）';
        const eq = compare(actual, s.expected);
        return {
          index: i,
          args: s.args,
          expected: s.expected,
          actual,
          verdict: eq.ok ? 'pass' : 'fail',
        };
      }),
    );
  }, [runtime, entry, samples, code]);

  const runManual = useCallback(async () => {
    if (!runtime || !entry?.method) {
      return;
    }
    setBusy(true);
    setRunError('');
    setStdout('');
    setResults(null);

    const call = `${entry.method}(${manualArgs.trim() || ''})`;
    const driver = `
import json as __json__
print(${JSON.stringify(MARKER)} + __json__.dumps(Solution().${call}, default=str, ensure_ascii=False))
`;
    const {stdout: out, stderr, error} = await runCode(
      runtime,
      `${code}\n${driver}`,
    );
    setBusy(false);
    setStdout(out);
    if (error) {
      setRunError(error);
      return;
    }
    const line = out.split('\n').find((l) => l.startsWith(MARKER));
    setResults(
      line
        ? [
            {
              index: 0,
              args: [manualArgs.trim()],
              expected: '',
              actual: line.slice(MARKER.length),
              verdict: 'pass',
            },
          ]
        : null,
    );
    if (!line && stderr) {
      setRunError(stderr);
    }
  }, [runtime, entry, manualArgs, code]);

  const passCount = useMemo(
    () => results?.filter((r) => r.verdict === 'pass').length ?? 0,
    [results],
  );

  if (!entry) {
    return null;
  }

  if (!open) {
    return (
      <section className={styles.collapsed}>
        <button
          type="button"
          className={styles.openButton}
          onClick={() => setOpen(true)}
          aria-expanded={false}>
          <span className={styles.badge}>运行</span>
          <span>
            在浏览器里直接跑这段 Python —— 不用装环境（首次加载 {PYODIDE_SIZE_HINT}）
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className={styles.wrapper} data-testid="pyrunner">
      <div className={styles.head}>
        <h3 className={styles.title}>在浏览器里运行</h3>
        {entry.method && (
          <p className={styles.meta}>
            入口：<code>Solution().{entry.method}({entry.paramNames.join(', ')})</code>
          </p>
        )}
      </div>

      {loadError && (
        <div className={styles.errorBox}>
          <p>Python 运行时加载失败：{loadError}</p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setLoadError('');
            }}>
            重试
          </button>
        </div>
      )}

      {!runtime && !loadError && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>{loadingMsg || '正在准备 Python 运行时…'}</p>
          <p className={styles.hint}>
            {PYODIDE_SIZE_HINT}，需要等一会儿。之后由浏览器缓存，再次运行是瞬时的。
          </p>
        </div>
      )}

      {runtime && (
        <>
          {hasSamples ? (
            <>
              <p className={styles.hint}>
                直接用题解里的 {samples.length} 组样例跑一遍：
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={runSamples}
                  disabled={busy}
                  data-testid="run">
                  {busy ? '运行中…' : '▶ 运行样例'}
                </button>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setEditing((v) => !v)}
                  aria-expanded={editing}>
                  {editing ? '收起代码' : '编辑代码'}
                </button>
              </div>

              {editing && (
                <textarea
                  className={styles.editor}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  rows={16}
                  aria-label="Python 代码"
                />
              )}

              {results && (
                <div className={styles.results} data-testid="results">
                  <p className={styles.summary}>
                    {passCount} / {results.length} 组样例通过
                  </p>
                  <ul className={styles.sampleList}>
                    {results.map((r) => (
                      <li key={r.index} className={styles.sampleItem}>
                        <span
                          className={`${styles.verdict} ${
                            r.verdict === 'pass' ? styles.pass : styles.fail
                          }`}>
                          {r.verdict === 'pass' ? '✓' : '✗'}
                        </span>
                        <div className={styles.sampleBody}>
                          <code className={styles.sampleArgs}>
                            {entry.method}({r.args.join(', ')})
                          </code>
                          <div className={styles.diff}>
                            <span className={styles.diffLabel}>期望</span>
                            <code>{r.expected}</code>
                            <span className={styles.diffLabel}>实际</span>
                            <code
                              className={
                                r.verdict === 'pass' ? styles.ok : styles.bad
                              }>
                              {r.actual}
                            </code>
                          </div>
                          {r.reason && (
                            <p className={styles.reason}>{r.reason}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <p className={styles.hint}>
                这篇的示例是散文/表格写法，没能自动抽成可调用的参数。
                手动填参数运行 —— 逗号分隔，顺序对应签名：
                <code>{entry.paramNames.join(', ')}</code>
              </p>
              <input
                type="text"
                className={styles.input}
                value={manualArgs}
                placeholder={
                  entry.paramNames.length === 1
                    ? '例："abcabcbb"'
                    : `例：${entry.paramNames
                        .map((p) => `[${p}]`)
                        .join(', ')}`
                }
                onChange={(e) => setManualArgs(e.target.value)}
                aria-label="调用参数"
              />
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={runManual}
                  disabled={busy}
                  data-testid="run">
                  {busy ? '运行中…' : '▶ 运行'}
                </button>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => setEditing((v) => !v)}
                  aria-expanded={editing}>
                  {editing ? '收起代码' : '编辑代码'}
                </button>
              </div>
              {editing && (
                <textarea
                  className={styles.editor}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  rows={16}
                  aria-label="Python 代码"
                />
              )}
              {results && (
                <div className={styles.results} data-testid="results">
                  <p className={styles.summary}>输出</p>
                  <pre className={styles.output}>
                    <code>{results[0].actual}</code>
                  </pre>
                </div>
              )}
            </>
          )}

          {runError && (
            <div className={styles.errorBox}>
              <strong>运行出错</strong>
              <pre className={styles.output}>
                <code>{runError}</code>
              </pre>
            </div>
          )}

          {!results && !runError && stdout && (
            <pre className={styles.output}>
              <code>{stdout}</code>
            </pre>
          )}
        </>
      )}
    </section>
  );
}

/**
 * 比较实际值与期望值。
 *
 * ## 为什么不能直接字符串相等
 *
 * 题解里的期望值有多种写法，直接比必然误判：
 * - `2.00000`（力扣的浮点格式）vs Python 的 `2.0`
 * - `[0,1]`（无空格）vs `json.dumps` 产出的 `[0, 1]`
 * - `["ad","ae"]` vs `'["ad", "ae"]'`
 *
 * 所以按「先尝试结构化比较，再退回字符串」的顺序逐级降级。
 */
export function compare(
  actual: string,
  expected: string,
): {ok: boolean; reason?: string} {
  const a = actual.trim();
  const e = expected.trim();
  if (a === e) {
    return {ok: true};
  }

  // 1) 双方都是合法 JSON -> 结构化深比较
  const aj = tryJson(a);
  const ej = tryJson(e);
  if (aj.ok && ej.ok) {
    if (deepEqual(aj.value, ej.value)) {
      return {ok: true};
    }
    return {
      ok: false,
      reason: `类型/内容不符：期望 ${JSON.stringify(ej.value)}，实际 ${JSON.stringify(aj.value)}`,
    };
  }

  // 2) 期望值去掉引号后与实际相等（处理 "abc" vs abc）
  const unquoted = ej.ok && typeof ej.value === 'string' ? ej.value : undefined;
  if (unquoted !== undefined && unquoted === a) {
    return {ok: true};
  }

  // 3) 数值容差（中位数这类会写成 2.00000）
  const an = Number(a);
  const en = Number(e);
  if (Number.isFinite(an) && Number.isFinite(en)) {
    return Math.abs(an - en) < 1e-6
      ? {ok: true}
      : {ok: false, reason: `数值不符：期望 ${en}，实际 ${an}`};
  }

  return {ok: false};
}

function tryJson(s: string): {ok: true; value: unknown} | {ok: false} {
  if (!s || !/^[[{"]|^-?\d|^true$|^false$|^null$/.test(s.trim())) {
    return {ok: false};
  }
  try {
    return {ok: true, value: JSON.parse(s)};
  } catch {
    return {ok: false};
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
      )
    );
  }
  return false;
}

export {normalizeCode};