'use client';

import React from 'react';
import Link from 'next/link'; // Link import
import styles from '../categories.module.css';

const ChevronDown = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChevronUp = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 15L12 10L17 15" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function CategoryItem({ category, isOpen, onToggle }) {
  // 텍스트를 URL slug 형식으로 변환하는 함수 (예: "Herbal Extracts" -> "herbal-extracts")
  const slugify = (text) => text.toLowerCase().replace(/ & /g, ' ').replace(/_/g, ' ').replace(/\s+/g, '-');

  return (
    <div className={styles.categoryItem}>
      <button className={styles.categoryHeader} onClick={onToggle}>
        <span className={styles.categoryName}>
          {category.name} <span className={styles.categoryCode}>({category.code})</span>
        </span>
        {isOpen ? <ChevronUp /> : <ChevronDown />}
      </button>
      {isOpen && (
        <ul className={styles.subCategoryList}>
          {category.subCategories.map(sub => (
            // [수정] Link 컴포넌트로 각 항목을 감싸줍니다.
            <Link key={sub} href={`/products/${slugify(sub)}`} passHref>
              <li className={styles.subCategoryItem}>
                {sub.replace(/_/g, ' ')}
              </li>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}