'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // 카테고리 데이터 상태
  const [mainCategories, setMainCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true); // 개별 로딩 상태 유지
  const [errorCategories, setErrorCategories] = useState(null); // 개별 에러 상태 유지

  // 배너 제품 데이터 상태
  const [bannerProducts, setBannerProducts] = useState([]);
  const [loadingBannerProducts, setLoadingBannerProducts] = useState(true); // 개별 로딩 상태 유지
  const [errorBannerProducts, setErrorBannerProducts] = useState(null); // 개별 에러 상태 유지

  const { showModal } = useModal(); // 알림 모달 훅

  useEffect(() => {
    const dontShowUntil = localStorage.getItem('popupDontShowUntil');
    const today = new Date().toISOString().split('T')[0];

    if (dontShowUntil !== today) {
      setShowPopup(true);
    }
  }, []);

  // 두 API 호출을 통합한 단일 데이터 페칭 함수
  const fetchHomeData = useCallback(async () => {
    setLoadingCategories(true);
    setLoadingBannerProducts(true);
    setErrorCategories(null);
    setErrorBannerProducts(null);

    try {
      // 1. 메인 카테고리 데이터 가져오기
      const categoriesResponse = await fetch('/api/categories?level=main');
      if (!categoriesResponse.ok) {
        throw new Error(`HTTP error! status: ${categoriesResponse.status} fetching categories`);
      }
      const categoriesData = await categoriesResponse.json();
      // categoryId를 id로 복사하여 TrendingSection에서 사용 가능하도록 함
      const processedCategories = (categoriesData || []).map(category => ({
        ...category,
        id: category.categoryId,
      }));
      setMainCategories(processedCategories);
      setLoadingCategories(false); // 카테고리 로딩 완료

      // 배너 제품 필터링을 위한 카테고리 ID 목록 추출
      const fetchedMainCategoryIds = processedCategories.map(cat => cat.name);

      // 2. 배너 제품 데이터 가져오기 (메인 카테고리 ID에 따라 필터링)
      const productsResponse = await fetch('/api/products?limit=50'); // 충분한 제품을 가져오기 위해 limit 증가
      if (!productsResponse.ok) {
        throw new Error(`HTTP error! status: ${productsResponse.status} fetching products`);
      }
      const allProducts = await productsResponse.json();

      // 이미지가 있고, 유효한 URL 패턴을 가지며, 메인 카테고리 ID에 포함된 상품만 필터링
      const validImageProducts = allProducts.filter(p =>
        p.mainImage && (p.mainImage.startsWith('http://') || p.mainImage.startsWith('https://')) &&
        fetchedMainCategoryIds.includes(p.mainCategory) // 제품의 categoryId가 메인 카테고리 ID 목록에 있는지 확인
      );

      // 필터링된 제품 중 무작위로 5개 선택
      const shuffledProducts = validImageProducts.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffledProducts.slice(0, 5);

      const mappedBannerItems = selectedProducts.map((product, index) => ({
        id: product.productId,
        color: index % 2 === 0 ? 'gray' : 'lightgray',
        imageUrl: product.mainImage,
      }));
      setBannerProducts(mappedBannerItems);
      setLoadingBannerProducts(false); // 배너 제품 로딩 완료

    } catch (err) {
      console.error("Error fetching home data:", err);
      setErrorCategories(`Failed to load home data: ${err.message}`);
      setErrorBannerProducts(`Failed to load home data: ${err.message}`);
      setLoadingCategories(false); // 에러 발생 시 로딩 상태 해제
      setLoadingBannerProducts(false); // 에러 발생 시 로딩 상태 해제
      showModal(`An error occurred while loading home data: ${err.message}`);
    }
  }, [showModal]); // showModal만 의존성으로 가짐

  // 컴포넌트 마운트 시 통합된 데이터 로드 함수 호출
  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // MainBanner에 전달할 아이템 (Swiper loop를 위해 3배로 늘림)
  const triplicatedBannerItems = useMemo(() => {
    if (!bannerProducts.length) return []; // 제품이 없으면 빈 배열 반환
    return [
      ...bannerProducts,
      ...bannerProducts.map(item => ({ ...item, id: `${item.id}-duplicate-1` })),
      ...bannerProducts.map(item => ({ ...item, id: `${item.id}-duplicate-2` }))
    ];
  }, [bannerProducts]);

  // 전체 로딩 및 에러 상태
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
          <p>Error: {hasError}</p>
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
