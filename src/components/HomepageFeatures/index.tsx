import React from 'react';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: JSX.Element;
};
function Feature({title, description}: FeatureItem) {
  return (
    <div className={styles.feature}>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className={styles.container}>
      </div>
    </section>
  );
}
