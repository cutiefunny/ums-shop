import React from 'react';
import styles from '../home.module.css';

export default function TrendingSection({ categories }) {
  return (
    <section className={styles.trendingSection}>
      <h2 className={styles.sectionTitle}>Trending now</h2>
      <p className={styles.sectionSubtitle}>Picked by seafarers, for seafarers.</p>
      <div className={styles.categoryGrid}>
        {categories.map(category => (
          <div key={category} className={styles.categoryCard}>
            {category}
          </div>
        ))}
      </div>
    </section>
  );
}