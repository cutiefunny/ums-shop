'use client';

import React, { useState, useEffect } from 'react';
import styles from './home.module.css';
import HomeHeader from './components/HomeHeader';
import MainBanner from './components/MainBanner';
import TrendingSection from './components/TrendingSection';
import BottomNav from './components/BottomNav';
import PopupModal from './components/PopupModal';

export default function HomePage() {
    const [showPopup, setShowPopup] = useState(false);
    useEffect(() => {
    const dontShowUntil = localStorage.getItem('popupDontShowUntil');
    const today = new Date().toISOString().split('T')[0];

    if (dontShowUntil !== today) {
      setShowPopup(true);
    }
  }, []);
  // TODO: 실제 데이터는 Firestore 등에서 가져옵니다.
  const bannerItems = [
    { id: 1, color: '#e9ecef' },
    { id: 2, color: '#ced4da' },
    { id: 3, color: '#e9ecef' },
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
          imageUrl="/path/to/your/banner.png" // TODO: 실제 배너 이미지 경로 입력
          onClose={() => setShowPopup(false)} 
        />
      )}
      <HomeHeader />
      <main className={styles.mainContent}>
        <div className={styles.titleSection}>
          <h1 className={styles.mainTitle}>Tap to Start Private Shopping</h1>
        </div>
        <MainBanner items={bannerItems} />
        <TrendingSection categories={trendingCategories} />
      </main>
      <BottomNav />
    </div>
  );
}