// app/admin/components/Card.jsx
import React from 'react';
import styles from './Card.module.css'; // CSS Module 임포트

export default function Card({ title, children, style }) {
  return (
    <div className={styles.card} style={style}> {/* CSS Module 클래스 적용 */}
      <h3 className={styles.cardTitle}>{title}</h3>
      {children}
    </div>
  );
}