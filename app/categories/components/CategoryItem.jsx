'use client';

import React from 'react';
import styles from '../categories.module.css';

const ChevronDown = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 10L12 15L17 10" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChevronUp = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 15L12 10L17 15" stroke="#495057" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default function CategoryItem({ category, isOpen, onToggle }) {
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
            <li key={sub} className={styles.subCategoryItem}>
              {sub.replace(/_/g, ' ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}