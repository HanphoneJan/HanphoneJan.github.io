import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {SELF_TEST_ANCHOR, SELF_TEST_TITLE} from './toc';
import styles from './styles.module.css';
import Heading from '@theme/Heading';
import {isCorrect, type Question} from './types';

interface Props {
  /** 题库键：题解 md 相对 code-training/docs 的路径 */
  docId: string;
}

/** 每题作答后的状态 */
type AnswerState = {
  value: unknown;
  submitted: boolean;
};

type LoadState =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'loaded'}
  | {status: 'error'; message: string};

const TYPE_LABEL: Record<Question['type'], string> = {
  single: '单选',
  multi: '多选',
  judge: '判断',
  blank: '填空',
};

/**
 * 题库按需加载。
 *
 * 用模块级 promise 缓存：在题解之间跳转时不会重复下载，
 * 浏览器自身的 HTTP 缓存是第二道保险。
 */
let bankPromise: Promise<Map<string, Question[]>> | undefined;

function loadBank(url: string): Promise<Map<string, Question[]>> {
  bankPromise ??= fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json() as Promise<{items?: Question[]}>;
    })
    .then((bank) => {
      const byDoc = new Map<string, Question[]>();
      for (const item of bank.items ?? []) {
        const list = byDoc.get(item.docId);
        if (list) {
          list.push(item);
        } else {
          byDoc.set(item.docId, [item]);
        }
      }
      return byDoc;
    })
    .catch((e) => {
      // 允许失败后重试
      bankPromise = undefined;
      throw e;
    });
  return bankPromise;
}

/**
 * 主动回忆自测区块。
 *
 * 由 remark 插件 `inject-self-test` 在题解末尾自动注入，构建期只传一个
 * docId；**题目数据在用户点开时才 fetch** —— 否则几百道题会被打进每一个
 * 题解页面的 JS bundle。
 *
 * 设计要点：一题一屏，必须提交才能看下一题 —— 这样才逼出真正的主动回忆，
 * 而不是在题干还开着的情况下顺手点「下一页」。
 */
