'use client';

import React, { useState } from 'react';
import BottomNav from '../home/components/BottomNav';
import CategoryItem from './components/CategoryItem';
import styles from './categories.module.css';
import { categoryData } from '@/data/mockData';

export default function CategoriesPage() {
  // 열려있는 카테고리를 관리하는 상태
  const [openCategory, setOpenCategory] = useState('Health_Wellness');

  const handleToggle = (categoryName) => {
    // 이미 열려있는 카테고리를 다시 클릭하면 닫고, 다른 카테고리를 클릭하면 해당 카테고리를 엽니다.
    setOpenCategory(prev => (prev === categoryName ? null : categoryName));
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Category</h1>
      </header>
      <main className={styles.mainContent}>
        <div className={styles.categoryList}>
          {categoryData.map(category => (
            <CategoryItem
              key={category.name}
              category={category}
              isOpen={openCategory === category.name}
              onToggle={() => handleToggle(category.name)}
            />
          ))}
        </div>
      </main>
      {/* activePath prop으로 현재 활성화된 메뉴를 전달 */}
      <BottomNav activePath="categories" />
    </div>
  );
}