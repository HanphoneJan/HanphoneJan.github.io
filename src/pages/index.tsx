import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="前后端工程实践与 AI 技术探索笔记">
      <main className={styles.hero}>
        <div className={styles.heroContainer}>
          <h1 className={styles.title}>构建 · 思考 · 分享</h1>
          <p className={styles.subtitle}>
            前后端工程实践与 AI 技术探索笔记
          </p>
          <div className={styles.buttons}>
            <a href="/docs/intro" className={styles.heroButton}>
              开始阅读
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="/blog" className={styles.heroButtonSecondary}>
              浏览博客
            </a>
          </div>
        </div>
      </main>
    </Layout>
  );
}
