'use client';

import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import styles from './home.module.css';
import HomeHeader from './components/HomeHeader';
import SearchComponent from './components/SearchComponent';
import MainBanner from './components/MainBanner';
import TrendingSection from './components/TrendingSection';
import BottomNav from './components/BottomNav';
import PopupModal from './components/PopupModal';
// import { categoryData } from '@/data/mockData'; // 더 이상 mockData에서 categoryData를 가져오지 않습니다.
import { useModal } from '@/contexts/ModalContext'; // useModal 훅 임포트

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [mainCategories, setMainCategories] = useState([]); // API에서 가져올 카테고리 데이터
  const [loadingCategories, setLoadingCategories] = useState(true); // 카테고리 로딩 상태
  const [errorCategories, setErrorCategories] = useState(null); // 카테고리 에러 상태
  const { showModal } = useModal(); // 알림 모달 훅

  useEffect(() => {
    const dontShowUntil = localStorage.getItem('popupDontShowUntil');
    const today = new Date().toISOString().split('T')[0];

    if (dontShowUntil !== today) {
      setShowPopup(true);
    }
  }, []);

  // API를 통해 메인 카테고리 데이터를 가져오는 함수
  const fetchMainCategories = useCallback(async () => {
    setLoadingCategories(true);
    setErrorCategories(null);
    try {
      const response = await fetch('/api/categories?level=main');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setMainCategories(data || []); // 데이터가 없을 경우 빈 배열로 초기화
    } catch (err) {
      console.error("Error fetching main categories for Home Page:", err);
      setErrorCategories(`메인 카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`메인 카테고리 목록을 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingCategories(false);
    }
  }, [showModal]);

  useEffect(() => {
    fetchMainCategories();
  }, [fetchMainCategories]);


  const bannerItems = [
    { id: 1, color: 'gray', imageUrl: '/images/home1.jpeg' },
    { id: 2, color: 'lightgray', imageUrl: '/images/home2.jpeg' },
    { id: 3, color: 'gray', imageUrl: '/images/home3.jpeg' },
  ];

  // Swiper loop 경고 및 렌더링 오류 해결을 위해 아이템 배열을 3배로 늘립니다.
  const triplicatedBannerItems = [
    ...bannerItems,
    ...bannerItems.map(item => ({ ...item, id: `${item.id}-duplicate-1` })),
    ...bannerItems.map(item => ({ ...item, id: `${item.id}-duplicate-2` }))
  ];

  // TrendingSection에 전달할 카테고리 데이터는 이제 API에서 가져온 mainCategories입니다.
  // trendingCategories는 더 이상 필요하지 않습니다.

  return (
    <div className={styles.pageContainer}>
      {showPopup && (
        <PopupModal 
          imageUrl="/images/notice-popup.png"
          onClose={() => setShowPopup(false)} 
        />
      )}
      
      <HomeHeader 
        onSearchClick={() => setIsSearchVisible(true)} 
        isSearchVisible={isSearchVisible}
      />

      <SearchComponent 
        isVisible={isSearchVisible} 
        onClose={() => setIsSearchVisible(false)} 
      />

      {/* 카테고리 로딩 중이거나 에러 발생 시 메시지 표시 */}
      {loadingCategories ? (
        <div className={styles.mainContent} style={{ textAlign: 'center', padding: '50px' }}>
          <p>카테고리를 불러오는 중...</p>
        </div>
      ) : errorCategories ? (
        <div className={styles.mainContent} style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <p>오류: {errorCategories}</p>
        </div>
      ) : (
        <main className={styles.mainContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>Tap to Start Private Shopping</h1>
          </div>
          <MainBanner items={triplicatedBannerItems} />
          {/* API에서 가져온 mainCategories를 TrendingSection에 전달 */}
          <TrendingSection categories={mainCategories} />
        </main>
      )}

      <BottomNav activePath="home" />
    </div>
  );
}
