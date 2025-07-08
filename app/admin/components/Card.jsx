// app/admin/components/Card.jsx
import React from 'react';
import styles from './Card.module.css'; // CSS Module 임포트

export default function Card({ title, children, style, ...props }) { // ...props를 추가하여 나머지 모든 prop을 받습니다.
  return (
    <div className={styles.card} style={style} {...props}> {/* ...props를 div에 전달합니다. */}
      <h3 className={styles.cardTitle}>{title}</h3>
      {children}
    </div>
  );
}