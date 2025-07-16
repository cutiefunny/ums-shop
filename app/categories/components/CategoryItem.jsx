// app/categories/components/CategoryItem.jsx
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // useEffect, useCallback 추가
import Link from 'next/link';
import styles from '../categories.module.css';

const ChevronDown = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 10L12 15L17 10" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChevronUp = () => <svg width="24" height="24" viewBox="0 0 24 24"><path d="M7 15L12 10L17 15" stroke="#495057" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// 텍스트를 URL slug 형식으로 변환하는 헬퍼 함수 (내부에 직접 구현)
const slugify = (text) => text.toLowerCase().replace(/ & /g, ' ').replace(/_/g, ' ').replace(/\s+/g, '-');


export default function CategoryItem({ category, isOpen, onToggle }) {
  const [subCategories, setSubCategories] = useState([]); // 서브 카테고리 상태 추가
  const [subLoading, setSubLoading] = useState(false); // 서브 카테고리 로딩 상태
  const [subError, setSubError] = useState(null); // 서브 카테고리 에러 상태

  // 서브 카테고리를 불러오는 함수
  const fetchSubCategories = useCallback(async () => {
    if (!category || !category.categoryId) return; // category나 categoryId가 없으면 실행 안 함

    setSubLoading(true);
    setSubError(null);
    try {
      // level=surve1, parentId는 메인 카테고리의 categoryId
      const response = await fetch(`/api/categories?level=surve1&parentId=${category.categoryId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSubCategories(data || []);
    } catch (err) {
      console.error("Error fetching sub categories:", err);
      setSubError(`서브 카테고리를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setSubLoading(false);
    }
  }, [category]); // category 객체에 의존

  // isOpen 상태가 true가 되고, 아직 서브 카테고리를 불러오지 않았다면 API 호출
  useEffect(() => {
    if (isOpen && subCategories.length === 0 && !subLoading && !subError) {
      fetchSubCategories();
    }
  }, [isOpen, subCategories, subLoading, subError, fetchSubCategories]);


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
          {subLoading ? (
            <img src="/images/loading2.gif" alt="Loading..." style={{ height: '48px' }} />
          ) : subError ? (
            <li className={styles.subCategoryItem} style={{ textAlign: 'center', color: 'red' }}>
              오류: {subError}
            </li>
          ) : subCategories.length > 0 ? (
            subCategories.map(subCat => ( // subCat은 이제 객체 {categoryId, name, code, ...}
              <Link key={subCat.categoryId} href={`/products/${slugify(subCat.name)}`} passHref>
                <li className={styles.subCategoryItem}>
                  {subCat.name.replace(/_/g, ' ')} {/* 이름 표시 */}
                </li>
              </Link>
            ))
          ) : (
            <li className={styles.subCategoryItem} style={{ textAlign: 'center', color: '#868e96' }}>
              서브 카테고리가 없습니다.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}