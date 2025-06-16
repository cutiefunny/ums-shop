import React from 'react';
import Link from 'next/link'; // Link import
import styles from '../home.module.css';
import { slugify } from '@/data/mockData'; // slugify 함수 import

export default function TrendingSection({ categories }) {
  return (
    <section className={styles.trendingSection}>
      <h2 className={styles.sectionTitle}>Trending now</h2>
      <p className={styles.sectionSubtitle}>Picked by seafarers, for seafarers.</p>
      <div className={styles.categoryGrid}>
        {categories.map(categoryName => (
          // [수정] Link 컴포넌트로 각 카드를 감싸줍니다.
          <Link key={categoryName} href={`/category1depth/${slugify(categoryName)}`} className={styles.categoryCardLink}>
            <div className={styles.categoryCard}>
              {categoryName.replace(/_/g, ' ')}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}