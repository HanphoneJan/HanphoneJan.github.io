import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {usePluginData} from '@docusaurus/useGlobalData';
import styles from './index.module.css';

/**
 * 站点首页。
 *
 * ## 为什么不是一个只有两个按钮的 hero
 *
 * 这个站真正的内容在侧边栏里：182 篇题解、171 份逐行算法动画、
 * 可运行样例、自测题库、知识图谱。原来的首页一句都没提，读者点进来
 * 只看到「开始阅读」——落地页没有承担「这站有什么、该从哪进」的职责。
 *
 * ## 数字是构建期真算出来的，不是写死的
 *
 * 题解数取自 `doc-permalinks` 的 permalink 表（只数 `problems/` 下的文档），
 * 可视化数与自测题数分别取自 `vis-traces` / `self-test` 两个插件的
 * globalData。内容增删后首页会自动跟着变，不会出现「写着 182 其实已经 200」。
 * 与题解页的自测/可视化同一个取舍：这里只读得到**清单**本身，
 * 没有把几百 KB 的题目正文、轨迹帧拖进首页。
 */

interface DocPermalinkData {
  map: Record<string, string>;
}

interface VisTracesData {
  entries: unknown[];
}

interface SelfTestData {
  docIds: string[];
}

/** 四个内容入口，顺序即首页上的展示顺序 */
const ENTRIES: Array<{
  to: string;
  icon: string;
  title: string;
  desc: string;
  cta: string;
}> = [
  {
    to: '/docs',
    icon: '📘',
    title: '技术文档',
    desc: '前端、后端、嵌入式、机器学习、AI Agent，以及 Python / Java 计算机基础系列。',
    cta: '进入文档',
  },
  {
    to: '/code-training/category/题库',
    icon: '🧮',
    title: '代码训练',
    desc: '力扣 / 牛客题解，每道题都能在浏览器里直接跑样例、看逐行动画。',
    cta: '开始刷题',
  },
  {
    to: '/stars',
    icon: '⭐',
    title: 'Stars',
    desc: '收藏并打标签的优质开源仓库，支持搜索、标签筛选与排序。',
    cta: '浏览收藏',
  },
  {
    to: '/projects',
    icon: '🚀',
    title: '项目',
    desc: '自己做过与正在做的开源项目与作品。',
    cta: '查看项目',
  },
];

/** 三个差异化能力，指向它们真正起作用的地方 */
const FEATURES: Array<{
  to: string;
  icon: string;
  title: string;
  desc: string;
}> = [
  {
    to: '/code-training/category/题库',
    icon: '▶',
    title: '浏览器里跑样例',
    desc: '题解里点一下就能运行代码、比对样例输出，不用装 Python 环境，也不用复制粘贴。',
  },
  {
    to: '/code-training/category/算法模式',
    icon: '🎬',
    title: '逐行算法动画',
    desc: '录制真实执行过程并回放每一步：数组怎么收缩、指针怎么走、DP 表怎么填。',
  },
  {
    to: '/code-training/category/题库',
    icon: '🧠',
    title: '主动回忆自测',
    desc: '每道题解末尾都有一组自测题，看完解析当场检验自己是不是真的记住了。',
  },
];

export default function Home() {
  const {siteConfig} = useDocusaurusContext();

  // 构建期注入的清单，用来算首页上的真实数字
  const docData = usePluginData('doc-permalinks') as
    | DocPermalinkData
    | undefined;
  const visData = usePluginData('vis-traces') as VisTracesData | undefined;
  const selfTestData = usePluginData('self-test') as SelfTestData | undefined;

  const problemCount = Object.keys(docData?.map ?? {}).filter((key) =>
    key.startsWith('problems/'),
  ).length;
  const visCount = visData?.entries?.length ?? 0;
  const selfTestCount = selfTestData?.docIds?.length ?? 0;

  const stats = [
    {value: problemCount, label: '篇题解'},
    {value: visCount, label: '份算法动画'},
    {value: selfTestCount, label: '篇带自测题'},
  ].filter((s) => s.value > 0);

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main>
        <header className={styles.hero}>
          <div className={styles.heroContainer}>
            <Heading as="h1" className={styles.title}>
              {siteConfig.title}
            </Heading>
            <p className={styles.subtitle}>{siteConfig.tagline}</p>
            <p className={styles.lead}>
              技术文档与算法训练场 —— 静态笔记之外，还放得下可运行的代码、
              可回放的算法动画，以及看完就忘不了的自测题。
            </p>
            <div className={styles.buttons}>
              <Link to="/docs" className={styles.heroButton}>
                开始阅读
              </Link>
              <Link
                to="/code-training/category/题库"
                className={styles.heroButtonSecondary}>
                刷算法题
              </Link>
            </div>

            {stats.length > 0 && (
              <dl className={styles.stats}>
                {stats.map((s) => (
                  <div key={s.label} className={styles.stat}>
                    <dt className={styles.statLabel}>{s.label}</dt>
                    <dd className={styles.statValue}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </header>

        <section className={styles.section}>
          <Heading as="h2" className={styles.sectionTitle}>
            从哪里开始
          </Heading>
          <div className={styles.cards}>
            {ENTRIES.map((entry) => (
              <Link key={entry.to} to={entry.to} className={styles.card}>
                <span className={styles.cardIcon} aria-hidden="true">
                  {entry.icon}
                </span>
                <h3 className={styles.cardTitle}>{entry.title}</h3>
                <p className={styles.cardDesc}>{entry.desc}</p>
                <span className={styles.cardCta}>{entry.cta} →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <Heading as="h2" className={styles.sectionTitle}>
            这里有什么不一样
          </Heading>
          <div className={styles.features}>
            {FEATURES.map((feature) => (
              <Link
                key={feature.title}
                to={feature.to}
                className={styles.feature}>
                <span className={styles.featureIcon} aria-hidden="true">
                  {feature.icon}
                </span>
                <div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDesc}>{feature.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
