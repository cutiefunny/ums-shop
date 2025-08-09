'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../products.module.css';
import { slugify } from '@/data/mockData';

const CloseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// 💡 1차 카테고리 '전체 목록'을 받아 페이지를 '이동'시키는 역할로 수정
export default function CategorySwitchModal({ isOpen, onClose, currentSlug, allCategories }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Category</h3>
          <button onClick={onClose} className={styles.iconButton}><CloseIcon /></button>
        </div>
        <ul className={styles.modalCategoryList}>
          {/* 💡 전달받은 1차 카테고리 전체(allCategories)를 map으로 순회 */}
          {allCategories.map(category => {
            // 💡 API 데이터에 name이 없는 경우를 대비
            if (!category || !category.name) return null;

            const slug = slugify(category.name);
            const isActive = slug === currentSlug;
            return (
              <li key={category.name}>
                {/* 💡 클릭 시 해당 1차 카테고리 페이지로 이동하는 Link */}
                <Link
                  href={`/products/${slug}`}
                  className={`${styles.modalCategoryItem} ${isActive ? styles.active : ''}`}
                  onClick={onClose}
                >
                  {category.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}