export default function SelfTest({docId}: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<LoadState>({status: 'idle'});
  const [byDoc, setByDoc] = useState<Map<string, Question[]>>(new Map());
  const [cursor, setCursor] = useState(0);
  const [states, setStates] = useState<Record<string, AnswerState>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const requestedRef = useRef(false);

  // 题解页里拿自己的 permalink，这样「看题解」能精确跳回这篇
  const {metadata} = useDoc();
  const bankUrl = useBaseUrl('/quiz/bank.json');

  const questions = useMemo(() => byDoc.get(docId) ?? [], [byDoc, docId]);

  useEffect(() => {
    // 用 ref 而不是把 load.status 放进依赖：effect 内部 setLoad 会改变依赖，
    // 触发上一轮 cleanup 把 cancelled 置 true，导致 promise 回调被丢弃、
    // 界面永远停在「正在加载题目…」。这个坑踩过一次。
    if (!open || requestedRef.current) {
      return;
    }
    requestedRef.current = true;
    setLoad({status: 'loading'});
    loadBank(bankUrl)
      .then((map) => {
        setByDoc(map);
        setLoad({status: 'loaded'});
      })
      .catch((e: Error) => {
        // 允许用户点重试
        requestedRef.current = false;
        setLoad({status: 'error', message: e.message});
      });
  }, [open, bankUrl]);

  const current = questions[cursor];
  const finished = !questions.length || cursor >= questions.length;

  const state = current ? states[current.id] : undefined;
  const answered = state?.submitted ?? false;

  const reset = useCallback(() => {
    setCursor(0);
    setStates({});
  }, []);

  const setValue = useCallback(
    (value: unknown) => {
      if (!current || state?.submitted) {
        return;
      }
      setStates((prev) => ({...prev, [current.id]: {value, submitted: false}}));
    },
    [current, state?.submitted],
  );

  const submit = useCallback(() => {
    if (!current || state?.submitted) {
      return;
    }
    if (state?.value === undefined) {
      // 没作答就点提交：聚焦输入框而不是静默忽略
      inputRef.current?.focus();
      return;
    }
    setStates((prev) => ({
      ...prev,
      [current.id]: {...prev[current.id], submitted: true},
    }));
  }, [current, state]);

  const toggleMulti = useCallback(
    (optionIndex: number) => {
      if (!current || state?.submitted) {
        return;
      }
      const picked = Array.isArray(state?.value)
        ? (state.value as number[])
        : [];
      const next = picked.includes(optionIndex)
        ? picked.filter((i) => i !== optionIndex)
        : [...picked, optionIndex].sort((a, b) => a - b);
      setValue(next);
    },
    [current, state, setValue],
  );

  const summary = useMemo(() => {
    const graded = questions.filter((q) => states[q.id]?.submitted);
    const right = graded.filter((q) => isCorrect(q, states[q.id].value));
    return {right: right.length, total: graded.length};
  }, [questions, states]);

  // ---------- 折叠态：还没点开 ----------
  if (!open) {
    return (
      <section className={styles.wrapper}>
        <Heading as="h2" id={SELF_TEST_ANCHOR} className={styles.title}>
          {SELF_TEST_TITLE}
        </Heading>
        <button
          type="button"
          className={styles.openButton}
          onClick={() => setOpen(true)}
          aria-expanded={false}>
          <span>检验一下是否真的掌握了 —— 主动回忆题</span>
        </button>
      </section>
    );
  }

  // ---------- 加载 / 出错 ----------
  if (load.status === 'loading' || load.status === 'idle') {
    return (
      <section className={styles.wrapper}>
        <Heading as="h2" id={SELF_TEST_ANCHOR} className={styles.title}>
          {SELF_TEST_TITLE}
        </Heading>
        <p className={styles.hint}>正在加载题目…</p>
      </section>
    );
  }

  if (load.status === 'error') {
    return (
      <section className={styles.wrapper}>
        <Heading as="h2" id={SELF_TEST_ANCHOR} className={styles.title}>
          {SELF_TEST_TITLE}
        </Heading>
        <p className={styles.hint}>题目加载失败（{load.message}）</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setLoad({status: 'loading'})}>
            重试
          </button>
        </div>
      </section>
    );
  }

  // ---------- 题库里没有这篇的题（remark 插件已过滤，这里兜底） ----------
  if (questions.length === 0) {
    return (
      <section className={styles.wrapper}>
        <Heading as="h2" id={SELF_TEST_ANCHOR} className={styles.title}>
          {SELF_TEST_TITLE}
        </Heading>
        <p className={styles.hint}>这篇暂时还没有自测题。</p>
      </section>
    );
  }

  // ---------- 结果页 ----------
  if (finished) {
    return (
      <section className={styles.wrapper}>
        <div className={styles.summary}>
          <p className={styles.summaryScore}>
            本轮 {summary.right} / {questions.length} 正确
          </p>
          <div className={styles.summaryActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={reset}>
              重做一遍
            </button>
            {metadata.permalink && (
              <Link className={styles.linkButton} to={metadata.permalink}>
                回到题解正文
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ---------- 答题页 ----------
  return (
    <section className={styles.wrapper}>
      <Heading as="h2" id={SELF_TEST_ANCHOR} className={styles.title}>
        {SELF_TEST_TITLE}
      </Heading>
      <p className={styles.hint}>
        先自己作答再看解析。答错不扣分，错了才是这次复习的价值所在。
      </p>

      <div className={styles.progress}>
        <span className={styles.progressText}>
          第 {cursor + 1} / {questions.length} 题 · {TYPE_LABEL[current.type]}
        </span>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{width: `${(cursor / questions.length) * 100}%`}}
          />
        </div>
      </div>

      <p className={styles.stem}>{current.stem}</p>

      <div className={styles.answerArea}>
        {current.type === 'judge' ? (
          <div className={styles.judgeRow}>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                className={cx(
                  styles.option,
                  state?.value === v && styles.optionSelected,
                  answered &&
                    state?.value === v &&
                    (v ? styles.correct : styles.wrong),
                )}
                disabled={answered}
                onClick={() => setValue(v)}>
                {v ? '正确' : '错误'}
              </button>
            ))}
          </div>
        ) : current.type === 'blank' ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.blankInput}
            placeholder="输入答案，例如 O(n log n)"
            value={typeof state?.value === 'string' ? state.value : ''}
            disabled={answered}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submit();
              }
            }}
          />
        ) : (
          <ul className={styles.optionList}>
            {current.options.map((option, i) => {
              const right = isOptionRight(current, i);
              const picked = Array.isArray(state?.value)
                ? (state.value as number[]).includes(i)
                : state?.value === i;
              return (
                <li key={i}>
                  <button
                    type="button"
                    className={cx(
                      styles.option,
                      picked && styles.optionSelected,
                      // 提交后：正确答案标绿；选错的标红。
                      // 只标「我选的那个」是不够的 —— 答错时必须把正确
                      // 答案指出来，否则这一轮的复习价值就没了。
                      answered && right && styles.correct,
                      answered && picked && !right && styles.wrong,
                    )}
                    disabled={answered}
                    onClick={() =>
                      current.type === 'multi' ? toggleMulti(i) : setValue(i)
                    }>
                    <span className={styles.optionKey}>
                      {current.type === 'multi' ? box(picked) : letter(i)}
                    </span>
                    <span>{option}</span>
                    {answered && right && !picked && (
                      <span className={styles.rightMark}>正确答案</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {answered && (
        <div
          className={cx(
            styles.feedback,
            isCorrect(current, state?.value)
              ? styles.feedbackRight
              : styles.feedbackWrong,
          )}>
          <strong>
            {isCorrect(current, state?.value) ? '答对了' : '答错了'}
          </strong>
          <p className={styles.explain}>{current.explain}</p>
          <p className={styles.source}>出处：{current.source}</p>
        </div>
      )}

      <div className={styles.actions}>
        {!answered ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={submit}>
            提交作答
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setCursor((c) => c + 1)}>
              {cursor + 1 === questions.length ? '查看结果' : '下一题'}
            </button>
            <Link className={styles.linkButton} to={metadata.permalink ?? '#'}>
              看题解
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

/** 该选项是否属于正确答案集合 */
function isOptionRight(q: Question, optionIndex: number): boolean {
  if (q.type === 'single') {
    return q.answer === optionIndex;
  }
  if (q.type === 'multi') {
    return q.answer.includes(optionIndex);
  }
  return false;
}

/** 避免为一个三元表达式引入 clsx 依赖 */
function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

function box(checked: boolean): string {
  return checked ? '☑' : '☐';
}