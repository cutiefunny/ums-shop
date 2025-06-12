import React from 'react';
import styles from '../home.module.css';

export default function MainBanner({ items }) {
  return (
    <div className={styles.bannerContainer}>
      {items.map(item => (
        <div key={item.id} className={styles.bannerItem} style={{ backgroundColor: item.color }}>
          {/* 배너 콘텐츠 */}
        </div>
      ))}
    </div>
  );
}