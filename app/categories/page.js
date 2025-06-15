'use client';

import React, { useState } from 'react';
import BottomNav from '../home/components/BottomNav';
import CategoryItem from './components/CategoryItem';
import styles from './categories.module.css';

// 시안을 바탕으로 카테고리 데이터 구성
const categoryData = [
  { name: 'Health_Wellness', code: 'HEA', subCategories: ['Herbal Extracts_Supplements', 'Beauty & Health Devices', 'General Health & Supplements'] },
  { name: 'Food_Beverages', code: 'FOO / BEV / MFO / MEI', subCategories: ['Subcategory 1', 'Subcategory 2'] },
  { name: 'Fashion_Lifestyle', code: 'FAS', subCategories: ['Subcategory A', 'Subcategory B'] },
  { name: 'Electronics_Gadgets', code: 'ELE', subCategories: [] },
  { name: 'Tech_Communication', code: 'TEC', subCategories: [] },
  { name: 'Personal Care_Grooming', code: 'PER / COS', subCategories: [] },
  { name: 'Kids\' Essentials', code: 'KID', subCategories: [] },
  { name: 'Outdoor, Sports_Leisure', code: 'OUT / SPO', subCategories: [] },
  { name: 'Cabin Care_Home Comforts', code: 'CLC', subCategories: [] },
  { name: 'Korean Souvenirs_Gifts', code: 'GIF', subCategories: [] },
];

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