import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main className={styles.hero}>
        <div className={styles.heroContainer}>
          <h1 className={styles.title}>{siteConfig.title}</h1>
          <p className={styles.subtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link href="/docs" className={styles.heroButton}>
              开始阅读
            </Link>
            <Link
              href="/code-training/patterns/sorting"
              className={styles.heroButtonSecondary}>
              算法可视化
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
