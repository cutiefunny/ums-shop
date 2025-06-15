'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../products.module.css';
import { slugify } from '@/data/mockData';

const CloseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function CategorySwitchModal({ isOpen, onClose, currentSlug, siblingCategories }) {
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
          {siblingCategories.map(categoryName => {
            const slug = slugify(categoryName);
            const isActive = slug === currentSlug;
            return (
              <li key={categoryName}>
                <Link 
                  href={`/products/${slug}`} 
                  className={`${styles.modalCategoryItem} ${isActive ? styles.active : ''}`}
                  onClick={onClose} // 다른 카테고리 클릭 시 모달 닫기
                >
                  {categoryName}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}