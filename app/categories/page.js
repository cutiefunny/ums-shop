// app/categories/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // useEffect, useCallback 추가
import BottomNav from '../home/components/BottomNav';
import CategoryItem from './components/CategoryItem';
import styles from './categories.module.css';
// import { categoryData } from '@/data/mockData'; // 더 이상 mockData에서 가져오지 않습니다.

export default function CategoriesPage() {
  // 열려있는 카테고리를 관리하는 상태
  const [openCategory, setOpenCategory] = useState(null); // 초기값을 null로 변경
  const [mainCategories, setMainCategories] = useState([]); // API에서 불러올 메인 카테고리 데이터
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태

  // API를 통해 메인 카테고리 데이터를 불러오는 함수
  const fetchMainCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/categories?level=main'); // level=main으로 메인 카테고리 요청
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMainCategories(data || []); // 데이터가 없을 경우 빈 배열로 초기화
      // 초기 openCategory 설정 (선택 사항: 첫 번째 카테고리를 열어두려면)
      // if (data && data.length > 0) {
      //   setOpenCategory(data[0].categoryId); // categoryId를 기준으로 열기
      // }
    } catch (err) {
      console.error("Error fetching main categories:", err);
      setError(`메인 카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 컴포넌트 마운트 시 메인 카테고리 데이터 불러오기
  useEffect(() => {
    fetchMainCategories();
  }, [fetchMainCategories]);

  const handleToggle = (categoryId) => { // categoryName 대신 categoryId를 사용
    // 이미 열려있는 카테고리를 다시 클릭하면 닫고, 다른 카테고리를 클릭하면 해당 카테고리를 엽니다.
    setOpenCategory(prev => (prev === categoryId ? null : categoryId));
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        return <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />;
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.mainContent} style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <p>error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Category</h1>
      </header>
      <main className={styles.mainContent}>
        <div className={styles.categoryList}>
          {mainCategories.length > 0 ? (
            mainCategories.map(category => (
              <CategoryItem
                key={category.categoryId} // API 응답의 categoryId를 key로 사용
                category={category} // API 응답 객체 전체를 전달
                isOpen={openCategory === category.categoryId} // categoryId를 기준으로 isOpen 판단
                onToggle={() => handleToggle(category.categoryId)} // categoryId를 기준으로 토글
              />
            ))
          ) : (
            <div className={styles.emptyMessage}>
              <p>no categories.</p>
            </div>
          )}
        </div>
      </main>
      {/* activePath prop으로 현재 활성화된 메뉴를 전달 */}
      <BottomNav activePath="categories" />
    </div>
  );
}