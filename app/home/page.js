'use client';

import React, { useState, useEffect } from 'react';
import styles from './home.module.css';
import HomeHeader from './components/HomeHeader';
import SearchComponent from './components/SearchComponent'; // [신규] SearchComponent import
import MainBanner from './components/MainBanner';
import TrendingSection from './components/TrendingSection';
import BottomNav from './components/BottomNav';
import PopupModal from './components/PopupModal';

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false); // [신규] 검색창 표시 여부 상태

  useEffect(() => {
    const dontShowUntil = localStorage.getItem('popupDontShowUntil');
    const today = new Date().toISOString().split('T')[0];

    if (dontShowUntil !== today) {
      setShowPopup(true);
    }
  }, []);

  const bannerItems = [
    { id: 1, color: 'gray' },
    { id: 2, color: 'lightgray' },
    { id: 3, color: 'gray' },
  ];

  // [FIX] Swiper loop 경고 및 렌더링 오류 해결을 위해 아이템 배열을 3배로 늘립니다.
  const triplicatedBannerItems = [
    ...bannerItems,
    ...bannerItems.map(item => ({ ...item, id: `${item.id}-duplicate-1` })),
    ...bannerItems.map(item => ({ ...item, id: `${item.id}-duplicate-2` }))
  ];

  const trendingCategories = [
    'Safety Equipment',
    'Navigation Tools',
    'Food & Provisions',
    'Maintenance',
  ];

  return (
    <div className={styles.pageContainer}>
      {showPopup && (
        <PopupModal 
          imageUrl="/images/notice-popup.png"
          onClose={() => setShowPopup(false)} 
        />
      )}
      
      {/* [수정] 검색 아이콘 클릭 시 isSearchVisible 상태를 true로 변경하는 함수 전달 */}
      <HomeHeader 
        onSearchClick={() => setIsSearchVisible(true)} 
        isSearchVisible={isSearchVisible}
      />

      {/* [신규] isSearchVisible 상태에 따라 SearchComponent를 렌더링하고, 닫기 함수 전달 */}
      <SearchComponent 
        isVisible={isSearchVisible} 
        onClose={() => setIsSearchVisible(false)} 
      />

      {/* isSearchVisible가 true일 때는 메인 콘텐츠를 숨겨서 UI가 겹치지 않게 처리 */}
      {/* {!isSearchVisible && ( */}
        <main className={styles.mainContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>Tap to Start Private Shopping</h1>
          </div>
          <MainBanner items={triplicatedBannerItems} />
          <TrendingSection categories={trendingCategories} />
        </main>
      {/* )} */}

      <BottomNav activePath="home" />
    </div>
  );
}