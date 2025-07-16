'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // useCallback, useMemo 추가
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

  // 카테고리 데이터 상태
  const [mainCategories, setMainCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState(null);

  // 배너 제품 데이터 상태
  const [bannerProducts, setBannerProducts] = useState([]);
  const [loadingBannerProducts, setLoadingBannerProducts] = useState(true);
  const [errorBannerProducts, setErrorBannerProducts] = useState(null);

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

  // API를 통해 랜덤 제품 이미지를 가져오는 함수 (배너용)
  const fetchBannerProducts = useCallback(async () => {
    setLoadingBannerProducts(true);
    setErrorBannerProducts(null);
    try {
      // DynamoDB에서 최대 10개의 상품만 가져오도록 limit 파라미터 추가
      const response = await fetch('/api/products?limit=10'); // 수정된 부분
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const allProducts = await response.json();

      // 이미지가 있고, Next.js Image 컴포넌트가 허용하는 URL 패턴을 가진 상품만 필터링
      // (next.config.mjs에 설정된 remotePatterns를 따름)
      const validImageProducts = allProducts.filter(p =>
        p.mainImage && (p.mainImage.startsWith('http://') || p.mainImage.startsWith('https://'))
      );

      // 필터링된 유효한 이미지 제품 중 무작위로 5개 선택
      // (ScanLimit이 10개이므로, 10개 미만일 수도 있어 .slice(0, 5)는 그대로 유지)
      const shuffledProducts = validImageProducts.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffledProducts.slice(0, 5); // 5개만 최종 선택

      const mappedBannerItems = selectedProducts.map((product, index) => ({
        id: product.productId, // 또는 고유한 다른 ID
        // 색상은 임의로 지정하거나, 백엔드에서 받아올 수 있습니다.
        color: index % 2 === 0 ? 'gray' : 'lightgray',
        imageUrl: product.mainImage,
      }));

      setBannerProducts(mappedBannerItems);
    } catch (err) {
      console.error("Error fetching banner products:", err);
      setErrorBannerProducts(`배너 이미지를 불러오는 데 실패했습니다: ${err.message}`);
      showModal(`배너 이미지를 불러오는 데 실패했습니다: ${err.message}`);
    } finally {
      setLoadingBannerProducts(false);
    }
  }, [showModal]);


  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchMainCategories();
    fetchBannerProducts(); // 배너 제품도 함께 가져옴
  }, [fetchMainCategories, fetchBannerProducts]);

  // MainBanner에 전달할 아이템 (Swiper loop를 위해 3배로 늘림)
  const triplicatedBannerItems = useMemo(() => {
    if (!bannerProducts.length) return []; // 제품이 없으면 빈 배열 반환
    return [
      ...bannerProducts,
      ...bannerProducts.map(item => ({ ...item, id: `${item.id}-duplicate-1` })),
      ...bannerProducts.map(item => ({ ...item, id: `${item.id}-duplicate-2` }))
    ];
  }, [bannerProducts]);


  const isLoading = loadingCategories || loadingBannerProducts;
  const hasError = errorCategories || errorBannerProducts;

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

      {/* 카테고리 또는 배너 제품 로딩 중이거나 에러 발생 시 메시지 표시 */}
      {isLoading ? (
        <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      ) : hasError ? (
        <div className={styles.mainContent} style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <p>오류: {hasError}</p>
        </div>
      ) : (
        <main className={styles.mainContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.mainTitle}>Tap to Start Private Shopping</h1>
          </div>
          <MainBanner items={bannerProducts} />
          {/* API에서 가져온 mainCategories를 TrendingSection에 전달 */}
          <TrendingSection categories={mainCategories} />
        </main>
      )}

      <BottomNav activePath="home" />
    </div>
  );
}