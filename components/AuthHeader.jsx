'use client';

import React from 'react';
import styles from '../app/auth.module.css'; // 공통 스타일 사용

export default function AuthHeader({ onBack }) {
  return (
    <header className={styles.authHeader}>
      <button onClick={onBack} className={styles.backButton}>
        {/* 뒤로가기 아이콘 SVG */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/>
        </svg>
      </button>
    </header>
  );
}