import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../home.module.css';
import { slugify } from '@/data/mockData';

export default function TrendingSection({ categories }) {
  return (
    <section className={styles.trendingSection}>
      <h2 className={styles.sectionTitle}>Trending now</h2>
      <p className={styles.sectionSubtitle}>Picked by seafarers, for seafarers.</p>
      <div className={styles.categoryGrid}>
        {categories.map((category, index) => { // map 콜백에 index 추가
          // category.id가 없거나 유효하지 않은 경우 경고 출력 (디버깅용)
          if (!category || !category.id) {
            console.warn('Category object is missing an ID, or is invalid:', category);
          }

          // category.name이 유효한 문자열일 경우에만 렌더링
          // key prop에 category.id가 없거나 유효하지 않을 경우 index를 fallback으로 사용
          return category && typeof category.name === 'string' ? (
            <Link key={category.id || `category-${index}`} href={`/category1depth/${slugify(category.name)}`} className={styles.categoryCardLink}>
              <div className={styles.categoryCard}>
                {category.imageUrl && (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    width={100}
                    height={100}
                    style={{ objectFit: 'contain', marginBottom: '10px' }}
                  />
                )}
                {category.name.replace(/_/g, ' ')}
              </div>
            </Link>
          ) : (
            // 유효하지 않은 카테고리 항목은 렌더링하지 않거나 대체 콘텐츠 표시
            // 대체 div에도 고유한 key를 부여하여 React 경고 방지
            <div key={category ? (category.id || `invalid-category-${index}`) : `invalid-category-${index}`} style={{ display: 'none' }}></div>
          );
        })}
      </div>
    </section>
  );
}
