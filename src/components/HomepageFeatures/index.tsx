import React from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: '工程实践',
    icon: '⚙️',
    description: (
      <>
        前后端架构设计、性能优化、工程化实践经验总结
      </>
    ),
  },
  {
    title: 'AI 探索',
    icon: '🤖',
    description: (
      <>
        机器学习、深度学习、大语言模型应用研究笔记
      </>
    ),
  },
  {
    title: '技术分享',
    icon: '📚',
    description: (
      <>
        持续学习，记录成长，分享知识，构建技术影响力
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className={styles.container}>
        {FeatureList.map((props, idx) => (
          <Feature key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
