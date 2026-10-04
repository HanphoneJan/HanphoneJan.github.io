import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from '@docusaurus/Link';
import {usePluginData} from '@docusaurus/useGlobalData';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import type {SrsCard, SrsData} from '@site/plugins/srs-cards';
import styles from './styles.module.css';
import {
  buildDeck,
  commitGrade,
  exportProgress,
  importProgress,
  loadProgress,
  resetProgress,
  stateOf,
  weakTags,
  type Progress,
} from './store';
import {
  dayToISO,
  forecast,
  maturity,
  strengthLabel,
  toDay,
  type Grade,
} from './scheduler';

const GRADES: Array<{key: Grade; label: string; hint: string; tone: string}> = [
  {key: 'forgot', label: '忘了', hint: '完全想不起来', tone: 'forgot'},
  {key: 'recall', label: '记得', hint: '想起来了但有点慢', tone: 'recall'},
  {key: 'instant', label: '秒答', hint: '毫不费力', tone: 'instant'},
];

type View = 'deck' | 'stats';

export default function SrsReview(): React.ReactElement {
  const data = usePluginData('srs-cards') as unknown as SrsData | undefined;
  const cards = useMemo(() => data?.cards ?? [], [data]);

  const today = toDay();
  const [progress, setProgress] = useState<Progress>({states: {}});
  // SSR 时不读 localStorage，避免 hydration 不一致
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>('deck');
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState<Array<{card: SrsCard; grade: Grade}>>([]);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    setProgress(loadProgress());
    setReady(true);
  }, []);

  const deck = useMemo(
    () => (ready ? buildDeck(cards, progress, today) : {cards: [], totalDue: 0, remaining: 0}),
    [cards, progress, today, ready],
  );

  // 打完一张后把它移出当前牌组，避免重复出现
  const current = deck.cards[cursor];

  const grade = useCallback(
    (g: Grade) => {
      if (!current) {
        return;
      }
      const next = commitGrade(current, progress, g, today);
      setProgress(next);
      setDone((prev) => [...prev, {card: current, grade: g}]);
      setFlipped(false);
      setCursor((c) => c + 1);
    },
    [current, progress, today],
  );

  // 键盘快捷键：1/2/3 打分，翻面用空格
  useEffect(() => {
    if (!flipped || !current) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return;
      }
      if (e.key === '1') {
        grade('forgot');
      } else if (e.key === '2') {
        grade('recall');
      } else if (e.key === '3') {
        grade('instant');
      } else if (e.key === ' ') {
        e.preventDefault();
        setFlipped(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, current, grade]);

  const weak = useMemo(
    () => (ready ? weakTags(cards, progress) : []),
    [cards, progress, ready],
  );
  const buckets = useMemo(
    () => (ready ? forecast(progress.states, today, 14) : []),
    [progress, today, ready],
  );
  const reviewedCount = Object.values(progress.states).filter(
    (s) => s.lastReview > 0,
  ).length;
  const finished = ready && deck.cards.length > 0 && cursor >= deck.cards.length;

  return (
    <Layout
      title="复习队列"
      description="按间隔重复算法排的题解复习卡片">
      <div className={styles.page}>
        <div className={styles.header}>
          <Heading as="h1" className={styles.title}>
            复习队列
          </Heading>
          <p className={styles.subtitle}>
            间隔重复（SM-2 lite）：答得越轻松，下次间隔越长；答错则回到起点重来。
          </p>
          {ready && (
            <div className={styles.tabs}>
              <button
                type="button"
                className={
                  view === 'deck' ? styles.tabActive : styles.tab
                }
                onClick={() => setView('deck')}>
                今日复习
                {deck.totalDue > 0 && (
                  <span className={styles.badge}>{deck.totalDue}</span>
                )}
              </button>
              <button
                type="button"
                className={view === 'stats' ? styles.tabActive : styles.tab}
                onClick={() => setView('stats')}>
                进度总览
              </button>
            </div>
          )}
        </div>

        {!ready && <p className={styles.empty}>加载中…</p>}

        {ready && cards.length === 0 && (
          <p className={styles.empty}>没有找到题解，无法生成复习卡片。</p>
        )}

        {ready && cards.length > 0 && view === 'stats' && (
          <StatsView
            cards={cards}
            progress={progress}
            weak={weak}
            buckets={buckets}
            reviewedCount={reviewedCount}
            message={message}
            setMessage={setMessage}
          />
        )}

        {ready && cards.length > 0 && view === 'deck' && (
          <>
            {deck.cards.length === 0 && (
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>
                  {reviewedCount === 0
                    ? '今天没有待复习的卡片'
                    : '今日复习已完成'}
                </p>
                <p className={styles.emptyHint}>
                  {reviewedCount === 0
                    ? '所有题解都已排到未来。做完新题后会自动到期。'
                    : '明天会有新的一批到期。间隔会随表现自动拉长。'}
                </p>
              </div>
            )}

            {finished && deck.cards.length > 0 && (
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>
                  本轮完成 {done.length} 张
                </p>
                <p className={styles.emptyHint}>
                  {done.filter((d) => d.grade === 'instant').length} 张秒答，
                  {done.filter((d) => d.grade === 'recall').length} 张记得，
                  {done.filter((d) => d.grade === 'forgot').length} 张忘了
                  {deck.remaining > 0 && `，还有 ${deck.remaining} 张未开始`}
                </p>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setCursor(0);
                    setDone([]);
                  }}>
                  再来一轮
                </button>
              </div>
            )}

            {current && !finished && (
              <>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${(cursor / deck.cards.length) * 100}%`,
                    }}
                  />
                </div>
                <div className={styles.meta}>
                  <span>
                    第 {cursor + 1} / {deck.cards.length} 张
                  </span>
                  {deck.remaining > 0 && (
                    <span className={styles.muted}>
                      今日还有 {deck.remaining + deck.cards.length - cursor - 1}{' '}
                      张
                    </span>
                  )}
                </div>

                <article className={styles.card}>
                  <div className={styles.cardHead}>
                    <span
                      className={`${styles.difficulty} ${
                        styles[`lv${current.level}`] ?? ''
                      }`}>
                      {current.difficultyLabel}
                    </span>
                    <span className={styles.platform}>{current.platform}</span>
                  </div>

                  <h2 className={styles.cardTitle}>{current.title}</h2>

                  <div className={styles.tags}>
                    {current.tags.slice(0, 6).map((t) => (
                      <span key={t} className={styles.tag}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <p className={styles.hint}>
                    {flipped
                      ? '先在心里把这题从头讲一遍，再看解析对不对。'
                      : '先自己回忆解法 —— 别急着翻题解。'}
                  </p>

                  <div className={styles.actions}>
                    {current.permalink ? (
                      <Link className={styles.primaryButton} to={current.permalink}>
                        打开题解
                      </Link>
                    ) : (
                      <span className={styles.muted}>题解链接缺失</span>
                    )}
                    {!flipped && (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setFlipped(true)}>
                        我想起来了，翻面
                      </button>
                    )}
                  </div>

                  {flipped && (
                    <div className={styles.gradeRow}>
                      <p className={styles.gradeHint}>如实评价，别为了好看选「秒答」</p>
                      <div className={styles.gradeButtons}>
                        {GRADES.map((g) => (
                          <button
                            key={g.key}
                            type="button"
                            className={`${styles.gradeButton} ${styles[g.tone]}`}
                            onClick={() => grade(g.key)}>
                            <strong>{g.label}</strong>
                            <span className={styles.gradeHintSmall}>
                              {g.hint}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className={styles.kbdHint}>
                        快捷键 1 / 2 / 3，空格翻回
                      </p>
                    </div>
                  )}
                </article>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function StatsView({
  cards,
  progress,
  weak,
  buckets,
  reviewedCount,
  message,
  setMessage,
}: {
  cards: SrsCard[];
  progress: Progress;
  weak: ReturnType<typeof weakTags>;
  buckets: number[];
  reviewedCount: number;
  message: string;
  setMessage: (s: string) => void;
}): React.ReactElement {
  const today = toDay();
  const maxBucket = Math.max(1, ...buckets);

  // 最该复习的几张：到期且遗忘次数多
  const weakest = [...cards]
    .map((c) => ({card: c, state: stateOf(c, progress, today)}))
    .filter((x) => x.state.lapses > 0)
    .sort((a, b) => b.state.lapses - a.state.lapses)
    .slice(0, 8);

  const onExport = () => {
    const blob = new Blob([exportProgress()], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `srs-progress-${dayToISO(today)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('已导出到下载目录');
  };

  const onImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importProgress(String(reader.result));
      setMessage(res.message);
      if (res.ok) {
        setTimeout(() => window.location.reload(), 800);
      }
    };
    reader.readAsText(file);
  };

  const onReset = () => {
    if (
      window.confirm(
        '确定清空全部复习进度？下次进来所有题解都会重新到期。',
      )
    ) {
      resetProgress();
      window.location.reload();
    }
  };

  return (
    <>
      <div className={styles.statRow}>
        <Stat label="卡片总数" value={cards.length} />
        <Stat label="已复习" value={reviewedCount} />
        <Stat
          label="今日到期"
          value={cards.filter((c) => stateOf(c, progress, today).due <= today).length}
        />
        <Stat
          label="平均成熟度"
          value={`${Math.round(
            (Object.values(progress.states).reduce(
              (sum, s) => sum + maturity(s),
              0,
            ) /
              Math.max(1, Object.keys(progress.states).length)) *
              100,
          )}%`}
        />
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>到期分布</h2>
        <div className={styles.chart}>
          {buckets.map((n, i) => (
            <div key={i} className={styles.chartCol}>
              <div
                className={i === 0 ? styles.chartBarOverdue : styles.chartBar}
                style={{height: `${(n / maxBucket) * 100}%`}}
                title={`${n} 张`}
              />
              <span className={styles.chartLabel}>
                {i === 0 ? '逾期' : i === 1 ? '今天' : i === 2 ? '明天' : i - 1}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.chartHint}>
          「逾期」是已经过了计划复习日还没练的卡 —— 欠得越多越该先做。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>薄弱标签</h2>
        {weak.length === 0 ? (
          <p className={styles.emptyHint}>
            还没有足够的数据。复习几轮之后，这里会列出失分最多的知识点 ——
            直接告诉你下一步该练什么。
          </p>
        ) : (
          <ul className={styles.weakList}>
            {weak.map((w) => (
              <li key={w.tag} className={styles.weakItem}>
                <span className={styles.weakTag}>{w.tag}</span>
                <div className={styles.weakBarWrap}>
                  <div
                    className={styles.weakBar}
                    style={{width: `${Math.round(w.rate * 100)}%`}}
                  />
                </div>
                <span className={styles.weakRate}>
                  错 {w.failures}/{w.attempts}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {weakest.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>反复出错的题</h2>
          <ul className={styles.plainList}>
            {weakest.map(({card, state}) => (
              <li key={card.id} className={styles.plainItem}>
                <span className={styles.plainTitle}>{card.title}</span>
                <span className={styles.muted}>
                  错 {state.lapses} 次 ·{' '}
                  {strengthLabel(state).text}
                </span>
                {card.permalink && (
                  <Link className={styles.smallLink} to={card.permalink}>
                    看题解
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>数据管理</h2>
        <p className={styles.emptyHint}>
          进度存在本浏览器（localStorage），换设备或清缓存会丢。建议定期导出备份。
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onExport}>
            导出进度
          </button>
          <label className={styles.secondaryButton}>
            导入进度
            <input
              type="file"
              accept="application/json"
              className={styles.hiddenInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onImport(f);
                }
              }}
            />
          </label>
          <button type="button" className={styles.dangerButton} onClick={onReset}>
            清空进度
          </button>
        </div>
        {message && <p className={styles.message}>{message}</p>}
      </section>
    </>
  );
}

function Stat({label, value}: {label: string; value: React.ReactNode}): React.ReactElement {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}