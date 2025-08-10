'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './home.module.css';
import HomeHeader from './components/HomeHeader';
import SearchComponent from './components/SearchComponent';
import MainBanner from './components/MainBanner';
import TrendingSection from './components/TrendingSection';
import BottomNav from './components/BottomNav';
import PopupModal from './components/PopupModal';
import { useModal } from '@/contexts/ModalContext';

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupBanner, setPopupBanner] = useState(null); // 팝업 배너 데이터 상태
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 카테고리 데이터 상태
  const [mainCategories, setMainCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);

  // 메인 배너 데이터 상태
  const [mainBanners, setMainBanners] = useState([]);
  const [loadingMainBanners, setLoadingMainBanners] = useState(true);
  const [errorMainBanners, setErrorMainBanners] = useState(null);

  const { showModal } = useModal();

  // 데이터 페칭 함수 (배너, 카테고리)
  const fetchHomeData = useCallback(async () => {
    setLoadingCategories(true);
    setLoadingMainBanners(true);
    setErrorCategories(null);
    setErrorMainBanners(null);

    try {
      // 1. 배너 데이터 가져오기 (모든 배너를 가져옴)
      const bannersResponse = await fetch('/api/admin/banner');
      if (!bannersResponse.ok) {
        console.error(`Banner fetch error: ${bannersResponse.status}`);
      } else {
        const allBannersData = await bannersResponse.json();
        
        // 클라이언트 측에서 활성화된 배너 필터링
        const now = new Date();
        const activeBanners = allBannersData.filter(banner => 
          banner.status === 'active' &&
          now >= new Date(banner.startDate) &&
          now <= new Date(banner.endDate)
        );

        // 'Open' 배너에 대한 우선순위 로직 적용
        const openBanners = activeBanners.filter(b => b.location === 'Open');
        const priorityOpenBanners = openBanners.filter(b => b.isPriority === true);

        if (priorityOpenBanners.length > 0) {
            // 우선순위 팝업 배너가 있으면, 가장 최신 1개만 선택
            priorityOpenBanners.sort((a, b) => new Date(b.uploadedDate) - new Date(a.uploadedDate));
            const finalPopupBanner = priorityOpenBanners[0];
            
            setPopupBanner(finalPopupBanner);
            const dontShowUntil = localStorage.getItem('popupDontShowUntil');
            const today = new Date().toISOString().split('T')[0];
            if (dontShowUntil !== today) {
                setShowPopup(true);
            }
        } else {
            // 우선순위 팝업이 없으면 아무것도 표시하지 않음
            setPopupBanner(null);
            setShowPopup(false);
        }

        // ✨ [수정됨] 'Home' 배너 로직: 유효한 모든 배너를 order 순으로 정렬
        const homeBanners = activeBanners
          .filter(b => b.location === 'Home')
          .sort((a, b) => a.order - b.order);
        
        const mappedBannerItems = homeBanners.map(banner => ({
          id: banner.bannerId,
          imageUrl: banner.imageUrl,
          linkUrl: banner.link,
          exposureType: banner.exposureType, // exposureType 추가
        }));
        setMainBanners(mappedBannerItems);
      }
      setLoadingMainBanners(false);

      // 2. 메인 카테고리 데이터 가져오기
      const categoriesResponse = await fetch('/api/categories?level=main');
      if (!categoriesResponse.ok) {
        throw new Error(`HTTP error! status: ${categoriesResponse.status} fetching categories`);
      }
      const categoriesData = await categoriesResponse.json();
      const processedCategories = (categoriesData || []).map(category => ({
        ...category,
        id: category.categoryId,
      }));
      setMainCategories(processedCategories);

    } catch (err) {
      console.error("Error fetching home data:", err);
      setErrorCategories(`Failed to load data: ${err.message}`);
      setErrorMainBanners(`Failed to load data: ${err.message}`);
      showModal(`An error occurred while loading home data: ${err.message}`);
    } finally {
      setLoadingCategories(false);
      setLoadingMainBanners(false);
    }
  }, [showModal]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);
  
  // 전체 로딩 및 에러 상태
  const isLoading = loadingCategories || loadingMainBanners;
  const hasError = errorCategories || errorMainBanners;

  return (
    <div className={styles.pageContainer}>
      {showPopup && popupBanner && (
        <PopupModal
          banner={popupBanner} // 전체 배너 객체 전달
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

      {isLoading ? (
        <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      ) : hasError ? (
        <div className={styles.mainContent} style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <p>Error: {hasError}</p>
        </div>
      ) : (
        <main className={styles.mainContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>Tap to Start Private Shopping</h1>
          </div>
          <MainBanner items={mainBanners} />
          <TrendingSection categories={mainCategories} />
        </main>
      )}

      <BottomNav activePath="home" />
    </div>
  );
}