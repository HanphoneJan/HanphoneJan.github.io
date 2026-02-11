import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './index.module.css';

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description="技术文档站">
      <main className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>{siteConfig.title}</h1>
          <p className={styles.subtitle}>{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <a href="/docs/intro" className="button button--primary button--lg">
              开始阅读
            </a>
          </div>
        </div>
      </main>
    </Layout>
  );
}
